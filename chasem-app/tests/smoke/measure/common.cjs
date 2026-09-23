const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const SP = require('path').join(__dirname, '../..');
const ROOT = require('path').join(__dirname, '../../..'), M = SP + '/mtest', SM = SP + '/smoke/measure';
function serve() {
  const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = p.startsWith('/m/') ? path.join(M, p.slice(3)) : p.startsWith('/s/') ? path.join(SM, p.slice(3)) : path.join(ROOT, p);
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'application/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.html') ? 'text/html' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream' }); res.end(d); }); });
  return new Promise(r => srv.listen(0, () => r({ srv, base: 'http://127.0.0.1:' + srv.address().port + '/' })));
}
// The app asks for an email before it shows anything. These tests are about measuring, not joining, so an
// account goes on the phone before the app boots, the same shape the join screen writes with no relay.
const joinScript = () => {
  const ACC = { email: 'test@example.com', joined: '2026-01-01', offline: true };
  const seed = () => { try { const raw = localStorage.getItem('qc-app-v1'); const s = raw ? JSON.parse(raw) : {}; if (!s.account || !s.account.email) { s.account = ACC; s.details = s.details || {}; if (!s.details.trading_name) s.details.trading_name = 'Test Painting Co'; if (!s.details.abn) s.details.abn = '12 345 678 901'; if (!s.details.state) s.details.state = 'SA'; s.security = Object.assign({}, s.security, { setup_done: true }); s.payment = s.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' };  localStorage.setItem('qc-app-v1', JSON.stringify(s)); } } catch (e) {} };
  seed();
  const realClear = localStorage.clear.bind(localStorage);
  localStorage.clear = function () { realClear(); seed(); };
};
async function launch(opts) {
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox', '--enable-precise-memory-info'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], ...(opts || {}) }); await ctx.addInitScript(joinScript); return { b, ctx };
}
function checker() { let fails = 0; const log = []; const ok = (c, m) => { const line = (c ? 'PASS ' : 'FAIL ') + m; console.log(line); log.push(line); if (!c) fails++; }; return { ok, fails: () => fails, log }; }
// Create a job, add an interior room, switch to measure mode. Returns job id / room id.
async function newMeasureRoom(p, base) {
  await p.goto(base, { waitUntil: 'load' }); await p.click('#newjob'); await p.waitForTimeout(900); await p.click('[data-add="interior"]'); await p.waitForSelector('[data-bind="L"]');
  await p.click('[data-method="measured"]'); await p.waitForSelector('[data-part="photo"]');
  const h = await p.evaluate(() => location.hash); const m = h.match(/job\/([^/]+)\/room\/([^/]+)/); return { job: m[1], room: m[2] };
}
async function status(p) { return p.$eval('[data-part="status"]', e => e.textContent); }
async function loadPhoto(p, file, part) { await p.setInputFiles('[data-part="' + (part || 'photolib') + '"]', file); }
// wait until the auto flow reaches a decision: page edit, "No A4 page", or a read failure. Returns {kind, ms}
async function waitDecision(p, timeout) {
  const t0 = Date.now();
  try {
    await p.waitForFunction(() => { const q = window.__qcMeasure; const st = document.querySelector('[data-part="status"]').textContent; return (q && q.state.edit && q.state.edit.kind === 'page') || /No A4 page|Could not read|Photo too small/.test(st); }, null, { timeout: timeout || 20000 });
  } catch (e) { return { kind: 'timeout', ms: Date.now() - t0, status: await status(p) }; }
  const st = await status(p); return { kind: /Could not read|Photo too small/.test(st) ? 'unreadable' : /No A4 page/.test(st) ? 'nopage' : 'page', ms: Date.now() - t0, status: st };
}
module.exports = { joinScript, serve, launch, checker, newMeasureRoom, status, loadPhoto, waitDecision, SP, ROOT, M, SM, fs, path };
