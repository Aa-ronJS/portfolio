// XSS: hostile strings in every user field, every screen visited; href attribute breakout on Chase; import-only vectors.
const { boot } = require('./h.cjs');
(async () => {
  const t = await boot(); const { p, ok } = t;
  const P1 = '<img src=x onerror="window.__xss=1">', P2 = '"><svg onload=window.__xss=1>';
  const xss = () => p.evaluate(() => window.__xss);
  async function seed(payload) {
    return p.evaluate(pl => {
      const store = window.__qcApp.store; store.reset(); const S = store.load();
      S.account = { email: 'test@example.com', joined: store.today(), offline: true }; // reset wipes the account; the app shows the join screen without one
      Object.assign(S.details, { trading_name: pl, owner_name: pl, bsb: '063-000', account_number: '1', account_name: pl, sign_off: pl, other_payments: pl, postcode: '5000', address: pl, abn: pl, email: pl, phone: pl });
      S.wording.included = [pl]; S.wording.excluded = [pl]; S.wording.accept = pl; S.follow_up.quote_days = [1];
      const j = store.newJob(); j.client = { name: pl, phone: pl, email: pl, address: pl + ' 5118' }; j.summary = pl; j.notes = pl;
      const r = store.newRoom('interior'); r.name = pl; r.L = 4; r.W = 3; r.method = 'measured'; r.walls = [{ wall: pl, width_mm: 4000, height_mm: 2400, gross_area_m2: 9.6, openings: [], paint_area_m2: 8, method: 'photo', expected_error_pct: 2 }]; j.rooms.push(r);
      const r2 = store.newRoom('exterior'); r2.name = pl; r2.ext = { weatherboard: 10 }; j.rooms.push(r2);
      j.extras.push({ desc: pl, qty: 1, unit: pl, rate: 50, confirm: true }); j.extras.push({ desc: pl, qty: 1, unit: 'each', rate: '', confirm: false });
      const pr = window.__qcApp.pricing.priceJob(j, S);
      j.quote = { date: store.addDays(store.today(), -20), lines: pr.lines, subtotal: pr.subtotal, gst: pr.gst, total: pr.total, deposit: pr.deposit, assumptions: pr.assumptions }; j.status = 'quoted'; j.sent_date = j.quote.date;
      j.invoices = [{ no: 'INV-2001', kind: 'deposit', kind_line: 'x', date: store.addDays(store.today(), -20), due: store.addDays(store.today(), -10), lines: [{ desc: pl, amount: 100 }], subtotal: 100, gst: 10, total: 110, paid_date: '', pay_url: 'https://buy.stripe.com/' + pl, follow_ups: [{ id: 'f1', day: store.addDays(store.today(), 3), channel: pl, what: pl }] }];
      j.follow_ups = [{ id: 'f2', day: store.addDays(store.today(), 3), channel: pl, what: pl }];
      j.booking = { start: store.today(), days: 2, end: store.addDays(store.today(), 2), end_inclusive: store.addDays(store.today(), 1), hour: 7, gcal: 'https://calendar.google.com/?text=' + pl };
      j.visit = { date: store.addDays(store.today(), 1), start_min: 540, minutes: 30, why: pl, gcal: 'javascript:window.__xss=1' };
      j.ballpark = { low: 100, high: 200 }; j.picks = [{ type: 'bedroom', size: 'M', n: 1 }];
      store.save(); return { id: j.id, rid: r.id, rid2: r2.id };
    }, payload);
  }
  for (const [pl, label] of [[P1, 'img onerror'], [P2, 'svg onload breakout']]) {
    const ids = await seed(pl);
    const routes = ['#/', '#/job/' + ids.id, '#/job/' + ids.id + '/room/' + ids.rid, '#/job/' + ids.id + '/room/' + ids.rid2, '#/job/' + ids.id + '/quote', '#/job/' + ids.id + '/invoice', '#/chase', '#/enquiry', '#/enquiry/' + ids.id, '#/settings', '#/help'];
    for (const h of routes) { t.drainErrors(); await t.go(h, 250); const e = t.drainErrors(); const x = await xss(); const imgs = await p.$$eval('#app img[src="x"], #app svg', els => els.length); ok(x === undefined && e.length === 0 && imgs === 0, `${label}: ${h} -> __xss=${x}, injected nodes=${imgs}` + (e.length ? ' ERR ' + e[0].split('\n')[0] : '')); }
    // Chase hrefs
    await t.go('#/chase', 250); const hrefs = await p.$$eval('#app a[href^="sms:"], #app a[href^="mailto:"]', as => as.map(a => a.getAttribute('href')));
    ok(hrefs.length >= 2, label + ': chase has sms:/mailto: links (' + hrefs.length + ')');
    hrefs.forEach(h => { const raw = /[<>"]/.test(h); ok(!raw, label + ': href has no raw <>" characters: ' + h.slice(0, 90)); });
    const strayAttrs = await p.$$eval('#app a', as => as.filter(a => a.hasAttribute('onload') || a.hasAttribute('onerror')).length); ok(strayAttrs === 0, label + ': no injected event attributes on anchors');
    // job-name in the PDF filename
    const fn = await p.evaluate(() => { const j = window.__qcApp.store.load().jobs[0]; return j.quote_no + ' ' + (j.client.name || 'quote').replace(/[^\w ]+/g, '') + '.pdf'; }); ok(!/[<>"]/.test(fn), label + ': PDF filename sanitised: ' + fn);
  }
  // Import-only vectors: logo, pay_url javascript:, id with quotes
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.details.logo = '"><img src=x onerror="window.__xss=2">'; window.__qcApp.store.save(); });
  t.drainErrors(); await t.go('#/settings', 300); let x = await xss(); ok(x === undefined, 'settings: logo string from a backup is not injected as HTML (__xss=' + x + ')');
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.details.logo = ''; const j = S.jobs[0]; j.invoices[0].pay_url = 'javascript:window.__xss=3'; window.__qcApp.store.save(); });
  await t.go('#/job/' + (await p.evaluate(() => window.__qcApp.store.load().jobs[0].id)) + '/invoice', 200); const jsHref = await p.$$eval('#app a', as => as.filter(a => /^javascript:/i.test(a.getAttribute('href') || '')).length);
  ok(jsHref === 0, 'invoice screen: javascript: pay_url from a backup is not rendered as a clickable href (' + jsHref + ' found)');
  const idJob = await p.evaluate(() => { const S = window.__qcApp.store.load(); const j = window.__qcApp.store.newJob(); j.id = 'x"><img src=x onerror="window.__xss=4">'; j.client.name = 'idjob'; window.__qcApp.store.save(); return j.id; });
  t.drainErrors(); await t.go('#/', 250); x = await xss(); ok(x === undefined, 'home: hostile job id from a backup does not execute (__xss=' + x + ')');
  ok(t.errors.length === 0, 'no page errors during XSS tests');
  await t.done();
})().catch(e => { console.error(e); process.exit(1); });
