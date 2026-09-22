// Import/export round trip, bad imports, sparse backups, big backups, localStorage quota and corruption.
const { boot, SP, fs } = require('./h.cjs');
(async () => {
  const t = await boot(); const { p, ok } = t;
  p.on('download', d => d.delete().catch(() => {}));
  const backup = fs.readFileSync(SP + '/apptest/backup.json', 'utf8');
  const screens = ['#/', '#/settings', '#/chase', '#/enquiry', '#/help'];
  async function visitAll(extra) { const out = {}; for (const h of screens.concat(extra || [])) { t.drainErrors(); await t.go(h, 150); const e = t.drainErrors(); const txt = await p.$eval('#app', x => x.innerText).catch(() => ''); out[h] = { errors: e, empty: txt.trim().length < 5 }; } return out; }
  const allClean = (r) => Object.keys(r).every(k => !r[k].errors.length && !r[k].empty);
  const fmt = r => Object.keys(r).filter(k => r[k].errors.length || r[k].empty).map(k => k + ': ' + (r[k].errors[0] || 'blank screen').split('\n')[0]).join(' | ');

  // 1. export -> wipe -> import -> identical
  await p.evaluate(j => window.__qcApp.store.importAll(j), backup);
  const exp1 = await p.evaluate(() => window.__qcApp.store.exportAll());
  await p.evaluate(() => window.__qcApp.store.reset()); const afterWipe = await p.evaluate(() => window.__qcApp.store.load().jobs.length); ok(afterWipe === 0, 'wipe clears jobs');
  await p.evaluate(j => window.__qcApp.store.importAll(j), exp1); const exp2 = await p.evaluate(() => window.__qcApp.store.exportAll());
  const strip = (x) => { const o = JSON.parse(x); delete o.rev; delete o.saved_at; return JSON.stringify(o); }; ok(strip(exp1) === strip(exp2), 'export -> wipe -> import -> export is identical (save counter aside)'); if (exp1 !== exp2) { const a = JSON.parse(exp1), b = JSON.parse(exp2); Object.keys(a).forEach(k => { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) t.note('differs: ' + k); }); }
  // export via the Settings button
  await t.go('#/settings'); await p.waitForSelector('#export'); const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('#export')]); ok(dl && /chasem-backup-\d{4}-\d\d-\d\d\.json/.test(dl.suggestedFilename()), 'Save back-up downloads a dated JSON');

  // 2. bad imports through the UI file picker
  async function importText(txt, name) { await t.go('#/settings'); await p.waitForSelector('#import'); await p.setInputFiles('#import', { name: name || 'b.json', mimeType: 'application/json', buffer: Buffer.from(txt) }); await p.waitForTimeout(250); return p.$eval('#toast', e => e.textContent); }
  const jobsBefore = await p.evaluate(() => window.__qcApp.store.load().jobs.length);
  let m = await importText('garbage {{{'); ok(/Unexpected|JSON|not valid/i.test(m), 'garbage import -> error toast: ' + m);
  m = await importText('{}'); ok(/Not a Chasem/.test(m), '{} import -> rejected: ' + m);
  m = await importText('[]'); ok(/Not a Chasem/.test(m), '[] import -> rejected: ' + m);
  m = await importText('null'); ok(/Not a Chasem|Cannot/.test(m) && !t.errors.length, 'null import -> rejected: ' + m);
  m = await importText('"hello"'); ok(/Not a Chasem|Cannot/.test(m) && !t.errors.length, '"hello" import -> rejected: ' + m);
  const jobsAfter = await p.evaluate(() => window.__qcApp.store.load().jobs.length); ok(jobsAfter === jobsBefore, 'bad imports left data intact');
  // backup with jobs but missing settings groups
  const sparse = JSON.parse(backup); delete sparse.costing; delete sparse.follow_up; delete sparse.stripe; delete sparse.sending; delete sparse.booking; delete sparse.wording; delete sparse.rules; delete sparse.next_quote;
  m = await importText(JSON.stringify(sparse)); ok(/Restored/.test(m), 'sparse backup imports: ' + m);
  const jid = await p.evaluate(() => window.__qcApp.store.load().jobs[0].id);
  let r = await visitAll(['#/job/' + jid, '#/job/' + jid + '/quote', '#/job/' + jid + '/invoice', '#/enquiry/' + jid]); ok(allClean(r), 'sparse backup: every screen renders without errors' + (allClean(r) ? '' : ' -- ' + fmt(r)));
  const filled = await p.evaluate(() => { const S = window.__qcApp.store.load(); return !!(S.costing.paint_price && S.follow_up.invoice_days && S.stripe && S.sending && S.booking && S.wording.included && S.rules.minimum_job); }); ok(filled, 'sparse backup: defaults filled for missing groups');
  // follow_up present but partial (invoice_days missing)
  const partial = JSON.parse(backup); partial.follow_up = { quote_days: [3] }; partial.wording = { accept: 'x' }; partial.costing = { labour_rate: 70 };
  m = await importText(JSON.stringify(partial)); r = await visitAll(['#/job/' + jid + '/quote', '#/job/' + jid + '/invoice']); ok(allClean(r), 'partial follow_up/wording/costing groups: screens render' + (allClean(r) ? '' : ' -- ' + fmt(r)));
  // jobs missing fields (client, rooms, invoices, extras)
  const thin = JSON.parse(backup); thin.jobs = [{ id: 'thin1', quote_no: 'Q-1', status: 'draft' }, { id: 'thin2', quote_no: 'Q-2', status: 'quoted', client: { name: 'X' }, quote: { total: 100, date: '2026-01-01', lines: [] }, rooms: [{ id: 'r', type: 'interior', method: 'measured' }] }];
  m = await importText(JSON.stringify(thin)); t.drainErrors(); r = await visitAll(['#/job/thin1', '#/job/thin2', '#/job/thin2/quote', '#/job/thin2/invoice', '#/job/thin2/room/r', '#/enquiry/thin1']);
  ok(allClean(r), 'backup whose jobs lack client/rooms/invoices: screens render' + (allClean(r) ? '' : ' -- ' + fmt(r)));
  // wall records lacking fields (paint_area_m2 string, no openings)
  const wl = JSON.parse(backup); wl.jobs = [{ id: 'w1', quote_no: 'Q-1', status: 'draft', client: { name: 'W', phone: '', email: '', address: '' }, summary: '', extras: [], invoices: [], rooms: [{ id: 'r', name: 'R', type: 'interior', method: 'measured', walls: [{ wall: 'A', width_mm: '4000', height_mm: 2400, paint_area_m2: '9.6', method: 'photo', expected_error_pct: 2 }], surfaces: {}, ext: {} }] }];
  m = await importText(JSON.stringify(wl)); r = await visitAll(['#/job/w1', '#/job/w1/room/r', '#/job/w1/quote']); ok(allClean(r), 'wall record with string area / no openings: screens render' + (allClean(r) ? '' : ' -- ' + fmt(r)));

  // 3. very large backup: 300 jobs
  const big = JSON.parse(backup); const proto = big.jobs.find(j => j.invoices && j.invoices.length) || big.jobs[0]; big.jobs = [];
  for (let i = 0; i < 300; i++) { const j = JSON.parse(JSON.stringify(proto)); j.id = 'big' + i; j.quote_no = 'Q-' + (5000 + i); j.client.name = 'Client ' + i; j.status = ['quoted', 'invoiced', 'draft', 'accepted'][i % 4]; j.sent_date = '2026-08-01'; if (j.invoices) j.invoices.forEach((inv, k) => { inv.no = 'INV-' + (9000 + i * 3 + k); inv.due = '2026-08-1' + (k % 9); inv.paid_date = ''; }); big.jobs.push(j); }
  const bigTxt = JSON.stringify(big); t.note('300-job backup is ' + (bigTxt.length / 1024).toFixed(0) + ' KB');
  const t0 = Date.now(); m = await importText(bigTxt); ok(/Restored/.test(m), '300-job backup imports in ' + (Date.now() - t0) + ' ms: ' + m);
  for (const h of ['#/', '#/chase', '#/settings', '#/enquiry', '#/job/big7', '#/job/big7/quote', '#/job/big7/invoice']) { const s0 = Date.now(); t.drainErrors(); await p.evaluate(h => { location.hash = h; }, h); await p.waitForFunction(() => document.querySelector('#app').children.length > 0); const dt = Date.now() - s0; const e = t.drainErrors(); ok(dt < 3000 && !e.length, `big backup: ${h} rendered in ${dt} ms` + (e.length ? ' ERR ' + e[0] : '')); }
  const chaseRows = await p.evaluate(() => { location.hash = '#/chase'; return new Promise(r => setTimeout(() => r(document.querySelectorAll('#app .card').length), 300)); }); t.note('chase screen cards with 300 jobs: ' + chaseRows);
  const st0 = Date.now(); await p.evaluate(() => { const S = window.__qcApp.store.load(); S.details.owner_name = 'x'; window.__qcApp.store.save(); }); t.note('save() with 300 jobs took ' + (Date.now() - st0) + ' ms');

  // 4. localStorage quota exceeded
  await p.evaluate(j => window.__qcApp.store.importAll(j), backup);
  await p.evaluate(() => { const orig = Storage.prototype.setItem; window.__origSet = orig; Storage.prototype.setItem = function () { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }; });
  await t.go('#/settings'); await p.waitForSelector('[data-bind="details.trading_name"]'); await p.fill('[data-bind="details.trading_name"]', 'Quota Co'); await p.waitForTimeout(100);
  let toast = await t.toast(); ok(/Could not save/.test(toast) && !t.errors.length, 'quota exceeded on a settings edit -> toast "' + toast + '", no crash');
  await t.go('#/'); await p.waitForSelector('#newjob'); await p.evaluate(() => { document.getElementById('toast').hidden = true; document.getElementById('toast').textContent = ''; }); await p.click('#newjob'); await p.waitForTimeout(200); toast = await t.toast();
  ok(/Could not save/.test(toast), 'quota exceeded on New job -> user warned (toast: "' + toast + '")');
  ok(!t.errors.length, 'quota exceeded: no page errors');
  // import while storage throws: toasts Restored but data reverts?
  await t.go('#/settings'); await p.evaluate(() => { document.getElementById('toast').hidden = true; document.getElementById('toast').textContent = ''; }); const nm0 = await p.evaluate(() => window.__qcApp.store.load().details.trading_name);
  const alt = JSON.parse(backup); alt.details.trading_name = 'Imported While Full'; m = await importText(JSON.stringify(alt)); const nm1 = await p.evaluate(() => window.__qcApp.store.load().details.trading_name);
  ok(!/Restored/.test(m) || nm1 === 'Imported While Full', 'import when storage is full: toast "' + m + '" but trading_name is now "' + nm1 + '" (was "' + nm0 + '")');
  await p.evaluate(() => { Storage.prototype.setItem = window.__origSet; });

  // 5. corrupt / odd JSON in the key before load
  async function bootWith(raw) { await p.evaluate(r => { localStorage.setItem('qc-app-v1', r); }, raw); t.drainErrors(); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(200); const e = t.drainErrors(); const txt = await p.$eval('#app', x => x.innerText).catch(() => ''); const hooks = await p.evaluate(() => !!window.__qcApp); return { errors: e, rendered: txt.trim().length > 5, hooks }; }
  for (const [raw, label] of [['{not json', 'truncated JSON'], ['null', 'null'], ['"a string"', 'a JSON string'], ['42', 'a number'], ['[]', 'an array'], ['true', 'true'], ['{"jobs":"nope","details":5,"prices":[]}', 'wrong types']]) {
    const res = await bootWith(raw); ok(res.errors.length === 0 && res.rendered && res.hooks, `corrupt key = ${label}: app starts with defaults` + (res.errors.length ? ' -- ' + res.errors[0].split('\n')[0] : res.rendered ? '' : ' -- blank screen'));
  }
  await p.evaluate(() => localStorage.removeItem('qc-app-v1'));
  await t.done();
})().catch(e => { console.error(e); process.exit(1); });
