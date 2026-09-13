'use strict';
// Inbound email triage. A provider (Postmark, Resend, Mailgun) POSTs each
// email to /webhooks/inbox. The message is matched to a customer or partner,
// classified, and either answered on the spot (the safe classes) or queued
// with a drafted reply for one tap on /admin/autopilot.
//
// Classification uses the Claude API when ANTHROPIC_API_KEY (or `ant auth
// login`) is available; otherwise a keyword classifier does the safe cases
// and queues the rest. INBOX_CLASSIFIER=keywords forces the fallback (tests).
const db = require('./db');
const mail = require('./mail');

const MODEL = process.env.INBOX_MODEL || 'claude-opus-5';
const CLASSES = ['certificate_request', 'invoice_or_receipt', 'refill_request', 'address_change', 'cancel', 'add_kits', 'how_to', 'partner_enquiry', 'complaint', 'sales_question', 'spam', 'other'];
// Auto-answer without a human when confidence is high; everything else is queued with the draft.
const AUTO = new Set(['certificate_request', 'invoice_or_receipt', 'refill_request', 'address_change', 'cancel', 'add_kits', 'how_to', 'partner_enquiry', 'sales_question', 'spam']);
const AUTO_MIN_CONFIDENCE = parseFloat(process.env.INBOX_AUTO_MIN || '0.8');

const brand = () => process.env.BRAND || 'Kit Register';
const base = () => (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const sign = () => `\n\n${brand()}`;

const SCHEMA = {
  type: 'object',
  properties: {
    classification: { type: 'string', enum: CLASSES },
    confidence: { type: 'number' },
    new_address: { type: ['string', 'null'] },
    kits_wanted: { type: ['integer', 'null'] },
    summary: { type: 'string' },
  },
  required: ['classification', 'confidence', 'new_address', 'kits_wanted', 'summary'],
  additionalProperties: false,
};

function keywordClassify(m) {
  const t = `${m.subject || ''}\n${m.body || ''}`.toLowerCase();
  const has = (...w) => w.some((x) => t.includes(x));
  let c = 'other', conf = 0.6;
  if (has('unsubscribe', 'seo services', 'guest post', 'backlink')) { c = 'spam'; conf = 0.9; }
  else if (has('complain', 'unacceptable', 'disappointed', 'not happy', 'unhappy', 'wrong', 'damaged', 'missing', 'broken', 'never arrived')) { c = 'complaint'; conf = 0.8; } // complaints win over every other class
  else if (has('certificate')) { c = 'certificate_request'; conf = 0.85; }
  else if (has('invoice', 'receipt', 'tax invoice')) { c = 'invoice_or_receipt'; conf = 0.85; }
  else if (has('cancel')) { c = 'cancel'; conf = 0.85; }
  else if (has('moved', 'new address', 'change of address', 'changed address')) { c = 'address_change'; conf = 0.7; }
  else if (has('another kit', 'more kits', 'add a kit', 'add kits', 'extra kit', 'new ute', 'new vehicle')) { c = 'add_kits'; conf = 0.8; }
  else if (has('refill', 'ran out', 'used the', 'need more', 'restock')) { c = 'refill_request'; conf = 0.8; }
  else if (has('partner', 'refer', 'commission', 'consultant')) { c = 'partner_enquiry'; conf = 0.8; }
  else if (has('how do i', 'how to', 'where is', 'scan')) { c = 'how_to'; conf = 0.75; }
  else if (has('price', 'pricing', 'how much', 'quote', 'gst')) { c = 'sales_question'; conf = 0.8; }
  const addr = (m.body || '').match(/(?:new address|moved to|now at)[:\s]+([^\n]{8,120})/i);
  return { classification: c, confidence: conf, new_address: addr ? addr[1].trim() : null, kits_wanted: null, summary: (m.subject || '').slice(0, 120) };
}

async function claudeClassify(m, customer) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    output_config: { format: { type: 'json_schema', schema: SCHEMA }, effort: 'low' },
    system: `You triage inbound email for ${brand()}, an Australian business that sells workplace first-aid kits on a replenishment plan with a compliance certificate. Classify the email into exactly one class and give a confidence from 0 to 1. Use "cancel" only when the sender clearly asks to end the plan. Use "complaint" when the sender is unhappy about service or goods, whatever else they ask. Extract a new postal address only if one is stated. Extract the number of extra kits wanted only if stated. Never invent details.${customer ? ` The sender is an existing customer: ${customer.name}, ${customer.plan_billing} plan, ${db.listKits(customer.id).length} kits.` : ' The sender is not a known customer.'}`,
    messages: [{ role: 'user', content: `From: ${m.from_email}\nSubject: ${m.subject}\n\n${(m.body || '').slice(0, 6000)}` }],
  });
  if (res.stop_reason === 'refusal') return { classification: 'other', confidence: 0, new_address: null, kits_wanted: null, summary: 'classifier refused' };
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

async function classify(m, customer) {
  const useClaude = process.env.INBOX_CLASSIFIER !== 'keywords' && (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.INBOX_CLASSIFIER === 'claude');
  if (!useClaude) return keywordClassify(m);
  try { return await claudeClassify(m, customer); }
  catch (e) { console.error('inbox classify', e.message); return { ...keywordClassify(m), confidence: 0.5 }; }
}

// The reply for each class. Returns {subject, text, act} where act mutates the register.
function compose(cls, m, c, k) {
  const hi = `Hi ${(c && c.contact_name) || ''},\n\n`.replace('Hi ,', 'Hi,');
  const rec = c ? `${base()}/c/${c.token}` : null;
  switch (cls) {
    case 'certificate_request':
      return c ? { subject: 'Your compliance certificate', text: `${hi}Your current certificate is here (it is always live, so this link is the one to keep): ${rec}/certificate\n\nThe full record with every kit, check and refill: ${rec}` }
        : { subject: 'Your compliance certificate', text: `${hi}I could not match this email address to an account. Reply from the address you signed up with, or with your business name, and the certificate link will come straight back.` };
    case 'invoice_or_receipt':
      return { subject: 'Your invoice', text: `${hi}Every payment has a tax invoice from Stripe; it is emailed at the time of payment and you can download any of them here: ${base()}/billing?c=${c ? c.token : ''}\n\nIf you need it addressed differently, reply with the details and it will be reissued.` };
    case 'refill_request': {
      const kits = c ? db.listKits(c.id).filter((x) => x.status === 'active') : [];
      const links = kits.map((x) => `  ${x.type === 'vehicle' ? 'Vehicle' : 'Site'} · ${x.location || x.code}: ${base()}/k/${x.code}`).join('\n');
      return { subject: 'Your refill', text: `${hi}Tap the kit below, tick what was used, and the refill ships the same business day; the record updates itself.\n\n${links || '  (no kits found on this address; reply with your business name)'}\n\nIf you would rather I do it, reply with which kit and which items.` };
    }
    case 'address_change':
      return { subject: 'Address updated', text: `${hi}${k.new_address ? `Done: refills now ship to ${k.new_address}. ` : 'Reply with the new address on one line and it will be updated the same day. '}Your record: ${rec || base()}`,
        act: () => { if (c && k.new_address) { db.updateCustomer(c.id, { address: k.new_address }); db.logEvent(c.id, null, 'address_changed', { to: k.new_address, via: 'email' }); } } };
    case 'cancel':
      return { subject: 'Cancelling your plan', text: `${hi}Sorry to see you go. Cancel here in one click, effective at the end of the current period, and the kits stay yours: ${base()}/billing?c=${c ? c.token : ''}\n\nIf it is about price or the number of kits, reply and I will adjust the plan instead.`,
        act: () => { if (c) db.logEvent(c.id, null, 'cancel_requested', { via: 'email' }); } };
    case 'add_kits':
      return { subject: 'Adding kits', text: `${hi}Add kits to your plan here; they ship with a QR label and appear on your record the moment you name them: ${base()}/buy?cref=${c ? c.token : ''}${k.kits_wanted ? `&vehicles=${k.kits_wanted}` : ''}` };
    case 'how_to':
      return { subject: 'How it works', text: `${hi}Scan the QR label on any kit lid with a phone camera (or open the link on your record). Tick what was used and send: the refill ships the same business day. Press "nothing used, checked and complete" for the six-monthly check. Every check and refill goes on your record: ${rec || base()}\n\nNothing else to remember.` };
    case 'partner_enquiry':
      return { subject: 'Partnering with ' + brand(), text: `${hi}Partners (WHS consultants, bookkeepers, trainers, associations) earn 15% of the first year's plan for every client who signs up through their link, and see each client's compliance state in a portal. Sign up in a minute: ${base()}/partners` };
    case 'sales_question':
      return { subject: 'Pricing', text: `${hi}Site kit A$119 and vehicle kit A$59, yours outright. The plan that keeps them stocked and gives you the certificate is A$12 a month per site kit and A$7 per vehicle kit (A$15 minimum), billed annually; monthly is 15% more. GST on top. Build your exact quote here: ${base()}/buy` };
    case 'spam':
      return { subject: '', text: '', silent: true };
    case 'complaint':
      return { subject: 'Re: ' + (m.subject || 'your message'), text: `${hi}Thank you for telling me; I am sorry this happened. ${k.summary ? 'What I understand: ' + k.summary + '. ' : ''}Here is what I will do: [fill in before sending]. If a replacement is needed it ships today.`, needs_human: true };
    default:
      return { subject: 'Re: ' + (m.subject || 'your message'), text: `${hi}Thanks for your email. [draft reply]`, needs_human: true };
  }
}

// Main entry. Returns the inbox row after handling.
async function handle(m) {
  const from = (m.from_email || '').trim().toLowerCase();
  const c = from ? db.getCustomerByEmail(from) : null;
  const row = db.createInbound({ from_email: from, subject: m.subject, body: m.body, customer_id: c ? c.id : null });
  const k = await classify(m, c);
  const reply = compose(k.classification, m, c, k);
  const auto = AUTO.has(k.classification) && k.confidence >= AUTO_MIN_CONFIDENCE && !reply.needs_human;
  if (reply.silent) { db.updateInbound(row.id, { classification: k.classification, confidence: k.confidence, status: 'ignored' }); return db.db.prepare('SELECT * FROM inbox WHERE id = ?').get(row.id); }
  if (auto) {
    if (reply.act) reply.act();
    if (from) await mail.send({ to: from, subject: reply.subject, text: reply.text + sign(), kind: 'inbox_reply', customer_id: c ? c.id : null });
    db.updateInbound(row.id, { classification: k.classification, confidence: k.confidence, reply: reply.text, status: 'auto_replied' });
    if (c) db.logEvent(c.id, null, 'email_answered', { classification: k.classification });
  } else {
    const a = db.createAction({ type: 'send_email', title: `Reply to ${c ? c.name : from}: ${k.classification.replace(/_/g, ' ')}`,
      detail: `${m.subject || ''}\n\n${(m.body || '').slice(0, 600)}\n\n--- draft reply ---\n${reply.text}`,
      payload: { to: from, subject: reply.subject, text: reply.text + sign(), kind: 'inbox_reply', customer_id: c ? c.id : null, inbox_id: row.id } });
    db.updateInbound(row.id, { classification: k.classification, confidence: k.confidence, reply: reply.text, status: 'queued', action_id: a.id });
  }
  return db.db.prepare('SELECT * FROM inbox WHERE id = ?').get(row.id);
}

// Normalise the common providers' inbound JSON to {from_email, subject, body}.
function fromProvider(p) {
  if (p.FromFull || p.TextBody !== undefined) return { from_email: (p.FromFull && p.FromFull.Email) || p.From, subject: p.Subject, body: p.StrippedTextReply || p.TextBody || '' }; // Postmark
  if (p.from && typeof p.from === 'object') return { from_email: p.from.email || p.from.address, subject: p.subject, body: p.text || '' }; // Resend-style
  return { from_email: p.from || p.sender || p.from_email, subject: p.subject, body: p.text || p['body-plain'] || p.body || '' }; // Mailgun / generic
}

module.exports = { handle, classify, compose, keywordClassify, fromProvider, CLASSES, AUTO };
