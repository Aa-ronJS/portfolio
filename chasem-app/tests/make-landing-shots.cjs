const { chromium, devices } = require('playwright-core'); const http = require('http'), fs = require('fs'), path = require('path');
// Renders the app screenshots the website uses (app-home.png, app-nudge.png) from a sample electrician's book.
// node tests/make-landing-shots.cjs [out-dir]   (default: chasem-landing/public)
const ROOT = path.join(__dirname, '..'), OUT = process.argv[2] || path.join(__dirname, '../../chasem-landing/public');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
const day = (n) => { const d = new Date(Date.now() - n * 86400000); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); };
(async () => { await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2, serviceWorkers: 'block', colorScheme: 'light' }); const p = await ctx.newPage();
  await p.addInitScript(() => { const k = 'qc-app-v1', S = JSON.parse(localStorage.getItem(k) || '{}'); if (S.account) return; S.account = { email: 'dave@steele.com.au', joined: '2026-01-01', verified: true };
    S.details = { trading_name: 'Steele Electrical', owner_name: 'Dave Steele', abn: '12 345 678 901', state: 'SA', bsb: '063-000', account_number: '12345678', phone: '0412 345 678', email: 'dave@steele.com.au', trade: 'electrician', gst: true }; S.security = { setup_done: true };
    localStorage.setItem(k, JSON.stringify(S)); window.__qcRelayFetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: true, providers: [] }) }); });
  await p.goto(base + '#/add/find', { waitUntil: 'load' }); await p.waitForTimeout(800);
  const csv = ['Number,Customer,Mobile,Email,Status,Date,Due,Total,Amount Due,Description',
    'Q-2041,Jane Mitchell,0412 111 222,,Sent,' + day(4) + ',,"$2,450.00",,Switchboard upgrade',
    'Q-2044,Tom Nguyen,0413 222 333,,Sent,' + day(9) + ',,$880.00,,Downlights and dimmers',
    'Q-2047,Kim Vo,,kim@example.com,Sent,' + day(2) + ',,"$1,150.00",,Outdoor power and lights',
    'Q-2039,Mia Chen,0415 444 555,,Accepted,' + day(12) + ',,"$6,400.00",,Rewire, 3-bed home',
    'INV-1006,Priya Shah,0419 888 999,,Awaiting payment,' + day(26) + ',' + day(12) + ',"$3,885.20","$3,885.20",Solar and battery install',
    'INV-1009,Ben Hart,0420 111 000,,Awaiting payment,' + day(5) + ',' + day(-2) + ',$640.00,$640.00,Hot water service'].join('\n');
  await p.setInputFiles('#sheetfile', { name: 'tradify.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) }); await p.waitForTimeout(700);
  await p.click('#sheetgo'); await p.waitForTimeout(1500);
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.ui = Object.assign({}, S.ui, { book_chase: 'hidden' }); st.save(); location.hash = '#/'; }); await p.waitForTimeout(300);
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const c = document.getElementById('setupcard'); if (c) c.remove(); }); await p.waitForTimeout(100);
  await p.screenshot({ path: OUT + '/app-home.png' });
  await p.evaluate(() => { location.hash = '#/chase'; }); await p.waitForTimeout(1200);
  const card = await p.evaluate(() => { const bub = document.querySelector('#app .card pre, #app .card .msg, #app .card blockquote') || null; const cards = Array.from(document.querySelectorAll('#app .card')).filter(c => /Priya/.test(c.innerText)); const c = cards[0]; const r = c.getBoundingClientRect(); const tiles = c.querySelector('.tiles, .row'); const cut = Array.from(c.querySelectorAll('*')).find(e => /^Text$/.test(e.innerText.trim()) && e.closest('button,a')); const bottom = cut ? cut.closest('button,a').getBoundingClientRect().top - 12 : r.bottom; return { x: r.left, y: r.top + scrollY, width: r.width, height: bottom - r.top }; });
  await p.screenshot({ path: OUT + '/app-nudge.png', clip: card, fullPage: true });
  console.log(await p.$eval('#app', e => e.innerText.slice(0, 600)));
  await b.close(); srv.close(); })();
