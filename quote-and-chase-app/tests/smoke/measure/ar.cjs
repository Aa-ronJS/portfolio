const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const C = require('./common.cjs');
(async () => {
  const { srv, base } = await C.serve(); const { b } = await C.launch(); const { ok, fails } = C.checker();
  async function run(name, init) {
    const ctx = await b.newContext({ ...require('playwright-core').devices['iPhone 13'] }); const p = await ctx.newPage(); await p.addInitScript(C.joinScript); await p.addInitScript(__OPEN_SEC); const errors = []; p.on('pageerror', e => errors.push(e.message));
    if (init) await p.addInitScript(init); await C.newMeasureRoom(p, base); await p.waitForTimeout(300);
    const hidden = await p.$eval('[data-part="arbtn"]', e => e.hidden); console.log(name + ': AR button hidden =', hidden, 'navigator.xr =', await p.evaluate(() => { try { return typeof navigator.xr; } catch (e) { return 'getter throws'; } })); return { p, ctx, hidden, errors };
  }
  let r = await run('default headless', null); await r.ctx.close();
  r = await run('xr undefined', () => { Object.defineProperty(navigator, 'xr', { value: undefined, configurable: true }); }); ok(r.hidden, 'button hidden with navigator.xr undefined'); await r.ctx.close();
  r = await run('xr throws', () => { Object.defineProperty(navigator, 'xr', { get() { throw new Error('nope'); }, configurable: true }); }); ok(r.hidden && r.errors.length === 0, 'button hidden when navigator.xr getter throws'); await r.ctx.close();
  r = await run('xr rejects', () => { Object.defineProperty(navigator, 'xr', { value: { isSessionSupported: () => Promise.reject(new Error('x')) }, configurable: true }); }); ok(r.hidden && r.errors.length === 0, 'button hidden when isSessionSupported rejects'); await r.ctx.close();
  r = await run('fake xr', () => { Object.defineProperty(navigator, 'xr', { value: { isSessionSupported: () => Promise.resolve(true), requestSession: () => Promise.reject(new Error('AR session refused by test')) }, configurable: true }); });
  ok(!r.hidden, 'button appears with a fake xr that supports immersive-ar');
  await r.p.click('[data-part="arbtn"]'); await r.p.waitForTimeout(500);
  const st = await C.status(r.p), cls = await r.p.$eval('[data-part="status"]', e => e.className), overlay = await r.p.$$('.ar-overlay, .ar-canvas');
  console.log('after click: status =', st, '|', cls, '| overlay nodes left:', overlay.length);
  ok(/AR did not start: AR session refused/.test(st) && /bad/.test(cls), 'error shown in status'); ok(overlay.length === 0, 'overlay and canvas cleaned up');
  await C.loadPhoto(r.p, C.M + '/a4_basic.jpg'); const d = await C.waitDecision(r.p); ok(d.kind === 'page', 'page still usable after AR failure (' + d.kind + ')'); ok(r.errors.length === 0, 'no page errors (' + r.errors.join('|') + ')');
  // requestSession resolves with a junk session: should fail gracefully too
  await r.ctx.close(); r = await run('fake session', () => { Object.defineProperty(navigator, 'xr', { value: { isSessionSupported: () => Promise.resolve(true), requestSession: () => Promise.resolve({ updateRenderState() {}, requestReferenceSpace: () => Promise.resolve({}), addEventListener() {}, requestAnimationFrame() {}, renderState: {}, end() {} }) }, configurable: true }); });
  await r.p.click('[data-part="arbtn"]'); await r.p.waitForTimeout(500); console.log('junk session: status =', await C.status(r.p), '| overlay nodes left:', (await r.p.$$('.ar-overlay, .ar-canvas')).length, '| errors:', r.errors);
  ok(/AR did not start/.test(await C.status(r.p)) && (await r.p.$$('.ar-overlay')).length === 0, 'junk session fails gracefully'); await r.ctx.close();
  await b.close(); srv.close(); console.log(fails() ? 'FAILURES ' + fails() : 'ALL PASSED'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
