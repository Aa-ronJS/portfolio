// XSS, tier 2: reset the canary per screen and locate the injected node; UI-typeable fields vs import-only fields separately.
const { boot } = require('./h.cjs');
(async () => {
  const t = await boot(); const { p, ok } = t;
  const P1 = '<img src=x onerror="window.__xss=1">', P2 = '"><svg onload=window.__xss=1>';
  async function seed(pl, tier) {
    return p.evaluate(([pl, tier]) => {
      const store = window.__qcApp.store; store.reset(); const S = store.load();
      // UI tier: only fields a user can type in the app (settings text inputs, job/client fields, room/wall/extra names)
      Object.assign(S.details, { trading_name: pl, owner_name: pl, bsb: '063-000', account_number: '1', account_name: pl, sign_off: pl, other_payments: pl, postcode: '5000', address: pl, abn: pl, email: pl, phone: pl });
      S.wording.included = [pl]; S.wording.excluded = [pl]; S.wording.accept = pl; S.follow_up.quote_days = [1];
      const j = store.newJob(); j.client = { name: pl, phone: pl, email: pl, address: pl + ' 5118' }; j.summary = pl; j.notes = pl;
      const r = store.newRoom('interior'); r.name = pl; r.L = 4; r.W = 3; r.method = 'measured'; r.walls = [{ wall: pl, width_mm: 4000, height_mm: 2400, gross_area_m2: 9.6, openings: [], paint_area_m2: 8, method: 'photo', expected_error_pct: 2 }]; j.rooms.push(r);
      const r2 = store.newRoom('exterior'); r2.name = pl; r2.ext = { weatherboard: 10 }; j.rooms.push(r2);
      j.extras.push({ desc: pl, qty: 1, unit: pl, rate: 50, confirm: true });
      const pr = window.__qcApp.pricing.priceJob(j, S);
      j.quote = { date: store.addDays(store.today(), -20), lines: pr.lines, subtotal: pr.subtotal, gst: pr.gst, total: pr.total, deposit: pr.deposit, assumptions: pr.assumptions }; j.status = 'quoted'; j.sent_date = j.quote.date;
      j.invoices = [{ no: 'INV-2001', kind: 'deposit', kind_line: 'x', date: store.addDays(store.today(), -20), due: store.addDays(store.today(), -10), lines: [{ desc: pl, amount: 100 }], subtotal: 100, gst: 10, total: 110, paid_date: '' }];
      j.booking = { start: store.today(), days: 2, end: store.addDays(store.today(), 2), end_inclusive: store.addDays(store.today(), 1), hour: 7, gcal: 'https://calendar.google.com/' };
      j.visit = { date: store.addDays(store.today(), 1), start_min: 540, minutes: 30, why: 'x', gcal: 'https://calendar.google.com/' }; j.ballpark = { low: 100, high: 200 }; j.picks = [{ type: 'bedroom', size: 'M', n: 1 }];
      if (tier === 'import') { // fields only a crafted backup can set
        j.invoices[0].pay_url = 'https://buy.stripe.com/' + pl; j.invoices[0].follow_ups = [{ id: 'f1', day: store.addDays(store.today(), 3), channel: pl, what: pl }];
        j.follow_ups = [{ id: 'f2', day: store.addDays(store.today(), 3), channel: pl, what: pl }]; j.booking.gcal = 'https://calendar.google.com/?text=' + pl; j.visit.why = pl; j.visit.gcal = 'javascript:window.__xss=1';
      }
      store.save(); return { id: j.id, rid: r.id, rid2: r2.id };
    }, [pl, tier]);
  }
  for (const tier of ['ui', 'import']) for (const [pl, label] of [[P1, 'img'], [P2, 'svg']]) {
    const ids = await seed(pl, tier);
    const routes = ['#/', '#/job/' + ids.id, '#/job/' + ids.id + '/room/' + ids.rid, '#/job/' + ids.id + '/room/' + ids.rid2, '#/job/' + ids.id + '/quote', '#/job/' + ids.id + '/invoice', '#/chase', '#/enquiry', '#/enquiry/' + ids.id, '#/settings', '#/help'];
    for (const h of routes) {
      await p.evaluate(() => { window.__xss = undefined; document.getElementById('app').innerHTML = ''; }); t.drainErrors(); await t.go(h, 250); const e = t.drainErrors(); const x = await p.evaluate(() => window.__xss);
      const where = await p.$$eval('#app img[src="x"], #app svg', els => els.map(el => { const par = el.parentElement; return (par.tagName + (par.className ? '.' + par.className : '') + ' > ' + par.outerHTML.slice(0, 140)).replace(/\s+/g, ' '); }));
      ok(x === undefined && !e.length, `[${tier}/${label}] ${h.replace(ids.id, 'ID').replace(ids.rid, 'RID').replace(ids.rid2, 'RID2')} -> __xss=${x}` + (where.length ? ' via ' + where.join(' || ') : '') + (e.length ? ' ERR ' + e[0].split('\n')[0] : ''));
    }
  }
  await t.done();
})().catch(e => { console.error(e); process.exit(1); });
