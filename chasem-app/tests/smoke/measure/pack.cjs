const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const C = require('./common.cjs'); const fs = C.fs;
(async () => {
  const { b, ctx } = await C.launch({ acceptDownloads: true }); const p = await ctx.newPage(); await p.addInitScript(__OPEN_SEC); const { ok, fails } = C.checker(); const errors = []; p.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  const failed = []; p.on('requestfailed', r => failed.push(r.url())); p.on('response', r => { if (r.status() >= 400) failed.push(r.url() + ' ' + r.status()); });
  await p.goto('file://' + require('path').join(__dirname, '../../..', 'chasem-pack/pack/measure/measure.html'), { waitUntil: 'load' }); await p.waitForTimeout(300);
  ok(failed.length === 0, 'all referenced files load from file:// (' + failed.join(', ') + ')'); ok(await p.evaluate(() => !!(window.QCMeasure && window.QCDetect && window.QCAR && window.AR)), 'globals present');
  await p.fill('#room', 'Lounge'); await p.setInputFiles('[data-part="photolib"]', C.M + '/a4_basic.jpg');
  await p.waitForFunction(() => window.__qc.state.edit && window.__qc.state.edit.kind === 'page', null, { timeout: 20000 }); await p.click('[data-part="stepbtns"] .btn.tape');
  await p.waitForFunction(() => window.__qc.state.edit && window.__qc.state.edit.kind === 'wall', null, { timeout: 20000 }); await p.click('[data-part="stepbtns"] .btn.tape'); await p.waitForFunction(() => window.__qc.wall(), null, { timeout: 20000 });
  console.log('status:', (await p.$eval('[data-part="status"]', e => e.textContent)).slice(0, 160));
  await p.click('[data-part="savewall"]'); await p.waitForTimeout(200); ok(!(await p.$eval('#saved', e => e.hidden)), 'saved table shown'); console.log('saved row:', await p.$eval('#savedtable tbody', e => e.textContent.replace(/\s+/g, ' ')));
  await p.evaluate(() => { window.__blobs = []; const o = URL.createObjectURL.bind(URL); URL.createObjectURL = b => { window.__blobs.push(b); return o(b); }; const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { window.__dlname = this.download; }; }); const hit = await p.evaluate(() => { const b = document.getElementById('download'), r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vh: innerHeight, hit: e && (e.id || e.className || e.tagName), scrollY }; }); console.log('download button hit-test:', JSON.stringify(hit)); await p.screenshot({ path: C.SM + '/pack-bar.png' }); ok(hit.hit === 'download' || /btn tape/.test(hit.hit), 'bottom bar Save button is clickable on a phone viewport (elementFromPoint = ' + hit.hit + ')'); await p.evaluate(() => document.getElementById('download').click()); await p.waitForTimeout(300);
  const txt = await p.evaluate(async () => window.__blobs.length ? await window.__blobs[0].text() : ''); const out = C.SM + '/measurements.json'; fs.writeFileSync(out, txt); const J = JSON.parse(txt); const dl = { suggestedFilename: () => '' };
  dl.suggestedFilename = () => ''; const dlname = await p.evaluate(() => window.__dlname); console.log('download name:', dlname, 'keys:', Object.keys(J), 'rooms:', J.rooms.length); const w = J.rooms[0].walls[0]; console.log('wall keys:', Object.keys(w)); console.log(JSON.stringify(w).slice(0, 500));
  ok(dlname === 'measurements.json', 'file name'); ok(J.rooms[0].name === 'Lounge' && Array.isArray(J.rooms[0].walls), 'rooms[].walls[]');
  ['width_mm', 'height_mm', 'openings', 'paint_area_m2', 'method', 'scale', 'expected_error_pct'].forEach(k => ok(w[k] !== undefined && w[k] !== null, 'wall has ' + k + ' = ' + JSON.stringify(w[k])));
  // Nothing rounds here: rounding is the host app's call (measure.js only rounds when roundUpMm is set), and
  // the standalone page does not ask for it, so the file carries the measurement itself.
  ok(w.method === 'photo-page' && w.scale === 'page' && w.rounded === false && w.width_mm === w.measured_width_mm && Math.abs(w.width_mm - 4000) <= 100, 'method, scale and an unrounded width within 100 mm of the truth (' + w.width_mm + ')');
  ok(Math.abs(w.paint_area_m2 - (w.gross_area_m2 - w.openings.reduce((s, o) => s + o.area_m2, 0))) < 0.01, 'paint area = gross - openings');
  await p.evaluate(() => document.getElementById('copy').click()); ok(!(await p.$eval('#summary', e => e.hidden)) && /Lounge \/ Wall 1/.test(await p.$eval('#summary', e => e.value)), 'summary text');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(300); ok((await p.$$('#savedtable tbody tr')).length === 1, 'saved walls persist across reload (file:// localStorage)');
  ok(errors.length === 0, 'no page errors (' + errors.join('|') + ')');
  await b.close(); console.log(fails() ? 'FAILURES ' + fails() : 'ALL PASSED'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
