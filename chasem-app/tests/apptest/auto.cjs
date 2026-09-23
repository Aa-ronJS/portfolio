const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const __JOINED = () => { try { const k = 'qc-app-v1', raw = localStorage.getItem(k); const s = raw ? JSON.parse(raw) : {}; s.account = Object.assign({ email: 'test@example.com', joined: '2026-01-01' }, s.account || {}); s.details = s.details || {}; if (!s.details.trading_name) s.details.trading_name = 'Test Painting Co'; if (!s.details.abn) s.details.abn = '12 345 678 901'; if (!s.details.state) s.details.state = 'SA'; s.security = Object.assign({}, s.security, { setup_done: true }); s.payment = s.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }; // the app asks for an email before it opens; these suites are about what comes after
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..'), SP = require('path').join(__dirname, '..'), M = SP + '/mtest';
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = p.startsWith('/m/') ? path.join(M, p.slice(3)) : path.join(ROOT, p); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'application/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; }; const pe = (m, t) => (100 * (m - t) / t).toFixed(2) + '%';
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); await p.addInitScript(__JOINED); await p.addInitScript(__OPEN_SEC);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
  await p.goto(base, { waitUntil: 'load' }); await p.click('#newjob'); await p.click('[data-add="interior"]'); await p.waitForSelector('[data-bind="L"]');
  await p.click('[data-method="measured"]'); await p.waitForSelector('[data-part="photo"]');
  ok(await p.$eval('[data-part="arbtn"]', e => e.hidden), 'AR button hidden where WebXR AR is unsupported');
  const names = ['a4_basic', 'a4_printed', 'a4_printed_dense', 'a4_printed_landscape', 'a4_landscape', 'a4_cream_gradient', 'a4_white_wall', 'a4_far_wide', 'a4_furniture', 'a4_nodoor'];
  for (const n of names) {
    const T = JSON.parse(fs.readFileSync(`${M}/${n}.json`, 'utf8')); const paintH = T.wall.h - 75 - 90; // cornice and skirting in the rendered scene
    await p.setInputFiles('[data-part="photolib"]', `${M}/${n}.jpg`);
    await p.waitForFunction(() => window.__qcMeasure && window.__qcMeasure.state.edit && window.__qcMeasure.state.edit.kind === 'page' || /No A4 page/.test(document.querySelector('[data-part="status"]').textContent), null, { timeout: 60000 });
    const st1 = await p.$eval('[data-part="status"]', e => e.textContent);
    if (/No A4 page/.test(st1)) { ok(false, n + ': page not found (' + st1 + ')'); continue; }
    ok(/Is this the A4 page/.test(await p.$eval('[data-part="steptitle"]', e => e.textContent)), n + ': asks to confirm the page');
    if (n === 'a4_basic') { await p.$eval('.stage', e => e.scrollIntoView({ block: 'center' })); await p.screenshot({ path: SP + '/apptest/auto-page.png' }); }
    await p.click('[data-part="stepbtns"] .btn.tape'); // Yes
    await p.waitForFunction(() => window.__qcMeasure.state.edit && window.__qcMeasure.state.edit.kind === 'wall', null, { timeout: 30000 });
    const guessed = await p.evaluate(() => window.__qcMeasure.state.edit.guessed); ok(!guessed, n + ': wall outline found automatically');
    if (n === 'a4_basic') { ok((await p.$$('[data-part="insets"] canvas')).length === 4, 'four corner insets shown for the wall'); await p.click('[data-part="insets"] .inset:nth-child(2)'); ok(!!(await p.evaluate(() => window.__qcMeasure.state.zoom)), 'tapping an inset zooms the main view'); await p.$eval('.stage', e => e.scrollIntoView({ block: 'center' })); await p.screenshot({ path: SP + '/apptest/auto-wall-zoom.png' }); await p.click('[data-part="insets"] button'); await p.$eval('.stage', e => e.scrollIntoView({ block: 'start' })); await p.screenshot({ path: SP + '/apptest/auto-wall.png' }); }
    await p.click('[data-part="stepbtns"] .btn.tape'); // Yes
    await p.waitForFunction(() => window.__qcMeasure.wall(), null, { timeout: 30000 });
    const shown = await p.evaluate(() => window.__qcMeasure.wall()), w = await p.evaluate(() => ({ w: window.__qcMeasure.state.scale.measured.W, h: window.__qcMeasure.state.scale.measured.H })), items = await p.evaluate(() => window.__qcMeasure.state.items.filter(i => i.type !== 'wall').map(i => [i.type, Math.round(i.w), Math.round(i.h)]));
    const st = await p.$eval('[data-part="status"]', e => e.textContent);
    ok(Math.abs(w.w - T.wall.w) / T.wall.w < 0.015, `${n}: measured width ${w.w.toFixed(0)} vs ${T.wall.w} (${pe(w.w, T.wall.w)})`);
    ok(Math.abs(shown.w - w.w) < 1 && Math.abs(shown.h - w.h) < 1, `${n}: shown wall is the measured size, no rounding (${shown.w} x ${shown.h})`);
    ok(w.h > paintH * 0.985 && w.h < T.wall.h * 1.01, `${n}: height ${w.h.toFixed(0)} (cornice-to-skirting ${paintH}, ceiling-to-floor ${T.wall.h}) (${pe(w.h, paintH)} vs paint height)`);
    const door = items.find(i => i[0] === 'door'), win = items.find(i => i[0] === 'window');
    if (T.door) ok(door && Math.abs(door[1] - 820) / 820 < 0.03, `${n}: door found ${door ? door[1] + 'x' + door[2] : 'NO'} (truth 820x2040, frame adds ~40)`); else ok(!door, `${n}: no false door (${door ? door[1] + 'x' + door[2] : 'none'})`);
    if (T.window) ok(win && (Math.abs(win[1] - T.window.w) / T.window.w < 0.03 || Math.abs(win[1] - (T.window.w + 100)) / T.window.w < 0.04), `${n}: window found ${win ? win[1] + 'x' + win[2] : 'NO'} (truth ${T.window.w}x${T.window.h}, or plus the 50 mm frame)`);
    console.log('     status: ' + st.slice(0, 140) + (await p.evaluate(() => ' | f: ' + window.__qcMeasure.state.fSource + ', conf ±' + (window.__qcMeasure.state.scale && window.__qcMeasure.state.scale.err) + '%')));
    if (n === 'a4_basic') { await p.$eval('.stage', e => e.scrollIntoView({ block: 'start' })); await p.screenshot({ path: SP + '/apptest/auto-done.png' }); }
    if (n === 'a4_basic') { await p.click('[data-part="diag"]'); const st3 = await p.waitForFunction(() => { const t = document.querySelector('[data-part="status"]').textContent; return /copied|"app"/i.test(t) ? t : false; }, null, { timeout: 5000 }).then(h => h.jsonValue()).catch(() => p.$eval('[data-part="status"]', e => e.textContent)); ok(/copied|"app"/i.test(st3), 'copy details works: ' + st3.slice(0, 60)); }
    await p.click('[data-part="savewall"]'); await p.waitForTimeout(150);
  }
  const saved = await p.evaluate(() => window.__qcApp.store.load().jobs[0].rooms[0].walls.map(w => [w.method, w.scale, w.width_mm, w.height_mm, w.expected_error_pct]));
  console.log('saved walls:', JSON.stringify(saved)); ok(saved.length >= 6 && saved.every(w => w[0] === 'photo-page') && saved.some(w => w[2] % 100 !== 0), 'walls saved with method photo-page at measured (unrounded) sizes');
  // AR geometry unit checks
  const ar = await p.evaluate(() => { const c = [[0, 2.4, -3], [4, 2.4, -3], [4, 0, -3], [0, 0, -3]]; const w = QCAR.wallFromPoints(c); const o = QCAR.openingFromPoints(w, [0.3, 2.04, -3], [1.12, 0, -3]); return { W: w.W, H: w.H, o }; });
  ok(ar.W === 4000 && ar.H === 2400 && Math.round(ar.o.width_mm) === 820 && Math.round(ar.o.height_mm) === 2040, 'AR geometry: ' + JSON.stringify(ar));
  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
