'use strict';
// End-to-end smoke test against a throwaway database. Boots the server on a
// random port, walks the sales flow (new account -> kits -> scan -> ship ->
// certificate), and asserts on what the pages and the engine say.
//   npm test
process.env.DB_PATH = require('path').join(require('os').tmpdir(), `kits-test-${process.pid}.db`);
process.env.ADMIN_PASSWORD = 'test-pass';
process.env.BRAND = 'TestBrand';
process.env.CONTACT_PHONE = '0400 000 000';

const assert = require('assert');
const fs = require('fs');
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

(async () => {
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

  console.log(`\n${n} checks passed`);
  server.close();
  db.db.close();
  for (const f of [process.env.DB_PATH, process.env.DB_PATH + '-wal', process.env.DB_PATH + '-shm']) { try { fs.unlinkSync(f); } catch {} }
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
