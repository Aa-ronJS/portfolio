const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../../..');
const SP = require('path').join(__dirname, '../..') + '/smoke/shell';
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.txt': 'text/plain' };
function serve(root) {
  const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('nf'); } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(d); }); });
  return new Promise(r => srv.listen(0, () => r({ srv, base: 'http://127.0.0.1:' + srv.address().port + '/' })));
}
let fails = 0; const findings = [];
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) { fails++; findings.push(m); } };
async function launch() { return chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] }); }
function wire(p, log) { p.on('pageerror', e => log.push({ type: 'pageerror', text: e.message, url: p.url() })); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log.push({ type: m.type(), text: m.text(), url: p.url() }); }); p.on('dialog', d => d.accept()); }
const overflowJs = () => { let m = 0, who = ''; document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.height && r.right > m) { m = r.right; who = e.tagName + '.' + e.className + (e.id ? '#' + e.id : ''); } }); return { maxRight: Math.round(m), who, sw: document.documentElement.scrollWidth, iw: innerWidth, ok: m <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1 }; };
// seeds one job per status; returns ids
const seedJs = () => {
  const st = window.__qcApp.store, S = st.load(), today = st.today(), P = window.__qcApp.pricing;
  Object.assign(S.details, { trading_name: 'Test Painting Co', owner_name: 'Sam Tester', abn: '12 345 678 901', phone: '0400 000 000', email: 'sam@example.com', account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678', postcode: '5000' });
  function room() { const r = st.newRoom('interior'); r.name = 'Lounge'; r.L = 5; r.W = 4; r.doors = 1; r.windows = 2; return r; }
  function mk(name, status) { const j = st.newJob(); j.client = { name, phone: '0411 222 333', email: name.split(' ')[0].toLowerCase() + '@example.com', address: '12 Wattle St Adelaide 5000' }; j.summary = 'Repaint lounge for ' + name; j.status = status; j.rooms.push(room()); return j; }
  function freeze(j, daysAgo) { const pr = P.priceJob(j, S); j.quote = { date: st.addDays(today, -daysAgo), lines: pr.lines, subtotal: pr.subtotal, gst: pr.gst, total: pr.total, deposit: pr.deposit, assumptions: pr.assumptions, measured_rooms: 0, total_rooms: 1 }; j.sent_date = j.quote.date; return pr; }
  function inv(j, kind, no, dateAgo, dueAgo, paid, extra) { const t = kind === 'deposit' ? Math.round(j.quote.total * 0.2) : j.quote.total; const sub = Math.round(t / 1.1); return Object.assign({ kind, no, date: st.addDays(today, -dateAgo), due: st.addDays(today, -dueAgo), paid_date: paid ? st.addDays(today, -dueAgo + 1) : '', lines: [{ desc: kind + ' for ' + j.quote_no, amount: sub }], subtotal: sub, gst: t - sub, total: t, kind_line: kind }, extra || {}); }
  const e = mk('Enquiry Person', 'enquiry'); e.rooms = []; e.picks = [{ type: 'lounge', size: 'M', n: 1 }, { type: 'bedroom', size: 'S', n: 2 }]; e.ballpark = { low: 1200, high: 1700, mid: 1450 }; e.visit = { date: st.addDays(today, 2), start_min: 9 * 60, minutes: 30, why: 'first free slot', detour: 0, gcal: 'https://calendar.google.com/calendar/render?action=TEMPLATE' };
  const d = mk('Draft Person', 'draft');
  const q = mk('Quoted Person', 'quoted'); freeze(q, 10);
  const a = mk('Accepted Person', 'accepted'); freeze(a, 5); a.booking = { start: st.addDays(today, 3), days: 2, end: st.addDays(today, 5), end_inclusive: st.addDays(today, 4), hour: 7, gcal: 'https://calendar.google.com/calendar/render?action=TEMPLATE' };
  const i = mk('Invoiced Person', 'invoiced'); freeze(i, 40); i.invoices = [inv(i, 'deposit', 'INV-2001', 30, 30, true), inv(i, 'final', 'INV-2002', 20, 12, false, { pay_url: 'https://buy.stripe.com/test_abc123', pay_link_id: 'plink_test', follow_ups: [{ id: 'SM1', channel: 'sms', day: st.addDays(today, -11), to: '0411 222 333', what: 'INV-2002+1', sent: true }, { id: 'SM2', channel: 'sms', day: st.addDays(today, -5), to: '0411 222 333', what: 'INV-2002+7' }, { id: 'SM3', channel: 'sms', day: st.addDays(today, 9), to: '0411 222 333', what: 'INV-2002+21' }] })];
  const p = mk('Paid Person', 'paid'); freeze(p, 50); p.invoices = [inv(p, 'full', 'INV-2003', 40, 33, true, { paid_by: 'card' })];
  const dc = mk('Declined Person', 'declined'); freeze(dc, 20);
  const nr = mk('Noroom Person', 'draft'); nr.rooms = []; nr.client.name = 'Noroom Person';
  S.account = { email: 'sam@example.com', joined: today, offline: true }; S.setup_done = true;
  S.next_invoice = 2004; st.save();
  return { enquiry: e.id, draft: d.id, quoted: q.id, accepted: a.id, invoiced: i.id, paid: p.id, declined: dc.id, noroom: nr.id, room: d.rooms[0].id };
};
// The app asks for an email before it shows anything. Tests that are not about joining put an account on the
// phone before the app boots, the same shape the join screen writes when there is no relay.
const ACCOUNT = { email: 'test@example.com', joined: '2026-01-01', offline: true };
const joinScript = () => {
  const ACC = { email: 'test@example.com', joined: '2026-01-01', offline: true };
  const seed = () => { try { const raw = localStorage.getItem('qc-app-v1'); const s = raw ? JSON.parse(raw) : {}; if (!s.account || !s.account.email) { s.account = ACC; localStorage.setItem('qc-app-v1', JSON.stringify(s)); } } catch (e) {} };
  seed();
  // localStorage.clear() in a test wipes the account too, so put it straight back
  const realClear = localStorage.clear.bind(localStorage);
  localStorage.clear = function () { realClear(); seed(); };
};
module.exports = { chromium, devices, fs, path, ROOT, SP, serve, ok, launch, wire, overflowJs, seedJs, joinScript, ACCOUNT, findings, get fails() { return fails; } };
