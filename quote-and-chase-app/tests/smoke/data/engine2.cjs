// Engine round two (worker D): no-cap states, business terms, price_override, condition_scope, sizes line, roomTotal, exterior loaded rates, ballpark scope, Kev regression, rules migration.
const fs = require('fs'), vm = require('vm'); const A = require('path').join(__dirname, '../../..') + '/';
const FILES = ['postcodes.js', 'geo.js', 'costing.js', 'store.js', 'pricing.js', 'schedule.js'];
function boot(stored) {
  const ctx = vm.createContext({ console }); ctx.window = ctx;
  ctx.localStorage = { getItem: () => (stored ? JSON.stringify(stored) : null), setItem: () => {}, removeItem: () => {} };
  for (const f of FILES) vm.runInContext(fs.readFileSync(A + f, 'utf8'), ctx);
  return ctx.window;
}
const W = boot(null); const S = W.QCStore.defaults(); W.QCStore.load = () => S; S.details.postcode = '6000';
const P = W.QCPricing, Sch = W.QCSched;
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const room = (o) => Object.assign(W.QCStore.newRoom(o.type || 'interior'), o);
const clone = (o) => JSON.parse(JSON.stringify(o));
const withState = (st, pc) => { const s = clone(S); s.details.state = st; s.details.postcode = pc || s.details.postcode; return s; };
const sum = (ls) => Math.round(ls.reduce((a, l) => a + l.amount, 0) * 100) / 100;

// 1. deposit caps: no-cap states honour the typed %
let c = P.depositCap(23898.6, 'TAS'); ok(c.pct === 100 && c.amount === 23898.6 && c.none === true && c.reason === 'no legal cap in TAS', 'TAS: pct 100, amount = total, reason "no legal cap in TAS"');
ok(P.depositCap(5000, 'NT').reason === 'no legal cap in NT' && P.depositCap(5000, 'ACT').pct === 100, 'NT and ACT the same');
ok(P.depositCap(5000, 'WA').pct === 100 && /under \$7,500/.test(P.depositCap(5000, 'WA').reason) && P.depositCap(7500, 'WA').pct === 6.5, 'WA: no cap under $7,500, 6.5% from $7,500');
ok(P.depositCap(10000, 'NSW').pct === 10 && /Home Building Act/.test(P.depositCap(10000, 'NSW').law) && !/Act/.test(P.depositCap(10000, 'NSW').reason), 'NSW 10%; the Act name sits in .law, not in the plain reason');
ok(P.depositCap(5000, '').pct === 10 && /no state set/.test(P.depositCap(5000, '').reason), 'blank state still held at 10% with a reason');
// Wazza: TAS homeowner, 30% typed, must get 30%
const wazza = { rooms: [room({ type: 'exterior', name: 'House', storeys: 2, ext: { weatherboard: 180, eaves: 48, gutters: 48, ext_window: 6, ext_door: 2, scaffold: 5200, condition: 'poor' } })], extras: [], deposit_pct: 30, client: { address: '5 Elizabeth St Hobart TAS 7000', type: 'homeowner' } };
let p = P.priceJob(wazza, withState('TAS', '7000'));
ok(p.deposit_pct === 30 && p.deposit === Math.round(p.total * 30) / 100 && p.deposit_capped === null, `TAS homeowner typed 30% -> deposit ${p.deposit} of ${p.total}, not capped`);
p = P.priceJob(Object.assign(clone(wazza), { deposit_pct: 30 }), withState('NSW', '2000'));
ok(p.deposit_capped && p.deposit_capped.cap === 10 && p.deposit === Math.round(p.total * 10) / 100 && p.deposit_capped.requested === 30, 'same job in NSW -> held at 10%, requested 30 recorded');

// 2. business terms
ok(S.rules.business_deposit_pct === 0 && S.rules.business_days === 30, 'defaults: business_deposit_pct 0, business_days 30');
const bed = () => room({ name: 'Bed', L: 4, W: 3 });
['agent', 'strata', 'builder', 'commercial'].forEach((t) => { const j = { rooms: [bed()], extras: [], client: { address: '', type: t } }; ok(P.depositPct(S, j) === 0 && P.balanceDays(S, j) === 30, t + ': no per-job override -> 0% deposit, 30 days'); });
let home = { rooms: [bed()], extras: [], client: { address: '', type: 'homeowner' } }; ok(P.depositPct(S, home) === 10 && P.balanceDays(S, home) === 7, 'homeowner: 10% and 7 days as before');
let agentJob = { rooms: [bed()], extras: [], deposit_pct: 15, balance_days: 14, client: { address: '', type: 'agent' } }; ok(P.depositPct(S, agentJob) === 15 && P.balanceDays(S, agentJob) === 14, 'per-job override beats business terms');
let S2 = clone(S); S2.rules.business_deposit_pct = 20; S2.rules.business_days = 45; ok(P.depositPct(S2, { client: { type: 'strata' } }) === 20 && P.balanceDays(S2, { client: { type: 'strata' } }) === 45, 'edited business terms are used');
S2.rules.business_deposit_pct = ''; S2.rules.business_days = null; ok(P.depositPct(S2, { client: { type: 'strata' } }) === 10 && P.balanceDays(S2, { client: { type: 'strata' } }) === 7, 'blank business terms fall back to the homeowner defaults');
p = P.priceJob({ rooms: [bed()], extras: [], client: { address: '', type: 'agent' } }, S); ok(p.deposit === 0 && p.deposit_pct === 0 && p.balance_days === 30 && p.business_terms === true && p.deposit_capped === null, 'priceJob on an agent job: deposit $0, balance_days 30, business_terms true');
let tf = P.termsFor(S, { client: { type: 'agent' } }); ok(tf.deposit_pct === 0 && tf.balance_days === 30 && tf.business && tf.deposit_source === 'business' && tf.days_source === 'business', 'termsFor says where the terms came from: ' + JSON.stringify(tf));
tf = P.termsFor(S, agentJob); ok(tf.deposit_source === 'job' && tf.days_source === 'job', 'termsFor: job override -> source job');
ok(P.depositPct(S, null) === 10 && P.balanceDays(S, null) === 7 && P.depositPct(null, null) === 10, 'depositPct/balanceDays survive a missing job or settings');

// 3. price_override
const two = () => ({ rooms: [room({ name: 'Lounge', L: 5, W: 4, doors: 1, windows: 2, condition: 'fair' }), room({ name: 'Bed', L: 3, W: 3 })], extras: [], client: { address: '' } });
const base = P.priceJob(two(), S), baseLounge = base.lines.filter((l) => l.room === 'Lounge');
let ovJob = two(); ovJob.rooms[0].price_override = 1500; let ov = P.priceJob(ovJob, S), ovLounge = ov.lines.filter((l) => l.room === 'Lounge');
ok(ovLounge.length === 1 && ovLounge[0].desc === 'Lounge, as quoted' && ovLounge[0].client_desc === 'Lounge, as quoted' && ovLounge[0].amount === 1500 && ovLounge[0].qty === 1 && ovLounge[0].override === true && ovLounge[0].key === 'room_price', 'override: one line "Lounge, as quoted" at $1,500');
ok(ovLounge[0].engine_amount === sum(baseLounge) && ov.subtotal === Math.round((base.subtotal - sum(baseLounge) + 1500) * 100) / 100, `override: subtotal swaps the room's lines for $1,500 (price list said $${sum(baseLounge)})`);
ok(Math.abs(ov.cost.hours - base.cost.hours) < 1e-9 && Math.abs(ov.cost.paint - base.cost.paint) < 1e-9 && ov.cost.margin !== base.cost.margin, 'override: private costing keeps the hours and litres from the engine lines, margin moves');
ok(ov.notes.some((n) => /Lounge: your price \$1500 used; the price list came to/.test(n)) && ov.assumptions.some((a) => /Lounge: walls in fair condition/.test(a)), 'override: private note names both figures, client basis line for the room still there');
ovJob = two(); ovJob.rooms[0].price_override = 1500; let S3 = clone(S); S3.prices.p_walls = null; ov = P.priceJob(ovJob, S3); ok(!ov.confirm.some((c) => /Lounge/.test(c)) && ov.confirm.some((c) => /Bed/.test(c)) && !ov.lines.some((l) => l.room === 'Lounge' && l.confirm), 'override: a missing wall rate no longer asks TO CONFIRM for the overridden room, still does for the other: ' + JSON.stringify(ov.confirm));
[null, '', 0, 'abc', -5].forEach((v) => { const j = two(); j.rooms[0].price_override = v; const r = P.priceJob(j, S); ok(r.subtotal === base.subtotal && !r.lines.some((l) => l.override), 'price_override ' + JSON.stringify(v) + ' means none'); });
let ovOnly = { rooms: [room({ name: 'Study', price_override: 650 })], extras: [], client: { address: '' } }; p = P.priceJob(ovOnly, S); ok(p.lines.length === 2 && p.lines[0].amount === 650 && p.lines[1].key === 'p_setup' && p.has_interior && p.assumptions[0] === 'Sizes measured on site.', 'override with no sizes typed still prices the room (Terry quotes by the room) + set-up');
let extOv = { rooms: [room({ type: 'exterior', name: 'Front', price_override: 4000, ext: { weatherboard: 80, scaffold: 1200 } })], extras: [], client: { address: '' } }; p = P.priceJob(extOv, S); ok(p.lines[0].desc === 'Front, as quoted' && p.lines[0].unit === 'area' && p.lines[0].amount === 4000 && p.has_exterior && p.cost.other >= 1200, 'exterior area override: one line, unit area, scaffold still in the private cost');

// 4. condition_scope
const extJob = (cond, scope) => ({ rooms: [room({ type: 'exterior', name: 'House', ext: { weatherboard: 160, condition: cond, condition_scope: scope } })], extras: [], client: { address: '' } });
let all = P.priceJob(extJob('fair', 'all'), S), half = P.priceJob(extJob('fair', 'half'), S), side = P.priceJob(extJob('fair', 'side'), S), none2 = P.priceJob(extJob('fair', undefined), S);
const prep = (r) => (r.lines.find((l) => l.key === 'p_prep_mod') || {}).qty;
ok(prep(all) === 8 && prep(half) === 4 && prep(side) === 2.4 && prep(none2) === 8, `fair prep hours all/half/side/unset = ${prep(all)}/${prep(half)}/${prep(side)}/${prep(none2)} (160 m² / 20 × 1, 0.5, 0.3)`);
ok(/House: surfaces in fair condition/.test(all.assumptions.join()) && /House: about half the surfaces in fair condition/.test(half.assumptions.join()) && /House: one side in fair condition/.test(side.assumptions.join()), 'fair assumption text names all / about half / one side');
all = P.priceJob(extJob('poor', 'all'), S); half = P.priceJob(extJob('poor', 'half'), S); side = P.priceJob(extJob('poor', 'side'), S);
const heavy = (r) => (r.lines.find((l) => l.key === 'p_prep_heavy') || {}).qty, seal = (r) => (r.lines.find((l) => l.key === 'p_sealer') || {}).qty;
ok(heavy(all) === 20 && heavy(half) === 10 && heavy(side) === 6 && seal(all) === 48 && seal(half) === 24 && seal(side) === 14.4, `poor heavy prep ${heavy(all)}/${heavy(half)}/${heavy(side)} h, spot prime ${seal(all)}/${seal(half)}/${seal(side)} m²`);
ok(/one side in poor condition \(peeling, bare timber\), heavy preparation and spot priming included/.test(side.assumptions.join()) && !/allowance/.test(side.assumptions.join() + JSON.stringify(P.CLIENT_DESC)), 'poor assumption text; the word "allowance" is gone from client text');
ok(all.lines.find((l) => l.key === 'p_weatherboard').qty === 160, 'condition_scope does not touch the painting lines');
ok(P.priceJob(extJob('poor', 'rubbish'), S).lines.find((l) => l.key === 'p_prep_heavy').qty === 20, 'unknown condition_scope = all');

// 5. sizes line (measured_by)
p = P.priceJob({ rooms: [room({ name: 'A', L: 4, W: 3 }), room({ name: 'B', L: 3, W: 3, measured_by: 'us' })], extras: [], client: { address: '' } }, S);
ok(p.assumptions.filter((a) => /Sizes|sizes/.test(a)).length === 1 && p.assumptions[0] === 'Sizes measured on site.' && p.sizes_by === 'us' && p.sizes_line === 'Sizes measured on site.', 'no room marked client -> one line "Sizes measured on site."');
p = P.priceJob({ rooms: [room({ name: 'A', L: 4, W: 3 }), room({ name: 'B', L: 3, W: 3, measured_by: 'client' }), room({ name: 'C', L: 3, W: 3, measured_by: 'client' })], extras: [], client: { address: '' } }, S);
ok(p.assumptions.filter((a) => /sizes/i.test(a)).length === 1 && p.assumptions[0] === 'Room sizes supplied by the client, confirmed on site before work starts.' && p.sizes_by === 'client', 'any room marked client -> the client sentence, once per quote');
ok(!/supplied by client/.test(p.assumptions.join()), 'the old "Sizes supplied by client" line is gone');
p = P.priceJob({ rooms: [], extras: [{ desc: 'Gate', qty: 1, rate: 200 }], client: { address: '' } }, S); ok(!p.assumptions.some((a) => /sizes/i.test(a)) && p.sizes_line === '', 'extras only -> no sizes line');
const wall = (pa, w) => ({ wall: 'W', width_mm: w || 4000, height_mm: 2400, gross_area_m2: 9.6, openings: [], paint_area_m2: pa, method: 'photo', expected_error_pct: 2 });
p = P.priceJob({ rooms: [room({ name: 'M', method: 'measured', walls: [wall(8), wall(8, 3000), wall(8), wall(8, 3000)] })], extras: [], client: { address: '' } }, S); ok(p.assumptions[0] === 'Sizes measured on site.' && p.measured_rooms === 1, 'photo-measured room -> measured on site');
ok(P.SIZES_TEXT.us === 'Sizes measured on site.' && /supplied by the client/.test(P.SIZES_TEXT.client), 'SIZES_TEXT exported for the PDF');

// 6. exterior lines expose the loaded rate
const kevD = { rooms: [room({ type: 'exterior', name: 'Exterior', storeys: 2, ext: { weatherboard: 180, eaves: 48, gutters: 48, ext_window: 6, ext_door: 2, scaffold: 4500, pressure: 180 } })], extras: [], client: { address: 'Perth WA 6000' } };
p = P.priceJob(kevD, S); const wb = p.lines.find((l) => l.key === 'p_weatherboard'), door = p.lines.find((l) => l.key === 'p_ext_door'), scaf = p.lines.find((l) => l.key === 'p_scaffold');
ok(wb.rate === 57.6 && wb.base_rate === 48 && wb.loading === 20 && wb.loading_desc === 'two storey +20%' && wb.amount === 10368, 'weatherboard: rate 57.60 loaded, base_rate 48, loading 20');
ok(door.rate === 220 && door.base_rate === 220 && door.loading === 0 && door.loading_desc === '', 'exterior door: no storey loading, base = rate');
ok(scaf.rate === 4500 && scaf.base_rate === 4500 && scaf.amount === 4500 && scaf.desc === "Scaffold, scaffolder's quote", 'scaffold line carries the typed amount as its rate and a plain label');
ok(p.lines.every((l) => typeof l.base_rate === 'number' && typeof l.loading === 'number'), 'every line has base_rate and loading (set-up, travel, extras too)');
let S4 = clone(S); S4.rules.storey_uplift_pct = 0; p = P.priceJob(kevD, S4); ok(p.lines.find((l) => l.key === 'p_weatherboard').rate === 48 && p.lines.find((l) => l.key === 'p_weatherboard').loading === 0, 'uplift 0% -> no loading');

// 7. roomTotal: same path as the quote
const j2 = two(); const full = P.priceJob(j2, S);
j2.rooms.forEach((r) => { const rt = P.roomTotal(r, S, j2), mine = full.lines.filter((l) => l.room === r.name); ok(rt.subtotal === sum(mine) && rt.lines.length === mine.length && rt.hours > 0 && rt.litres > 0 && rt.room === r.name, `roomTotal(${r.name}) = $${rt.subtotal}, ${rt.hours} h, ${rt.litres} L, matches the quote's ${mine.length} lines`); });
let rt = P.roomTotal(kevD.rooms[0], S, kevD); ok(rt.subtotal === sum(full.lines.filter(() => false)) + 19628 && rt.lines.find((l) => l.key === 'p_weatherboard').rate === 57.6 && rt.lines.find((l) => l.key === 'p_scaffold').amount === 4500, `roomTotal exterior: $${rt.subtotal} includes scaffold $4,500 and the loaded weatherboard rate (Wazza's Area total)`);
const o2 = two(); o2.rooms[0].price_override = 1500; rt = P.roomTotal(o2.rooms[0], S, o2); ok(rt.override && rt.subtotal === 1500 && rt.lines.length === 1 && rt.engine_lines.length === baseLounge.length && rt.engine_subtotal === sum(baseLounge) && rt.hours > 0, 'roomTotal with an override: the one line, plus engine_lines/engine_subtotal and hours from the price list');
rt = P.roomTotal(room({ name: 'Blank' }), S, {}); ok(rt.lines.length === 0 && rt.subtotal === 0 && rt.hours === 0 && rt.litres === 0, 'roomTotal on an empty room -> zeros, no throw');
rt = P.roomTotal(room({ name: 'Prem', L: 4, W: 3 }), S, { premium_paint: true }); ok(rt.lines.find((l) => l.key === 'p_walls').rate === 27.6, 'roomTotal honours the job flags (premium paint)');
let S5 = clone(S); S5.prices.p_ceilings = null; rt = P.roomTotal(room({ name: 'C', L: 4, W: 3 }), S5, {}); ok(rt.confirm.length === 1 && rt.lines.find((l) => l.key === 'p_ceilings').confirm, 'roomTotal flags a missing rate');
ok(typeof P.roomLines === 'function' && P.roomTotal(room({ name: 'X', L: 4, W: 3 }), S).subtotal > 0, 'roomTotal works without a job argument');

// 8. ballpark scope (Deb: two-bed unit, walls only)
const picks = [{ type: 'bedroom', size: 'M', n: 2 }, { type: 'lounge', size: 'M', n: 1 }]; S.details.postcode = '0810';
const bw = Sch.ballpark(picks, 'fair', S, 'Rapid Creek 0810', { scope: 'walls' }), bwc = Sch.ballpark(picks, 'fair', S, 'Rapid Creek 0810', 'walls_ceilings'), ba = Sch.ballpark(picks, 'fair', S, 'Rapid Creek 0810', 'all'), bdef = Sch.ballpark(picks, 'fair', S, 'Rapid Creek 0810');
console.log(`  ballpark two-bed fair: walls $${bw.low}-${bw.high} (mid ${bw.mid}), walls+ceilings $${bwc.low}-${bwc.high} (mid ${bwc.mid}), all $${ba.low}-${ba.high} (mid ${ba.mid}); walls/all = ${(bw.mid / ba.mid).toFixed(2)}`);
ok(bw.mid < bwc.mid && bwc.mid < ba.mid && bw.scope === 'walls' && bwc.scope === 'walls_ceilings' && bdef.scope === 'all' && bdef.mid === ba.mid, 'scope as a string or {scope}; walls < walls+ceilings < all; default all');
ok(bw.priced.lines.every((l) => ['p_walls', 'p_prep_mod', 'p_setup'].indexOf(l.key) >= 0) && bw.rooms.every((r) => r.surfaces.ceiling === false && r.surfaces.skirting === false && r.doors === 0 && r.windows === 0), 'walls scope: only walls, prep and set-up lines; rooms carry the walls-only switches');
ok(bw.mid / ba.mid > 0.5 && bw.mid / ba.mid < 0.7, 'walls-only two-bed is about 60% of the full repaint at the list rates (a third is not reachable without a wall rate under $13/m²)');
ok(bw.scope_label === 'Walls only' && ba.band_pct === 20, 'scope label and band');
S.details.postcode = '6000';

// 9. Kev regression (defaults, Perth)
const kev = (title, job, want) => { const r = P.priceJob(job, S); ok(r.total === want, `${title}: $${r.total} (round one $${want})`); };
kev('(a) lounge', { rooms: [room({ name: 'Lounge', L: 4.2, W: 3.6, H: 2.7, doors: 1, windows: 2, condition: 'good' })], extras: [], client: { address: 'Perth WA 6000' } }, 2094.73);
kev('(d) weatherboard two storey', kevD, 21755.8);
kev('(h) poor bedroom wallpaper', { rooms: [room({ name: 'Bedroom', L: 3.6, W: 3.3, doors: 1, windows: 1, condition: 'poor', wallpaper_m2: 30 })], extras: [], client: { address: 'Perth WA 6000' } }, 3545.96);
const g = Sch.ballpark([{ type: 'lounge', size: 'M', n: 1 }, { type: 'bedroom', size: 'S', n: 2 }], 'good', S, 'Perth WA 6000'); ok(g.low === 3900 && g.mid === 4925.25 && g.high === 5950, `(g) ballpark ${g.low} / ${g.mid} / ${g.high} unchanged`);
p = P.priceJob(kevD, S); ok(p.deposit === 1414.13 && p.deposit_capped && p.deposit_capped.cap === 6.5 && /legal limit in WA/.test(p.deposit_capped.reason), '(d) WA 6.5% cap still bites at $21,755: deposit $1,414.13, reason "' + p.deposit_capped.reason + '"');

// 10. hydrate migration of the rules defaults
const old = W.QCStore.defaults(); delete old.rules.business_deposit_pct; delete old.rules.business_days; old.rules.deposit_pct = 20; old.rules.balance_days = 14;
let W2 = boot(old); let st = W2.QCStore.load(); ok(st.rules.business_deposit_pct === 0 && st.rules.business_days === 30 && st.rules.deposit_pct === 20 && st.rules.balance_days === 14, 'older install: business terms filled (0 / 30), edited homeowner terms kept');
const edited = W.QCStore.defaults(); edited.rules.business_deposit_pct = 25; edited.rules.business_days = 45; W2 = boot(edited); st = W2.QCStore.load(); ok(st.rules.business_deposit_pct === 25 && st.rules.business_days === 45, 'edited business terms survive hydrate');
const junk = W.QCStore.defaults(); junk.rules.business_deposit_pct = 'abc'; junk.rules.business_days = ''; W2 = boot(junk); st = W2.QCStore.load(); ok(st.rules.business_deposit_pct === 0 && st.rules.business_days === 30, 'rubbish business terms reset to the defaults');

console.log(fails ? 'FAILURES ' + fails : 'ALL PASSED'); process.exit(fails ? 1 : 0);
