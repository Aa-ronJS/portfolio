// Scheduler, calendar and Stripe client logic in Node: browser modules loaded into a vm context. Run: node unit.cjs  (also with TZ=Australia/Adelaide)
const fs = require('fs'), vm = require('vm'); const A = require('path').join(__dirname, '../../..') + '/';
const ctx = vm.createContext({ console, setTimeout, clearTimeout }); ctx.window = ctx;
for (const f of ['postcodes.js', 'geo.js', 'costing.js', 'cal.js', 'stripe.js', 'store.js', 'pricing.js', 'schedule.js']) vm.runInContext(fs.readFileSync(A + f, 'utf8').replace(/localStorage/g, 'undefined'), ctx);
const W = ctx.window; let S = W.QCStore.defaults(); W.QCStore.load = () => S; S.details.postcode = '5000';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; }; const note = (m) => console.log('NOTE ' + m);
const Sch = W.QCSched, Cal = W.QCCal, St = W.QCStore, Stripe = W.QCStripe;
const RealDate = vm.runInContext('Date', ctx);
// Freeze the clock inside the vm at a given instant (schedule.js reads new Date() / Date.now() from the context global)
function freeze(iso) { if (!iso) { delete ctx.Date; return; } const fixed = new RealDate(iso).getTime(); const F = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(fixed); } static now() { return fixed; } }; ctx.Date = F; }
const fmt = (s) => s.date + ' ' + Sch.hm(s.start_min) + '-' + Sch.hm(s.end_min);
const dow = (iso) => new Date(iso + 'T00:00:00').getDay();
console.log('TZ=' + (process.env.TZ || '(system)') + ' now=' + new Date().toString());
(async () => {

// ---------- timezone sanity for the date helpers everything else builds on
{ const a = St.addDays('2026-09-22', 1), b = St.addDays('2026-09-22', 0), c = Cal.addDays('2026-09-22', 1);
  ok(a === '2026-09-23' && b === '2026-09-22' && c === '2026-09-23', 'QCStore.addDays / QCCal.addDays add whole days in this TZ (got +1=' + a + ', +0=' + b + ', cal +1=' + c + ')');
  const localToday = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
  ok(St.today() === localToday, 'QCStore.today() (UTC date) equals the local calendar date right now (' + St.today() + ' vs local ' + localToday + ')'); }
{ freeze('2026-09-21T22:30:00Z'); // 08:00 Tue 22 Sep in Adelaide, still Mon 21 Sep in UTC
  const t = St.today(), local = new ctx.Date(); const ld = local.getFullYear() + '-' + String(local.getMonth() + 1).padStart(2, '0') + '-' + String(local.getDate()).padStart(2, '0');
  ok(t === ld, 'at 08:00 local, QCStore.today() matches the local date (today()=' + t + ', local=' + ld + ')'); freeze(null); }

// ---------- scheduler
S.booking = { start_hour: 7, end_hour: 15, quote_from: 7, quote_to: 18, visit_minutes: 30, saturdays: true, sundays: false };
freeze('2026-09-21T02:00:00Z'); // Mon 21 Sep, 02:00 UTC = 11:30 Adelaide
const today = St.today(); note('scheduler tests run with frozen clock; today()=' + today + ' dow=' + dow(today));
{ const r = Sch.suggest({ jobs: [], settings: S, address: '1 Test St Adelaide SA 5000', minutes: 30, days: 14, count: 100 });
  const byDay = {}; r.slots.forEach(s => { byDay[s.date] = (byDay[s.date] || 0) + 1; });
  const days = Object.keys(byDay).sort(); const per = Object.values(byDay);
  note('no jobs: ' + r.slots.length + ' slots over ' + days.length + ' days, per day ' + JSON.stringify(per.slice(0, 5)) + ', first ' + fmt(r.slots[0]));
  const firstOf = {}; r.slots.forEach(s => { if (firstOf[s.date] == null || s.start_min < firstOf[s.date]) firstOf[s.date] = s.start_min; });
  const lateStarts = days.filter(d => d !== today && firstOf[d] !== 7 * 60);
  ok(r.slots.length > 0 && lateStarts.length === 0, 'no jobs: the first slot on every free day is 07:00' + (lateStarts.length ? ' (not on ' + lateStarts.join(', ') + ')' : ''));
  ok(per.every(n => n === 2), 'no jobs: 2 slots per day (actual per-day counts ' + JSON.stringify(per.slice(0, 4)) + ': one open gap gives one candidate)');
  ok(!days.some(d => dow(d) === 0) && days.some(d => dow(d) === 6), 'no jobs: Sundays skipped, Saturdays included by default');
  const r6 = Sch.suggest({ jobs: [], settings: S, address: '1 Test St Adelaide SA 5000', minutes: 30 }); ok(r6.slots.length === 6, 'default count is 6 (' + r6.slots.length + ')'); }
{ const jobs = []; for (let d = 0; d < 16; d++) { const day = St.addDays(today, d); jobs.push({ id: 'b' + d, quote_no: 'Q' + d, client: { name: 'B' + d, address: '1 X St Adelaide SA 5000' }, booking: { start: day, end: St.addDays(day, 1), hour: 7, days: 1 } }); }
  const S2 = JSON.parse(JSON.stringify(S)); S2.booking.end_hour = 18; W.QCStore.load = () => S2;
  const r = Sch.suggest({ jobs, settings: S2, address: '1 Test St Adelaide SA 5000', minutes: 30 }); ok(r.slots.length === 0, 'every day booked 07-18 for 14 days -> no slots (app shows "No free slot in the next two weeks")');
  const r2 = Sch.suggest({ jobs, settings: S, address: '1 Test St Adelaide SA 5000', minutes: 30 }); ok(r2.slots.length > 0 && r2.slots.every(s => s.start_min >= 15 * 60), 'every day booked 07-15 -> only after-job slots (' + (r2.slots[0] && fmt(r2.slots[0])) + ')');
  W.QCStore.load = () => S; }
{ const r = Sch.suggest({ jobs: [], settings: S, address: '1 Test St Adelaide SA 5000', minutes: 300, days: 3 }); ok(r.slots.length > 0 && r.slots.every(s => s.end_min <= 18 * 60), 'visit_minutes 300 fits before quote_to (' + fmt(r.slots[0]) + ')');
  const r2 = Sch.suggest({ jobs: [], settings: S, address: '1 Test St Adelaide SA 5000', minutes: 700, days: 3 }); ok(r2.slots.length === 0, 'visit longer than the window -> no slots');
  const S3 = JSON.parse(JSON.stringify(S)); S3.booking.visit_minutes = 300; const r3 = Sch.suggest({ jobs: [], settings: S3, address: '1 Test St Adelaide SA 5000', days: 3 }); ok(r3.minutes === 300, 'visit_minutes setting used when opts.minutes absent'); }
{ const S3 = JSON.parse(JSON.stringify(S)); S3.booking.quote_from = 18; S3.booking.quote_to = 7; const r = Sch.suggest({ jobs: [], settings: S3, address: '1 Test St Adelaide SA 5000', days: 3 }); ok(r.slots.length === 0, 'quote_from > quote_to -> no slots (no crash; app hints to check hours)');
  const S4 = JSON.parse(JSON.stringify(S)); S4.booking.quote_from = 'abc'; S4.booking.quote_to = ''; const r4 = Sch.suggest({ jobs: [], settings: S4, address: '1 Test St Adelaide SA 5000', days: 3 }); ok(r4.slots.length > 0 && r4.slots[0].start_min === 7 * 60, 'garbage quote_from/to fall back to 7-18'); }
{ const S3 = JSON.parse(JSON.stringify(S)); S3.booking.saturdays = false; S3.booking.sundays = true; const r = Sch.suggest({ jobs: [], settings: S3, address: '1 Test St Adelaide SA 5000', days: 14, count: 50 });
  const ds = r.slots.map(s => dow(s.date)); ok(!ds.includes(6) && ds.includes(0), 'saturdays=false, sundays=true toggles respected');
  const S5 = JSON.parse(JSON.stringify(S)); delete S5.booking.saturdays; const r5 = Sch.suggest({ jobs: [], settings: S5, address: '1 Test St Adelaide SA 5000', days: 14, count: 50 }); ok(r5.slots.map(s => dow(s.date)).includes(6), 'saturdays undefined (old store) -> treated as on'); }
{ const start = St.addDays(today, 2), job = { id: 'm', quote_no: 'Qm', client: { name: 'Multi', address: '1 X St Adelaide SA 5000' }, booking: { start, end: St.addDays(start, 3), days: 3, hour: 7 } };
  const blocked = [0, 1, 2, 3].map(i => Sch.dayItems([job], St.addDays(start, i), S).length);
  ok(blocked.join(',') === '1,1,1,0', '3-day booking blocks days 1-3 and not day 4 (dayItems per day: ' + blocked.join(',') + ')'); }
{ // double booking: book best slot, then suggest again for the same address
  const r1 = Sch.suggest({ jobs: [], settings: S, address: '9 Near St Willaston SA 5118', minutes: 30 }); const best = r1.slots[0];
  const booked = { id: 'v1', quote_no: 'Qv', client: { name: 'First', address: '9 Near St Willaston SA 5118' }, visit: { date: best.date, start_min: best.start_min, minutes: 30 } };
  const r2 = Sch.suggest({ jobs: [booked], settings: S, address: '9 Near St Willaston SA 5118', minutes: 30, count: 50 });
  const overlap = r2.slots.filter(s => s.date === best.date && s.start_min < best.end_min && s.end_min > best.start_min);
  ok(overlap.length === 0, 'second enquiry at the same address is not offered the booked slot or an overlap (first ' + fmt(best) + ', next same-day ' + (r2.slots.filter(s => s.date === best.date)[0] ? fmt(r2.slots.filter(s => s.date === best.date)[0]) : 'none') + ')');
  const after = r2.slots.filter(s => s.date === best.date && s.start_min >= best.end_min)[0]; ok(after && after.start_min - best.end_min >= 10, 'next same-day slot leaves travel time after the first visit (gap ' + (after ? after.start_min - best.end_min : '?') + ' min, same postcode = 3 km)'); }
{ // existing visit exactly at window end
  const day = St.addDays(today, 1), j = { id: 'e', quote_no: 'Qe', client: { name: 'Late', address: '1 X St Adelaide SA 5000' }, visit: { date: day, start_min: 17 * 60 + 30, minutes: 30 } };
  const r = Sch.suggest({ jobs: [j], settings: S, address: '2 Y St Adelaide SA 5000', minutes: 30, days: 2, count: 50 }); const sameDay = r.slots.filter(s => s.date === day);
  ok(sameDay.length > 0 && sameDay.every(s => s.end_min <= 17 * 60 + 30 - Sch.travelMin('5000', '5000')), 'visit ending at quote_to: only before-slots offered with travel margin (' + sameDay.map(fmt).join(', ') + ')');
  const j2 = { id: 'e2', quote_no: 'Qe2', client: { name: 'Over', address: '1 X St Adelaide SA 5000' }, visit: { date: day, start_min: 18 * 60, minutes: 60 } };
  const r2 = Sch.suggest({ jobs: [j2], settings: S, address: '2 Y St Adelaide SA 5000', minutes: 30, days: 2, count: 50 }); note('visit starting at quote_to and running past it: same-day slots ' + r2.slots.filter(s => s.date === day).map(fmt).join(', ')); }
{ // today after quote_to: freeze at 19:30 local (Adelaide is UTC+9:30 -> 10:00Z; UTC -> 19:30Z). Use TZ-aware offset.
  const off = -new RealDate().getTimezoneOffset() / 60; const ymd = today; const inst = new RealDate(ymd + 'T00:00:00Z').getTime() + (19.5 - off) * 3600000; freeze(new RealDate(inst).toISOString());
  const nowLocal = new ctx.Date(); const S3 = JSON.parse(JSON.stringify(S)); S3.booking.quote_to = nowLocal.getHours() - 1;
  const r = Sch.suggest({ jobs: [], settings: S3, address: '1 Test St Adelaide SA 5000', minutes: 30, days: 3, count: 50 });
  ok(!r.slots.some(s => s.date === St.today()), 'after quote_to today (local ' + nowLocal.getHours() + ':' + nowLocal.getMinutes() + ', quote_to ' + S3.booking.quote_to + ') -> no slot today; first ' + (r.slots[0] ? fmt(r.slots[0]) : 'none'));
  ok(r.slots.length > 0 && St.daysBetween(St.today(), r.slots[0].date) >= 1, 'first slot is on a later day (' + (r.slots[0] && r.slots[0].date) + ' vs today ' + St.today() + ')');
  // just inside the window: now+60 rounded should be the earliest
  const S4 = JSON.parse(JSON.stringify(S)); S4.booking.quote_to = 23; const r4 = Sch.suggest({ jobs: [], settings: S4, address: '1 Test St Adelaide SA 5000', minutes: 30, days: 1, count: 50 });
  const nowMin = nowLocal.getHours() * 60 + nowLocal.getMinutes(); ok(r4.slots.length === 1 && r4.slots[0].start_min >= nowMin + 60 && r4.slots[0].start_min % 15 === 0, 'today: earliest slot is >= now+60 rounded to 15 (' + (r4.slots[0] && fmt(r4.slots[0])) + ')');
  freeze('2026-09-21T02:00:00Z'); }
{ // 250 jobs
  const pcs = ['5000', '5118', '5112', '5251', '5251', '5159', '5068', '5045', '5107', '5162']; const jobs = [];
  for (let i = 0; i < 250; i++) { const d = St.addDays(today, i % 14), pc = pcs[i % pcs.length]; const j = { id: 'p' + i, quote_no: 'Q' + i, client: { name: 'J' + i, address: i + ' Load St Somewhere SA ' + pc } }; if (i % 3 === 0) j.booking = { start: d, end: St.addDays(d, 1 + (i % 2)), hour: 7, days: 1 + (i % 2) }; else j.visit = { date: d, start_min: 15 * 60 + 15 * (i % 8), minutes: 30 }; jobs.push(j); }
  const t0 = process.hrtime.bigint(); const r = Sch.suggest({ jobs, settings: S, address: '5 Hill Rd Mount Barker SA 5251', minutes: 30 }); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  ok(ms < 2000, '250 jobs with bookings/visits: suggest in ' + ms.toFixed(1) + ' ms, ' + r.slots.length + ' slots'); }
{ const same = Sch.suggest({ jobs: [], settings: S, address: 'Unit 2, 10 King William St Adelaide SA 5000', days: 2 }); ok(same.known && same.postcode === '5000' && /3 min|1[0-9] min/.test(same.slots[0].why), 'same postcode as base: known, ' + same.slots[0].why);
  const unk = Sch.suggest({ jobs: [], settings: S, address: '1 Nowhere Rd Somewhere 0001', days: 2 }); ok(!unk.known && unk.postcode === '0001' && unk.slots.length > 0, 'unknown postcode 0001: flagged not known, still slots, travel default ' + Sch.travelMin('5000', '0001') + ' min');
  const none = Sch.suggest({ jobs: [], settings: S, address: '', days: 2 }); ok(!none.known && none.postcode === '' && none.slots.length > 0, 'no address: slots still offered, postcode empty');
  const two = Sch.suggest({ jobs: [], settings: S, address: 'Unit 5000, 1 Long Rd Gawler SA 5118', days: 2 }); ok(two.postcode === '5118', 'address with two 4-digit numbers: last one is taken as the postcode (' + two.postcode + ')');
  note('"Unit 5000 ... 5118" -> ' + two.postcode + '; "PO Box 1234 Adelaide 5000" -> ' + Sch.suggest({ jobs: [], settings: S, address: 'PO Box 1234 Adelaide 5000', days: 1 }).postcode + '; "1 Main St Adelaide" -> "' + Sch.suggest({ jobs: [], settings: S, address: '1 Main St Adelaide', days: 1 }).postcode + '"');
  ok(Sch.travelMin('5000', '5000') === 11 && Sch.travelMin(null, '5000') === 20 && Sch.travelMin('5000', '') === 20, 'travelMin: same postcode 11 min, missing postcode 20 min'); }
freeze(null);

// ---------- ballpark
{ const z = Sch.ballpark([], 'good', S, ''); ok(z.rooms.length === 0 && z.low === 0 && z.high === 0, 'ballpark with zero picks -> $0 to $0 (app hides this behind "Add rooms")');
  const u = Sch.ballpark([{ type: 'garage', size: 'M', n: 2 }], 'good', S, ''); ok(u.rooms.length === 0, 'unknown room type skipped'); note('picks of only unknown types -> ' + u.low + ' to ' + u.high + ' (UI would show "$0 to $0" if such a job were imported)');
  const big = Sch.ballpark([{ type: 'bedroom', size: 'M', n: 50 }], 'good', S, ''); ok(big.rooms.length === 50 && big.low > 20000 && big.high > big.low && big.rooms[49].name === 'Bedroom 50', 'n=50 rooms: 50 rooms named 1..50, range ' + big.low + '-' + big.high);
  const bad = Sch.ballpark([{ type: 'bedroom', size: 'XL', n: 'two' }], 'good', S, ''); ok(bad.rooms.length === 1, 'size XL / n "two" fall back to size 1 and one room');
  const Snull = JSON.parse(JSON.stringify(S)); Object.keys(Snull.prices).forEach(k => { Snull.prices[k] = null; }); W.QCStore.load = () => Snull;
  const nr = Sch.ballpark([{ type: 'lounge', size: 'M', n: 1 }], 'good', Snull, ''); W.QCStore.load = () => S;
  note('every price null -> ballpark ' + nr.low + ' to ' + nr.high + ' (mid ' + nr.mid + '), minimum_applied=' + nr.priced.minimum_applied + ', confirm lines=' + nr.priced.confirm.length);
  ok(nr.priced.confirm.length > 0 && (nr.low === 0 || nr.priced.minimum_applied), 'no rates: priced lines are flagged "no rate"; range comes from the minimum job charge (the enquiry screen does not show this warning)');
  const Sno = JSON.parse(JSON.stringify(Snull)); Sno.rules.minimum_job = 0; W.QCStore.load = () => Sno; const nr2 = Sch.ballpark([{ type: 'lounge', size: 'M', n: 1 }], 'good', Sno, ''); W.QCStore.load = () => S; ok(nr2.low === 0 && nr2.high === 0, 'no rates and no minimum -> $0 to $0 with no "no rates" signal in the ballpark result'); }

// ---------- calendar
function validateIcs(text) {
  const errs = []; if (!/\r\n$/.test(text)) errs.push('does not end with CRLF'); if (/(^|[^\r])\n/.test(text)) errs.push('bare LF present');
  const raw = text.split('\r\n'); raw.pop();
  raw.forEach((l, i) => { const oct = Buffer.byteLength(l, 'utf8'); if (oct > 75) errs.push('line ' + (i + 1) + ' is ' + oct + ' octets: ' + JSON.stringify(l.slice(0, 40))); });
  const lines = []; raw.forEach(l => { if (/^[ \t]/.test(l) && lines.length) lines[lines.length - 1] += l.slice(1); else lines.push(l); });
  const stack = [], comps = []; let cur = null;
  lines.forEach((l, i) => { const m = l.match(/^([A-Z0-9-]+)(;[^:]*)?:(.*)$/s); if (!m) { errs.push('unparsable line ' + (i + 1) + ': ' + JSON.stringify(l.slice(0, 60))); return; }
    const [, name, params, val] = m; if (name === 'BEGIN') { cur = { type: val, props: {}, parent: cur }; stack.push(cur); comps.push(cur); return; } if (name === 'END') { if (!cur || cur.type !== val) errs.push('END:' + val + ' mismatched'); stack.pop(); cur = stack[stack.length - 1] || null; return; }
    if (!cur) { errs.push(name + ' outside a component'); return; } (cur.props[name] = cur.props[name] || []).push({ params: params || '', val });
    if (/^(DTSTART|DTEND|DTSTAMP|TRIGGER)$/.test(name) && !/^-?P/.test(val)) { const isDate = /VALUE=DATE(?!-)/.test(params || ''); if (isDate) { if (!/^\d{8}$/.test(val)) errs.push(name + ' bad DATE ' + val); } else { const t = val.match(/^\d{8}T(\d{2})(\d{2})(\d{2})Z?$/); if (!t) errs.push(name + ' bad DATE-TIME ' + val); else if (+t[1] > 23 || +t[2] > 59 || +t[3] > 60) errs.push(name + ' out-of-range time ' + val); } }
    if (/^(SUMMARY|DESCRIPTION|LOCATION|X-WR-CALNAME)$/.test(name)) { const un = val.replace(/\\[\\;,nN]/g, ''); if (/[,;]/.test(un)) errs.push(name + ' has unescaped , or ;'); if (/\\/.test(un)) errs.push(name + ' has a stray backslash'); } });
  if (stack.length) errs.push('unclosed components ' + stack.map(c => c.type).join(','));
  const cal = comps[0]; if (!cal || cal.type !== 'VCALENDAR') errs.push('no VCALENDAR'); else { if (!cal.props.VERSION) errs.push('no VERSION'); if (!cal.props.PRODID) errs.push('no PRODID'); }
  comps.filter(c => c.type === 'VEVENT').forEach((e, k) => { ['UID', 'DTSTAMP', 'DTSTART'].forEach(p => { if (!e.props[p]) errs.push('VEVENT ' + k + ' missing ' + p); }); if (e.props.DTEND && e.props.DTSTART) { const a = e.props.DTSTART[0], b = e.props.DTEND[0]; if (/VALUE=DATE/.test(a.params) !== /VALUE=DATE/.test(b.params)) errs.push('VEVENT ' + k + ' DTSTART/DTEND type mismatch'); if (b.val <= a.val) errs.push('VEVENT ' + k + ' DTEND not after DTSTART (' + a.val + ' -> ' + b.val + ')'); } });
  comps.filter(c => c.type === 'VALARM').forEach((a, k) => { if (!a.props.ACTION || !a.props.TRIGGER) errs.push('VALARM ' + k + ' missing ACTION/TRIGGER'); if (a.props.ACTION && a.props.ACTION[0].val === 'DISPLAY' && !a.props.DESCRIPTION) errs.push('VALARM ' + k + ' DISPLAY without DESCRIPTION'); });
  return { errs, comps, lines };
}
const unesc = (s) => s.replace(/\\n/g, '\n').replace(/\\([\\;,])/g, '$1');
{ const nasty = 'Smith, Jones; "The Painters" \\ Über café 北京 🎨🎨 — line1\nline2'; const evs = [{ uid: 'u1', summary: 'Quote visit: ' + nasty, description: nasty + '\r\nCRLF line\n' + 'x'.repeat(200), location: '1 Long, Road; Suburb 🎨 ' + 'ü'.repeat(80), url: 'http://x/#/chase', start: '2026-10-01', startMin: 9 * 60 + 15, endMin: 9 * 60 + 45, alarmBefore: 45 }];
  const t = Cal.ics(evs, 'Cal, name; ünïcode'); const v = validateIcs(t); v.errs.forEach(e => note('ics(unicode) validator: ' + e));
  const octetErrs = v.errs.filter(e => /octets/.test(e)); ok(octetErrs.length === 0, 'folded lines are <= 75 octets with unicode (' + octetErrs.length + ' lines over; fold() counts UTF-16 units, cal.js:63)');
  const roundTrip = Buffer.from(t, 'utf8').toString('utf8'); const v2 = validateIcs(roundTrip); const summ = v2.comps.find(c => c.type === 'VEVENT').props.SUMMARY[0].val;
  ok(unesc(summ) === 'Quote visit: ' + nasty, 'SUMMARY with commas, semicolons, backslash, newline, unicode round-trips through UTF-8 + unfold' + (unesc(summ) === 'Quote visit: ' + nasty ? '' : ' (got ' + JSON.stringify(unesc(summ).slice(0, 80)) + ')'));
  const loc = v2.comps.find(c => c.type === 'VEVENT').props.LOCATION[0].val; ok(unesc(loc) === evs[0].location, 'LOCATION with emoji + 80 ü round-trips' + (unesc(loc) === evs[0].location ? '' : ' (emoji at a fold boundary is split into surrogate halves -> U+FFFD)'));
  const desc = v2.comps.find(c => c.type === 'VEVENT').props.DESCRIPTION[0].val; ok(!/\r/.test(desc), 'DESCRIPTION: bare CR from \\r\\n input is not emitted raw' + (/\r/.test(desc) ? ' (raw CR present; escText only escapes \\n)' : ''));
  ok(v.errs.filter(e => !/octets/.test(e)).length === 0, 'structure valid: CRLF, VERSION/PRODID, UID/DTSTAMP/DTSTART, VALARM TRIGGER:-PT45M (' + v.errs.filter(e => !/octets/.test(e)).join('; ') + ')');
  ok(/TRIGGER:-PT45M/.test(t), 'alarmBefore 45 -> TRIGGER:-PT45M'); }
{ // fold boundary: emoji straddling position 72
  const s = 'A'.repeat(63) + '🎨🎨🎨🎨🎨'; const t = Cal.ics([{ uid: 'f', summary: s, start: '2026-10-01' }]); const back = validateIcs(Buffer.from(t, 'utf8').toString('utf8')); const summ = back.comps.find(c => c.type === 'VEVENT').props.SUMMARY[0].val;
  ok(summ === s, 'emoji at the fold boundary survives (got ' + JSON.stringify(summ.slice(60)) + ')'); }
{ const t = Cal.ics([{ uid: 'b', summary: 'Painting', start: '2026-10-05', end: '2026-10-08' }]); const v = validateIcs(t); ok(v.errs.length === 0 && /DTSTART;VALUE=DATE:20261005/.test(t) && /DTEND;VALUE=DATE:20261008/.test(t), '3-day booking: DTSTART 05, DTEND 08 exclusive (all-day) ' + v.errs.join(';'));
  const t1 = Cal.ics([{ uid: 'b1', summary: 'Painting', start: '2026-10-05', startHour: 7, endHour: 15 }]); ok(/DTSTART:20261005T070000/.test(t1) && /DTEND:20261005T150000/.test(t1), 'one-day booking timed 07:00-15:00');
  const t2 = Cal.ics([{ uid: 'b2', summary: 'Painting', start: '2026-10-05' }]); ok(/DTEND;VALUE=DATE:20261006/.test(t2), 'all-day with no end -> next day exclusive (uses Cal.addDays: ' + (t2.match(/DTEND;VALUE=DATE:(\d+)/) || [])[1] + ')'); }
{ const t = Cal.ics([{ uid: 'm', summary: 'Late visit', start: '2026-10-01', startMin: 23 * 60 + 45, endMin: 23 * 60 + 45 + 60 }]); const v = validateIcs(t); v.errs.forEach(e => note('ics(midnight) validator: ' + e));
  ok(v.errs.length === 0, 'timed visit crossing midnight (23:45 + 60 min) yields a valid DTEND (actual DTEND ' + (t.match(/DTEND:(\S+)/) || [])[1] + ')');
  const g = Cal.googleUrl({ summary: 'x', start: '2026-10-01', startMin: 23 * 60 + 45, endMin: 23 * 60 + 105 }); note('googleUrl dates for the same event: ' + decodeURIComponent(g.match(/dates=([^&]+)/)[1])); }
{ const t = Cal.ics([{ uid: 'h', summary: 'Follow up', start: '2026-10-01', startHour: 8, endHour: 9, alarmHour: 8 }]); const v = validateIcs(t); ok(v.errs.length === 0 && /TRIGGER;VALUE=DATE-TIME:\d{8}T\d{6}Z/.test(t), 'alarmHour -> absolute UTC trigger, valid (' + v.errs.join(';') + ')'); }
{ const t = Cal.ics([{ uid: 'e', summary: '', start: '2026-10-01' }]); const v = validateIcs(t); ok(v.errs.length === 0, 'empty summary still valid'); ok(/SUMMARY:\r\n/.test(t), 'empty SUMMARY emitted as empty value'); }
{ const t = Cal.ics([{ uid: 'u', summary: 'x', start: '2026-10-01', url: 'http://x/?a=1,2;3' }]); ok(/URL:http:\/\/x\/\?a=1,2;3/.test(t), 'URL emitted unescaped (RFC: URI value, fine)'); }

// ---------- Stripe client
{ ok(!Stripe.keyLooksRight('rk_live_x'), 'rk_live_x too short refused'); ok(!Stripe.keyLooksRight('sk_live_' + 'a'.repeat(24)), 'sk_live_ secret key refused'); ok(Stripe.keyLooksRight('  rk_live_' + 'a'.repeat(24) + ' \n'), 'whitespace around rk key tolerated by keyLooksRight');
  ok(Stripe.keyLooksRight('rk_test_' + 'a'.repeat(24)), 'rk_test_ accepted'); ok(!Stripe.keyLooksRight('rk_live_' + 'a'.repeat(9) + '-'), 'rk with non-alnum char refused'); ok(!Stripe.keyLooksRight(null) && !Stripe.keyLooksRight(''), 'null/empty refused');
  const reqs = []; const mk = (status, j) => ({ ok: status < 400, status, json: async () => j });
  ctx.__qcFetch = async (url, o) => { reqs.push({ url, o }); if (/\/prices$/.test(url)) return mk(200, { id: 'price_1' }); if (/payment_links$/.test(url)) return mk(400, { error: { message: 'You cannot create a payment link in test mode with a live key.' } }); if (/checkout\/sessions/.test(url)) return mk(200, { data: [{ payment_status: 'unpaid', status: 'expired', amount_total: 1000, created: 1 }, { payment_status: 'unpaid', status: 'open' }] }); return mk(404, { error: { message: 'nf' } }); };
  const key = 'rk_live_' + 'a'.repeat(24);
  let err = null; await Stripe.createPaymentLink(key, { amount: 635.55, name: 'Test Painting INV-2001', invoiceNo: 'INV-2001', jobId: 'j1' }).catch(e => { err = e; });
  const priceBody = decodeURIComponent(reqs[0].o.body); ok(/unit_amount=63555(&|$)/.test(priceBody), 'amount 635.55 -> unit_amount=63555 (' + priceBody.match(/unit_amount=\d+/) + ')'); ok(/currency=aud/.test(priceBody), 'currency defaults to aud'); ok(!/surcharge|application_fee/.test(priceBody + decodeURIComponent(reqs[1].o.body)), 'no surcharge / application fee anywhere');
  ok(err && /payment link/.test(err.message), '/prices ok then /payment_links error -> rejects with Stripe message (app toasts "Card link failed" and sends without link): ' + (err && err.message));
  ok(/Authorization/.test(Object.keys(reqs[0].o.headers).join()) && !/\s/.test(reqs[0].o.headers.Authorization.slice(7)), 'key sent without whitespace? header=' + JSON.stringify(reqs[0].o.headers.Authorization));
  let e2 = null; reqs.length = 0; await Stripe.createPaymentLink('  ' + key + '  ', { amount: 1, name: 'x' }).catch(e => { e2 = e; }); ok(reqs[0].o.headers.Authorization === 'Bearer ' + key, 'whitespace-padded key is trimmed before use (actual header ' + JSON.stringify(reqs[0].o.headers.Authorization) + ')');
  const cp = await Stripe.checkPaid(key, 'plink_1'); ok(cp.paid === false, 'checkPaid with unpaid + expired sessions -> paid:false');
  ctx.__qcFetch = async () => mk(200, { data: [{ payment_status: 'paid', amount_total: 63555, created: 1790000000, customer_details: { email: 'jane@example.com' } }] }); const cp2 = await Stripe.checkPaid(key, 'plink_1'); ok(cp2.paid && cp2.amount === 635.55 && cp2.email === 'jane@example.com' && /^\d{4}-\d{2}-\d{2}$/.test(cp2.when), 'checkPaid paid -> amount 635.55, email, date');
  ctx.__qcFetch = async () => mk(200, { data: [{ payment_status: 'paid', amount_total: 1000 }, { payment_status: 'paid', amount_total: 2000 }] }); const cp3 = await Stripe.checkPaid(key, 'plink_1'); note('two paid sessions on one link (client paid twice) -> reports only first, amount ' + cp3.amount);
  ctx.__qcFetch = async () => mk(401, { error: { message: 'Invalid API Key provided' } }); let e3 = null; await Stripe.checkPaid(key, 'plink_1').catch(e => { e3 = e; }); ok(e3 && /Invalid API Key/.test(e3.message), 'bad key -> Stripe message surfaced');
  ctx.__qcFetch = async () => ({ ok: false, status: 502, json: async () => { throw new Error('html'); } }); let e4 = null; await Stripe.checkPaid(key, 'plink_1').catch(e => { e4 = e; }); ok(e4 && !/Stripe error 502/.test(e4.message) === false || (e4 && /html/.test(e4.message)), 'non-JSON 502 from Stripe -> error is "' + (e4 && e4.message) + '" (r.json() rejection is not mapped to "Stripe error 502")');
  ctx.__qcFetch = async (url, o) => { reqs.push({ url, o }); return mk(200, { id: 'x', url: 'https://buy.stripe.com/x' }); }; reqs.length = 0; let e5 = null; await Stripe.createPaymentLink(key, { amount: 0.005, name: 'tiny' }).catch(e => { e5 = e; }); ok(e5 && /at least \$0\.50/.test(e5.message) && reqs.length === 0, 'half a cent is refused here with a plain reason rather than sent to Stripe to reject: ' + (e5 && e5.message));
  reqs.length = 0; await Stripe.createPaymentLink(key, { amount: 100, name: 'A & B = "quoted" + café', invoiceNo: 'INV-1' }); const b = reqs[1].o.body; ok(/metadata%5Binvoice%5D=INV-1/.test(b) && /caf%C3%A9/.test(b) && /%26/.test(b), 'form encoding: nested metadata, unicode and & in names encoded'); }

console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
