const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const __JOINED = () => { try { const k = 'qc-app-v1', raw = localStorage.getItem(k); const s = raw ? JSON.parse(raw) : {}; s.account = Object.assign({ email: 'test@example.com', joined: '2026-01-01' }, s.account || {}); s.details = s.details || {}; if (!s.details.trading_name) s.details.trading_name = 'Test Painting Co'; if (!s.details.abn) s.details.abn = '12 345 678 901'; if (!s.details.state) s.details.state = 'SA'; s.security = Object.assign({}, s.security, { setup_done: true }); s.payment = s.payment || { account_name: 'Test Painting Co', bsb: '063-000', account_number: '12345678' }; localStorage.setItem(k, JSON.stringify(s)); } catch (e) {} }; // the app asks for an email before it opens; these suites are about what comes after
const { chromium, devices } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = require('path').join(__dirname, '../..'), SP = require('path').join(__dirname, '..');
const T = JSON.parse(fs.readFileSync(SP + '/mtest/truth2.json', 'utf8'));
const srv = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': p.endsWith('.js') ? 'application/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html' }); res.end(d); }); });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const pt = a => ({ x: a[0], y: a[1] }); const pe = (m, t) => (100 * (m - t) / t).toFixed(2) + '%';
// the loaded image is downscaled from 3000 to 3200 max -> no scaling (3000 < 3200). good.
(async () => {
  await new Promise(r => srv.listen(0, r)); const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ executablePath: (process.env.QC_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'), args: ['--no-sandbox'] });
  const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); await p.addInitScript(__JOINED); await p.addInitScript(__OPEN_SEC);
  p.on('pageerror', e => { console.log('PAGE ERROR', e.message); fails++; });
  await p.goto(base, { waitUntil: 'load' }); await p.click('#newjob'); await p.click('[data-add="interior"]'); await p.waitForSelector('[data-bind="L"]');
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.rules.round_up_cm = 0; window.__qcApp.store.save(); }); await p.click('[data-method="measured"]'); await p.waitForSelector('[data-part="photo"]');
  for (const [photo, expectSrc] of [['photo2.jpg', /photo data, 26.*confirmed/], ['photo2-noexif.jpg', /^worked out from the wall corners$/]]) {
    console.log('--- ' + photo);
    await p.setInputFiles('[data-part="photolib"]', SP + '/mtest/' + photo);
    await p.waitForFunction(() => window.__qcMeasure && window.__qcMeasure.state.img && window.__qcMeasure.state.auto, null, { timeout: 60000 }); await p.evaluate(() => window.__qcMeasure.manual());
    const exif = await p.evaluate(() => window.__qcMeasure.state.exif); console.log('  exif', JSON.stringify(exif));
    // jitter the truth corners by +-1.5 px like a careful tap
    const jit = c => [c[0] + (Math.random() - 0.5) * 3, c[1] + (Math.random() - 0.5) * 3];
    const rect = await p.evaluate(pts => { const r = window.__qcMeasure.wall4(pts); return r && { aspect: r.aspect, f: window.__qcMeasure.state.f, src: window.__qcMeasure.state.fSource, mode: window.__qcMeasure.state.mode }; }, T.wall.corners.map(jit).map(pt));
    console.log('  frame', JSON.stringify(rect), 'true f', T.f_px.toFixed(0), 'true aspect', (T.wall.h / T.wall.w).toFixed(4));
    ok(rect && Math.abs(rect.aspect / (T.wall.h / T.wall.w) - 1) < 0.01, 'aspect ratio within 1%: ' + pe(rect.aspect, T.wall.h / T.wall.w));
    ok(expectSrc.test(rect.src), 'focal source: ' + rect.src + ' f=' + rect.f.toFixed(0));
    let aw = await p.evaluate(() => window.__qcMeasure.wall()); if (photo === 'photo2.jpg') ok(aw && aw.h === 2400 && Math.abs(aw.w - 4000) / 4000 < 0.01, `auto-sized from assumed 2.4 ceiling -> ${aw.w.toFixed(0)} x ${aw.h.toFixed(0)}`); else ok(aw && Math.abs(aw.w - 4000) / 4000 < 0.01 && aw.h === 2400, `auto-sized from the best height learned on the first wall (typed ceiling beats power point) -> ${aw.w.toFixed(0)} x ${aw.h.toFixed(0)}`);
    { const st2 = await p.evaluate(() => ({ assumed: window.__qcMeasure.state.scale.assumed, method: window.__qcMeasure.state.scale.method, hidden: document.querySelector('[data-part="scalebox"]').hidden })); ok(st2.hidden === !st2.assumed, 'scale panel shown only while assumed: ' + JSON.stringify(st2));
      if (photo !== 'photo2.jpg') ok(st2.method === 'inherited', 'second wall in the room inherits the height learned from the first wall: ' + st2.method); }
    // wrong ceiling typed (2.6), door tapped, one-tap rescale from the door
    await p.evaluate(() => window.__qcMeasure.scale('ceiling', 2600));
    await p.evaluate(({ a, b }) => { window.__qcMeasure.setMode('door'); window.__qcMeasure.place(a); window.__qcMeasure.place(b); }, { a: pt(T.door.tl), b: pt(T.door.br) });
    ok(!(await p.$eval('[data-part="rescalerow"]', e => e.hidden)), 'door 8% off standard -> rescale button offered: ' + (await p.$eval('[data-part="status"]', e => e.textContent)).slice(0, 110));
    await p.evaluate(() => window.__qcMeasure.rescale()); aw = await p.evaluate(() => window.__qcMeasure.wall());
    ok(aw && Math.abs(aw.w - 4000) / 4000 < 0.01 && Math.abs(aw.h - 2400) / 2400 < 0.01, `rescaled from door -> ${aw.w.toFixed(0)} x ${aw.h.toFixed(0)}`);
    const dd = await p.evaluate(() => window.__qcMeasure.state.items.filter(i => i.type === 'door')[0]); ok(dd && Math.abs(dd.w - 820) / 820 < 0.015, 'door opening resized with it: ' + dd.w.toFixed(0) + ' x ' + dd.h.toFixed(0));
    await p.evaluate(() => { window.__qcMeasure.state.items = window.__qcMeasure.state.items.filter(i => i.type === 'wall'); });
    // ceiling
    let w = await p.evaluate(() => { window.__qcMeasure.scale('ceiling', 2400); return window.__qcMeasure.wall(); });
    ok(w && Math.abs(w.w - 4000) / 4000 < 0.01, `ceiling scale -> ${w.w.toFixed(0)} x ${w.h.toFixed(0)} (${pe(w.w, 4000)} / ${pe(w.h, 2400)})`);
    // openings in that frame
    const d = await p.evaluate(({ a, b }) => { window.__qcMeasure.setMode('door'); window.__qcMeasure.place(a); window.__qcMeasure.place(b); return window.__qcMeasure.state.items.filter(i => i.type === 'door')[0]; }, { a: pt(T.door.tl), b: pt(T.door.br) });
    ok(d && Math.abs(d.w - 820) / 820 < 0.015 && Math.abs(d.h - 2040) / 2040 < 0.015, `door ${d.w.toFixed(0)} x ${d.h.toFixed(0)} (${pe(d.w, 820)} / ${pe(d.h, 2040)})`);
    const st = await p.$eval('[data-part="status"]', e => e.textContent); ok(/checks out/.test(st), 'door cross-check message: ' + st.slice(0, 120));
    const wi = await p.evaluate(({ a, b }) => { window.__qcMeasure.setMode('window'); window.__qcMeasure.place(a); window.__qcMeasure.place(b); return window.__qcMeasure.state.items.filter(i => i.type === 'window')[0]; }, { a: pt(T.window.tl), b: pt(T.window.br) });
    ok(wi && Math.abs(wi.w - 1200) / 1200 < 0.015 && Math.abs(wi.h - 1000) / 1000 < 0.015, `window ${wi.w.toFixed(0)} x ${wi.h.toFixed(0)} (${pe(wi.w, 1200)} / ${pe(wi.h, 1000)})`);
    // door height scale
    w = await p.evaluate(({ a, b }) => { window.__qcMeasure.scale('door', 2040, [a, b]); return window.__qcMeasure.wall(); }, { a: pt(T.door.top), b: pt(T.door.bottom) });
    ok(w && Math.abs(w.w - 4000) / 4000 < 0.01 && Math.abs(w.h - 2400) / 2400 < 0.01, `door-height scale -> ${w.w.toFixed(0)} x ${w.h.toFixed(0)} (${pe(w.w, 4000)} / ${pe(w.h, 2400)})`);
    // power point scale (116 mm, ~70 px in the photo, jitter 1 px)
    w = await p.evaluate(({ a, b }) => { window.__qcMeasure.scale('gpo', 116, [a, b]); return window.__qcMeasure.wall(); }, { a: pt(jit(T.gpo.left)), b: pt(jit(T.gpo.right)) });
    ok(w && Math.abs(w.w - 4000) / 4000 < 0.04, `power-point scale -> ${w.w.toFixed(0)} x ${w.h.toFixed(0)} (${pe(w.w, 4000)} / ${pe(w.h, 2400)})`);
    // can't see all corners: door leaf as the reference rectangle
    const Hr = await p.evaluate(pts => { window.__qcMeasure.setMode('wall2'); return !!window.__qcMeasure.refRect('door', pts); }, T.door.corners.map(jit).map(pt));
    ok(Hr, 'door rectangle reference accepted');
    const w2 = await p.evaluate(({ a, b }) => { window.__qcMeasure.place(a); window.__qcMeasure.place(b); return window.__qcMeasure.wall(); }, { a: pt(T.wall.corners[0]), b: pt(T.wall.corners[2]) });
    ok(w2 && Math.abs(w2.w - 4000) / 4000 < 0.03 && Math.abs(w2.h - 2400) / 2400 < 0.03, `wall from door reference -> ${w2.w.toFixed(0)} x ${w2.h.toFixed(0)} (${pe(w2.w, 4000)} / ${pe(w2.h, 2400)})`);
    const wn = await p.evaluate(({ a, b }) => { window.__qcMeasure.setMode('window'); window.__qcMeasure.place(a); window.__qcMeasure.place(b); return window.__qcMeasure.state.items.filter(i => i.type === 'window')[0]; }, { a: pt(T.window.tl), b: pt(T.window.br) });
    ok(wn && Math.abs(wn.w - 1200) / 1200 < 0.04, `window from door reference ${wn.w.toFixed(0)} x ${wn.h.toFixed(0)} (${pe(wn.w, 1200)} / ${pe(wn.h, 1000)})`);
    await p.click('[data-part="savewall"]'); await p.waitForSelector('#walls table');
    console.log('  saved:', await p.$eval('#walls', e => e.innerText.replace(/\s+/g, ' ')));
  }
  await p.screenshot({ path: SP + '/apptest/geom.png', fullPage: true });
  await b.close(); srv.close(); console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
