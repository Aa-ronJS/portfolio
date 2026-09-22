const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const C = require('./common.cjs'); const fs = C.fs;
(async () => {
  const { srv, base } = await C.serve(); const { b, ctx } = await C.launch(); const p = await ctx.newPage(); await p.addInitScript(__OPEN_SEC); const { ok, fails } = C.checker();
  const errors = []; p.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await C.newMeasureRoom(p, base); const T = JSON.parse(fs.readFileSync(C.M + '/a4_basic.json', 'utf8')); const W = T.wall.corners.map(c => ({ x: c[0], y: c[1] }));
  const st = () => C.status(p);
  const reset = async () => { await p.evaluate(() => { const q = window.__qcMeasure; q.manual(); q.state.items = []; q.state.rect = null; q.state.scale = null; }); };
  await C.loadPhoto(p, C.M + '/a4_basic.jpg'); await C.waitDecision(p); await p.click('[data-part="stepbtns"] .btn:not(.tape)');
  // 90-degree rotated order: clockwise starting at top-right (TR, BR, BL, TL)
  let r = await p.evaluate(pts => { const q = window.__qcMeasure; q.wall4(pts); return { w: q.wall(), st: document.querySelector('[data-part="status"]').textContent, asp: q.state.rect && q.state.rect.aspect }; }, [W[1], W[2], W[3], W[0]]);
  console.log('TR-first (90deg) order ->', r.w ? Math.round(r.w.w) + 'x' + Math.round(r.w.h) : 'rejected', 'aspect', r.asp && r.asp.toFixed(3), '|', r.st.slice(0, 110));
  ok(!r.w || /warn|order|top-left/.test(r.st), 'rotated corner order refused or flagged (truth 4000x2400, got ' + (r.w ? Math.round(r.w.w) + 'x' + Math.round(r.w.h) : 'none') + ')');
  await reset();
  // anticlockwise order (TL, BL, BR, TR)
  r = await p.evaluate(pts => { const q = window.__qcMeasure; q.wall4(pts); return { w: q.wall(), st: document.querySelector('[data-part="status"]').textContent }; }, [W[0], W[3], W[2], W[1]]);
  ok(!r.w && /Not a sensible wall shape/.test(r.st), 'anticlockwise order refused: ' + r.st.slice(0, 60)); await reset();
  // same point x4
  r = await p.evaluate(pt => { const q = window.__qcMeasure; q.wall4([pt, pt, pt, pt]); return { w: q.wall(), st: document.querySelector('[data-part="status"]').textContent }; }, W[0]);
  ok(!r.w && /Not a sensible wall shape/.test(r.st), 'same point x4 refused'); await reset();
  // three corners then Door mode with no wall frame
  r = await p.evaluate(pts => { const q = window.__qcMeasure; q.setMode('wall'); pts.forEach(pt => q.place(pt)); q.setMode('door'); const n = q.state.taps.length; q.place(pts[0]); return { n, st: document.querySelector('[data-part="status"]').textContent, pend: !!q.state.pending }; }, [W[0], W[1], W[2]]);
  ok(r.n === 0 && !r.pend && /Tap the wall corners first/.test(r.st), 'three taps then Door: taps cleared, door refused: ' + r.st.slice(0, 60)); await reset();
  // door taps before any wall in door mode after "No page"
  // drag a page handle far outside the canvas with zoom off
  await p.evaluate(() => window.__qcMeasure.autoStart()); await p.waitForFunction(() => window.__qcMeasure.state.edit && window.__qcMeasure.state.edit.kind === 'page'); await p.click('[data-part="insets"] button'); // Whole photo
  r = await p.evaluate(() => { const q = window.__qcMeasure, view = document.querySelector('[data-part="view"]'), stage = document.querySelector('[data-part="stage"]'), r = view.getBoundingClientRect(), c = q.state.edit.pts[0];
    const a = { x: r.left + c.x * r.width / view.width, y: r.top + c.y * r.height / view.height }; const ev = (t, x, y) => stage.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, pointerId: 1, pointerType: 'touch', isPrimary: true }));
    ev('pointerdown', a.x, a.y); ev('pointermove', r.left - 3000, r.top - 3000); ev('pointerup', r.left - 3000, r.top - 3000); return { pt: q.state.edit.pts[0], zoom: !!q.state.zoom }; });
  console.log('handle dragged far outside ->', JSON.stringify(r)); ok(r.pt.x >= 0 && r.pt.y >= 0, 'handle clamped to the photo (actual ' + Math.round(r.pt.x) + ',' + Math.round(r.pt.y) + ')');
  await p.evaluate(() => window.__qcMeasure.confirmPage()); await p.waitForTimeout(1500); r = await p.evaluate(() => ({ st: document.querySelector('[data-part="status"]').textContent, edit: window.__qcMeasure.state.edit && window.__qcMeasure.state.edit.kind, page: window.__qcMeasure.state.page && window.__qcMeasure.state.page.corners.map(c => [Math.round(c.x), Math.round(c.y)]) }));
  console.log('   confirm with off-canvas corner:', r.st.slice(0, 120), '| edit:', r.edit, '| page:', JSON.stringify(r.page));
  if (r.edit === 'wall') { await p.click('[data-part="stepbtns"] .btn.tape'); await p.waitForTimeout(1500); const w = await p.evaluate(() => ({ m: window.__qcMeasure.state.scale && window.__qcMeasure.state.scale.measured, st: document.querySelector('[data-part="status"]').textContent })); console.log('   wall from off-canvas page:', w.m ? Math.round(w.m.W) + 'x' + Math.round(w.m.H) : 'none', '|', w.st.slice(0, 160)); ok(!w.m || /check|warn/.test(w.st), 'off-canvas page corner does not silently size the wall'); }
  // the "No A4 page" message: is it visible after the flow settles?
  await C.loadPhoto(p, C.SM + '/blank.jpg'); await p.waitForTimeout(3000); const s2 = await st(); console.log('blank wall, status 3 s after load:', s2); ok(/No A4 page/.test(s2), 'user is told no page was found (blank wall)');
  ok(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(fails() ? 'FAILURES ' + fails() : 'ALL PASSED'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
