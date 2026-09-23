// The wall: a new account does five things before it can do anything, one question at a time.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
// signed in, and nothing else: exactly what a new account looks like
const SIGNED = () => { try { const k = 'qc-app-v1', s = JSON.parse(localStorage.getItem(k) || '{}');
  s.account = { email: 'new@example.com', joined: '2026-01-01', verified: true };
  s.sending = { server: 'https://relay.example/api/msg', token: 'qc1.x.y', hosted: true, server_has_creds: true };
  localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} };

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' }); const p = await ctx.newPage();
  await p.addInitScript(SIGNED);
  await p.addInitScript(() => { window.__qcRelayFetch = (u) => Promise.resolve({ json: () => Promise.resolve(/connect/.test(String(u)) ? { ok: true, off: true } : { ok: true }) }); });
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; }); p.on('dialog', d => d.accept());
  const text = () => p.$eval('#app', e => e.innerText);

  await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(700);
  let t = await text();
  ok(/1 of 5/.test(t) && /Your business name/.test(t), 'a new account lands on one question, not the jobs list');
  ok(!/New job|Quick quote/.test(t), 'and nothing else is on the screen');
  ok(await p.$eval('header.top nav', e => e.hidden), 'the tabs are not offered while he is walled');

  // no way round it
  for (const h of ['#/', '#/chase', '#/settings', '#/job/anything', '#/test']) {
    await p.evaluate(x => { location.hash = x; }, h); await p.waitForTimeout(350);
    ok(/of 5/.test(await text()), 'typing ' + h + ' still lands on set-up');
  }
  await p.evaluate(() => { location.hash = '#/help'; }); await p.waitForTimeout(350);
  ok(/How it works/.test(await text()), 'help still opens, so he is never stuck with nowhere to go');

  // one question at a time, and each is checked
  await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(350);
  await p.click('#w_next'); await p.waitForTimeout(250);
  ok(/Type your business name/.test(await text()), 'an empty answer is refused rather than skipped');
  await p.fill('#w_in', "Dave's Painting"); await p.click('#w_next');
  await p.waitForFunction(() => /2 of 5/.test(document.querySelector('#app').innerText), null, { timeout: 4000 }).catch(() => {});
  ok(/2 of 5/.test(await text()) && /ABN/.test(await text()), 'answering moves him on');
  await p.fill('#w_in', '123'); await p.click('#w_next');
  await p.waitForFunction(() => /11 numbers/.test(document.querySelector('#app').innerText), null, { timeout: 4000 }).catch(() => {});
  ok(/11 numbers/.test(await text()), 'an ABN that is not an ABN is refused');
  await p.fill('#w_in', '12 345 678 901'); await p.click('#w_next');
  await p.waitForFunction(() => /3 of 5/.test(document.querySelector('#app').innerText), null, { timeout: 4000 }).catch(() => {});
  ok(/3 of 5/.test(await text()) && /state/.test(await text()), 'then the state');
  await p.click('[data-state="SA"]');
  await p.waitForFunction(() => /4 of 5/.test(document.querySelector('#app').innerText), null, { timeout: 4000 }).catch(() => {});
  ok(/4 of 5/.test(await text()) && /day rate/i.test(await text()), 'then the day rate');
  await p.fill('#w_in', '40'); await p.click('#w_next');
  await p.waitForFunction(() => /between 100 and 3000/.test(document.querySelector('#app').innerText), null, { timeout: 4000 }).catch(() => {});
  ok(/between 100 and 3000/.test(await text()), 'a day rate that cannot be right is refused');
  await p.fill('#w_in', '650'); await p.click('#w_next');
  await p.waitForFunction(() => /5 of 5/.test(document.querySelector('#app').innerText), null, { timeout: 4000 }).catch(() => {});
  const priced = await p.evaluate(() => { const S = window.__qcApp.store.load(); return { walls: S.prices.p_walls, hourly: S.costing.labour_rate }; });
  ok(priced.hourly > 0 && priced.walls > 0, 'his day rate becomes an hourly cost and a whole price list: ' + JSON.stringify(priced));
  ok(/5 of 5/.test(await text()) && /paid/.test(await text()), 'then how he gets paid');

  // card is the offer; with Connect not switched on it falls back rather than dead-ending
  await p.click('#w_card'); await p.waitForTimeout(700);
  ok(/not switched on yet/.test(await text()), 'card payments not being live yet is said plainly, not hidden');
  await p.evaluate(() => { const d = document.querySelector('#app details'); if (d) d.open = true; }); await p.waitForTimeout(200);
  await p.fill('#w_bsb', '123'); await p.click('#w_bank'); await p.waitForTimeout(300);
  ok(/6 numbers|Whose account/.test(await text()), 'half-typed bank details are refused');
  await p.fill('#w_an', 'Dave'); await p.fill('#w_bsb', '063-000'); await p.fill('#w_acct', '12345678');
  await p.click('#w_bank'); await p.waitForTimeout(1000);
  t = await text();
  if (!/New job/.test(t)) console.log('    DBG', JSON.stringify(await p.evaluate(() => { const S = window.__qcApp.store.load(); return { hash: location.hash, payment: S.payment, screen: document.querySelector('#app').innerText.replace(/\s+/g, ' ').slice(0, 70) }; })));
  ok(/New job/.test(t) && !/of 5/.test(t), 'the last answer opens the app');
  ok(!(await p.$eval('header.top nav', e => e.hidden)), 'and the tabs come back');

  // it stays open
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.waitForTimeout(500);
  ok(/New job/.test(await text()), 'and stays open on the next visit');

  // taking a required thing away puts him back, so nothing can go out half-set
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.details.state = ''; window.__qcApp.store.save(); location.hash = '#/chase'; });
  await p.waitForTimeout(500);
  ok(/of 5/.test(await text()), 'clearing something required puts him straight back at set-up');

  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
