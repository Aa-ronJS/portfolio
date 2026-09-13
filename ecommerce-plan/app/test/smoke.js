'use strict';
// End-to-end smoke test against a throwaway database. Boots the server on a
// random port, walks the sales flow (new account -> kits -> scan -> ship ->
// certificate), and asserts on what the pages and the engine say.
//   npm test
process.env.DB_PATH = require('path').join(require('os').tmpdir(), `kits-test-${process.pid}.db`);
process.env.ADMIN_PASSWORD = 'test-pass';
process.env.BRAND = 'TestBrand';
process.env.CONTACT_PHONE = '0400 000 000';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.INBOX_CLASSIFIER = 'keywords';
process.env.INBOUND_SECRET = 'inb_test';
process.env.FULFIL_WEBHOOK_SECRET = 'ful_test';
process.env.FOUNDER_EMAIL = 'founder@example.com';
process.env.AUTOPILOT_FORCE_WEEKLY = '1';
process.env.AUTOPILOT_FORCE_MONTHLY = '1';
process.env.SUPPLIER_EMAIL = 'orders@supplier.example';

const assert = require('assert');
const fs = require('fs');
const crypto = require('crypto');
const { server, cfg } = require('../server');
const db = require('../lib/db');
const sched = require('../lib/schedule');

const AUTH = 'Basic ' + Buffer.from('admin:test-pass').toString('base64');
let base;
async function get(p, opts = {}) {
  const r = await fetch(base + p, { redirect: 'manual', ...opts });
  return { status: r.status, text: await r.text(), location: r.headers.get('location'), type: r.headers.get('content-type') };
}
const admin = (p, opts = {}) => get(p, { ...opts, headers: { Authorization: AUTH, ...(opts.headers || {}) } });
const form = (o) => new URLSearchParams(o).toString();
const post = (p, body, auth) => get(p, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...(auth ? { Authorization: AUTH } : {}) }, body: form(body) });

// A fake Stripe: records the session it was asked to create, serves it back as paid.
const http = require('http');
const fakeSessions = {};
const fakeStripe = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => body += c); req.on('end', () => {
    if (req.method === 'POST' && req.url === '/v1/checkout/sessions') {
      const p = new URLSearchParams(body); const id = 'cs_test_' + Object.keys(fakeSessions).length;
      const meta = {}; for (const [k, v] of p) { const m = k.match(/^metadata\[(.+)\]$/); if (m) meta[m[1]] = v; }
      fakeSessions[id] = { id, url: `http://stripe.test/pay/${id}`, mode: p.get('mode'), payment_status: 'paid', status: 'complete', customer: 'cus_' + id, subscription: 'sub_' + id,
        amount_total: 12345, metadata: meta, customer_details: { email: 'buyer@example.com', phone: '0400 555 666', name: meta.contact_name || 'Buyer', address: { line1: '9 Site St', city: 'Adelaide', state: 'SA', postal_code: '5000' } },
        line_items_raw: body };
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(fakeSessions[id])); return;
    }
    const m = req.url.match(/^\/v1\/checkout\/sessions\/(.+)$/);
    if (req.method === 'GET' && m && fakeSessions[m[1]]) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(fakeSessions[m[1]])); return; }
    res.statusCode = 404; res.end(JSON.stringify({ error: { message: 'no such session' } }));
  });
});

(async () => {
  await new Promise((r) => fakeStripe.listen(0, r));
  cfg.stripeApiBase = `http://127.0.0.1:${fakeStripe.address().port}`;
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
  cfg.baseUrl = base;
  let n = 0; const ok = (m) => { n++; console.log('  ok', m); };

  // public pages
  assert.strictEqual((await get('/')).status, 200); ok('landing renders');
  assert.strictEqual((await get('/health')).text, 'ok'); ok('health');
  assert.strictEqual((await get('/k/NOPE')).status, 404); ok('unknown kit is 404');
  assert.strictEqual((await get('/admin')).status, 401); ok('admin requires auth');
  assert.strictEqual((await get('/style.css')).status, 200); ok('static css served');
  assert.strictEqual((await get('/../server.js')).status, 404); ok('static path traversal blocked');

  // create account with 1 site + 2 vehicle kits
  let r = await post('/admin/customers/new', { name: 'Test Sparky Pty Ltd', abn: '11 222 333 444', contact_name: 'Jo', phone: '0400 123 456', email: 'jo@example.com', address: '1 Test St, Wingfield SA', industry: 'Trades', plan_billing: 'annual', site_kits: '1', vehicle_kits: '2' }, true);
  assert.strictEqual(r.status, 303); ok('account created');
  const cid = r.location.split('/').pop();
  const c = db.getCustomer(cid);
  assert(c && c.token.length === 16);
  const kits = db.listKits(cid);
  assert.strictEqual(kits.length, 3); ok('three kits registered');
  const site = kits.find((k) => k.type === 'site'); const ute = kits.find((k) => k.type === 'vehicle');
  assert(db.listItems(site.id).length > 25 && db.listItems(ute.id).length > 15); ok('contents seeded from profiles');
  assert.strictEqual(site.next_refill_at, db.addMonths(db.today(), db.REFILL_MONTHS)); ok('next refill scheduled');

  // customer detail + record + certificate
  r = await admin(`/admin/customers/${cid}`); assert(r.text.includes('Test Sparky')); ok('customer page');
  r = await get(`/c/${c.token}`); assert(r.status === 200 && r.text.includes('All kits compliant')); ok('record shows compliant');
  r = await get(`/c/${c.token}/certificate`); assert(r.text.includes('COMPLIANT') && r.text.includes('3 first-aid kits')); ok('certificate renders');
  r = await get(`/c/${c.token}.json`); assert(JSON.parse(r.text).overall === 'compliant'); ok('json record');

  // scan page and after-use flow
  r = await get(`/k/${ute.code}`); assert(r.status === 200 && r.text.includes('What did you use?')); ok('scan page renders');
  r = await get(`/k/${ute.code.toLowerCase()}`); assert.strictEqual(r.status, 200); ok('scan code is case-insensitive');
  const items = db.listItems(ute.id);
  const gloves = items.find((i) => i.name.startsWith('Nitrile'));
  r = await post(`/k/${ute.code}/used`, { used: String(gloves.id), ['qty_' + gloves.id]: '2', reporter: 'Jo', note: 'cut' });
  assert(r.status === 200 && r.text.includes('Refill on its way')); ok('after-use recorded');
  assert.strictEqual(db.listItems(ute.id).find((i) => i.id === gloves.id).qty_present, gloves.qty_present - 2); ok('quantity decremented');
  let open = db.listOpenRequests(); assert.strictEqual(open.length, 1); ok('refill request opened');
  let st = sched.kitState(db.getKit(ute.id), db.listItems(ute.id), open);
  assert.strictEqual(st.state, 'attention'); ok('kit state is attention: ' + st.reasons[0]);
  r = await get(`/c/${c.token}`); assert(r.text.includes('Attention required')); ok('record shows attention');
  r = await post(`/k/${ute.code}/used`, { reporter: 'Jo' }); assert.strictEqual(r.status, 303); ok('empty submission bounces back');

  // dashboard lists it; ship it
  r = await admin('/admin'); assert(r.text.includes('Refill requests (1)') && r.text.includes('Test Sparky')); ok('dashboard shows open request');
  r = await post(`/admin/refills/${open[0].id}/ship`, { tracking: 'AP123' }, true); assert.strictEqual(r.status, 303); ok('request shipped');
  assert.strictEqual(db.listOpenRequests().length, 0);
  assert.strictEqual(db.listItems(ute.id).find((i) => i.id === gloves.id).qty_present, gloves.qty_required); ok('quantity restored on ship');
  st = sched.kitState(db.getKit(ute.id), db.listItems(ute.id), []); assert.strictEqual(st.state, 'compliant'); ok('kit compliant again');

  // check ok + problem
  r = await post(`/k/${site.code}/ok`, { reporter: 'Jo' }); assert(r.text.includes('Recorded')); ok('check ok recorded');
  r = await post(`/k/${site.code}/problem`, { note: 'kit missing' }); assert(r.text.includes("We're on it")); ok('problem recorded');
  assert.strictEqual(db.listOpenRequests()[0].kind, 'problem');
  await post(`/admin/refills/${db.listOpenRequests()[0].id}/ship`, {}, true);

  // expiry engine: scheduled refill due / overdue; item expiry; AED
  db.updateKit(site.id, { next_refill_at: db.addDays(db.today(), 5) });
  st = sched.kitState(db.getKit(site.id), db.listItems(site.id), []); assert.strictEqual(st.state, 'due'); ok('refill inside window -> due');
  db.updateKit(site.id, { next_refill_at: db.addDays(db.today(), -3) });
  st = sched.kitState(db.getKit(site.id), db.listItems(site.id), []); assert.strictEqual(st.state, 'overdue'); ok('refill past -> overdue');
  let rep = sched.dueReport(); assert(rep.scheduled.some((k) => k.id === site.id)); ok('due report lists scheduled refill');
  r = await post(`/admin/kits/${site.id}/refill`, { tracking: 'AP999' }, true); assert.strictEqual(r.status, 303);
  const s2 = db.getKit(site.id); assert.strictEqual(s2.next_refill_at, db.addMonths(db.today(), db.REFILL_MONTHS)); ok('scheduled pack shipped resets cycle');
  const anyExp = db.listItems(site.id).find((i) => i.expires_at);
  db.setItem(anyExp.id, anyExp.qty_required, db.addDays(db.today(), 10));
  st = sched.kitState(db.getKit(site.id), db.listItems(site.id), []); assert(st.state === 'due' && /expires in 10 days/.test(st.reasons.join())); ok('item expiry inside window -> due');
  db.setItem(anyExp.id, anyExp.qty_required, db.addDays(db.today(), -1));
  st = sched.kitState(db.getKit(site.id), db.listItems(site.id), []); assert.strictEqual(st.state, 'overdue'); ok('expired item -> overdue');
  db.setItem(anyExp.id, anyExp.qty_required, db.addMonths(db.today(), 24));

  r = await post(`/admin/customers/${cid}/aeds`, { location: 'Office', make_model: 'HeartSine 350P', serial: 'X1', pads_expiry: db.addDays(db.today(), 20), battery_expiry: db.addMonths(db.today(), 20) }, true);
  assert.strictEqual(r.status, 303); ok('AED registered');
  rep = sched.dueReport(); assert(rep.aeds.length === 1 && /Pads expire in 20 days/.test(rep.aeds[0].reasons.join())); ok('AED pads flagged');
  r = await get(`/c/${c.token}/certificate`); assert(r.text.includes('1 defibrillator')); ok('certificate counts AED');

  // renewals, labels, export
  db.updateCustomer(cid, { plan_renewal: db.addDays(db.today(), 10) });
  rep = sched.dueReport(); assert(rep.renewals.some((x) => x.id === cid)); ok('renewal flagged');
  r = await post(`/admin/customers/${cid}/renew`, {}, true); assert.strictEqual(db.getCustomer(cid).plan_renewal, db.addMonths(db.addDays(db.today(), 10), 12)); ok('renew extends 12 months');
  r = await admin(`/admin/kits/${site.id}/label`); assert(r.text.includes('<svg') && r.text.includes(site.code)); ok('label with QR');
  r = await admin(`/admin/labels?customer=${cid}`); assert((r.text.match(/<svg/g) || []).length === 3); ok('label sheet for customer');
  r = await admin('/admin/export.csv'); assert(r.type.startsWith('text/csv') && r.text.split('\n').length === 4); ok('csv export');
  r = await post(`/admin/kits/${ute.id}/items`, { ['qty_' + gloves.id]: '1', ['exp_' + gloves.id]: '2027-01-01' }, true);
  assert.strictEqual(db.listItems(ute.id).find((i) => i.id === gloves.id).expires_at, '2027-01-01'); ok('contents edit');
  r = await admin(`/admin/kits/${ute.id}`); assert(r.text.includes(ute.code)); ok('kit page');

  // escaping
  await post('/admin/customers/new', { name: '<script>alert(1)</script> Co', site_kits: '0', vehicle_kits: '0' }, true);
  r = await admin('/admin/customers'); assert(!r.text.includes('<script>alert(1)') && r.text.includes('&lt;script&gt;')); ok('html escaped');

  // ---- partners, referrals, payouts
  r = await post('/admin/partners', { name: 'Safe Hands WHS', type: 'whs_consultant', contact_name: 'Pat', fee_share: '0.15' }, true);
  assert.strictEqual(r.status, 303); ok('partner created');
  const pid = r.location.split('/').pop(); const partner = db.getPartner(pid);
  assert(partner && partner.token.length === 12);
  r = await post('/admin/customers/new', { name: 'Referred Plumbing', partner_id: pid, site_kits: '1', vehicle_kits: '3' }, true);
  const rid = r.location.split('/').pop(); const rc = db.getCustomer(rid);
  assert.strictEqual(rc.source, 'partner'); ok('partner-referred account tagged');
  const payouts = db.listPartnerPayouts(pid);
  assert.strictEqual(payouts.length, 1); assert.strictEqual(payouts[0].amount, Math.round((144 + 3 * 84) * 0.15 * 100) / 100); ok('payout recorded: A$' + payouts[0].amount);
  r = await get(`/p/${partner.token}`); assert(r.status === 200 && r.text.includes('Referred Plumbing') && r.text.includes('owed to you')); ok('partner portal renders');
  assert(!r.text.includes('0400 123 456')); ok('portal hides client contact details');
  r = await admin(`/admin/partners/${pid}`); assert(r.text.includes('/check?ref=' + partner.token)); ok('partner detail with referral link');
  r = await post(`/admin/payouts/${payouts[0].id}/paid`, {}, true); assert.strictEqual(db.listPartnerPayouts(pid)[0].status, 'paid'); ok('payout marked paid');
  r = await post('/admin/customers/new', { name: 'Word Of Mouth Electrical', referred_by: cid, site_kits: '1', vehicle_kits: '0' }, true);
  const wid = r.location.split('/').pop(); assert.strictEqual(db.getCustomer(wid).source, 'referral');
  assert(db.listEvents(cid).some((e) => e.type === 'referral_made')); ok('customer referral attributed to referrer');

  // ---- self-check lead magnet
  r = await get('/check?ref=' + partner.token); assert(r.status === 200 && r.text.includes('Is your first-aid setup compliant') && r.text.includes(partner.token)); ok('self-check form with partner ref');
  r = await post('/check', { ref: partner.token, kits: 'yes', checked: 'no', dates: 'unsure', owner: 'yes', firstaider: 'yes', process: 'no', evidence: 'no', aed: 'yes', business: 'Lead Landscaping', phone: '0400 999 888', email: 'lead@example.com', industry: 'Landscaping / outdoor' });
  assert(r.status === 200 && r.text.includes('4 of 8')); ok('self-check scored 4 of 8');
  const leads = db.listLeads(); assert(leads.length === 1 && leads[0].partner_id === pid && leads[0].score === 4); ok('lead stored with partner attribution');
  r = await admin('/admin/leads'); assert(r.text.includes('Lead Landscaping')); ok('leads page');
  r = await post(`/admin/leads/${leads[0].id}`, { status: 'contacted' }, true); assert.strictEqual(db.listLeads()[0].status, 'contacted'); ok('lead status update');

  // ---- cancellation and metrics
  r = await post(`/admin/customers/${wid}/cancel`, { reason: 'closed the business' }, true); assert.strictEqual(db.getCustomer(wid).status, 'cancelled'); ok('plan cancelled with reason');
  r = await get(`/c/${db.getCustomer(wid).token}`); assert(r.text.includes('Plan inactive')); ok('record shows inactive plan');
  r = await admin('/admin/metrics'); assert(r.status === 200 && r.text.includes('Retention and acquisition') && r.text.includes('closed the business')); ok('metrics page with cancellation reason');
  const M = require('../lib/metrics').compute();
  assert(M.bySource.partner === 1 && M.bySource.referral === 1 && M.cancelled === 1 && M.leads === 1); ok('metrics counts by source');

  // ---- Stripe webhook
  db.updateCustomer(cid, { email: 'jo@example.com' });
  const signed = (payload) => { const t = Math.floor(Date.now() / 1000); const raw = JSON.stringify(payload); const v1 = crypto.createHmac('sha256', 'whsec_test').update(`${t}.${raw}`).digest('hex'); return { raw, sig: `t=${t},v1=${v1}` }; };
  const stripePost = (payload, sig) => get('/webhooks/stripe', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': sig }, body: payload });
  let sp = signed({ type: 'invoice.payment_failed', data: { object: { customer: 'cus_123', customer_email: 'jo@example.com', attempt_count: 1 } } });
  r = await stripePost(sp.raw, 't=1,v1=bad'); assert.strictEqual(r.status, 400); ok('unsigned stripe event rejected');
  r = await stripePost(sp.raw, sp.sig); assert.strictEqual(r.status, 200); assert.strictEqual(db.getCustomer(cid).status, 'past_due'); ok('payment failed -> past due (matched by email)');
  assert.strictEqual(db.getCustomer(cid).stripe_customer_id, 'cus_123'); ok('stripe customer id attached');
  r = await get(`/c/${c.token}`); assert(r.text.includes('Renewal payment pending')); ok('record shows dunning state');
  const end = Math.floor(Date.now() / 1000) + 365 * 86400;
  sp = signed({ type: 'invoice.paid', data: { object: { customer: 'cus_123', subscription: 'sub_1', amount_paid: 30700, lines: { data: [{ period: { end } }] } } } });
  r = await stripePost(sp.raw, sp.sig); assert.strictEqual(r.status, 200);
  const after = db.getCustomer(cid); assert(after.status === 'active' && after.plan_renewal === new Date(end * 1000).toISOString().slice(0, 10)); ok('invoice paid -> active, renewal moved (matched by stripe id)');
  assert(db.listEvents(cid).some((e) => e.type === 'payment_recovered')); ok('recovery event logged');
  sp = signed({ type: 'invoice.paid', data: { object: { customer: 'cus_unknown', customer_email: 'nobody@example.com' } } });
  r = await stripePost(sp.raw, sp.sig); assert(r.text.includes('unmatched')); ok('unknown customer logged, not applied');

  // ---- compliance calendar
  r = await post(`/admin/customers/${cid}/obligations`, { category: 'fire', label: 'Fire extinguishers x4', location: 'Workshop', last_done: db.addMonths(db.today(), -6), provider: 'ABC Fire' }, true);
  assert.strictEqual(r.status, 303); ok('obligation added');
  let obs = db.listObligations(cid); assert(obs.length === 1 && obs[0].interval_months === 6 && obs[0].next_due === db.today()); ok('fire item defaults to 6 months, due today');
  st = sched.obligationState(obs[0]); assert.strictEqual(st.state, 'due'); ok('obligation due state');
  r = await get(`/c/${c.token}`); assert(r.text.includes('Compliance calendar') && r.text.includes('Fire extinguishers x4')); ok('record shows calendar');
  r = await get(`/c/${c.token}/certificate`); assert(r.text.includes('1 scheduled item')); ok('certificate counts calendar items');
  rep = sched.dueReport(); assert(rep.obligations.some((o) => o.id === obs[0].id)); ok('due report lists obligation');
  r = await admin('/admin'); assert(r.text.includes('Compliance calendar items due (1)')); ok('dashboard shows obligation');
  r = await post(`/admin/obligations/${obs[0].id}/done`, { date: db.today() }, true); assert.strictEqual(r.status, 303);
  obs = db.listObligations(cid); assert.strictEqual(obs[0].next_due, db.addMonths(db.today(), 6)); ok('done resets the cycle');
  assert.strictEqual(sched.obligationState(obs[0]).state, 'compliant');
  r = await post(`/admin/customers/${cid}/obligations`, { category: 'test_tag', label: 'Test and tag, workshop', last_done: db.addMonths(db.today(), -14) }, true);
  obs = db.listObligations(cid); const tt = obs.find((o) => o.category === 'test_tag'); assert.strictEqual(sched.obligationState(tt).state, 'overdue'); ok('overdue test-and-tag flagged');
  assert.strictEqual(sched.customerSummary(db.getCustomer(cid)).overall, 'overdue'); ok('overall state includes calendar');
  r = await post(`/admin/obligations/${tt.id}/retire`, {}, true); assert.strictEqual(db.listObligations(cid).length, 1); ok('obligation retired');
  const M2 = require('../lib/metrics').compute(); assert(M2.withCalendar === 1 && M2.calendarTake > 0); ok('metrics: calendar take-rate');

  // ---- self-serve: quote, checkout, fulfil via webhook, welcome/onboarding, referral, partner signup
  const checkoutLib = require('../lib/checkout');
  let qq = checkoutLib.quote({ sites: '1', vehicles: '3', billing: 'annual', calendar: 'yes' });
  assert(qq.kits === 296 && qq.plan_pm === 33 + 14 && qq.plan_period === 47 * 12 && qq.today === 296 + 564); ok('quote: 1 site + 3 utes + calendar, annual');
  qq = checkoutLib.quote({ sites: '0', vehicles: '1', billing: 'monthly' });
  assert(qq.plan_pm === Math.round(15 * 1.15 * 100) / 100); ok('quote: minimum plan and monthly premium');
  r = await get('/buy?ref=' + partner.token); assert(r.status === 200 && r.text.includes('Build your kit plan') && r.text.includes(partner.token)); ok('buy page with partner ref');
  r = await post('/buy', { sites: '0', vehicles: '0', business: 'X' }); assert.strictEqual(r.status, 400); ok('buy rejects zero kits');
  r = await post('/buy', { sites: '1', vehicles: '2', billing: 'annual', calendar: 'yes', business: 'Online Sparky', contact_name: 'Sam', industry: 'Trades', ref: partner.token });
  assert(r.status === 303 && /stripe\.test\/pay\/cs_test_/.test(r.location)); ok('checkout session created and redirected');
  const sid = r.location.split('/').pop(); const sess = fakeSessions[sid];
  assert(sess.mode === 'subscription' && sess.metadata.business === 'Online Sparky' && sess.metadata.sites === '1' && sess.metadata.vehicles === '2' && sess.metadata.calendar === 'yes' && sess.metadata.ref === partner.token); ok('session carries the order as metadata');
  assert(/line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=11900/.test(sess.line_items_raw) && /recurring%5D%5Binterval%5D=year/.test(sess.line_items_raw)); ok('line items: kit at A$119 one-off, plan recurring yearly');
  // webhook arrives
  sp = signed({ type: 'checkout.session.completed', data: { object: sess } });
  r = await stripePost(sp.raw, sp.sig); assert(r.status === 200 && r.text.includes('fulfilled')); ok('webhook fulfils the session');
  const oc = db.getCustomerBySession(sid); assert(oc && oc.source === 'partner' && oc.partner_id === pid && oc.calendar === 1 && oc.stripe_customer_id === 'cus_' + sid); ok('account created from session: partner-attributed, calendar on');
  assert.strictEqual(db.listKits(oc.id).length, 3); ok('kits created from metadata');
  assert(db.listPartnerPayouts(pid).some((x) => x.customer_id === oc.id && x.amount === Math.round((144 + 2 * 84) * 0.15 * 100) / 100)); ok('partner payout recorded for online sale');
  r = await stripePost(sp.raw, sp.sig); assert(r.text.includes('already')); ok('webhook is idempotent');
  r = await get('/welcome?session_id=' + sid); assert(r.status === 200 && r.text.includes('Name your kits') && r.text.includes(oc.token)); ok('welcome page for a fulfilled session');
  // success page before the webhook: a second purchase, welcome first
  r = await post('/buy', { sites: '2', vehicles: '0', billing: 'monthly', business: 'Clinic Online', cref: c.token });
  const sid2 = r.location.split('/').pop();
  r = await get('/welcome?session_id=' + sid2); assert(r.status === 200); const oc2 = db.getCustomerBySession(sid2);
  assert(oc2 && oc2.source === 'referral' && oc2.referred_by === cid && oc2.plan_billing === 'monthly' && db.listKits(oc2.id).length === 2); ok('welcome page fulfils when the webhook is late; customer referral attributed');
  assert(db.listEvents(cid).some((e) => e.type === 'referral_reward_due')); ok('referrer reward logged');
  const k2 = db.listKits(oc2.id);
  r = await post(`/c/${oc2.token}/setup`, { ['loc_' + k2[0].id]: 'Reception', ['loc_' + k2[1].id]: 'Treatment room 2', contact_name: 'Dr Lee' });
  assert(r.status === 303 && r.location.endsWith('/certificate')); assert.strictEqual(db.getKit(k2[0].id).location, 'Reception'); assert(db.getCustomer(oc2.id).onboarded_at); ok('self-serve onboarding names kits and lands on the certificate');
  r = await get(`/c/${oc2.token}`); assert(r.text.includes('/buy?cref=' + oc2.token)); ok('record carries the customer referral link');
  r = await get('/partners'); assert(r.status === 200 && r.text.includes('Get paid to fix them')); ok('partner signup page');
  r = await post('/partners', { name: 'Self Serve Safety', type: 'trainer', email: 'p@example.com' }); assert(r.status === 200 && r.text.includes('/buy?ref=')); ok('partner self-signup creates links');
  assert.strictEqual(db.listPartners().length, 2);
  r = await get('/terms'); assert.strictEqual(r.status, 200); ok('terms page');

  // ---- autopilot: jobs, queue, shipments, stock, purchase orders, inbound email, billing link
  const ap = require('../lib/autopilot'); const fulfilLib = require('../lib/fulfil');
  const outboxKinds = () => db.listOutbox(500).map((m) => m.kind);
  // a 3PL that accepts orders and echoes an id
  const threePL = []; const fake3pl = http.createServer((rq, rs) => { let bd = ''; rq.on('data', (x) => bd += x); rq.on('end', () => { threePL.push(JSON.parse(bd)); rs.setHeader('Content-Type', 'application/json'); rs.end(JSON.stringify({ id: 'WH-' + threePL.length })); }); });
  await new Promise((r2) => fake3pl.listen(0, r2));
  process.env.FULFIL_WEBHOOK = `http://127.0.0.1:${fake3pl.address().port}/orders`;
  // make the first customer look 12 days old, with a renewal in 20 days and an open after-use request
  db.db.prepare("UPDATE customers SET created_at = ?, plan_renewal = ?, email = 'jo@example.com' WHERE id = ?").run(db.addDays(db.today(), -12) + 'T00:00:00.000Z', db.addDays(db.today(), 20), cid);
  fulfilLib.seedStock({ 'KIT-SITE': 10, 'KIT-VEH': 15, 'PACK-SITE': 20, 'PACK-VEH': 30, 'AED-PADS': 2, 'AED-BATT': 1 });
  const ck = db.listKits(cid)[0];
  db.recordUse(ck, [{ id: db.listItems(ck.id)[0].id, name: db.listItems(ck.id)[0].name, qty: 1 }], 'autopilot test', 'Jo');
  let run = await ap.runAll();
  assert(run.renewals.sent === 1 && outboxKinds().some((k) => k.startsWith('renewal_30:'))); ok('renewal notice 30 days out, once per cycle');
  run = await ap.runAll(); assert.strictEqual(run.renewals.sent, 0); ok('renewal notice is not repeated');
  assert(run.shipments.created === 0 && db.listShipments(null).some((x) => x.kind === 'after_use' && x.status === 'sent_to_3pl')); ok('after-use request became a shipment and went to the 3PL');
  const sh = db.listShipments(null).find((x) => x.kind === 'after_use');
  assert(threePL.length >= 1 && threePL.some((o) => o.order_ref === sh.id && o.lines[0].qty === 1)); ok('3PL received the order with the lines');
  // kit orders from checkout ship once, and cover every kit
  assert(db.listShipments(null).some((x) => x.kind === 'kits' && x.customer_id === oc.id && JSON.parse(x.lines).length === 3)); ok('checkout kits shipped as one order of three');
  r = await get('/webhooks/fulfilment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_ref: sh.id, tracking: 'AP123' }) }); assert.strictEqual(r.status, 401); ok('fulfilment callback needs the secret');
  r = await get('/webhooks/fulfilment?key=ful_test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_ref: sh.id, tracking: 'AP123', carrier: 'AusPost' }) }); assert.strictEqual(r.status, 200);
  assert(db.getShipment(sh.id).status === 'shipped' && db.listRequestsForKit(ck.id).every((q) => q.status !== 'open')); ok('3PL callback marks shipped and closes the refill request');
  const skuUsed = fulfilLib.itemSku(db.listItems(ck.id)[0].name); assert.strictEqual(db.getStock(skuUsed).on_hand, -1); ok('stock decremented per line');
  run = await ap.runAll(); assert(outboxKinds().some((k) => k === 'shipped:' + sh.id)); ok('customer told the refill shipped');
  // stock: reorder point -> purchase order; small one auto-sent, big one queued
  db.upsertStock({ sku: 'KIT-VEH', name: 'Vehicle kit', on_hand: 2, reorder_point: 8, reorder_qty: 30, unit_cost: 32 });
  run = await ap.runAll(); let pos = db.listPurchaseOrders(); assert(run.stock.raised === 1 && pos.some((po) => po.status === 'sent' && po.total === 30 * 32)); ok('purchase order under the cap sent to the supplier automatically');
  assert(outboxKinds().some((k) => k.startsWith('po:'))); ok('supplier emailed the purchase order');
  db.upsertStock({ sku: 'KIT-SITE', name: 'Site kit', on_hand: 0, reorder_point: 5, reorder_qty: 40, unit_cost: 58 });
  run = await ap.runAll(); assert(run.stock.queued && db.listActions('pending').some((a) => a.type === 'purchase_order')); ok('purchase order over the cap waits in the queue');
  const poAction = db.listActions('pending').find((a) => a.type === 'purchase_order');
  r = await post(`/admin/actions/${poAction.id}/approve`, {}, true); assert.strictEqual(r.status, 303);
  assert(db.getAction(poAction.id).status === 'done' && db.listPurchaseOrders().find((po) => po.action_id === poAction.id).status === 'sent'); ok('approving the queue item sends the purchase order');
  const bigPo = db.listPurchaseOrders().find((po) => po.action_id === poAction.id);
  r = await post(`/admin/purchase-orders/${bigPo.id}/received`, {}, true); assert.strictEqual(db.getStock('KIT-SITE').on_hand, 40); ok('receiving a purchase order tops up stock');
  // dunning: past due -> emails -> cancel at day 21
  const pdc = db.createCustomer({ name: 'Late Payer', email: 'late@example.com', plan_billing: 'monthly' });
  db.setBillingStatus(pdc.id, 'past_due'); db.logEvent(pdc.id, null, 'payment_failed', { attempt: 1 });
  db.db.prepare("UPDATE events SET created_at = ? WHERE customer_id = ? AND type = 'payment_failed'").run(db.addDays(db.today(), -8) + 'T00:00:00.000Z', pdc.id);
  run = await ap.runAll(); assert(outboxKinds().filter((k) => k.startsWith('dunning_') && db.listOutbox(500).find((m) => m.kind === k).customer_id === pdc.id).length === 2); ok('dunning emails at day 1 and 7');
  db.db.prepare("UPDATE events SET created_at = ? WHERE customer_id = ? AND type = 'payment_failed'").run(db.addDays(db.today(), -22) + 'T00:00:00.000Z', pdc.id);
  run = await ap.runAll(); assert(run.dunning.cancelled === 1 && db.getCustomer(pdc.id).status === 'cancelled'); ok('cancelled after 21 days past due');
  assert(outboxKinds().includes('exit_survey')); ok('exit survey sent on cancellation');
  // activation: no scan in 10 days -> nudge; onboarding reminder for unnamed kits
  assert(outboxKinds().includes('onboarding_reminder') || !db.listCustomersByStatus('active').some((x) => !x.onboarded_at && sched.daysBetween(x.created_at.slice(0, 10), db.today()) >= 2)); ok('onboarding reminder logic ran');
  const quiet = db.createCustomer({ name: 'Quiet Co', email: 'quiet@example.com' }); db.createKit({ customer_id: quiet.id, type: 'site', location: 'Office' });
  db.db.prepare('UPDATE customers SET created_at = ?, onboarded_at = ? WHERE id = ?').run(db.addDays(db.today(), -11) + 'T00:00:00.000Z', db.now(), quiet.id);
  run = await ap.runAll(); assert(db.listOutbox(500).some((m) => m.kind === 'activation_10' && m.customer_id === quiet.id)); ok('activation nudge at day 10 for a kit never scanned');
  // leads sequence
  assert(db.listOutbox(500).some((m) => m.kind === 'lead_0' && m.lead_id)); ok('self-check result email sent to the lead');
  assert(db.listLeads().every((l) => l.status !== 'new' || !l.email)); ok('lead moved to contacted');
  // partners: statement and payout in the queue
  assert(db.listOutbox(500).some((m) => m.kind.startsWith('statement:')) && db.listActions('pending').some((a) => a.type === 'partner_payout')); ok('partner statement sent, payout waits for a tap');
  const payAction = db.listActions('pending').find((a) => a.type === 'partner_payout');
  r = await post(`/admin/actions/${payAction.id}/approve`, {}, true); assert(db.listPartnerPayouts(pid).every((x) => x.status === 'paid')); ok('approving the payout marks it paid');
  // weekly review: digest to the founder, ads rule in the queue
  assert(db.listOutbox(500).some((m) => m.kind.startsWith('digest:') && m.to_email === 'founder@example.com' && m.text.includes('Waiting for your tap'))); ok('weekly digest emailed to the founder');
  assert(db.lastJobRuns(100).some((j) => j.job === 'review')); ok('weekly review recorded once');
  // inbound email: safe classes answered, the rest queued with a draft
  const inb = (from, subject, body) => get('/webhooks/inbox?key=inb_test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ FromFull: { Email: from }, Subject: subject, TextBody: body }) });
  r = await get('/webhooks/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); assert.strictEqual(r.status, 401); ok('inbound webhook needs the secret');
  r = await inb('jo@example.com', 'Certificate please', 'Can you send our compliance certificate for the insurer?'); let j = JSON.parse(r.text);
  assert(j.classification === 'certificate_request' && j.status === 'auto_replied'); ok('certificate request answered automatically');
  const lastMail = db.listOutbox(1)[0]; assert(lastMail.kind === 'inbox_reply' && lastMail.text.includes(`/c/${c.token}/certificate`)); ok('reply carries the customer\'s own certificate link');
  r = await inb('jo@example.com', 'We moved', 'Hi, new address: 44 Harbour Rd, Port Adelaide SA 5015. Thanks'); j = JSON.parse(r.text);
  assert(j.classification === 'address_change' && j.status === 'queued'); ok('address change below confidence threshold waits for a tap');
  r = await inb('jo@example.com', 'Kit', 'The scissors arrived damaged and the box was wrong, this is unacceptable'); j = JSON.parse(r.text);
  assert(j.classification === 'complaint' && j.status === 'queued' && db.listActions('pending').some((a) => a.type === 'send_email' && a.detail.includes('draft reply'))); ok('complaint queued with a drafted reply');
  const emailAction = db.listActions('pending').find((a) => a.type === 'send_email' && a.title.includes('complaint'));
  r = await post(`/admin/actions/${emailAction.id}/reject`, { why: 'call them instead' }, true); assert(db.getAction(emailAction.id).status === 'rejected'); ok('a queued reply can be rejected');
  r = await inb('seo@spam.example', 'Guest post', 'We offer backlink packages'); j = JSON.parse(r.text); assert(j.status === 'ignored'); ok('spam ignored');
  r = await inb('jo@example.com', 'Cancel', 'Please cancel our plan'); j = JSON.parse(r.text); assert(j.status === 'auto_replied' && db.listEvents(cid).some((e) => e.type === 'cancel_requested')); ok('cancel request answered with the self-service link and logged');
  // billing self-service link falls back to a page when Stripe has no portal
  r = await get(`/billing?c=${c.token}`); assert(r.status === 200 || r.status === 303); ok('billing link resolves');
  // admin page and manual run
  r = await admin('/admin/autopilot'); assert(r.status === 200 && r.text.includes('Waiting for your tap') && r.text.includes('KIT-SITE') && r.text.includes('certificate_request')); ok('autopilot admin page renders queue, stock, inbox');
  r = await post('/admin/autopilot/run', {}, true); assert.strictEqual(r.status, 303); ok('run now from admin');
  r = await post(`/admin/shipments/${db.listShipments('sent_to_3pl')[0].id}/shipped`, { tracking: 'HAND1' }, true); assert.strictEqual(r.status, 303); ok('manual shipped button');
  const runs = db.lastJobRuns(5); assert(runs[0].job === 'all' && JSON.parse(runs[0].summary).mail); ok('job runs recorded');
  fake3pl.close();

  console.log(`\n${n} checks passed`);
  fakeStripe.close();
  server.close();
  db.db.close();
  for (const f of [process.env.DB_PATH, process.env.DB_PATH + '-wal', process.env.DB_PATH + '-shm']) { try { fs.unlinkSync(f); } catch {} }
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
