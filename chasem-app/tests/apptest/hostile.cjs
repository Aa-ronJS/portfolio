// What a bad phone does to the app. Each case is a condition a painter really has.
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const joined = () => { try { const k = 'qc-app-v1', s = JSON.parse(localStorage.getItem(k) || '{}'); s.account = { email: 'd@e.com', joined: '2026-01-01' }; s.details = s.details || {}; if (!s.details.trading_name) s.details.trading_name = 'Test Painting Co'; if (!s.details.abn) s.details.abn = '12 345 678 901'; if (!s.details.state) s.details.state = 'SA'; s.security = Object.assign({}, s.security, { setup_done: true }); s.payment = s.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} };

(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const fresh = async (init, arg) => {
    const ctx = await b.newContext({ ...devices['iPhone 13'], serviceWorkers: 'block' });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    if (init) await p.addInitScript(init, arg);
    return { ctx, p, errs };
  };
  const text = (p) => p.$eval('#app', e => e.innerText).catch(() => '');
  // the bar lives outside #app, above it, so it survives every screen
  const bar = (p) => p.$eval('#savebar', e => (e.hidden ? '' : e.innerText)).catch(() => '');

  // 1. localStorage throws on every touch: iOS private mode, or site data blocked
  { const { ctx, p, errs } = await fresh(() => {
      const bad = () => { throw new DOMException('denied', 'SecurityError'); };
      try { Object.defineProperty(window, 'localStorage', { get: bad, configurable: true }); } catch (e) {}
    });
    await p.goto(base, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(700);
    const t = await text(p);
    ok(t.trim().length > 10, 'storage blocked: the app still draws something (' + t.replace(/\s+/g, ' ').slice(0, 70) + ')');
    ok(!errs.length, 'storage blocked: no uncaught error (' + (errs[0] || '').split('\n')[0].slice(0, 80) + ')');
    const bb = await bar(p);
    ok(/not saving/i.test(bb) && /private/i.test(bb), 'storage blocked: a bar says so rather than pretending to work (' + bb.replace(/\s+/g, ' ').slice(0, 80) + ')');
    await ctx.close(); }

  // 2. the quota runs out mid-save: a full phone, which is most of them
  { const { ctx, p, errs } = await fresh(joined);
    await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(400);
    await p.evaluate(() => { const real = localStorage.setItem.bind(localStorage);
      let n = 0; localStorage.setItem = function (k, v) { if (k === 'qc-app-v1' && ++n > 1) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } return real(k, v); }; });
    await p.click('#newjob').catch(() => {}); await p.waitForTimeout(500);
    await p.fill('[data-bind="client.name"]', 'Full Phone Person').catch(() => {});
    await p.waitForTimeout(700);
    const bq = await bar(p);
    ok(!errs.length, 'quota full: no uncaught error');
    ok(/full/i.test(bq) && /not saved/i.test(bq), 'quota full: a bar says his work is not being saved (' + bq.replace(/\s+/g, ' ').slice(0, 90) + ')');
    ok(/Save a copy/i.test(bq), 'quota full: and offers the one way out that needs no storage');
    await ctx.close(); }

  // 3. the stored data is rubbish: a half-written save, a synced-in mess
  for (const junk of ['{"jobs":"not an array"}', '{"jobs":[{"id":null,"rooms":null,"client":7}]}', 'not json at all', '[]', '{"jobs":[],"details":null,"prices":null}']) {
    const { ctx, p, errs } = await fresh((j) => { try { localStorage.setItem('qc-app-v1', j); } catch (e) {} }, junk);
    await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(600);
    const t = await text(p);
    ok(t.trim().length > 10 && !errs.length, 'junk in storage (' + junk.slice(0, 28) + '): app opens, no crash' + (errs[0] ? ' ERR ' + errs[0].slice(0, 60) : ''));
    await ctx.close();
  }

  // 4. the phone's clock is wrong: dates in the past or the future
  for (const when of ['2019-01-01T00:00:00Z', '2031-06-01T00:00:00Z']) {
    const { ctx, p, errs } = await fresh((w) => {
      const R = Date, fixed = new R(w).getTime();
      window.Date = class extends R { constructor(...a) { if (a.length) super(...a); else super(fixed); } static now() { return fixed; } };
      try { const k = 'qc-app-v1', s = JSON.parse(localStorage.getItem(k) || '{}'); s.account = { email: 'd@e.com', joined: '2026-01-01' }; s.details = s.details || {}; if (!s.details.trading_name) s.details.trading_name = 'Test Painting Co'; if (!s.details.abn) s.details.abn = '12 345 678 901'; if (!s.details.state) s.details.state = 'SA'; s.security = Object.assign({}, s.security, { setup_done: true }); s.payment = s.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {}
    }, when);
    await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(500);
    await p.click('#newjob').catch(() => {}); await p.waitForTimeout(600);
    const t = await text(p);
    ok(!errs.length && t.trim().length > 10, 'clock set to ' + when.slice(0, 4) + ': a job can still be made' + (errs[0] ? ' ERR ' + errs[0].slice(0, 60) : ''));
    await ctx.close();
  }

  // 5. a very long name in every field: paste from a website, or a lean on the keyboard
  { const { ctx, p, errs } = await fresh(joined);
    await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(400);
    await p.click('#newjob'); await p.waitForTimeout(500);
    const long = 'Wattle'.repeat(300);
    for (const f of ['client.name', 'client.address', 'summary']) await p.fill('[data-bind="' + f + '"]', long).catch(() => {});
    await p.waitForTimeout(600);
    const over = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    ok(over.sw <= over.iw + 1, 'a 1800-character name does not push the page sideways (' + over.sw + ' vs ' + over.iw + ')');
    ok(!errs.length, 'a 1800-character name does not throw');
    await ctx.close(); }

  // 6. spam taps on the things that cost money or make records
  { const { ctx, p, errs } = await fresh(joined);
    await p.goto(base, { waitUntil: 'load' }); await p.waitForTimeout(400);
    await p.evaluate(() => { const b = document.getElementById('newjob'); for (let i = 0; i < 8; i++) b.click(); });
    await p.waitForTimeout(600);
    const n = await p.evaluate(() => window.__qcApp.store.load().jobs.length);
    ok(n === 1, 'eight taps on New job make one job (' + n + ')');
    ok(!errs.length, 'and throw nothing');
    await ctx.close(); }

  await b.close(); srv.close();
  console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
