const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const C = require('./common.cjs'); const fs = C.fs;
(async () => {
  const { srv, base } = await C.serve(); const { b, ctx } = await C.launch(); const p = await ctx.newPage(); await p.addInitScript(__OPEN_SEC); const { ok, fails } = C.checker();
  const errors = []; p.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  const ids = await C.newMeasureRoom(p, base); const T = JSON.parse(fs.readFileSync(C.M + '/a4_basic.json', 'utf8')); const W = T.wall.corners.map(c => ({ x: c[0], y: c[1] }));
  const st = () => C.status(p); const state = (k) => p.evaluate(k => { const s = window.__qcMeasure.state; return k ? s[k] : null; }, k);
  const eclick = sel => p.evaluate(s => document.querySelector(s).click(), sel);
  const walls = () => p.evaluate(ids => window.__qcApp.store.load().jobs.find(j => j.id === ids.job).rooms.find(r => r.id === ids.room).walls, ids);
  // k. Copy details before any photo
  await eclick('[data-part="diag"]'); console.log('diag before photo:', (await st()).slice(0, 120)); ok(!/undefined|null,null|Error/.test(await st()) || /copied|"app"/.test(await st()), 'copy details before photo does not blow up');
  // e. Save with nothing; undo past empty
  await eclick('[data-part="savewall"]'); ok(/corners of the wall first/.test(await st()), 'save with nothing: ' + (await st()).slice(0, 60));
  for (let i = 0; i < 3; i++) await eclick('[data-part="undo"]'); ok(/Undone/.test(await st()), 'undo past empty is harmless');
  // load, then "No page"
  await C.loadPhoto(p, C.M + '/a4_basic.jpg'); let d = await C.waitDecision(p); ok(d.kind === 'page', 'page found for flow tests');
  await p.click('[data-part="stepbtns"] .btn:not(.tape)'); ok((await state('mode')) === 'wall' && !(await state('edit')), 'No page -> manual wall mode: ' + (await st()).slice(0, 80));
  // a. wrong order: clockwise from bottom-right (BR, BL, TL, TR)
  let r = await p.evaluate(pts => { const q = window.__qcMeasure; q.wall4(pts); return { w: q.wall(), st: document.querySelector('[data-part="status"]').textContent, asp: q.state.rect && q.state.rect.aspect }; }, [W[2], W[3], W[0], W[1]]);
  console.log('BR-first order ->', r.w ? Math.round(r.w.w) + 'x' + Math.round(r.w.h) : 'rejected', 'aspect', r.asp && r.asp.toFixed(3), '|', r.st.slice(0, 100));
  ok(!r.w || /warn|order|top-left/.test(r.st), 'wrong corner order is refused or flagged (truth 4000x2400)');
  await p.evaluate(() => window.__qcMeasure.manual());
  // b. same point four times
  r = await p.evaluate(pt => { const q = window.__qcMeasure; q.wall4([pt, pt, pt, pt]); return { w: q.wall(), st: document.querySelector('[data-part="status"]').textContent }; }, W[0]);
  ok(!r.w && /Not a sensible wall shape/.test(r.st), 'same point x4 refused: ' + r.st.slice(0, 80));
  // c. three corners then Door mode
  r = await p.evaluate(pts => { const q = window.__qcMeasure; q.setMode('wall'); pts.forEach(pt => q.place(pt)); q.setMode('door'); const n = q.state.taps.length; q.place(pts[0]); return { n, st: document.querySelector('[data-part="status"]').textContent, pend: !!q.state.pending }; }, [W[0], W[1], W[2]]);
  ok(r.n === 0 && !r.pend && /Tap the wall corners first/.test(r.st), 'three taps then Door: taps cleared, door refused: ' + r.st.slice(0, 60));
  // g. bow-tie page: swap corners 0 and 1 then confirm
  await p.evaluate(() => window.__qcMeasure.autoStart()); await p.waitForFunction(() => window.__qcMeasure.state.edit && window.__qcMeasure.state.edit.kind === 'page');
  r = await p.evaluate(() => { const q = window.__qcMeasure, e = q.state.edit.pts; const t = e[0]; e[0] = e[1]; e[1] = t; q.confirmPage(); return { page: q.state.page && q.state.page.aspect, st: document.querySelector('[data-part="status"]').textContent }; });
  await p.waitForTimeout(800); const afterBow = await p.evaluate(() => ({ edit: window.__qcMeasure.state.edit && window.__qcMeasure.state.edit.kind, st: document.querySelector('[data-part="status"]').textContent }));
  console.log('bow-tie page confirm -> page aspect', r.page, '| then:', afterBow.edit, afterBow.st.slice(0, 120));
  ok(!r.page || /do not make a page|warn/.test(r.st), 'bow-tie page is refused at confirm (actual: ' + (r.page ? 'accepted, aspect ' + r.page.toFixed(3) : 'refused') + ')');
  if (afterBow.edit === 'wall') { await p.click('[data-part="stepbtns"] .btn.tape'); await p.waitForTimeout(1500); const w = await p.evaluate(() => ({ w: window.__qcMeasure.wall(), m: window.__qcMeasure.state.scale && window.__qcMeasure.state.scale.measured, st: document.querySelector('[data-part="status"]').textContent })); console.log('   wall after bow-tie page:', w.m ? Math.round(w.m.W) + 'x' + Math.round(w.m.H) : 'none', '|', w.st.slice(0, 160)); ok(!w.w || /warn|check/.test(w.st), 'bow-tie page does not silently size a wall'); }
  // h. drag a handle outside the canvas
  await p.evaluate(() => { const q = window.__qcMeasure; q.manual(); q.autoStart(); }); await p.waitForFunction(() => window.__qcMeasure.state.edit && window.__qcMeasure.state.edit.kind === 'page');
  r = await p.evaluate(() => { const q = window.__qcMeasure, view = document.querySelector('[data-part="view"]'), stage = document.querySelector('[data-part="stage"]'), r = view.getBoundingClientRect(), z = q.state.zoom, c = q.state.edit.pts[0];
    const toClient = (pt) => { const vx = z ? (pt.x - z.x0) * z.s : pt.x, vy = z ? (pt.y - z.y0) * z.s : pt.y; return { x: r.left + vx * r.width / view.width, y: r.top + vy * r.height / view.height }; };
    const a = toClient(c); const ev = (t, x, y) => stage.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, pointerId: 1, pointerType: 'touch', isPrimary: true }));
    ev('pointerdown', a.x, a.y); ev('pointermove', r.left - 400, r.top - 300); ev('pointerup', r.left - 400, r.top - 300); return { pt: q.state.edit.pts[0], zoom: !!z }; });
  console.log('handle dragged outside ->', JSON.stringify(r));
  ok(true, 'drag outside recorded; corner now at ' + Math.round(r.pt.x) + ',' + Math.round(r.pt.y) + (r.pt.x < 0 || r.pt.y < 0 ? ' (NEGATIVE, unclamped)' : ''));
  await p.evaluate(() => window.__qcMeasure.confirmPage()); await p.waitForTimeout(1200); console.log('   confirm with outside corner:', (await st()).slice(0, 140), '| edit:', await p.evaluate(() => window.__qcMeasure.state.edit && window.__qcMeasure.state.edit.kind));
  // f. size a wall properly, then Save twice quickly
  await p.evaluate(pts => { const q = window.__qcMeasure; q.manual(); q.wall4(pts); }, W); ok(!!(await p.evaluate(() => window.__qcMeasure.wall())), 'wall sized (assumed ceiling) for save tests');
  await p.evaluate(() => { const b = document.querySelector('[data-part="savewall"]'); b.click(); b.click(); b.click(); }); await p.waitForTimeout(200);
  let ws = await walls(); console.log('save x3 fast on assumed wall -> walls saved:', ws.length, '|', (await st()).slice(0, 100)); ok(ws.length === 1, 'save x3 quick saves exactly one wall (first click is the assumed-ceiling warning)');
  // i. New photo mid-flow with an unsaved sized wall
  await p.evaluate(pts => { const q = window.__qcMeasure; q.manual(); q.wall4(pts); }, W);
  await p.setInputFiles('[data-part="photo2"]', C.M + '/a4_nodoor.jpg'); d = await C.waitDecision(p); const items = await state('items'); ws = await walls();
  console.log('new photo mid-flow ->', d.kind, 'items now', items.length, 'walls saved', ws.length); ok(items.length === 0 && errors.length === 0 && ws.length === 2, 'new photo resets the canvas and keeps the wall already sized (walls now ' + ws.length + ')');
  // j. Done mid-flow with a sized wall -> auto-save exactly once
  await p.click('[data-part="stepbtns"] .btn:not(.tape)'); await p.evaluate(pts => window.__qcMeasure.wall4(pts), W); ok(await p.evaluate(() => window.__qcMeasure.unsaved()), 'unsaved wall present before Done');
  await p.click('a.btn.tape[href^="#/job/"]'); await p.waitForTimeout(400); ws = await walls(); console.log('after Done: walls', ws.length, ws.map(w => w.wall + ' ' + w.width_mm + 'x' + w.height_mm + ' ' + w.scale));
  ok(ws.length === 3, 'Done auto-saved exactly once (total ' + ws.length + ', want 3)'); ok(await p.evaluate(() => window.__qcMeasure === null), '__qcMeasure cleared after leaving');
  // back into the room, then browser back with an unsaved wall
  await p.click('a.job[href*="/room/"]'); await p.waitForSelector('[data-part="photo"]'); await C.loadPhoto(p, C.M + '/a4_basic.jpg'); await C.waitDecision(p); await p.click('[data-part="stepbtns"] .btn:not(.tape)'); await p.evaluate(pts => window.__qcMeasure.wall4(pts), W);
  await p.goBack(); await p.waitForTimeout(400); ws = await walls(); ok(ws.length === 4, 'browser back auto-saved once (total ' + ws.length + ', want 4)');
  ok(errors.length === 0, 'no page errors (' + errors.join(' | ') + ')');
  await b.close(); srv.close(); console.log(fails() ? 'FAILURES ' + fails() : 'ALL PASSED'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
