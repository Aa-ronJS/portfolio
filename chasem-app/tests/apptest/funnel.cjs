// The ad a tradie came from rides from the landing page into the app and is handed to the server when he proves his
// code, so cost per activated tradie can be read by ad. The trade he picks and set-up done go up with sync.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '../../../chasem-landing/public');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const MOCK = () => {
  window.__calls = [];
  window.__qcRelayFetch = (u, o) => {
    const b = JSON.parse(o.body); window.__calls.push({ url: String(u), body: b });
    if (/\/signin$/.test(String(u))) {
      if (b.action === 'start') return Promise.resolve({ json: () => Promise.resolve({ ok: true, sent: true }) });
      return Promise.resolve({ json: () => Promise.resolve({ ok: true, token: 'qc1.eyJ2IjoxfQ.sig', cus: 'cus_live1',
        sending: { server: 'https://relay.example/api/msg', token: 'qc1.eyJ2IjoxfQ.sig', hosted: true, server_has_creds: true },
        setup: { v: 1, settings: { details: { email: 'dave@example.com' } }, jobs: [] } }) });
    }
    if (/\/sync$/.test(String(u))) return Promise.resolve({ json: () => Promise.resolve({ ok: true, now: new Date().toISOString(), changes: [], bookings: [], replies: [], payments: [], optouts: [] }) });
    return Promise.resolve({ json: () => Promise.resolve({ ok: true }) });
  };
};
const TAGS = 'utm_source=meta&utm_medium=paid&utm_campaign=first100&utm_content=followup-sparkies&fbclid=IwAR123';

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.addInitScript(MOCK);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());

  // ---- the landing page passes the ad's tags on
  await p.goto(base + '?' + TAGS, { waitUntil: 'load' }); await p.waitForTimeout(600);
  const hrefs = await p.$$eval('[data-app], [data-sub]', as => as.map(a => a.href));
  ok(hrefs.length > 0 && hrefs.every(h => /\/app\/\?/.test(h) && /utm_content=followup-sparkies/.test(h) && /fbclid=IwAR123/.test(h)), 'every way into the app carries the ad\'s tags (' + hrefs[0] + ')');
  await p.goto(base + '?gclid=zzz&other=1', { waitUntil: 'load' }); await p.waitForTimeout(400);
  ok((await p.$$eval('[data-app]', as => as.map(a => a.href))).every(h => !/\?/.test(h)), 'with no ad tags, the links are left exactly as they were');

  // ---- the app keeps them from the first open
  await p.goto(base + 'app/?' + TAGS, { waitUntil: 'load' }); await p.waitForTimeout(800);
  let S = await p.evaluate(() => JSON.parse(localStorage.getItem('qc-app-v1') || '{}'));
  ok(S.src && S.src.utm_content === 'followup-sparkies' && S.src.fbclid === 'IwAR123' && S.src.at, 'the app keeps the ad it was opened from');
  await p.goto(base + 'app/?utm_content=a-later-ad', { waitUntil: 'load' }); await p.waitForTimeout(500);
  S = await p.evaluate(() => JSON.parse(localStorage.getItem('qc-app-v1') || '{}'));
  ok(S.src.utm_content === 'followup-sparkies', 'the first ad wins over a later one');

  // ---- and hands them over with the code
  await p.fill('#a_email', 'dave@example.com'); await p.click('#a_codein'); await p.waitForSelector('#a_code');
  await p.fill('#a_code', '654321'); await p.waitForTimeout(1200);
  const check = (await p.evaluate(() => window.__calls)).find(c => /\/signin$/.test(c.url) && c.body.action === 'check');
  ok(check && check.body.src && check.body.src.utm_content === 'followup-sparkies' && check.body.src.fbclid === 'IwAR123', 'the code check carries where he came from');
  const start = (await p.evaluate(() => window.__calls)).find(c => /\/signin$/.test(c.url) && c.body.action === 'start');
  ok(start && !start.body.src, 'asking for a code sends nothing about him but the email');

  // ---- sync carries his trade and whether set-up is done
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.details.trade = 'electrician'; S.security.setup_done = true; window.__qcApp.store.save(); });
  await p.evaluate(() => window.__qcApp.sync()); await p.waitForTimeout(900);
  const sy = (await p.evaluate(() => window.__calls)).filter(c => /\/sync$/.test(c.url)).pop();
  ok(sy && sy.body.me && sy.body.me.trade === 'electrician' && sy.body.me.setup === true, 'sync says his trade and that set-up is done');

  await b.close(); srv.close();
  console.log(fails ? 'FAILURES: ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('CRASH', e); process.exit(1); });
