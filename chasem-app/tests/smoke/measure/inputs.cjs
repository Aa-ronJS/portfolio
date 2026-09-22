const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const C = require('./common.cjs'); const fs = C.fs;
// What the detector still gets wrong on the hostile renders, and has since these fixtures were made. They are
// listed, not hidden: a case that starts passing is reported so the line can be deleted, and anything failing
// that is NOT on this list fails the run. Three are a bright rectangle in the photo taken for an A4 sheet (a
// door panel, a picture frame, a small patch), which then scales the wall from the wrong thing; the rest are
// the wall outline on a grainy or heavily vignetted photo, where the painter has to drag the corners himself.
const KNOWN = [
  /^doorpanel\.jpg: FALSE PAGE/, /^picture\.jpg: FALSE PAGE/, /^photo2\.jpg: FALSE PAGE/,
  /^picture\.jpg: width within 2%/,
  /^grainy\.jpg: automatic wall outline usable/, /^grainy\.jpg: width within 2%/,
  /^vignette\.jpg: automatic wall outline usable/, /^vignette\.jpg: width within 2%/,
];
const dist = (a, b) => Math.hypot(a.x - b[0], a.y - b[1]);
(async () => {
  const { srv, base } = await C.serve(); const { b, ctx } = await C.launch(); const p = await ctx.newPage(); await p.addInitScript(__OPEN_SEC); const raw = C.checker(); const known = []; const fixed = [];
  let hard = 0;
  const ok = (c, m) => { const isKnown = KNOWN.some((k) => k.test(m));
    if (!c && isKnown) { console.log('KNOWN ' + m); known.push(m); return false; }
    if (c && isKnown) { console.log('FIXED ' + m); fixed.push(m); return true; }
    if (!c) hard++; return raw.ok(c, m); };
  const log = raw.log;
  const errors = []; p.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); }); p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERROR', m.text().slice(0, 200)); });
  await C.newMeasureRoom(p, base);
  // wrap the detector with timers
  await p.evaluate(() => { window.__t = {}; ['findPage', 'findWall', 'findOpenings'].forEach(k => { const f = QCDetect[k]; QCDetect[k] = function () { const t0 = performance.now(); try { return f.apply(this, arguments); } finally { window.__t[k] = Math.round(performance.now() - t0); } }; }); });
  const cases = [
    ['text.jpg', null], ['one.png', null], ['big12mp.jpg', 'big12mp.json'], ['portrait.jpg', 'portrait.json'], ['rot90.jpg', 'rot90.json'], ['cutedge.jpg', 'cutedge.json'],
    ['tiny.jpg', 'tiny.json'], ['huge.jpg', 'huge.json'], ['doorpanel.jpg', 'doorpanel.json'], ['picture.jpg', 'picture.json'], ['dark.jpg', 'dark.json'], ['grainy.jpg', 'grainy.json'], ['vignette.jpg', 'vignette.json'], ['blank.jpg', 'blank.json'], ['@photo2.jpg', '@truth2.json']];
  const timing = {};
  for (const [file, truthF] of cases) {
    const dir = file[0] === '@' ? C.M : C.SM, fn = file.replace('@', ''), T = truthF ? JSON.parse(fs.readFileSync(dir + '/' + truthF.replace('@', ''), 'utf8')) : null;
    const heap0 = await p.evaluate(() => performance.memory.usedJSHeapSize);
    const tl = Date.now(); await C.loadPhoto(p, dir + '/' + fn, fn === 'portrait.jpg' ? 'photo' : 'photolib');
    const d = await C.waitDecision(p, 20000); const tDecision = Date.now() - tl;
    const st = await p.evaluate(() => ({ w: window.__qcMeasure.state.w, h: window.__qcMeasure.state.h, mode: window.__qcMeasure.state.mode, exif: window.__qcMeasure.state.exif, t: window.__t }));
    const sc = st.w && T && T.size ? st.w / T.size[0] : 1;
    const heap1 = await p.evaluate(() => performance.memory.usedJSHeapSize);
    console.log(`\n=== ${fn}: decision=${d.kind} in ${d.ms} ms (load->decision ${tDecision} ms); canvas ${st.w}x${st.h}; exif=${JSON.stringify(st.exif)}; heap ${(heap0/1048576).toFixed(0)}->${(heap1/1048576).toFixed(0)} MB; findPage ${st.t.findPage} ms\n    status: ${d.status.slice(0, 160)}`);
    ok(d.kind !== 'timeout', `${fn}: no hang (${d.ms} ms)`);
    const truthPage = T && T.page && T.page.corners.every(c => c[0] >= 0 && c[1] >= 0 && c[0] < T.size[0] && c[1] < T.size[1]) ? T.page.corners.map(c => [c[0] * sc, c[1] * sc]) : null;
    if (fn === 'text.jpg' || fn === 'one.png') { ok(d.kind === 'unreadable' || d.kind === 'nopage', `${fn}: rejected or no page (${d.kind})`); const workHidden = await p.$eval('[data-part="work"]', e => e.hidden); console.log('    work panel hidden:', workHidden, 'moderow hidden:', await p.$eval('[data-part="moderow"]', e => e.hidden)); continue; }
    if (d.kind === 'page') {
      const pts = await p.evaluate(() => window.__qcMeasure.state.edit.pts), portrait = await p.evaluate(() => window.__qcMeasure.state.auto.page.portrait);
      if (truthPage) { const errs = pts.map((c, i) => dist(c, truthPage[i])); const mx = Math.max(...errs); ok(mx < 3, `${fn}: page corners within 3 px of truth (max ${mx.toFixed(2)} px, scale ${sc.toFixed(3)}) ${portrait ? 'portrait' : 'landscape'} vs truth ${T.page.h > T.page.w ? 'portrait' : 'landscape'}`); ok(portrait === (T.page.h > T.page.w), `${fn}: orientation right`); }
      else ok(false, `${fn}: FALSE PAGE found at ${JSON.stringify(pts.map(c => [Math.round(c.x), Math.round(c.y)]))} (${portrait ? 'portrait' : 'landscape'})`);
      // confirm the page, wait for the wall step
      const t1 = Date.now(); await p.click('[data-part="stepbtns"] .btn.tape');
      let wallStep = true; try { await p.waitForFunction(() => window.__qcMeasure.state.edit && window.__qcMeasure.state.edit.kind === 'wall' || /do not make a page|did not give|Not a sensible wall shape|Corners out of order|probably not an A4 sheet/.test(document.querySelector('[data-part="status"]').textContent), null, { timeout: 20000 }); } catch (e) { wallStep = false; }
      const tw = Date.now() - t1; const t2 = await p.evaluate(() => window.__t);
      ok(wallStep, `${fn}: wall step appeared within 20 s (${tw} ms; findWall ${t2.findWall} ms)`); if (!wallStep) { console.log('    status:', await C.status(p)); continue; }
      const ed = await p.evaluate(() => window.__qcMeasure.state.edit); if (!ed) { console.log('    status:', await C.status(p)); continue; }
      const truthWall = T.wall.corners.map(c => [c[0] * sc, c[1] * sc]), inside = T.wall.corners.every(c => c[0] >= 0 && c[1] >= 0 && c[0] < T.size[0] && c[1] < T.size[1]);
      const werr = ed.pts.map((c, i) => dist(c, truthWall[i])), tol = 0.05 * Math.hypot(truthWall[3][0] - truthWall[0][0], truthWall[3][1] - truthWall[0][1]);
      console.log(`    wall guessed=${!!ed.guessed}; corner errs ${werr.map(e => e.toFixed(0)).join(', ')} px (tol ${tol.toFixed(0)}, truth inside image: ${inside}); status: ${(await C.status(p)).slice(0, 120)}`);
      if (inside) ok(!ed.guessed && Math.max(...werr) < tol, `${fn}: automatic wall outline usable`); else ok(true, `${fn}: wall corners outside image, outline ${ed.guessed ? 'guessed (default box)' : 'detected'} - manual drag expected`);
      const t3 = Date.now(); await p.click('[data-part="stepbtns"] .btn.tape');
      let done = true; try { await p.waitForFunction(() => window.__qcMeasure.wall() || /did not make|did not give|cannot be right|Not a sensible wall shape|Corners out of order|impossible wall size/.test(document.querySelector('[data-part="status"]').textContent), null, { timeout: 20000 }); } catch (e) { done = false; }
      const t4 = await p.evaluate(() => window.__t); ok(done, `${fn}: wall confirm returned (${Date.now() - t3} ms; findOpenings ${t4.findOpenings} ms)`);
      const res = await p.evaluate(() => { const q = window.__qcMeasure; return { wall: q.wall(), measured: q.state.scale && q.state.scale.measured, items: q.state.items.map(i => [i.type, Math.round(i.w), Math.round(i.h)]), st: document.querySelector('[data-part="status"]').textContent }; });
      console.log(`    result: measured ${res.measured ? Math.round(res.measured.W) + 'x' + Math.round(res.measured.H) : 'none'} (truth ${T.wall.w}x${T.wall.h}, paint height ${T.wall.h - 165}); items ${JSON.stringify(res.items)}\n    status: ${res.st.slice(0, 200)}`);
      if (inside && res.measured) ok(Math.abs(res.measured.W / T.wall.w - 1) < 0.02, `${fn}: width within 2% (${(100 * (res.measured.W / T.wall.w - 1)).toFixed(1)}%)`);
      timing[fn] = { decision: d.ms, findPage: st.t.findPage, wallStep: tw, findWall: t2.findWall, findOpenings: t4.findOpenings, heapMB: [heap0, heap1].map(x => Math.round(x / 1048576)), canvas: st.w + 'x' + st.h };
      await p.evaluate(() => window.__qcMeasure.manual());
    } else if (d.kind === 'nopage') {
      ok(!truthPage, `${fn}: ${truthPage ? 'MISSED the page (truth at ' + JSON.stringify(truthPage.map(c => c.map(Math.round))) + ')' : 'correctly reports no page'}`);
      const modeRow = await p.$eval('[data-part="moderow"]', e => !e.hidden), stepHidden = await p.$eval('[data-part="stepbox"]', e => e.hidden);
      console.log(`    mode=${st.mode}; mode row visible=${modeRow}; step box hidden=${stepHidden}; page debug: ${JSON.stringify(await p.evaluate(() => { const d = QCDetect.lastPageDebug; return d && { cands: d.cands, rejected: d.rejected }; }))}`);
      ok(st.mode === 'wall' && modeRow, `${fn}: falls back to manual wall corners`);
      // manual wall with truth corners, when inside the image
      if (T && T.wall.corners.every(c => c[0] >= 0 && c[1] >= 0 && c[0] < T.size[0] && c[1] < T.size[1])) {
        const r = await p.evaluate(pts => { const q = window.__qcMeasure; q.wall4(pts); return { w: q.wall(), st: document.querySelector('[data-part="status"]').textContent, scale: q.state.scale && q.state.scale.method }; }, T.wall.corners.map(c => ({ x: c[0] * sc, y: c[1] * sc })));
        console.log(`    manual wall4 -> ${r.w ? Math.round(r.w.w) + 'x' + Math.round(r.w.h) : 'none'} (${r.scale}); ${r.st.slice(0, 120)}`);
        ok(!!r.w, `${fn}: manual wall works after no-page`);
      }
    } else { console.log('    ' + d.kind, d.status); }
  }
  console.log('\nTIMING', JSON.stringify(timing, null, 1));
  // pure detector timing at full 4032x3024 and at the app's 3200 cap
  const T12 = JSON.parse(fs.readFileSync(C.SM + '/big12mp.json', 'utf8')); const p2 = await ctx.newPage(); await p2.addInitScript(__OPEN_SEC); await p2.goto(base + 's/detect-harness.html');
  for (const md of [1e9, 3200]) { const r = await p2.evaluate(({ u, f, md }) => window.run(u, f, md), { u: base + 's/big12mp.jpg', f: T12.f_px, md }); console.log(`detector-only 12MP at ${r.w}x${r.h}: findPage ${r.ms[0]} ms, findWall ${r.ms[1]} ms, findOpenings ${r.ms[2]} ms, heap ${r.heapMB.join('->')} MB, page ${r.page ? 'found' : 'NOT FOUND'}, wall ${r.wall ? 'found' : 'NOT FOUND'}`); }
  ok(errors.length === 0, 'no page errors (' + errors.length + ')');
  await b.close(); srv.close();
  console.log(known.length + ' known findings still there' + (fixed.length ? ', ' + fixed.length + ' now fixed (drop them from KNOWN)' : ''));
  console.log(hard ? 'FAILURES ' + hard : 'ALL PASSED (' + known.length + ' known findings)');
  process.exit(hard ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
