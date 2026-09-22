const __OPEN_SEC = () => { const f = () => document.querySelectorAll('details.sec:not([open])').forEach(d => { d.open = true; }); new MutationObserver(f).observe(document, { childList: true, subtree: true }); }; // tests see every settings section open
const C = require('./common.cjs'); const fs = C.fs;
(async () => {
  const { srv, base } = await C.serve(); const { b, ctx } = await C.launch(); const p = await ctx.newPage(); await p.addInitScript(__OPEN_SEC); const { ok, fails } = C.checker();
  const errors = []; p.on('pageerror', e => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  const ids = await C.newMeasureRoom(p, base);
  const room = () => p.evaluate(ids => window.__qcApp.store.load().jobs.find(j => j.id === ids.job).rooms.find(r => r.id === ids.room), ids);
  const toast = async () => { try { await p.waitForFunction(() => !document.getElementById('toast').hidden, null, { timeout: 3000 }); } catch (e) { return '(no toast)'; } return p.$eval('#toast', e => e.textContent); };
  const dir = C.SM + '/lidar'; fs.mkdirSync(dir, { recursive: true });
  const files = {
    'garbage.json': 'not json {{{', 'empty.json': '{}', 'null.json': 'null', 'array.json': '[]', 'nullwall.json': JSON.stringify({ walls: [null] }),
    'neg.json': JSON.stringify({ walls: [{ dimensions: [-3, -2.4, 0.1] }, { dimensions: [3, 2.4, 0.1] }] }),
    'negmm.json': JSON.stringify({ rooms: [{ name: 'X', walls: [{ width_mm: -4000, height_mm: 2400, openings: [] }, { width_mm: 4000, height_mm: 2400, openings: [{ type: 'door', width_mm: -820, height_mm: 2040 }] }, { width_mm: 3000, height_mm: 2400, openings: [{ type: 'window', width_mm: 9000, height_mm: 9000 }] }] }] }),
    'strings.json': JSON.stringify({ rooms: [{ walls: [{ width_mm: '4000', height_mm: '2400', openings: 'nope' }] }] }),
    'nan.json': JSON.stringify({ walls: [{ dimensions: { x: 'a', y: 2 } }, { dimensions: [1e9, 1e9, 0.1] }] }),
  };
  files['hugepad.json'] = '{"pad":"' + 'x'.repeat(40 * 1024 * 1024) + '","walls":[]}';
  const many = []; for (let i = 0; i < 5000; i++) many.push({ dimensions: [3 + (i % 5), 2.4, 0.1] }); files['manywalls.json'] = JSON.stringify({ walls: many });
  for (const k in files) fs.writeFileSync(dir + '/' + k, files[k]);
  for (const k of Object.keys(files)) {
    const before = (await room()).walls.length; const t0 = Date.now();
    await p.evaluate(() => { document.getElementById('toast').hidden = true; }); await p.setInputFiles('#lidar', dir + '/' + k); const t = await toast(); const rm = await room(); const ms = Date.now() - t0;
    const added = rm.walls.slice(before); console.log(`${k.padEnd(15)} toast="${t}" added=${added.length} in ${ms} ms method=${rm.method} ceiling_m2=${rm.ceiling_m2} ${added.slice(0, 3).map(w => w.width_mm + 'x' + w.height_mm + ' paint ' + w.paint_area_m2 + ' openings ' + JSON.stringify(w.openings)).join(' ; ')}`);
    if (k === 'negmm.json') { ok(added.every(w => w.width_mm > 0 && w.paint_area_m2 <= w.gross_area_m2 && w.paint_area_m2 >= 0), 'negmm: no negative widths, paint area within [0, gross] (actual ' + added.map(w => w.paint_area_m2 + '/' + w.gross_area_m2).join(', ') + ')'); }
    if (k === 'neg.json') ok(added.length === 1 && added[0].width_mm === 3000, 'neg dims skipped, positive kept');
    if (k === 'garbage.json' || k === 'null.json' || k === 'nullwall.json') ok(/not a RoomPlan/.test(t) && added.length === 0, k + ': rejected with toast');
    if (k === 'empty.json' || k === 'array.json') ok(added.length === 0, k + ': nothing added (toast "' + t + '")');
    if (k === 'nan.json') ok(added.length === 0 || added.every(w => isFinite(w.width_mm) && w.width_mm < 100000), 'nan/absurd dims: ' + added.map(w => w.width_mm + 'x' + w.height_mm).join(','));
    if (k === 'hugepad.json') ok(ms < 15000 && errors.length === 0, 'huge file handled in ' + ms + ' ms');
    if (k === 'manywalls.json') { const saved = await p.evaluate(() => { try { return localStorage.getItem('qc-app-v1').length; } catch (e) { return -1; } }); ok(ms < 15000, '5000 walls imported in ' + ms + ' ms, store bytes ' + saved); }
  }
  // does the state survive a reload (was the store saved)?
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(300); const rm2 = await room(); console.log('after reload walls =', rm2.walls.length);
  ok(errors.length === 0, 'no page errors (' + errors.join(' | ').slice(0, 200) + ')');
  await b.close(); srv.close(); console.log(fails() ? 'FAILURES ' + fails() : 'ALL PASSED'); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
