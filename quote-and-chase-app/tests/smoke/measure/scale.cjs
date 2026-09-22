const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const C = require('./common.cjs'); const fs = C.fs;
(async () => {
  const { srv, base } = await C.serve(); const { b, ctx } = await C.launch(); const p = await ctx.newPage(); await p.addInitScript(__OPEN_SEC); const { ok, fails } = C.checker();
  const errors = []; p.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  const ids = await C.newMeasureRoom(p, base); const T = JSON.parse(fs.readFileSync(C.M + '/a4_basic.json', 'utf8')); const W = T.wall.corners.map(c => ({ x: c[0], y: c[1] }));
  const st = () => C.status(p); const room = () => p.evaluate(ids => window.__qcApp.store.load().jobs.find(j => j.id === ids.job).rooms.find(r => r.id === ids.room), ids);
  // image points of the door top/bottom centre and the power point edges, from the truth wall homography (wall plane mm -> image)
  const pts = await p.evaluate(({ W, T }) => { const q = window.__qcMeasure, H = q.homography([{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}], W), P = (x, y) => q.apply(H, { x: x / T.wall.w, y: y / T.wall.h }); return { doorTop: P(710, 360), doorBot: P(710, 2400), gpoL: P(3800, 2088), gpoR: P(3916, 2088) }; }, { W, T });
  const eclick = sel => p.evaluate(s => document.querySelector(s).click(), sel); const setv = (sel, v) => p.evaluate(({ sel, v }) => { document.querySelector(sel).value = v; }, { sel, v });
  const measured = () => p.evaluate(() => { const s = window.__qcMeasure.state; return s.scale && s.scale.measured ? [Math.round(s.scale.measured.W), Math.round(s.scale.measured.H), s.scale.method] : null; });
  const fresh = async () => { await C.loadPhoto(p, C.M + '/a4_basic.jpg'); await C.waitDecision(p); await p.evaluate(pts => { const q = window.__qcMeasure; q.manual(); q.wall4(pts); }, W); };
  await fresh(); console.log('assumed:', await measured(), '|', (await st()).slice(0, 80));
  // a. door reversed (bottom then top)
  let r = await p.evaluate(pts => window.__qcMeasure.scale('door', 2040, [pts.doorBot, pts.doorTop]), pts); let m = await measured(); console.log('door reversed ->', r, m, '|', (await st()).slice(0, 100));
  ok(r && Math.abs(m[0] / 4000 - 1) < 0.02 && Math.abs(m[1] / 2400 - 1) < 0.02, 'door taps reversed still give the right wall (' + m + ')');
  // b. power point 2 px apart
  await fresh(); r = await p.evaluate(pts => window.__qcMeasure.scale('gpo', 116, [pts.gpoL, { x: pts.gpoL.x + 2, y: pts.gpoL.y }]), pts); m = await measured(); console.log('gpo 2px ->', r, m, '|', (await st()).slice(0, 120));
  ok(!r && m && m[2] !== 'gpo' && /cannot be right/.test(await st()), 'gpo taps 2 px apart refused (scale stays ' + m[2] + ')');
  // b2. power point proper
  r = await p.evaluate(pts => window.__qcMeasure.scale('gpo', 116, [pts.gpoL, pts.gpoR]), pts); m = await measured(); console.log('gpo proper ->', r, m); ok(r && Math.abs(m[0] / 4000 - 1) < 0.05, 'gpo proper scale within 5% (' + m + ')');
  // c. tape 0 / negative / abc through the UI
  for (const v of ['0', '-500', 'abc', '5']) { await fresh(); const before = (await measured())[2]; await eclick('[data-scale="tape"]'); await setv('[data-part="refmm"]', v);
    r = await p.evaluate(pts => { const q = window.__qcMeasure; q.place(pts.doorTop); q.place(pts.doorBot); return q.state.scale.method; }, pts); console.log('tape', v, '->', r, '|', (await st()).slice(0, 80)); ok(r === before && /Type the length/.test(await st()), 'tape length ' + v + ' refused (scale stays ' + r + ')'); }
  // d. ceiling 1.0 and 9.0 through the UI, and through the hook
  for (const v of ['1.0', '9.0']) { await fresh(); const b0 = (await measured())[2]; await setv('[data-part="ceiling"]', v); await eclick('[data-scale="ceiling"]'); m = await measured(); console.log('ceiling', v, '->', m, '|', (await st()).slice(0, 80)); ok(m[2] === b0, 'ceiling ' + v + ' refused in UI');
    r = await p.evaluate(v => window.__qcMeasure.scale('ceiling', v * 1000), v); m = await measured(); ok(!r && m[2] === b0, 'ceiling ' + v + ' refused via hook (' + (await st()).slice(0, 60) + ')'); }
  // e. inheritance: size from the door, save; second wall in same room; then a second room; then a second job
  await fresh(); await p.evaluate(pts => window.__qcMeasure.scale('door', 2040, [pts.doorTop, pts.doorBot]), pts); await p.click('[data-part="savewall"]'); await p.waitForTimeout(150);
  let rm = await room(); console.log('room after door-scaled save: H', rm.H, rm.H_from, rm.H_err, 'walls', rm.walls.length);
  ok(rm.H && Math.abs(rm.H - 2.4) < 0.05, 'room height recorded from the door');
  await fresh(); m = await measured(); console.log('second wall same room ->', m, '|', (await st()).slice(0, 100)); ok(m && m[2] === 'inherited', 'second wall in the same room inherits the height');
  const saved2 = await p.evaluate(() => window.__qcMeasure.state.scale.err); console.log('   inherited err', saved2);
  // second room in same job
  await p.click('a.btn.tape[href^="#/job/"]'); await p.waitForTimeout(900); await p.click('[data-add="interior"]'); await p.waitForSelector('[data-bind="L"]'); await p.click('[data-method="measured"]'); await p.waitForSelector('[data-part="photo"]');
  await C.loadPhoto(p, C.M + '/a4_basic.jpg'); await C.waitDecision(p); await p.evaluate(pts => { const q = window.__qcMeasure; q.manual(); q.wall4(pts); }, W); m = await measured(); console.log('second room same job ->', m, '|', (await st()).slice(0, 100));
  console.log('   (same job, other room: ' + (m[2] === 'inherited' ? 'inherits' : 'does NOT inherit, uses ' + m[2]) + ')');
  // second job
  await p.goto(base + '#/'); await p.waitForTimeout(200); await p.click('#newjob'); await p.waitForTimeout(900); await p.click('[data-add="interior"]'); await p.waitForSelector('[data-bind="L"]'); await p.click('[data-method="measured"]'); await p.waitForSelector('[data-part="photo"]');
  await C.loadPhoto(p, C.M + '/a4_basic.jpg'); await C.waitDecision(p); await p.evaluate(pts => { const q = window.__qcMeasure; q.manual(); q.wall4(pts); }, W); m = await measured(); console.log('second job ->', m); ok(m[2] !== 'inherited', 'a different job does not inherit');
  // f. rounding with round_up_cm = 0
  await p.evaluate(() => { const s = QCStore.load(); s.rules.round_up_cm = 0; QCStore.save(); }); const ru = await p.evaluate(() => QCStore.load().rules.round_up_cm); console.log('round_up_cm now', ru);
  await p.goto(base + '#/'); await p.waitForTimeout(200); await p.click('#newjob'); await p.waitForTimeout(900); await p.click('[data-add="interior"]'); await p.waitForSelector('[data-bind="L"]'); await p.click('[data-method="measured"]'); await p.waitForSelector('[data-part="photo"]');
  await C.loadPhoto(p, C.M + '/a4_basic.jpg'); await C.waitDecision(p); await p.click('[data-part="stepbtns"] .btn.tape'); await p.waitForFunction(() => window.__qcMeasure.state.edit && window.__qcMeasure.state.edit.kind === 'wall'); await p.click('[data-part="stepbtns"] .btn.tape'); await p.waitForFunction(() => window.__qcMeasure.wall());
  const rb = await p.evaluate(() => ({ st: document.querySelector('[data-part="status"]').textContent, hidden: document.querySelector('[data-part="roundbox"]').hidden, hint: document.querySelector('[data-part="roundhint"]').textContent, chips: [...document.querySelectorAll('[data-part="roundbtns"] button')].map(b => b.textContent), rounded: window.__qcMeasure.state.scale.rounded, wall: window.__qcMeasure.wall(), meas: window.__qcMeasure.state.scale.measured }));
  console.log('round_up 0 ->', JSON.stringify(rb).slice(0, 400)); ok(!rb.rounded && !/rounded up/.test(rb.st) && rb.wall.w === rb.meas.W, 'round_up_cm 0: wall not rounded, status does not say rounded up');
  ok(rb.hidden || rb.chips.length === 0, 'round_up_cm 0: no rounding chip offered (actual chips: ' + JSON.stringify(rb.chips) + ', box hidden ' + rb.hidden + ')');
  ok(errors.length === 0, 'no page errors');
  await b.close(); srv.close(); console.log(fails() ? 'FAILURES ' + fails() : 'ALL PASSED'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
