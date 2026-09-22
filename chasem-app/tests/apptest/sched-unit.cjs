// Scheduler logic in Node: load the browser modules into a fake window.
const fs = require('fs'), vm = require('vm'); const A = require('path').join(__dirname, '../..') + '/';
const ctx = vm.createContext({ console }); ctx.window = ctx;
for (const f of ['postcodes.js', 'geo.js', 'costing.js', 'store.js', 'pricing.js', 'schedule.js']) vm.runInContext(fs.readFileSync(A + f, 'utf8').replace(/localStorage/g, 'undefined'), ctx);
const W = ctx.window; W.QCStore.load = () => S; // bypass localStorage
const S = W.QCStore.defaults(); S.details.postcode = '5000'; S.booking = { start_hour: 7, end_hour: 15, quote_from: 7, quote_to: 18, visit_minutes: 30 };
Object.assign(W, { QCStore: Object.assign(W.QCStore, { today: () => '2026-09-21', addDays: (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); } }) });
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const Sch = W.QCSched;
console.log('travel minutes: 5000->5000', Sch.travelMin('5000', '5000'), ' 5000->5118 Gawler', Sch.travelMin('5000', '5118'), ' 5000->5251 Mt Barker', Sch.travelMin('5000', '5251'), ' 5118->5251', Sch.travelMin('5118', '5251'), ' 5118->5120', Sch.travelMin('5118', '5120'));
ok(Sch.travelMin('5000', '5000') < 15 && Sch.travelMin('5000', '5118') > 40 && Sch.travelMin('5118', '5251') > 60, 'travel minutes scale with distance');
// Tuesday 22 Sep: job at Gawler 7:00-15:00, quote visit at Elizabeth 5112 at 16:00
const jobs = [
  { id: 'a', quote_no: 'Q1', client: { name: 'Gawler job', address: '1 Main St Gawler SA 5118' }, booking: { start: '2026-09-22', end: '2026-09-23', hour: 7, days: 1 } },
  { id: 'b', quote_no: 'Q2', client: { name: 'Elizabeth visit', address: '2 Side St Elizabeth SA 5112' }, visit: { date: '2026-09-22', start_min: 16 * 60 + 30, minutes: 30 } },
];
const near = Sch.suggest({ jobs, settings: S, address: '9 Near St Willaston SA 5118', minutes: 30, days: 5 });
console.log('near Gawler:', near.slots.slice(0, 3).map(s => `${s.date} ${Sch.nice(s.start_min)} detour ${s.detour} (${s.why})`).join(' | '));
ok(near.slots[0].date === '2026-09-22' && near.slots[0].start_min >= 15 * 60 && near.slots[0].start_min < 16 * 60, 'an enquiry next to the Gawler job is slotted right after it, before Elizabeth (' + near.slots[0].date + ' ' + Sch.nice(near.slots[0].start_min) + ')');
const far = Sch.suggest({ jobs, settings: S, address: '5 Hill Rd Mount Barker SA 5251', minutes: 30, days: 5 });
console.log('Mt Barker:', far.slots.slice(0, 3).map(s => `${s.date} ${Sch.nice(s.start_min)} detour ${s.detour} (${s.why})`).join(' | '));
const tueFar = far.slots.filter(s => s.date === '2026-09-22');
ok(!tueFar.some(s => s.start_min >= 15 * 60 && s.start_min < 16 * 60 + 30), 'Mount Barker is never squeezed between the Gawler job and the Elizabeth visit');
ok(far.slots[0].date !== '2026-09-22' || far.slots[0].detour < 60, 'best Mount Barker slot is on a clearer day or a low-detour gap: ' + far.slots[0].date + ' ' + Sch.nice(far.slots[0].start_min));
const unknown = Sch.suggest({ jobs, settings: S, address: 'no postcode here', minutes: 30, days: 3 }); ok(!unknown.known && unknown.slots.length > 0, 'unknown postcode still gets slots (flagged not known)');
// ballpark
const bp = Sch.ballpark([{ type: 'lounge', size: 'M', n: 1 }, { type: 'bedroom', size: 'M', n: 2 }], 'fair', S, '');
console.log('ballpark', bp.low, bp.mid, bp.high, 'rooms', bp.rooms.length);
ok(bp.rooms.length === 3 && bp.low < bp.mid && bp.mid < bp.high && bp.low % 50 === 0 && bp.mid > 1500, 'ballpark range from presets and the price list');
console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
