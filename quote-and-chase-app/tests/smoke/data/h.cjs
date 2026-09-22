const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
// Shared harness: static server for the app (+ pdf.js under /pdfjs/), chromium, iPhone 13 emulation, pass/fail tally.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../../..');
const SP = require('path').join(__dirname, '../..');
const OUT = SP + '/smoke/data';
const PDFJS = path.join(require.resolve('pdfjs-dist/package.json'), '..', 'build');
function serve() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]), f;
    if (p.startsWith('/pdfjs/')) f = path.join(PDFJS, p.slice(7)); else { if (p.endsWith('/')) p += 'index.html'; f = path.join(ROOT, p); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': /\.m?js$/.test(f) ? 'application/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'text/html' }); res.end(d); });
  });
}
// The app asks for an email before it shows anything. These tests are about pricing and PDFs, not joining, so
// an account goes on the phone before the app boots, the same shape the join screen writes with no relay.
const joinScript = () => {
  const ACC = { email: 'test@example.com', joined: '2026-01-01', offline: true };
  const seed = () => { try { const raw = localStorage.getItem('qc-app-v1'); const s = raw ? JSON.parse(raw) : {}; if (!s.account || !s.account.email) { s.account = ACC; localStorage.setItem('qc-app-v1', JSON.stringify(s)); } } catch (e) {} };
  seed();
  const realClear = localStorage.clear.bind(localStorage);
  localStorage.clear = function () { realClear(); seed(); };
};
async function boot(opts) {
  opts = opts || {};
  const srv = serve(); await new Promise(r => srv.listen(0, r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext(opts.desktop ? { viewport: { width: 900, height: 1300 }, acceptDownloads: true } : { ...devices['iPhone 13'], acceptDownloads: true });
  const p = await ctx.newPage(); await p.addInitScript(joinScript); await p.addInitScript(__OPEN_SEC);
  const errors = [];
  p.on('pageerror', e => { errors.push(e.message); console.log('  PAGE ERROR:', e.message.split('\n')[0]); });
  p.on('dialog', d => d.accept());
  const t = { srv, base, b, ctx, p, errors, fails: 0 };
  t.ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) t.fails++; return c; };
  t.note = m => console.log('NOTE ' + m);
  t.drainErrors = () => { const e = errors.splice(0); return e; };
  t.go = async (hash, waitMs) => { await p.evaluate(h => { location.hash = h; }, hash); await p.waitForTimeout(waitMs || 120); };
  t.toast = () => p.$eval('#toast', e => e.hidden ? '' : e.textContent);
  t.done = async () => { await b.close(); srv.close(); console.log(t.fails ? 'FAILURES ' + t.fails : 'ALL PASSED'); };
  await p.goto(base, { waitUntil: 'load' });
  return t;
}
async function loadPdfjs(p) {
  await p.addScriptTag({ type: 'module', content: `import * as pdfjs from '/pdfjs/pdf.mjs'; pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.mjs'; window.pdfjs = pdfjs;` });
  await p.waitForFunction(() => window.pdfjs);
}
module.exports = { boot, loadPdfjs, joinScript, OUT, SP, ROOT, fs };
