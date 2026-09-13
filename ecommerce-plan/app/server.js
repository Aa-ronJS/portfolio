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
const db = require('./lib/db');
const sched = require('./lib/schedule');
const V = require('./lib/views');

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
  refillWindow: sched.REFILL_WINDOW_DAYS,
  renewalWindow: sched.RENEWAL_WINDOW_DAYS,
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
admin('GET', '/admin/customers/new', (req, res) => send(res, 200, V.customerNew(cfg)));
admin('POST', '/admin/customers/new', async (req, res) => {
  const b = await readBody(req);
  if (!b.name || !b.name.trim()) return send(res, 400, V.customerNew(cfg, 'Business name is required.'));
  const c = db.createCustomer(b);
  const nSite = Math.min(50, parseInt(b.site_kits || '0', 10) || 0);
  const nVeh = Math.min(50, parseInt(b.vehicle_kits || '0', 10) || 0);
  for (let i = 0; i < nSite; i++) db.createKit({ customer_id: c.id, type: 'site', location: nSite > 1 ? `Site kit ${i + 1}` : 'Main site' });
  for (let i = 0; i < nVeh; i++) db.createKit({ customer_id: c.id, type: 'vehicle', location: `Vehicle ${i + 1}` });
  notify('customer_created', { customer: c.name, kits: nSite + nVeh, record_url: `${cfg.baseUrl}/c/${c.token}` });
  redirect(res, `/admin/customers/${c.id}`);
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
