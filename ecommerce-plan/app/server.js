'use strict';
// Kit register, QR after-use refills, expiry engine, compliance certificate.
// Zero framework: node:http, node:sqlite, one dependency (qrcode) for labels.
//
//   ADMIN_PASSWORD=change-me node server.js
//
// Routes
//   GET  /                         landing page
//   GET  /k/:code                  scan page (public, unguessable code)
//   POST /k/:code/used             record used items -> refill request
//   POST /k/:code/ok               record "checked, all present"
//   POST /k/:code/problem          record a problem
//   GET  /c/:token                 customer compliance record (public by token)
//   GET  /c/:token/certificate     printable certificate
//   GET  /c/:token.json            machine-readable record
//   /admin/*                       HTTP Basic auth (ADMIN_USER / ADMIN_PASSWORD)

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL, URLSearchParams } = require('url');
const QRCode = require('qrcode');
const crypto = require('crypto');
const db = require('./lib/db');
const sched = require('./lib/schedule');
const V = require('./lib/views');
const metrics = require('./lib/metrics');
const check = require('./lib/check');
const checkout = require('./lib/checkout');
const autopilot = require('./lib/autopilot');
const fulfil = require('./lib/fulfil');
const inbox = require('./lib/inbox');

const cfg = {
  brand: process.env.BRAND || 'Kit Register',
  legalName: process.env.LEGAL_NAME || 'Aaron Steele',
  abn: process.env.ABN || 'pending',
  phone: process.env.CONTACT_PHONE || '0400 000 000',
  email: process.env.CONTACT_EMAIL || 'hello@example.com',
  baseUrl: (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, ''),
  checkoutUrl: process.env.CHECKOUT_URL || '',
  webhook: process.env.NOTIFY_WEBHOOK || '',
  adminUser: process.env.ADMIN_USER || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeApiBase: (process.env.STRIPE_API_BASE || 'https://api.stripe.com').replace(/\/$/, ''),
  inboundSecret: process.env.INBOUND_SECRET || '',
  billingPortalUrl: process.env.STRIPE_PORTAL_URL || '',
  refillWindow: sched.REFILL_WINDOW_DAYS,
  renewalWindow: sched.RENEWAL_WINDOW_DAYS,
  obligationWindow: sched.OBLIGATION_WINDOW_DAYS,
  obligationCategories: db.OBLIGATION_CATEGORIES,
};
if (!cfg.adminPassword) console.warn('WARNING: ADMIN_PASSWORD is not set. /admin is disabled until it is.');

// ---------------------------------------------------------------- helpers
const send = (res, status, body, type = 'text/html; charset=utf-8', headers = {}) => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', ...headers });
  res.end(body);
};
const redirect = (res, to) => { res.writeHead(303, { Location: to }); res.end(); };
const notFound = (res) => send(res, 404, V.layout({ title: 'Not found', cfg, nav: 'none', body: '<div class="narrow"><h1>Not found</h1><p>That link does not match a kit or a record. Check the code on the label or call ' + V.h(cfg.phone) + '.</p></div>' }));

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) { reject(new Error('body too large')); req.destroy(); } });
    req.on('end', () => {
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json')) { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } }
      else {
        const p = new URLSearchParams(data); const o = {};
        for (const [k, v] of p) { if (k in o) { o[k] = [].concat(o[k], v); } else o[k] = v; }
        resolve(o);
      }
    });
    req.on('error', reject);
  });
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 2e6) { reject(new Error('body too large')); req.destroy(); } });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Stripe signature: header "t=...,v1=..."; v1 = HMAC-SHA256(secret, `${t}.${rawBody}`)
function stripeSignatureValid(header, raw, secret, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - parseInt(parts.t, 10)) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex');
  const a = Buffer.from(expected); const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function authed(req, res) {
  if (!cfg.adminPassword) { send(res, 503, 'Admin disabled: set ADMIN_PASSWORD', 'text/plain'); return false; }
  const hdr = req.headers.authorization || '';
  if (hdr.startsWith('Basic ')) {
    const [u, p] = Buffer.from(hdr.slice(6), 'base64').toString().split(':');
    if (u === cfg.adminUser && p === cfg.adminPassword) return true;
  }
  res.writeHead(401, { 'WWW-Authenticate': `Basic realm="${cfg.brand} admin", charset="UTF-8"` });
  res.end('Sign in');
  return false;
}

function notify(type, payload) {
  if (!cfg.webhook) return;
  fetch(cfg.webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, at: db.now(), ...payload }) })
    .catch((e) => console.error('webhook failed', e.message));
}

const qrSvg = (url) => QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });

const MIME = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
function serveStatic(res, urlPath) {
  const file = path.join(__dirname, 'public', path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(path.join(__dirname, 'public'))) return notFound(res);
  fs.readFile(file, (err, data) => {
    if (err) return notFound(res);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600' });
    res.end(data);
  });
}

// ---------------------------------------------------------------- routes
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), handler });

route('GET', '/', (req, res) => send(res, 200, V.landing(cfg)));
route('GET', '/health', (req, res) => send(res, 200, 'ok', 'text/plain'));

// --- public: scan page
route('GET', '/k/:code', (req, res, p) => {
  const kit = db.getKitByCode(p.code.toUpperCase());
  if (!kit || kit.status !== 'active') return notFound(res);
  send(res, 200, V.scanPage(kit, db.getCustomer(kit.customer_id), db.listItems(kit.id), cfg));
});
route('POST', '/k/:code/used', async (req, res, p) => {
  const kit = db.getKitByCode(p.code.toUpperCase());
  if (!kit) return notFound(res);
  const body = await readBody(req);
  const items = db.listItems(kit.id);
  const ids = [].concat(body.used || []).map(String);
  const used = items.filter((it) => ids.includes(String(it.id))).map((it) => ({ id: it.id, name: it.name, qty: Math.max(1, parseInt(body['qty_' + it.id] || '1', 10)) }));
  if (!used.length) return redirect(res, `/k/${kit.code}`);
  const c = db.getCustomer(kit.customer_id);
  const reqRec = db.recordUse(kit, used, body.note, body.reporter);
  notify('after_use_reported', { customer: c.name, kit: kit.code, location: kit.location, items: used.map((u) => `${u.qty} × ${u.name}`), note: body.note, reporter: body.reporter, request_id: reqRec.id, admin_url: `${cfg.baseUrl}/admin` });
  send(res, 200, V.scanDone('used', kit, cfg, c.address || c.name));
});
route('POST', '/k/:code/ok', async (req, res, p) => {
  const kit = db.getKitByCode(p.code.toUpperCase());
  if (!kit) return notFound(res);
  const body = await readBody(req);
  db.recordCheckOk(kit, body.reporter);
  send(res, 200, V.scanDone('ok', kit, cfg));
});
route('POST', '/k/:code/problem', async (req, res, p) => {
  const kit = db.getKitByCode(p.code.toUpperCase());
  if (!kit) return notFound(res);
  const body = await readBody(req);
  const c = db.getCustomer(kit.customer_id);
  db.recordProblem(kit, body.note || 'Problem reported', body.reporter);
  notify('problem_reported', { customer: c.name, kit: kit.code, location: kit.location, note: body.note, admin_url: `${cfg.baseUrl}/admin` });
  send(res, 200, V.scanDone('problem', kit, cfg));
});

// --- public: compliance record (the .json route must come before the plain one)
route('GET', '/c/:token.json', (req, res, p) => {
  const c = db.getCustomerByToken(p.token);
  if (!c) return notFound(res);
  const s = sched.customerSummary(c);
  send(res, 200, JSON.stringify({ customer: { name: c.name, abn: c.abn, plan_billing: c.plan_billing, plan_renewal: c.plan_renewal }, overall: s.overall, kits: s.kits.map((k) => ({ code: k.code, type: k.type, location: k.location, state: k.state, reasons: k.reasons, last_check_at: k.last_check_at, next_refill_at: k.next_refill_at, items: k.items })), aeds: s.aeds, generated_at: db.now() }, null, 2), 'application/json');
});
route('GET', '/c/:token', (req, res, p) => {
  const c = db.getCustomerByToken(p.token);
  if (!c) return notFound(res);
  send(res, 200, V.record(c, sched.customerSummary(c), db.listEvents(c.id), cfg));
});
route('GET', '/c/:token/certificate', (req, res, p) => {
  const c = db.getCustomerByToken(p.token);
  if (!c) return notFound(res);
  send(res, 200, V.certificate(c, sched.customerSummary(c), cfg));
});

// --- admin
const admin = (method, pattern, handler) => route(method, pattern, (req, res, p, url) => { if (authed(req, res)) return handler(req, res, p, url); });

admin('GET', '/admin', (req, res) => send(res, 200, V.dashboard(sched.dueReport(), cfg)));
admin('GET', '/admin/customers', (req, res) => send(res, 200, V.customers(db.listCustomers(), cfg)));
admin('GET', '/admin/customers/new', (req, res) => send(res, 200, V.customerNew(cfg, '', db.listPartners(), db.listCustomers())));
admin('POST', '/admin/customers/new', async (req, res) => {
  const b = await readBody(req);
  if (!b.name || !b.name.trim()) return send(res, 400, V.customerNew(cfg, 'Business name is required.', db.listPartners(), db.listCustomers()));
  if (b.partner_id && !b.source) b.source = 'partner';
  if (b.referred_by && (!b.source || b.source === 'direct')) b.source = 'referral';
  const c = db.createCustomer(b);
  const nSite = Math.min(50, parseInt(b.site_kits || '0', 10) || 0);
  const nVeh = Math.min(50, parseInt(b.vehicle_kits || '0', 10) || 0);
  for (let i = 0; i < nSite; i++) db.createKit({ customer_id: c.id, type: 'site', location: nSite > 1 ? `Site kit ${i + 1}` : 'Main site' });
  for (let i = 0; i < nVeh; i++) db.createKit({ customer_id: c.id, type: 'vehicle', location: `Vehicle ${i + 1}` });
  db.recordPartnerPayout(c, nSite, nVeh);
  notify('customer_created', { customer: c.name, kits: nSite + nVeh, source: c.source, record_url: `${cfg.baseUrl}/c/${c.token}` });
  redirect(res, `/admin/customers/${c.id}`);
});
admin('POST', '/admin/customers/:id/cancel', async (req, res, p) => {
  const c = db.getCustomer(p.id);
  if (!c) return notFound(res);
  const b = await readBody(req);
  db.cancelCustomer(c.id, b.reason);
  notify('plan_cancelled', { customer: c.name, reason: b.reason });
  redirect(res, `/admin/customers/${c.id}`);
});

// --- self-serve checkout
route('GET', '/buy', (req, res, p, url) => {
  const params = Object.fromEntries(url.searchParams);
  const q = checkout.quote({ sites: params.sites || '1', vehicles: params.vehicles || '2', billing: params.billing, calendar: params.calendar });
  send(res, 200, V.buyPage(cfg, q, params));
});
route('POST', '/buy', async (req, res) => {
  const b = await readBody(req);
  const q = checkout.quote(b);
  const params = { ref: b.ref, cref: b.cref, business: b.business };
  if (q.sites + q.vehicles === 0) return send(res, 400, V.buyPage(cfg, q, params, 'Add at least one site or vehicle kit.'));
  if (!b.business || !b.business.trim()) return send(res, 400, V.buyPage(cfg, q, params, 'Business name is required.'));
  if (!cfg.stripeSecretKey) return send(res, 503, V.buyPage(cfg, q, params, 'Online payment is not switched on yet. Email ' + cfg.email + ' and we will set you up today.'));
  try {
    const session = await checkout.createSession(q, { sites: q.sites, vehicles: q.vehicles, billing: q.billing, calendar: q.calendar ? 'yes' : 'no',
      business: b.business.trim().slice(0, 120), contact_name: (b.contact_name || '').slice(0, 80), industry: (b.industry || '').slice(0, 80),
      ref: (b.ref || '').slice(0, 24), cref: (b.cref || '').slice(0, 24), source: 'site' }, cfg);
    redirect(res, session.url);
  } catch (e) {
    console.error('checkout', e.message);
    send(res, 502, V.buyPage(cfg, q, params, 'Payment could not be started. Try again in a minute or email ' + cfg.email + '.'));
  }
});
route('GET', '/welcome', async (req, res, p, url) => {
  const sid = url.searchParams.get('session_id');
  if (!sid) return notFound(res);
  let c = db.getCustomerBySession(sid);
  if (!c) {
    // the webhook may not have arrived yet: fetch the session and fulfil it here (idempotent)
    try {
      const session = await checkout.retrieveSession(sid, cfg);
      if (session.payment_status !== 'paid' && session.status !== 'complete') return send(res, 202, V.layout({ title: 'One moment', cfg, nav: 'none', extraHead: '<meta http-equiv="refresh" content="3">', body: '<div class="narrow"><h1>Confirming your payment</h1><p>This page refreshes itself. If it is still here after a minute, email ' + V.h(cfg.email) + ' with your receipt.</p></div>' }));
      const r = checkout.fulfil(session);
      c = r.customer;
      if (r.created) notify('customer_created', { customer: c.name, source: c.source, kits: db.listKits(c.id).length, record_url: `${cfg.baseUrl}/c/${c.token}`, email: c.email, phone: c.phone });
    } catch (e) { console.error('welcome', e.message); return notFound(res); }
  }
  send(res, 200, V.welcomePage(c, db.listKits(c.id), cfg, true));
});
route('GET', '/c/:token/welcome', (req, res, p) => {
  const c = db.getCustomerByToken(p.token);
  if (!c) return notFound(res);
  send(res, 200, V.welcomePage(c, db.listKits(c.id), cfg, false));
});
route('POST', '/c/:token/setup', async (req, res, p) => {
  const c = db.getCustomerByToken(p.token);
  if (!c) return notFound(res);
  const b = await readBody(req);
  for (const k of db.listKits(c.id)) if (('loc_' + k.id) in b && b['loc_' + k.id].trim()) db.updateKit(k.id, { location: b['loc_' + k.id].trim().slice(0, 80) });
  db.updateCustomer(c.id, { contact_name: b.contact_name || c.contact_name, address: b.address || c.address, onboarded_at: db.now() });
  db.logEvent(c.id, null, 'onboarded', {});
  redirect(res, `/c/${c.token}/certificate`);
});
route('GET', '/terms', (req, res) => send(res, 200, V.layout({ title: 'Plan terms', cfg, body: '<div class="narrow"><h1>Replenishment plan terms</h1><p>Kits are sold outright. The plan is a service per registered kit: scheduled refill packs twice a year, after-use refills reported through the kit\'s QR page (fair use four a year per kit), expiry tracking, a compliance record and an annual certificate. Annual plans are billed in advance and renew automatically with at least 30 days\' notice by email; monthly plans bill in advance each month. Cancel any time by email; annual plans refunded in full within 14 days of first purchase. The plan does not assess your first-aid needs or provide training; those duties remain with the person conducting the business or undertaking under the Work Health and Safety Act 2012 (SA) and Regulations. Nothing here excludes the Australian Consumer Law guarantees. Full terms: <a href="mailto:' + V.h(cfg.email) + '">' + V.h(cfg.email) + '</a>.</p></div>' })));

// --- self-serve partner signup
route('GET', '/partners', (req, res) => send(res, 200, V.partnerSignup(cfg)));
route('POST', '/partners', async (req, res) => {
  const b = await readBody(req);
  if (!b.name || !b.name.trim() || !b.email) return send(res, 400, V.partnerSignup(cfg, 'Name and email are required.'));
  const p = db.createPartner({ name: b.name, type: b.type, contact_name: b.contact_name, email: b.email, phone: b.phone, notes: b.notes, fee_share: '0.15' });
  notify('partner_signed_up', { partner: p.name, type: p.type, email: p.email, portal: `${cfg.baseUrl}/p/${p.token}` });
  send(res, 200, V.partnerSignup(cfg, '', p));
});

// --- compliance calendar
admin('POST', '/admin/customers/:id/obligations', async (req, res, p) => {
  const c = db.getCustomer(p.id);
  if (!c) return notFound(res);
  const b = await readBody(req);
  db.createObligation({ customer_id: c.id, ...b });
  redirect(res, `/admin/customers/${c.id}`);
});
admin('POST', '/admin/obligations/:id/done', async (req, res, p) => {
  const b = await readBody(req);
  const o = db.obligationDone(p.id, b.date || null);
  if (!o) return notFound(res);
  redirect(res, req.headers.referer && req.headers.referer.includes('/admin/customers/') ? `/admin/customers/${o.customer_id}` : '/admin');
});
admin('POST', '/admin/obligations/:id/retire', async (req, res, p) => {
  await readBody(req);
  const o = db.db.prepare('SELECT customer_id FROM obligations WHERE id = ?').get(p.id);
  if (!o) return notFound(res);
  db.retireObligation(p.id);
  redirect(res, `/admin/customers/${o.customer_id}`);
});

// --- partners
admin('GET', '/admin/partners', (req, res) => send(res, 200, V.partnersList(db.listPartners(), cfg)));
admin('POST', '/admin/partners', async (req, res) => {
  const b = await readBody(req);
  if (!b.name || !b.name.trim()) return redirect(res, '/admin/partners');
  const p = db.createPartner(b);
  redirect(res, `/admin/partners/${p.id}`);
});
admin('GET', '/admin/partners/:id', (req, res, p) => {
  const pt = db.getPartner(p.id);
  if (!pt) return notFound(res);
  send(res, 200, V.partnerDetail(pt, db.listPartnerCustomers(pt.id), db.listPartnerPayouts(pt.id), cfg));
});
admin('POST', '/admin/payouts/:id/paid', async (req, res, p) => {
  await readBody(req);
  const row = db.db.prepare('SELECT partner_id FROM partner_payouts WHERE id = ?').get(p.id);
  if (!row) return notFound(res);
  db.markPayoutPaid(p.id);
  redirect(res, `/admin/partners/${row.partner_id}`);
});
route('GET', '/p/:token', (req, res, p) => {
  const pt = db.getPartnerByToken(p.token);
  if (!pt || pt.status !== 'active') return notFound(res);
  const rows = db.listPartnerCustomers(pt.id).map((c) => { const s = sched.customerSummary(c); return { name: c.name, kits: s.kits.length, overall: s.overall, status: c.status, plan_renewal: c.plan_renewal }; });
  send(res, 200, V.partnerPortal(pt, rows, db.listPartnerPayouts(pt.id), cfg));
});

// --- self-check lead magnet
route('GET', '/check', (req, res, p, url) => send(res, 200, V.checkForm(check.QUESTIONS, cfg, url.searchParams.get('ref') || '')));
route('POST', '/check', async (req, res) => {
  const b = await readBody(req);
  const answers = {}; for (const q of check.QUESTIONS) answers[q.id] = b[q.id] || 'unsure';
  const result = check.score(answers);
  const partner = b.ref ? db.getPartnerByToken(b.ref) : null;
  const lead = db.createLead({ business: b.business, contact_name: b.contact_name, email: b.email, phone: b.phone, industry: b.industry,
    score: result.passed, answers, partner_id: partner ? partner.id : null, source: partner ? 'partner' : 'check' });
  notify('lead_created', { business: lead.business, contact: lead.contact_name, phone: lead.phone, email: lead.email, industry: lead.industry,
    score: `${result.passed}/${result.total}`, gaps: result.gaps.map((g) => g.id), partner: partner ? partner.name : null, admin_url: `${cfg.baseUrl}/admin/leads` });
  send(res, 200, V.checkResult(result, lead, cfg));
});
admin('GET', '/admin/leads', (req, res) => send(res, 200, V.leadsList(db.listLeads(), cfg)));
admin('POST', '/admin/leads/:id', async (req, res, p) => {
  const b = await readBody(req);
  if (['new', 'contacted', 'won', 'lost'].includes(b.status)) db.setLeadStatus(p.id, b.status);
  redirect(res, '/admin/leads');
});

// --- metrics
admin('GET', '/admin/metrics', (req, res) => send(res, 200, V.metrics(metrics.compute(), cfg)));

// --- Stripe webhook: billing status and dunning state
route('POST', '/webhooks/stripe', async (req, res) => {
  const raw = await readRaw(req);
  if (!stripeSignatureValid(req.headers['stripe-signature'], raw, cfg.stripeWebhookSecret)) return send(res, 400, 'bad signature', 'text/plain');
  let ev; try { ev = JSON.parse(raw); } catch { return send(res, 400, 'bad json', 'text/plain'); }
  const obj = (ev.data && ev.data.object) || {};
  const stripeCustomer = obj.customer || null;
  const email = obj.customer_email || (obj.customer_details && obj.customer_details.email) || null;
  if (ev.type === 'checkout.session.completed' && obj.id && (obj.payment_status === 'paid' || obj.status === 'complete')) {
    const r = checkout.fulfil(obj);
    if (r.created) notify('customer_created', { customer: r.customer.name, source: r.customer.source, kits: db.listKits(r.customer.id).length, record_url: `${cfg.baseUrl}/c/${r.customer.token}`, email: r.customer.email, phone: r.customer.phone });
    return send(res, 200, r.created ? 'ok (fulfilled)' : 'ok (already fulfilled)', 'text/plain');
  }
  const c = (stripeCustomer && db.getCustomerByStripe(stripeCustomer)) || db.getCustomerByEmail(email);
  if (!c) { db.logEvent('unmatched', null, 'stripe_event', { type: ev.type, stripe_customer: stripeCustomer, email }); return send(res, 200, 'ok (unmatched)', 'text/plain'); }
  if (stripeCustomer && !c.stripe_customer_id) db.updateCustomer(c.id, { stripe_customer_id: stripeCustomer });
  switch (ev.type) {
    case 'invoice.paid': {
      const line = obj.lines && obj.lines.data && obj.lines.data[0];
      const periodEnd = line && line.period && line.period.end ? new Date(line.period.end * 1000).toISOString().slice(0, 10) : null;
      db.setBillingStatus(c.id, 'active', { plan_renewal: periodEnd, stripe_subscription_id: obj.subscription || null });
      db.logEvent(c.id, null, c.status === 'past_due' ? 'payment_recovered' : 'plan_renewed', { until: periodEnd, amount: obj.amount_paid });
      break;
    }
    case 'invoice.payment_failed':
      db.setBillingStatus(c.id, 'past_due');
      db.logEvent(c.id, null, 'payment_failed', { attempt: obj.attempt_count, next: obj.next_payment_attempt });
      notify('payment_failed', { customer: c.name, phone: c.phone, attempt: obj.attempt_count, admin_url: `${cfg.baseUrl}/admin/customers/${c.id}` });
      break;
    case 'customer.subscription.deleted':
      db.cancelCustomer(c.id, 'subscription ended in Stripe');
      notify('plan_cancelled', { customer: c.name, reason: 'stripe subscription deleted' });
      break;
    default:
      db.logEvent(c.id, null, 'stripe_event', { type: ev.type });
  }
  send(res, 200, 'ok', 'text/plain');
});
admin('GET', '/admin/customers/:id', (req, res, p) => {
  const c = db.getCustomer(p.id);
  if (!c) return notFound(res);
  send(res, 200, V.customerDetail(c, sched.customerSummary(c), db.listEvents(c.id), cfg));
});
admin('POST', '/admin/customers/:id', async (req, res, p) => {
  const c = db.getCustomer(p.id);
  if (!c) return notFound(res);
  db.updateCustomer(c.id, await readBody(req));
  redirect(res, `/admin/customers/${c.id}`);
});
admin('POST', '/admin/customers/:id/renew', async (req, res, p) => {
  const c = db.getCustomer(p.id);
  if (!c) return notFound(res);
  await readBody(req);
  const base = c.plan_renewal && c.plan_renewal >= db.today() ? c.plan_renewal : db.today();
  const next = db.addMonths(base, c.plan_billing === 'monthly' ? 1 : 12);
  db.updateCustomer(c.id, { plan_renewal: next });
  db.logEvent(c.id, null, 'plan_renewed', { until: next });
  redirect(res, `/admin/customers/${c.id}`);
});
admin('POST', '/admin/customers/:id/kits', async (req, res, p) => {
  const c = db.getCustomer(p.id);
  if (!c) return notFound(res);
  const b = await readBody(req);
  const kit = db.createKit({ customer_id: c.id, type: b.type, location: b.location, modules: [].concat(b.modules || []) });
  redirect(res, `/admin/kits/${kit.id}`);
});
admin('POST', '/admin/customers/:id/aeds', async (req, res, p) => {
  const c = db.getCustomer(p.id);
  if (!c) return notFound(res);
  const b = await readBody(req);
  db.createAed({ customer_id: c.id, ...b });
  redirect(res, `/admin/customers/${c.id}`);
});
admin('POST', '/admin/aeds/:id', async (req, res, p) => {
  const b = await readBody(req);
  db.updateAed(p.id, b);
  const a = db.db.prepare('SELECT customer_id FROM aeds WHERE id = ?').get(p.id);
  redirect(res, a ? `/admin/customers/${a.customer_id}` : '/admin');
});
admin('GET', '/admin/kits/:id', (req, res, p) => {
  const k = db.getKit(p.id);
  if (!k) return notFound(res);
  const items = db.listItems(k.id);
  const open = db.listOpenRequests();
  send(res, 200, V.kitDetail(k, db.getCustomer(k.customer_id), items, db.listRequestsForKit(k.id), db.listKitEvents(k.id), sched.kitState(k, items, open), cfg));
});
admin('POST', '/admin/kits/:id', async (req, res, p) => {
  const k = db.getKit(p.id);
  if (!k) return notFound(res);
  db.updateKit(k.id, await readBody(req));
  redirect(res, `/admin/kits/${k.id}`);
});
admin('POST', '/admin/kits/:id/items', async (req, res, p) => {
  const k = db.getKit(p.id);
  if (!k) return notFound(res);
  const b = await readBody(req);
  for (const it of db.listItems(k.id)) {
    if (('qty_' + it.id) in b) db.setItem(it.id, Math.max(0, parseInt(b['qty_' + it.id] || '0', 10) || 0), b['exp_' + it.id] || null);
  }
  db.logEvent(k.customer_id, k.id, 'item_adjusted', {});
  redirect(res, `/admin/kits/${k.id}`);
});
admin('POST', '/admin/kits/:id/refill', async (req, res, p) => {
  const k = db.getKit(p.id);
  if (!k) return notFound(res);
  const b = await readBody(req);
  db.scheduledRefillShipped(k, b.tracking);
  redirect(res, req.headers.referer && req.headers.referer.includes('/admin/kits/') ? `/admin/kits/${k.id}` : '/admin');
});
admin('POST', '/admin/refills/:id/ship', async (req, res, p) => {
  const b = await readBody(req);
  const r = db.shipRequest(p.id, b.tracking);
  if (!r) return notFound(res);
  redirect(res, req.headers.referer && req.headers.referer.includes('/admin/kits/') ? `/admin/kits/${r.kit_id}` : '/admin');
});
admin('GET', '/admin/kits/:id/label', async (req, res, p) => {
  const k = db.getKit(p.id);
  if (!k) return notFound(res);
  const c = db.getCustomer(k.customer_id);
  send(res, 200, V.labels([{ ...k, customer_name: c.name, svg: await qrSvg(`${cfg.baseUrl}/k/${k.code}`) }], cfg));
});
admin('GET', '/admin/labels', async (req, res, p, url) => {
  const cid = url.searchParams.get('customer');
  let kits = db.listAllKits();
  if (cid) kits = kits.filter((k) => k.customer_id === cid);
  const withSvg = [];
  for (const k of kits) withSvg.push({ ...k, svg: await qrSvg(`${cfg.baseUrl}/k/${k.code}`) });
  send(res, 200, V.labels(withSvg, cfg));
});
admin('GET', '/admin/export.csv', (req, res) => {
  const rows = [['customer', 'abn', 'contact', 'phone', 'email', 'industry', 'plan_billing', 'plan_renewal', 'kit_code', 'kit_type', 'location', 'installed', 'last_check', 'next_refill', 'state']];
  const open = db.listOpenRequests();
  for (const k of db.listAllKits()) {
    const c = db.getCustomer(k.customer_id);
    const s = sched.kitState(k, db.listItems(k.id), open);
    rows.push([c.name, c.abn, c.contact_name, c.phone, c.email, c.industry, c.plan_billing, c.plan_renewal, k.code, k.type, k.location, k.installed_at, k.last_check_at, k.next_refill_at, s.state]);
  }
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  send(res, 200, csv, 'text/csv; charset=utf-8', { 'Content-Disposition': `attachment; filename="kits-${db.today()}.csv"` });
});

// --- autopilot: the queue, shipments, stock, inbound mail
admin('GET', '/admin/autopilot', (req, res) => {
  fulfil.seedStock();
  const d = { on: db.today(), pending: db.listActions('pending'), shipments: db.listShipments(null, 60), stock: db.listStock(), purchaseOrders: db.listPurchaseOrders(20),
    inbox: db.listInbox(40), outbox: db.listOutbox(40), lastRun: db.lastJobRuns(50).find((j) => j.job === 'all') || null,
    conf: { mail: !!process.env.MAIL_API_URL, inbound: !!cfg.inboundSecret, fulfil: !!process.env.FULFIL_WEBHOOK, stripe: !!(cfg.stripeSecretKey && cfg.stripeWebhookSecret), claude: !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN), supplier: !!process.env.SUPPLIER_EMAIL } };
  send(res, 200, V.autopilotPage(d, cfg));
});
admin('POST', '/admin/autopilot/run', async (req, res) => { await readBody(req); await autopilot.runAll(); redirect(res, '/admin/autopilot'); });
admin('POST', '/admin/actions/:id/approve', async (req, res, p) => { await readBody(req); if (await autopilot.approve(p.id) === null) return notFound(res); redirect(res, '/admin/autopilot'); });
admin('POST', '/admin/actions/:id/reject', async (req, res, p) => { const b = await readBody(req); if (autopilot.reject(p.id, b.why) === null) return notFound(res); redirect(res, '/admin/autopilot'); });
admin('POST', '/admin/shipments/:id/shipped', async (req, res, p) => { const b = await readBody(req); if (!fulfil.markShipped(p.id, { tracking: b.tracking })) return notFound(res); redirect(res, '/admin/autopilot'); });
admin('POST', '/admin/stock', async (req, res) => { const b = await readBody(req); const s = db.getStock(b.sku); if (s) db.upsertStock({ ...s, on_hand: parseInt(b.on_hand || '0', 10) || 0 }); redirect(res, '/admin/autopilot'); });
admin('POST', '/admin/purchase-orders/:id/received', async (req, res, p) => { await readBody(req); if (!db.getPurchaseOrder(p.id)) return notFound(res); db.setPurchaseOrderStatus(p.id, 'received'); redirect(res, '/admin/autopilot'); });

// the 3PL calls back when it ships (or you POST it from a shipping label tool)
route('POST', '/webhooks/fulfilment', async (req, res, p, url) => {
  const secret = process.env.FULFIL_WEBHOOK_SECRET || '';
  const given = req.headers['x-fulfil-secret'] || url.searchParams.get('key') || '';
  if (!secret || given !== secret) return send(res, 401, 'bad secret', 'text/plain');
  const b = await readBody(req);
  const s = (b.order_ref && db.getShipment(b.order_ref)) || (b.external_id && db.getShipmentByExternal(b.external_id)) || (b.id && db.getShipmentByExternal(b.id));
  if (!s) return send(res, 404, 'unknown shipment', 'text/plain');
  if (b.status && b.status !== 'shipped') return send(res, 200, 'noted', 'text/plain');
  fulfil.markShipped(s.id, { tracking: b.tracking || b.tracking_number || null, carrier: b.carrier || null });
  send(res, 200, 'ok', 'text/plain');
});
// the email provider posts inbound mail here
route('POST', '/webhooks/inbox', async (req, res, p, url) => {
  const given = req.headers['x-inbound-secret'] || url.searchParams.get('key') || '';
  if (!cfg.inboundSecret || given !== cfg.inboundSecret) return send(res, 401, 'bad secret', 'text/plain');
  const b = await readBody(req);
  const m = inbox.fromProvider(b);
  if (!m.from_email) return send(res, 400, 'no sender', 'text/plain');
  const row = await inbox.handle(m);
  send(res, 200, JSON.stringify({ id: row.id, classification: row.classification, status: row.status }), 'application/json');
});
// billing self-service: Stripe's customer portal (update card, invoices, cancel) via a per-customer link
route('GET', '/billing', async (req, res, p, url) => {
  const c = db.getCustomerByToken(url.searchParams.get('c') || '');
  if (!c) return notFound(res);
  if (cfg.stripeSecretKey && c.stripe_customer_id) {
    try {
      const body = new URLSearchParams({ customer: c.stripe_customer_id, return_url: `${cfg.baseUrl}/c/${c.token}` });
      const r = await fetch(`${cfg.stripeApiBase}/v1/billing_portal/sessions`, { method: 'POST', headers: { Authorization: `Bearer ${cfg.stripeSecretKey}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      const j = await r.json();
      if (r.ok && j.url) return redirect(res, j.url);
    } catch (e) { console.error('billing portal', e.message); }
  }
  if (cfg.billingPortalUrl) return redirect(res, cfg.billingPortalUrl);
  send(res, 200, V.layout({ title: 'Billing', cfg, nav: 'none', body: `<div class="narrow"><h1>Billing</h1><p>Update your card, download invoices or cancel by emailing <a href="mailto:${V.h(cfg.email)}">${V.h(cfg.email)}</a> from the address on the account. Changes are made the same business day.</p><p><a class="btn secondary" href="/c/${V.h(c.token)}">Back to your record</a></p></div>` }));
});

// ---------------------------------------------------------------- server
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, cfg.baseUrl);
    const p = url.pathname;
    if (req.method === 'GET' && (p === '/style.css' || p.startsWith('/public/') || /\.(png|svg|ico|txt)$/.test(p))) return serveStatic(res, p.replace(/^\/public/, ''));
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = p.match(r.re);
      if (m) return await r.handler(req, res, m.groups || {}, url);
    }
    notFound(res);
  } catch (e) {
    console.error(e);
    send(res, 500, V.layout({ title: 'Error', cfg, nav: 'none', body: '<div class="narrow"><h1>Something went wrong</h1><p>The error has been logged. Try again, or call ' + V.h(cfg.phone) + '.</p></div>' }));
  }
});

if (require.main === module) {
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen(port, () => console.log(`${cfg.brand} listening on ${cfg.baseUrl} (port ${port}); admin at /admin`));
}
module.exports = { server, cfg };
