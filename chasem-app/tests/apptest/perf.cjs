const L = require(require('path').join(__dirname, '..') + '/smoke/shell/lib.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const { srv, base } = await L.serve(L.ROOT); const b = await L.launch(); const ctx = await b.newContext({ ...L.devices['iPhone 13'] }); const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto(base + '#/', { waitUntil: 'load' }); await p.evaluate(L.seedJs);
  await p.evaluate(() => { const st = window.__qcApp.store, S = st.load(); const proto = S.jobs.find(j => j.invoices && j.invoices.length); const jobs = []; for (let i = 0; i < 300; i++) { const j = JSON.parse(JSON.stringify(proto)); j.id = 'big' + i; j.quote_no = 'Q-' + (5000 + i); j.client.name = 'Client ' + i; j.status = ['quoted', 'invoiced', 'draft', 'accepted'][i % 4]; j.sent_date = '2026-08-01'; (j.invoices || []).forEach((inv, k) => { inv.no = 'INV-' + (9000 + i * 3 + k); inv.due = '2026-08-1' + (k % 9); inv.paid_date = ''; inv.payments = []; }); jobs.push(j); } S.jobs = jobs; st.save(); });
  await p.reload({ waitUntil: 'load' }); await sleep(300);
  const prof = await p.evaluate(async (hashes) => {
    const T = {}; const wrap = (obj, name, label) => { const f = obj[name]; if (typeof f !== 'function') return; obj[name] = function () { const t0 = performance.now(); try { return f.apply(this, arguments); } finally { const k = label || name; T[k] = T[k] || { n: 0, ms: 0 }; T[k].n++; T[k].ms += performance.now() - t0; } }; };
    ['isHoliday', 'holidays', 'isBusinessDay', 'nextBusinessDay', 'nextSendTime', 'ics', 'googleUrl'].forEach(k => wrap(QCCal, k, 'QCCal.' + k));
    ['suggest', 'ballpark', 'dayItems', 'travelMin', 'km'].forEach(k => wrap(QCSched, k, 'QCSched.' + k));
    ['priceJob', 'depositPct', 'depositCap'].forEach(k => wrap(QCPricing, k, 'QCPricing.' + k));
    ['breakdown', 'tinsFor', 'deriveRates', 'deriveDiff', 'unitCost'].forEach(k => wrap(QCCosting, k, 'QCCosting.' + k));
    ['travel', 'distance', 'postcodeOf'].forEach(k => wrap(QCGeo, k, 'QCGeo.' + k));
    ['chaseText', 'lastContact', 'pendingFollowUps', 'waitingFollowUps', 'clients', 'greet', 'jobDesc'].forEach(k => wrap(window.__qcApp, k, 'app.' + k));
    wrap(window.__qcApp.store, 'load', 'store.load'); wrap(window.__qcApp.store, 'save', 'store.save');
    const out = {};
    for (const h of hashes) { location.hash = h; const t0 = performance.now(); window.__qcApp.route(); out[h] = Math.round(performance.now() - t0); }
    const top = Object.entries(T).sort((a, b) => b[1].ms - a[1].ms).slice(0, 14).map(([k, v]) => k + ': ' + Math.round(v.ms) + ' ms / ' + v.n + ' calls');
    return { out, top, logLen: (window.__qcApp.store.load().log && window.__qcApp.store.load().log.sent || []).length };
  }, ['#/chase', '#/settings', '#/', '#/enquiry']);
  console.log(JSON.stringify(prof, null, 1)); await b.close(); srv.close(); console.log('ALL PASSED (profile only, nothing asserted)'); })();
