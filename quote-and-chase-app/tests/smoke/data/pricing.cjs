// Pricing, costing and travel edge cases via the hooks and via the room UI.
const { boot } = require('./h.cjs');
(async () => {
  const t = await boot(); const { p, ok } = t;
  const price = (job, patch) => p.evaluate(([job, patch]) => {
    const S = JSON.parse(JSON.stringify(window.__qcApp.store.load())); if (!S.details.postcode) { S.details.postcode = '5000'; S.details.state = 'SA'; } // a set-up business, as the checks assume
    if (patch) { Object.keys(patch).forEach(k => Object.assign(S[k], patch[k])); }
    const base = window.__qcApp.store.newRoom('interior');
    job.rooms = (job.rooms || []).map(r => Object.assign({}, base, r));
    job.extras = job.extras || []; job.client = job.client || { address: '' };
    try { const r = window.__qcApp.pricing.priceJob(job, S); return { ok: true, r }; } catch (e) { return { ok: false, err: e.message }; }
  }, [job, patch || null]);
  const isFiniteAll = r => r.lines.every(l => Number.isFinite(l.qty) && Number.isFinite(l.amount) && Number.isFinite(l.rate)) && Number.isFinite(r.total) && Number.isFinite(r.deposit);

  // 1. zero rooms
  let r = (await price({})).r; ok(r.total === 0 && r.lines.length === 0 && !r.minimum_applied, 'zero rooms -> $0, no minimum applied');
  // blank L/W
  r = (await price({ rooms: [{ L: '', W: '' }] })).r; ok(r.lines.length === 0 && r.total === 0, 'blank L/W -> no lines');
  r = (await price({ rooms: [{ L: 0, W: 4 }] })).r; ok(r.lines.length === 0, 'L=0 -> no lines');
  r = (await price({ rooms: [{ L: -4, W: 4 }] })).r; ok(r.lines.length === 0, 'negative L -> no lines');
  r = (await price({ rooms: [{ L: 'abc', W: 'xyz' }] })).r; ok(r.lines.length === 0, "L='abc' -> no lines");
  r = (await price({ rooms: [{ L: 1e6, W: 1e6 }] })).r; ok(isFiniteAll(r) && r.total > 0, 'L=W=1e6 -> finite numbers (total ' + r.total + ')');
  // H blank vs 0
  let a = (await price({ rooms: [{ L: 4, W: 3, H: '' }] })).r, b = (await price({ rooms: [{ L: 4, W: 3, H: 0 }] })).r;
  ok(a.total === b.total && /taken as 2.4/.test(a.notes.join()) && /taken as 2.4/.test(b.notes.join()) && !/2\.4 m/.test(a.assumptions.join()), 'H blank and H=0 both fall back to 2.4 with a private note (not on the client basis)');
  // doors negative / 999
  a = (await price({ rooms: [{ L: 4, W: 3, doors: 0 }] })).r; b = (await price({ rooms: [{ L: 4, W: 3, doors: -2 }] })).r;
  const wa = a.lines.find(l => l.key === 'p_walls').qty, wb = b.lines.find(l => l.key === 'p_walls').qty;
  ok(wb <= wa, `doors=-2 must not increase wall area (doors=0 -> ${wa} m2, doors=-2 -> ${wb} m2)`);
  const sa = a.lines.find(l => l.key === 'p_skirting').qty, sb = b.lines.find(l => l.key === 'p_skirting').qty;
  ok(sb <= sa, `doors=-2 must not increase skirting (${sa} -> ${sb} lm)`);
  b = (await price({ rooms: [{ L: 4, W: 3, windows: -3 }] })).r; ok(b.lines.find(l => l.key === 'p_walls').qty <= wa, 'windows=-3 must not increase wall area (' + b.lines.find(l => l.key === 'p_walls').qty + ')');
  r = (await price({ rooms: [{ L: 4, W: 3, doors: 999 }] })).r; ok(r.lines.find(l => l.key === 'p_walls').qty === wa && !r.lines.some(l => l.key === 'p_skirting') && r.lines.find(l => l.key === 'p_door').qty === 999, 'doors=999 -> walls untouched (painted doors are extra-over), skirting clamps to 0, 999 door line');
  // all surfaces unticked
  r = (await price({ rooms: [{ L: 4, W: 3, surfaces: { walls: false, ceiling: false, skirting: false } }] })).r; ok(r.lines.length === 0, 'all surfaces unticked, no counts -> no lines');
  r = (await price({ rooms: [{ L: 4, W: 3, surfaces: { walls: false, ceiling: false, skirting: false }, condition: 'poor' }] })).r; ok(!r.lines.some(l => l.key === 'p_prep_heavy'), 'walls unticked + poor -> no prep line');
  // blank price -> TO CONFIRM
  r = (await price({ rooms: [{ L: 4, W: 3 }] }, { prices: { p_ceilings: null } })).r; const cl = r.lines.find(l => l.key === 'p_ceilings');
  ok(cl && cl.confirm && cl.amount === 0 && r.confirm.length === 1, 'null ceiling price -> line TO CONFIRM, $0, one confirm note');
  r = (await price({ rooms: [{ L: 4, W: 3 }] }, { prices: { p_ceilings: '' } })).r; ok(r.lines.find(l => l.key === 'p_ceilings').confirm, "'' ceiling price -> TO CONFIRM");
  r = (await price({ rooms: [{ L: 4, W: 3 }] }, { prices: { p_ceilings: 'abc' } })).r; t.note("price 'abc' -> confirm=" + r.lines.find(l => l.key === 'p_ceilings').confirm + ' amount=' + r.lines.find(l => l.key === 'p_ceilings').amount);
  // minimum job
  r = (await price({ rooms: [{ L: 1, W: 1 }] })).r; const ml = r.lines.find(l => l.key === 'minimum'); ok(r.minimum_applied && r.subtotal === 600 && r.gst === 60 && r.total === 660 && ml && ml.group === 'Adjustments' && Math.abs(r.lines.reduce((s, l) => s + l.amount, 0) - 600) < 0.005, 'tiny room -> minimum 600 + gst 60, with a visible Minimum job charge line so the table adds up');
  r = (await price({ rooms: [{ L: 1, W: 1 }] }, { rules: { minimum_job: '' } })).r; ok(!r.minimum_applied, 'blank minimum -> not applied');
  r = (await price({ rooms: [{ L: 1, W: 1 }] }, { rules: { minimum_job: -50 } })).r; ok(!r.minimum_applied, 'negative minimum -> not applied');
  // GST off
  r = (await price({ rooms: [{ L: 4, W: 3 }] }, { details: { gst: false } })).r; ok(r.gst === 0 && r.total === r.subtotal, 'GST off -> gst 0, total = subtotal');
  // premium paint
  a = (await price({ rooms: [{ L: 4, W: 3, condition: 'fair' }] })).r; b = (await price({ rooms: [{ L: 4, W: 3, condition: 'fair' }], premium_paint: true })).r;
  ok(b.lines.find(l => l.key === 'p_walls').rate === 27.6 && b.lines.find(l => l.key === 'p_prep_mod').rate === a.lines.find(l => l.key === 'p_prep_mod').rate, 'premium: walls 24 -> 27.60, prep hours untouched');
  r = (await price({ rooms: [{ L: 4, W: 3 }], premium_paint: true }, { rules: { premium_paint_pct: '' } })).r; ok(r.lines.find(l => l.key === 'p_walls').rate === 24, 'premium with blank pct -> +0%');
  // extras
  r = (await price({ extras: [{ desc: 'x', qty: 1, rate: '' }] })).r; ok(r.lines[0].confirm && r.confirm.length === 1, 'extra with blank rate -> TO CONFIRM');
  r = (await price({ extras: [{ desc: 'x', qty: 1, rate: -100 }], rooms: [{ L: 4, W: 3 }] })).r; ok(r.lines.find(l => l.room === 'Extras').amount >= 0, 'extra with negative rate must not produce a negative amount (got ' + r.lines.find(l => l.room === 'Extras').amount + ')');
  r = (await price({ extras: [{ desc: 'x', qty: 1, rate: 'confirm' }] })).r; ok(r.lines[0].confirm, "extra with rate 'confirm' -> flagged TO CONFIRM (confirm=" + r.lines[0].confirm + ', amount=' + r.lines[0].amount + ')');
  r = (await price({ extras: [{ desc: 'x', qty: '', rate: 50 }] })).r; ok(r.lines[0].qty === 1 && r.lines[0].amount === 50, 'extra with blank qty -> qty 1');
  r = (await price({ extras: [{ desc: 'x', qty: 0, rate: 50 }] })).r; t.note('extra with qty 0 -> qty ' + r.lines[0].qty + ' amount ' + r.lines[0].amount);
  // travel
  r = (await price({ rooms: [{ L: 4, W: 3 }], travel_km: 40, client: { address: '12 Main St Gawler 5118' } })).r; const tl = r.lines.find(l => l.room === 'Travel');
  ok(tl && tl.amount === 96 * r.travel.days && /typed/.test(tl.source) && tl.group === 'Travel', 'typed 40 km beats postcode: 40*1.2*2 = $96 x ' + r.travel.days + ' days');
  r = (await price({ rooms: [{ L: 12, W: 10 }, { L: 12, W: 10 }, { L: 12, W: 10 }], travel_km: 40, client: { address: '12 Main St Gawler 5118' } })).r; ok(r.travel.days > 1 && r.lines.find(l => l.room === 'Travel').amount === 96 * r.travel.days && r.days === r.travel.days, 'travel multiplies by days on site (' + r.travel.days + ' days)');
  r = (await price({ rooms: [{ L: 12, W: 10 }, { L: 12, W: 10 }, { L: 12, W: 10 }], travel_km: 40, client: { address: '12 Main St Gawler 5118' } }, { rules: { travel_per_day: false } })).r; ok(r.lines.find(l => l.room === 'Travel').amount === 96, 'travel_per_day off -> one trip');
  r = (await price({ rooms: [{ L: 4, W: 3 }], client: { address: 'Unit 1234, 5 Main St Gawler 5118' } })).r; ok(/5118 from 5000/.test(r.travel.source), 'address with two 4-digit numbers picks 5118: ' + r.travel.source);
  r = (await price({ rooms: [{ L: 4, W: 3 }], client: { address: '1 Rd Somewhere 0000' } })).r; ok(r.travel.amount === 0 && /not recognised/.test(r.travel.note) && /0000/.test(r.travel.note), 'postcode 0000 -> not recognised, no charge: ' + r.travel.note);
  r = (await price({ rooms: [{ L: 4, W: 3 }], client: { address: '1 Rd Somewhere 9999' } })).r; ok(r.travel.amount === 0 && /9999/.test(r.travel.note), 'postcode 9999 -> not recognised');
  r = (await price({ rooms: [{ L: 4, W: 3 }], client: { address: '12 Main St Gawler 5118' } }, { details: { postcode: '' } })).r; ok(r.travel.amount === 0 && /no business postcode/.test(r.travel.source), 'blank business postcode -> no charge, source says why');
  r = (await price({ rooms: [{ L: 4, W: 3 }], client: { address: '12 Main St Gawler 5118' } }, { details: { postcode: '0000' } })).r; ok(/0000/.test(r.travel.note), 'unknown business postcode named in note: ' + r.travel.note);
  r = (await price({ rooms: [{ L: 4, W: 3 }], client: { address: '12 Main St Gawler 5118' } }, { rules: { travel_per_km: '', free_radius_km: '' } })).r; ok(r.travel.amount === 0 && isFiniteAll(r), 'blank travel rate and radius -> $0, finite');
  r = (await price({ rooms: [{ L: 4, W: 3 }], travel_km: -10, client: { address: '12 Main St Gawler 5118' } })).r; ok(r.travel.amount > 0 && /postcode/.test(r.travel.source), 'negative typed km ignored, falls back to postcode');
  // measured rooms
  const wall = (pa, w) => ({ wall: 'W', width_mm: w || 4000, height_mm: 2400, gross_area_m2: 9.6, openings: [], paint_area_m2: pa, method: 'photo', expected_error_pct: 2 });
  r = (await price({ rooms: [{ method: 'measured', walls: [wall(0), wall(0, 3000)] }] })).r; ok(!r.lines.some(l => l.key === 'p_walls') && r.lines.find(l => l.key === 'p_ceilings').qty === 12 && r.lines.find(l => l.key === 'p_skirting').qty === 7, 'measured walls with zero paint area -> no wall line, ceiling 12, skirting 7');
  r = (await price({ rooms: [{ method: 'measured', walls: [wall(-5), wall(-5, 3000)] }] })).r; ok(!r.lines.some(l => l.key === 'p_walls') && isFiniteAll(r), 'negative paint_area -> clamped, finite');
  r = (await price({ rooms: [{ method: 'measured', walls: [wall(8), wall(8, 3000)], ceiling_m2: 20 }] })).r; ok(r.lines.find(l => l.key === 'p_ceilings').qty === 20 && !/ceiling taken as/.test(r.assumptions.join()), 'ceiling_m2 override used, no assumption');
  r = (await price({ rooms: [{ method: 'measured', walls: [wall(8)] }] })).r; ok(!r.lines.some(l => l.key === 'p_ceilings') && /1 of the walls/.test(r.assumptions.join()), 'one measured wall -> no ceiling, note says 1 of the walls measured');
  r = (await price({ rooms: [{ method: 'measured', walls: [{ paint_area_m2: 'abc', width_mm: 'x', openings: [{ type: 'door', width_mm: 'q' }], method: 'photo' }] }] })).r; ok(isFiniteAll(r), 'measured wall with garbage strings -> finite');
  // exterior
  r = (await price({ rooms: [{ type: 'exterior', ext: { weatherboard: 50, render: -5, eaves: 'abc', scaffold: 4000, tower: 2, gutters: 0 } }] })).r;
  ok(r.lines.length === 4 && r.lines.find(l => l.key === 'p_weatherboard').amount === 2400 && r.lines.find(l => l.key === 'p_scaffold').amount === 4000 && r.lines.find(l => l.key === 'p_tower').amount === 440 && r.lines.find(l => l.key === 'p_setup').amount === 150, 'exterior: negatives/strings/zeros skipped, 50 m2 wb + scaffold lump sum + 2 tower days + set-up');
  r = (await price({ rooms: [{ type: 'exterior', ext: { weatherboard: 100, storeys: 2, coats: 3, condition: 'poor' } }] })).r;
  ok(r.lines.find(l => l.key === 'p_weatherboard').rate === 57.6 && r.lines.some(l => l.key === 'p_ext_coat') && r.lines.some(l => l.key === 'p_prep_heavy') && r.lines.find(l => l.key === 'p_sealer').qty === 30, 'exterior two storey +20%, 3 coats adds an extra coat line, poor adds heavy prep and 30% spot prime');
  r = (await price({ rooms: [{ type: 'exterior', ext: { weatherboard: 100, pressure: 100 } }] })).r; ok(r.lines.some(l => l.key === 'p_pressure') && /priced separately/.test(await p.evaluate(() => QCStore.PRICE_ITEMS.filter(x => x[0] === 'p_weatherboard')[0][5])), 'pressure wash is a separate line and the weatherboard note says so');
  r = (await price({ rooms: [{ type: 'exterior', ext: { weatherboard: 50 } }], premium_paint: true }, { prices: { p_weatherboard: null } })).r; ok(r.lines[0].confirm && r.lines[0].amount === 0, 'exterior with null price -> TO CONFIRM');
  // deposit
  r = (await price({ rooms: [{ L: 4, W: 3 }] }, { rules: { deposit_pct: '' }, details: { deposit_pct: '' } })).r; ok(r.deposit === Math.round(r.total * 10) / 100 && r.deposit_pct === 10, 'blank deposit pct -> 10% used');
  r = (await price({ rooms: [{ L: 4, W: 3 }] }, { rules: { deposit_pct: 0 } })).r; ok(r.deposit === 0, 'deposit 0% -> $0 deposit');
  r = (await price({ rooms: [{ L: 4, W: 3 }], client: { address: '', type: 'commercial' } }, { rules: { deposit_pct: 100 } })).r; ok(r.deposit === 0 && r.deposit_pct === 0 && r.balance_days === 30 && r.business_terms, 'commercial job with no per-job deposit -> business terms: 0% deposit, 30 days');
  r = (await price({ rooms: [{ L: 4, W: 3 }], deposit_pct: 100, client: { address: '', type: 'commercial' } })).r; ok(r.deposit === r.total && !r.deposit_capped, 'deposit 100% typed on a commercial job -> full total, no cap');
  r = (await price({ rooms: [{ L: 4, W: 3 }] }, { rules: { deposit_pct: 100 } })).r; ok(r.deposit === 1000 && r.deposit_capped && r.deposit_capped.requested === 100 && /SA/.test(r.deposit_capped.reason), 'deposit 100% for a homeowner in SA (postcode 5000) -> capped at $1,000 with deposit_capped set');
  r = (await price({ rooms: [{ L: 4, W: 3 }], deposit_pct: 5 } )).r; ok(r.deposit === Math.round(r.total * 5) / 100 && r.deposit_pct === 5, 'per-job deposit_pct 5 overrides the default');
  const caps = await p.evaluate(() => [QCPricing.depositCap(10000, 'NSW').pct, QCPricing.depositCap(5000, 'SA').amount, QCPricing.depositCap(30000, 'SA').pct, QCPricing.depositCap(8000, 'WA').pct, QCPricing.depositCap(7000, 'WA').pct, QCPricing.depositCap(25000, 'VIC').pct, QCPricing.depositCap(19999, 'QLD').pct, QCPricing.depositCap(1000, 'TAS').reason]); ok(caps[0] === 10 && caps[1] === 1000 && caps[2] === 5 && caps[3] === 6.5 && caps[4] === 100 && caps[5] === 5 && caps[6] === 10 && /no legal cap in TAS/.test(caps[7]), 'depositCap: NSW 10, SA $1,000 then 5%, WA 6.5% from $7,500 (none below), VIC/QLD 10 then 5, TAS no cap: ' + JSON.stringify(caps));
  r = (await price({ rooms: [{ L: 4, W: 3, wallpaper_m2: 10, condition: 'good' }] })).r; ok(r.lines.find(l => l.key === 'p_sealer').qty === 10 && r.lines.find(l => l.key === 'p_prep_mod').qty === 1, 'wallpaper always brings a sealer coat and 1 hr prep per 10 m2');
  r = (await price({ rooms: [{ L: 4, W: 3, feature_m2: 5 }] })).r; ok(r.lines.find(l => l.key === 'p_walls').qty === 28.6, 'feature m2 taken off the wall area (33.6 - 5)');
  r = (await price({ rooms: [{ L: 4, W: 3, wardrobe_pairs: 1 }] })).r; ok(r.lines.find(l => l.key === 'p_walls').qty === 29.8 && r.lines.find(l => l.key === 'p_skirting').qty === 12.2, 'robe opening deducted: 3.8 m2 off walls, 1.8 lm off skirting');
  r = (await price({ rooms: [{ L: 4, W: 3, surfaces: { walls: false, ceiling: true, skirting: false }, condition: 'poor' }] })).r; ok(r.lines.some(l => l.key === 'p_prep_heavy') && r.lines.find(l => l.key === 'p_sealer').qty === 3.6, 'poor condition applies to a ceiling-only room (30% spot seal of 12 m2)');
  r = (await price({ rooms: [{ L: 4, W: 3, colour_change: true, cornice: true, window_kind: 'timber', windows: 1, doors: 2, panelled_doors: 1, high_access: true, exclude_m2: 3.6 }] })).r; ok(r.lines.find(l => l.key === 'p_walls').qty === 30 && r.lines.find(l => l.key === 'p_colour_change').qty === 30 && r.lines.find(l => l.key === 'p_cornice').qty === 14 && r.lines.some(l => l.key === 'p_window_timber') && r.lines.find(l => l.key === 'p_door_panel').qty === 1 && r.lines.some(l => l.key === 'p_high_access'), 'new room fields: exclude, colour change, cornice, timber window, panelled door, high access');
  r = (await price({ rooms: [{ perimeter_m: 20, ceiling_m2: 18 }] })).r; ok(r.lines.find(l => l.key === 'p_walls').qty === 48 && r.lines.find(l => l.key === 'p_ceilings').qty === 18, 'direct perimeter and ceiling entry');
  a = (await price({ rooms: [{ L: 4, W: 3 }] })).r; b = (await price({ rooms: [{ L: 4, W: 3 }], client_paint: true })).r; ok(b.total < a.total && b.cost.paint === 0 && /client/.test(b.assumptions.join()), 'client supplies paint: cheaper, no paint cost, noted');
  r = (await price({ rooms: [{ L: 4, W: 3 }], extras: [{ desc: 'opt', qty: 1, rate: 500, optional: true }] })).r; ok(r.subtotal === a.subtotal && r.options_total === 500 && r.lines.find(l => l.optional), 'optional extra listed but not in the total');
  ok(a.lines.every(l => l.group && l.client_desc && l.provenance != null) && a.gst === Math.round(a.subtotal * 10) / 100, 'every line has group, client_desc and provenance; GST is round2(subtotal x 0.1)');
  // rounding: PDF rate column vs amount (money() rounds rates)
  r = (await price({ rooms: [{ L: 4, W: 3 }], premium_paint: true })).r; const wl = r.lines.find(l => l.key === 'p_walls');
  t.note(`premium walls line: qty ${wl.qty} x rate ${wl.rate} = ${wl.amount}; PDF prints rate as ${await p.evaluate(x => QCPdf.money(x), wl.rate)}`);

  // 2. costing
  const derive = c => p.evaluate(c => { const d = Object.assign(QCCosting.defaults(), c); if (c.paint_price === null) delete d.paint_price; try { return { ok: true, r: QCCosting.deriveRates(d) }; } catch (e) { return { ok: false, err: e.message }; } }, c);
  const allNum = o => Object.keys(o).every(k => Number.isFinite(o[k]));
  let d = await derive({ labour_rate: '' }); ok(d.ok && allNum(d.r) && d.r.p_tower > 0 && d.r.p_scaffold === undefined, 'deriveRates blank labour -> numbers, scaffold not derived (walls ' + d.r.p_walls + ')');
  const dd = await p.evaluate(() => QCCosting.deriveDiff(window.__qcApp.store.load())); ok(Array.isArray(dd) && dd.length > 0 && dd.every(x => x.key && x.label && typeof x.to === 'number'), 'deriveDiff lists what Calculate prices would change (' + dd.length + ' items)');
  const tins = await p.evaluate(() => [QCCosting.tinsFor(2.16, QCCosting.tinSizes(QCCosting.defaults(), 'ceilings')).label, QCCosting.tinsFor(5.34, QCCosting.tinSizes(QCCosting.defaults(), 'walls')).label, QCCosting.tinsFor(12.74, QCCosting.tinSizes(QCCosting.defaults(), 'ceilings')).label, QCCosting.tinsFor(2.6, QCCosting.tinSizes(QCCosting.defaults(), 'enamel')).label, QCCosting.tinsFor(0.4, [1, 2, 4]).label]); ok(tins[0] === '1 × 4 L' && tins[2] === '1 × 15 L' && !/2 × 1 L/.test(tins.join()) && tins[4] === '1 × 1 L', 'tins: cheapest whole tins per type, never two 1 L: ' + tins.join(' | '));
  const bdw = await p.evaluate(() => { const c = QCCosting.defaults(); const b = QCCosting.breakdown([{ key: 'p_walls', qty: 100 }], c, 3000); return { l: b.litres.walls, days: b.site_days, hours: b.hours, base: b.base_hours }; }); ok(Math.abs(bdw.l - 100 * 2 / 14 * 1.08) < 0.01 && bdw.hours > bdw.base && bdw.days === 3, 'breakdown: 8% wastage on litres, per-day allowance on top of base hours, days = ceil(hours / 8)');
  d = await derive({ labour_rate: 0, margin_pct: 0, coats: 0, coverage_m2_per_l: 0 }); ok(d.ok && allNum(d.r), 'deriveRates zeros -> numbers (walls ' + d.r.p_walls + ')');
  d = await derive({ labour_rate: -65 }); ok(d.ok && Object.values(d.r).every(v => v >= 0), 'deriveRates negative labour must not produce negative prices (walls ' + (d.r && d.r.p_walls) + ')');
  d = await derive({ margin_pct: -150 }); ok(d.ok && Object.values(d.r).every(v => v >= 0), 'deriveRates margin -150% must not produce negative prices (walls ' + (d.r && d.r.p_walls) + ')');
  d = await derive({ coverage_m2_per_l: -14, coats: -2 }); ok(d.ok && allNum(d.r) && Object.values(d.r).every(v => v >= 0), 'deriveRates negative coats/coverage -> finite, non-negative (walls ' + (d.r && d.r.p_walls) + ')');
  d = await derive({ paint_price: null }); ok(d.ok && allNum(d.r), 'deriveRates paint_price missing -> numbers');
  d = await derive({ paint_price: { walls: 28 } }); ok(d.ok && allNum(d.r), 'deriveRates paint_price missing keys -> numbers');
  d = await derive({ hours_scale: -1 }); ok(d.ok && Object.values(d.r).every(v => v >= 0), 'deriveRates hours_scale -1 must not go negative (walls ' + (d.r && d.r.p_walls) + ')');
  let bd = await p.evaluate(() => { try { const b = QCCosting.breakdown([{ qty: 5 }, { key: 'nope', qty: 2 }, { key: 'p_walls', qty: 'abc' }, { key: 'p_walls', qty: 10 }], QCCosting.defaults(), 500); return { ok: true, b }; } catch (e) { return { ok: false, err: e.message }; } });
  ok(bd.ok && Number.isFinite(bd.b.cost) && Number.isFinite(bd.b.margin_pct), 'breakdown with keyless/unknown/garbage lines -> finite');
  bd = await p.evaluate(() => { const b = QCCosting.breakdown([{ key: 'p_walls', qty: 10 }], QCCosting.defaults(), 0); return b; }); ok(bd.margin_pct === 0 && Number.isFinite(bd.margin), 'breakdown subtotal 0 -> margin_pct 0, not NaN');
  bd = await p.evaluate(() => QCCosting.breakdown([{ key: 'p_walls', qty: 10 }], {}, 100)); ok(Number.isFinite(bd.cost), 'breakdown with empty costing -> finite');
  // Work out my rates via UI
  await t.go('#/settings'); await p.waitForSelector('#derive');
  await p.evaluate(() => { const S = window.__qcApp.store.load(); S.prices.p_deck = null; S.prices.p_walls = ''; window.__qcApp.store.save(); });
  await p.click('#derive'); await p.waitForTimeout(150);
  const missing = await p.evaluate(() => { const S = window.__qcApp.store.load(); return QCStore.PRICE_ITEMS.map(x => x[0]).filter(k => typeof S.prices[k] !== 'number' || !Number.isFinite(S.prices[k])); });
  ok(missing.length === 0, 'after Work out my rates every PRICE_ITEM has a numeric price' + (missing.length ? ' (missing: ' + missing.join(',') + ')' : ''));
  const domVals = await p.$$eval('[data-price]', els => els.filter(e => e.value === '').map(e => e.dataset.price)); ok(domVals.length === 0, 'settings price inputs all filled after derive');

  // UI room checks: type garbage into L/W, negative doors, and see the preview
  await t.go('#/'); await p.waitForSelector('#newjob'); await p.click('#newjob'); await p.waitForSelector('[data-add="interior"]'); await p.click('[data-add="interior"]'); await p.waitForSelector('[data-bind="L"]');
  await p.fill('[data-bind="L"]', '4'); await p.fill('[data-bind="W"]', '3'); await p.waitForTimeout(80);
  const prev1 = await p.$eval('#preview', e => e.innerText); ok(/Room subtotal/.test(prev1) && /Walls/.test(prev1), 'room preview shows lines for 4 x 3');
  await p.fill('[data-bind="doors"]', '-2'); await p.waitForTimeout(80); const prev2 = await p.$eval('#preview', e => e.innerText);
  const m1 = +(prev1.match(/Walls[^\n]*\n[^\n]*\n?\s*([\d.]+) m²/) || [0, 0])[1], m2 = +(prev2.match(/Walls[^\n]*\n[^\n]*\n?\s*([\d.]+) m²/) || [0, 0])[1];
  t.note('UI wall m2 doors=0 -> ' + m1 + ', doors=-2 -> ' + m2);
  const stored = await p.evaluate(() => window.__qcApp.store.load().jobs[0].rooms[0].doors); ok(stored === -2 || stored === '', 'negative doors typed in UI stored as ' + JSON.stringify(stored) + ' (input has min=0 but no clamp)');
  await p.fill('[data-bind="L"]', ''); await p.fill('[data-bind="L"]', '1e400'); await p.waitForTimeout(80);
  const prev3 = await p.$eval('#preview', e => e.innerText); ok(!/NaN|Infinity/.test(prev3), 'L=1e400 in the UI does not show NaN/Infinity: ' + prev3.replace(/\s+/g, ' ').slice(0, 80));
  // exterior UI
  await t.go('#/job/' + (await p.evaluate(() => window.__qcApp.store.load().jobs[0].id))); await p.waitForSelector('[data-add="exterior"]'); await p.click('[data-add="exterior"]'); await p.waitForSelector('[data-bind="ext.weatherboard"]');
  await p.fill('[data-bind="ext.weatherboard"]', '-20'); await p.fill('[data-bind="ext.scaffold"]', '1.5'); await p.waitForTimeout(80);
  const pe = await p.$eval('#preview', e => e.innerText); ok(/Scaffold/.test(pe) && !/Weatherboard/.test(pe), 'exterior preview: negative weatherboard ignored, scaffold shown');
  ok(t.errors.length === 0, 'no page errors during pricing tests');
  await t.done();
})().catch(e => { console.error(e); process.exit(1); });
