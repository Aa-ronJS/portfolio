// Can a painter who is not good with phones get through it? Nothing to tap smaller than a thumb, nothing to
// read smaller than 13px, no screen with nothing to do on it, and no vendor jargon anywhere he actually looks.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const joined = () => { try { const k = 'qc-app-v1', s = JSON.parse(localStorage.getItem(k) || '{}'); s.account = { email: 'd@e.com', joined: '2026-01-01' }; s.details = s.details || {}; if (!s.details.trading_name) s.details.trading_name = 'Test Painting Co'; if (!s.details.abn) s.details.abn = '12 345 678 901'; if (!s.details.state) s.details.state = 'SA'; s.security = Object.assign({}, s.security, { setup_done: true }); s.payment = s.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} };

// The advanced folds carry Stripe's and Twilio's own words, which cannot be renamed. Nothing a painter sees
// on his way through the job may use any of them.
const JARGON = ['API', 'token', 'webhook', 'relay', 'endpoint', 'JSON', 'payload', 'cache', 'localStorage',
  'restricted key', 'SID', 'OAuth', 'URL', 'CSV', 'PWA', 'service worker', 'ArUco', 'homography', 'base64', 'UTC', 'schema'];

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.addInitScript(joined);
  await p.addInitScript(() => { window.__qcRelayFetch = () => Promise.resolve({ json: () => Promise.resolve({ ok: true }) }); });
  p.on('dialog', d => d.accept());
  await p.goto(base + '#/test', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); S.details.phone = '0412 345 678'; S.details.email = 'd@e.com'; st.save(); });
  await p.click('#tdseed'); await p.waitForTimeout(1200);
  const S = await p.evaluate(() => window.__qcApp.store.load());
  const j = S.jobs.find(x => x.status === 'quoted'), inv = S.jobs.find(x => x.status === 'invoiced');

  const screens = [['home', '#/'], ['job', '#/job/' + j.id], ['room', '#/job/' + j.id + '/room/' + j.rooms[0].id],
    ['quote', '#/job/' + j.id + '/quote'], ['invoice', '#/job/' + inv.id + '/invoice'], ['chase', '#/chase'],
    ['enquiry', '#/enquiry'], ['settings', '#/settings'], ['help', '#/help'], ['test', '#/test']];

  const small = [], tiny = [], jargon = [], dead = [];
  for (const [name, h] of screens) {
    await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(100);
    await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const out = { small: [], tiny: [] };
      document.querySelectorAll('#app button, #app a.btn, #app a[href^="#/"], #app input[type=checkbox], #app select, nav a').forEach(el => {
        const b = el.getBoundingClientRect(); if (!b.width || !b.height) return;
        const label = (el.innerText || el.value || el.id || '').replace(/\s+/g, ' ').trim().slice(0, 28);
        const box = el.type === 'checkbox' && el.closest('label') ? el.closest('label').getBoundingClientRect() : b;
        if (Math.min(box.width, box.height) < 40) out.small.push(label + ' ' + Math.round(box.width) + 'x' + Math.round(box.height));
      });
      document.querySelectorAll('#app *').forEach(el => {
        if (!el.childNodes.length || el.children.length) return;
        const t = (el.textContent || '').trim(); if (t.length < 12) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 13) out.tiny.push(Math.round(fs * 10) / 10 + 'px "' + t.slice(0, 30) + '"');
      });
      out.actions = document.querySelectorAll('#app button, #app a.btn, #app input, #app select, #app textarea').length;
      out.text = document.querySelector('#app').innerText;
      return out;
    });
    if (r.small.length) small.push(name + ': ' + [...new Set(r.small)].join(' | '));
    if (r.tiny.length) tiny.push(name + ': ' + [...new Set(r.tiny)].join(' | '));
    if (!r.actions) dead.push(name);
    for (const w of JARGON) {
      const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (re.test(r.text)) jargon.push(name + ': ' + w);
    }
  }
  ok(!small.length, 'nothing to tap is under 40px' + (small.length ? ' — ' + small.join(' ;; ') : ''));
  ok(!tiny.length, 'nothing to read is under 13px' + (tiny.length ? ' — ' + tiny.join(' ;; ') : ''));
  ok(!dead.length, 'no screen leaves him with nothing to do' + (dead.length ? ' — ' + dead.join(', ') : ''));
  ok(!jargon.length, 'no vendor jargon on the screens he walks through' + (jargon.length ? ' — ' + jargon.join(', ') : ''));

  // every screen has a way back that is not the browser button
  for (const [name, h] of screens) {
    if (name === 'home') continue;
    await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(500);
    const out = await p.evaluate(() => !!document.querySelector('#app a[href="#/"], #app a[href^="#/job/"], nav a[data-nav="home"]'));
    ok(out, name + ': there is a way back without the browser button');
  }

  await b.close(); srv.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
