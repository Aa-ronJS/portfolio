/* Chasem: labour and paint behind each price. Set once; derives rates for the price list and shows a private cost/margin breakdown per quote. */
(function () {
  'use strict';
  // key: [hours per unit, paint type, litres per unit (or coats when a coverage class is given), other $ per unit, coverage class, consumables class]
  // coverage class: litres = coats / coverage[class] (per-substrate spread rate); blank = the litres figure is used as written.
  // consumables class: 'm2' | 'lm' | 'each' | '' scales costing.consumables_m2 (sandpaper, filler, tape, plastic, rollers).
  var BASE = {
    p_setup: [1.5, 'none', 0, 20, '', ''],
    p_walls: [0.20, 'walls', 2, 0, 'walls', 'm2'], p_ceilings: [0.20, 'ceilings', 2, 0, 'ceilings', 'm2'], p_cornice: [0.06, 'ceilings', 0.02, 0, '', 'lm'],
    p_skirting: [0.09, 'enamel', 0.03, 0, '', 'lm'], p_door: [1.3, 'enamel', 0.25, 0, '', 'each'], p_door_one: [0.75, 'enamel', 0.13, 0, '', 'each'], p_door_panel: [0.7, 'enamel', 0.05, 0, '', ''],
    p_window: [0.45, 'enamel', 0.10, 0, '', 'each'], p_window_timber: [1.4, 'enamel', 0.30, 0, '', 'each'], p_wardrobe: [1.2, 'enamel', 0.4, 0, '', 'each'],
    p_feature: [0.30, 'walls', 3, 0, 'walls', 'm2'], p_colour_change: [0.06, 'walls', 1, 0, 'walls', ''], p_wallpaper: [0.35, 'none', 0, 1.5, '', 'm2'],
    p_prep_mod: [1.0, 'none', 0, 3, '', ''], p_prep_heavy: [1.0, 'none', 0, 5, '', ''], p_sealer: [0.06, 'sealer', 1, 0, 'sealer', ''], p_new_plaster: [0.06, 'sealer', 1, 0, 'sealer', 'm2'],
    p_high_access: [1.5, 'none', 0, 20, '', ''],
    p_weatherboard: [0.39, 'exterior', 2, 0, 'exterior', 'm2'], p_render: [0.27, 'exterior', 2, 0, 'render', 'm2'], p_ext_coat: [0.07, 'exterior', 1, 0, 'exterior', ''],
    p_eaves: [0.27, 'exterior', 0.08, 0, '', 'lm'], p_gutters: [0.17, 'enamel', 0.04, 0, '', 'lm'], p_ext_door: [1.7, 'enamel', 0.35, 0, '', 'each'], p_ext_window: [1.7, 'enamel', 0.30, 0, '', 'each'], p_ext_window_alu: [0.6, 'enamel', 0.12, 0, '', 'each'],
    p_deck: [0.2, 'oil', 2, 0, 'oil', 'm2'], p_fence: [0.15, 'exterior', 2, 0, 'fence', 'm2'], p_pressure: [0.025, 'none', 0, 0.5, '', ''], p_tower: [0, 'none', 0, 160, '', ''], p_scaffold: [0, 'none', 0, 0, '', '']
  };
  var PAINT = { walls: 'Wall paint, low sheen', ceilings: 'Ceiling flat', enamel: 'Enamel, doors and trim', exterior: 'Exterior acrylic', sealer: 'Sealer / stain block', oil: 'Decking oil' };
  var COVERAGE = { walls: 14, ceilings: 12, enamel: 12, exterior: 9, render: 6, sealer: 10, oil: 8, fence: 6 };
  var TIN_SIZES = { walls: '4, 10, 15', ceilings: '4, 10, 15', enamel: '1, 2, 4', exterior: '4, 10, 15', sealer: '4, 10', oil: '4, 10' };
  var TIN_FACTOR = { 1: 1.8, 2: 1.5, 4: 1.35, 10: 1.1, 15: 1.0 };
  var CONSUMABLE = { m2: 1, lm: 0.6, each: 10 };
  function copy(o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = o[k]; }); return r; }
  function defaults() {
    return { labour_rate: 65, margin_pct: 40, coats: 2, coverage_m2_per_l: 14, coverage: copy(COVERAGE), paint_price: { walls: 28, ceilings: 16, enamel: 45, exterior: 32, sealer: 22, oil: 30 }, hours_scale: 1,
      tin_sizes: copy(TIN_SIZES), tin_price_factor: copy(TIN_FACTOR), charge_tins: false, wastage_pct: 8, setup_hours: 1.5, daily_hours: 0.75, consumables_m2: 0.5, crew: 1, hours_per_day: 8 };
  }
  function num(v, d) { var x = parseFloat(v); return isNaN(x) ? d : x; }
  function pos(v, d) { var x = parseFloat(v); return isNaN(x) || x <= 0 ? d : x; }
  function parseSizes(raw) { var arr = (Array.isArray(raw) ? raw : String(raw).split(/[^0-9.]+/)).map(function (v) { return parseFloat(v); }).filter(function (v) { return v > 0 && v <= 100; }); arr = arr.map(function (v) { return Math.round(v * 2) / 2; }).sort(function (a, b) { return a - b; }); return arr.filter(function (v, i) { return arr.indexOf(v) === i; }); }
  // tin sizes for a paint type: per-type list in costing.tin_sizes (object), or one list for every type (old string setting)
  function tinSizes(c, type) {
    var raw = c && c.tin_sizes != null ? c.tin_sizes : null, list;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) list = raw[type] != null && raw[type] !== '' ? raw[type] : TIN_SIZES[type] || '4, 10, 15';
    else if (raw != null && raw !== '') list = raw; else list = TIN_SIZES[type] || '4, 10, 15';
    var arr = parseSizes(list); if (!arr.length) arr = parseSizes(TIN_SIZES[type] || '4, 10, 15'); if (!arr.length) arr = [4, 10, 15]; return arr;
  }
  function factorFor(size, factors) { var f = factors || TIN_FACTOR, v = parseFloat(f[size]); if (v > 0) return v; var ks = Object.keys(f).map(Number).filter(function (k) { return k > 0 && parseFloat(f[k]) > 0; }).sort(function (a, b) { return a - b; }); if (!ks.length) return 1; var best = ks[0]; ks.forEach(function (k) { if (Math.abs(k - size) < Math.abs(best - size)) best = k; }); return parseFloat(f[best]) || 1; }
  // cheapest set of whole tins that covers the litres needed, at price-per-litre × size factor; fewest tins on a tie; never more than one 1 L tin
  function tinsFor(litres, sizes, factors) {
    sizes = (sizes && sizes.length ? sizes : [4, 10, 15]).slice().sort(function (a, b) { return a - b; }); var need = Math.max(0, parseFloat(litres) || 0); if (need <= 0) return { litres: 0, tins: {}, label: '', count: 0, units: 0 };
    var big = sizes[sizes.length - 1];
    if (need > 2000) { var nBig = Math.ceil(need / big), t0 = {}; t0[big] = nBig; return { litres: nBig * big, tins: t0, label: nBig + ' × ' + big + ' L', count: nBig, units: nBig * big * factorFor(big, factors) }; }
    var U = 2, INF = 1e18, main = sizes.filter(function (s) { return s !== 1; }), hasOne = sizes.indexOf(1) >= 0;
    if (!main.length) { var n1 = Math.ceil(need), t1 = { 1: n1 }; return { litres: n1, tins: t1, label: n1 + ' × 1 L', count: n1, units: n1 * factorFor(1, factors) }; }
    var target = Math.ceil(need * U - 1e-9), maxT = target + Math.round(big * U);
    var best = new Array(maxT + 1), cnt = new Array(maxT + 1), pick = new Array(maxT + 1); best[0] = 0; cnt[0] = 0;
    for (var t = 1; t <= maxT; t++) { best[t] = INF; cnt[t] = INF; main.forEach(function (s) { var u = Math.round(s * U); if (u > t || best[t - u] >= INF) return; var v = best[t - u] + s * factorFor(s, factors), c = cnt[t - u] + 1; if (v < best[t] - 1e-9 || (Math.abs(v - best[t]) < 1e-9 && c < cnt[t])) { best[t] = v; cnt[t] = c; pick[t] = u; } }); }
    function solve(T0, withOne) { var res = null; for (var T = T0; T <= maxT; T++) { if (best[T] < INF) { var v = best[T] + (withOne ? factorFor(1, factors) : 0), c = cnt[T] + (withOne ? 1 : 0); if (!res || v < res.units - 1e-9 || (Math.abs(v - res.units) < 1e-9 && c < res.count)) res = { T: T, units: v, count: c, one: withOne }; } } return res; }
    var a = solve(target, false), b = hasOne ? solve(Math.max(0, target - U), true) : null, w = a;
    if (b && (!w || b.units < w.units - 1e-9 || (Math.abs(b.units - w.units) < 1e-9 && b.count < w.count))) w = b;
    if (!w) return { litres: need, tins: {}, label: '', count: 0, units: 0 };
    var tins = {}, cur = w.T; while (cur > 0) { var u = pick[cur], sz = u / U; tins[sz] = (tins[sz] || 0) + 1; cur -= u; } if (w.one) tins[1] = (tins[1] || 0) + 1;
    var label = Object.keys(tins).map(Number).sort(function (x, y) { return y - x; }).map(function (sz) { return tins[sz] + ' × ' + sz + ' L'; }).join(' + ');
    return { litres: w.T / U + (w.one ? 1 : 0), tins: tins, label: label, count: w.count, units: w.units };
  }
  function coverageFor(c, cls) { var cov = c && c.coverage && typeof c.coverage === 'object' ? c.coverage : {}; var v = pos(cov[cls], 0); if (v) return v; if (cls === 'walls') return pos(c && c.coverage_m2_per_l, COVERAGE.walls); return COVERAGE[cls] || pos(c && c.coverage_m2_per_l, 14); }
  function unitCost(key, c) {
    var b = BASE[key]; if (!b) return null; c = c || {};
    var hrs = b[0]; if (key === 'p_setup') hrs = num(c.setup_hours, 1.5); hrs = Math.max(0, hrs) * Math.max(0.1, pos(c.hours_scale, 1));
    var type = b[1], litres = b[2];
    if (b[4]) { var coats = Math.max(1, pos(c.coats, 2)); litres = (b[2] === 2 ? coats : b[2] === 3 ? coats + 1 : b[2]) / coverageFor(c, b[4]); } // 2-coat items follow the coats setting; 3-coat items are one more; single coats stay single
    if (type !== 'none') litres = litres * (1 + Math.max(0, num(c.wastage_pct, 8)) / 100); else litres = 0;
    var paint$ = type === 'none' ? 0 : litres * Math.max(0, num((c.paint_price || {})[type], 0));
    var labour$ = hrs * Math.max(0, num(c.labour_rate, 0)), cons$ = (CONSUMABLE[b[5]] || 0) * Math.max(0, num(c.consumables_m2, 0.5)), other$ = b[3] + cons$;
    return { hours: hrs, litres: litres, paint_type: type, paint: paint$, labour: labour$, other: other$, consumables: cons$, cost: labour$ + paint$ + other$ };
  }
  function roundRate(rate) { rate = Math.max(0, rate); return rate >= 20 ? Math.round(rate) : Math.round(rate * 2) / 2; }
  // rates for every price item from labour, paint and markup; scaffold is typed per job so it is left alone
  function deriveRates(c) { var out = {}, mk = 1 + Math.max(0, num(c && c.margin_pct, 0)) / 100; Object.keys(BASE).forEach(function (k) { if (k === 'p_scaffold') return; var u = unitCost(k, c); if (!u) return; out[k] = roundRate(u.cost * mk); }); return out; }
  // what "Calculate prices" would change: [{key, label, from, to}], so the UI can confirm before overwriting
  function deriveDiff(settings) {
    var s = settings || {}, prices = s.prices || {}, der = deriveRates(s.costing || defaults()), items = (window.QCStore && QCStore.PRICE_ITEMS) || [], out = [];
    items.forEach(function (p) { var k = p[0]; if (der[k] == null) return; var from = prices[k] == null || prices[k] === '' ? null : num(prices[k], null); if (from !== der[k]) out.push({ key: k, label: p[1], unit: p[2], from: from, to: der[k] }); });
    return out;
  }
  // lines: priced quote lines with .key and .qty; returns hours, litres by type, tins, $ labour, $ paint, $ other, cost, days and margin against the quoted subtotal
  function breakdown(lines, c, subtotal, opts) {
    c = c || {}; opts = opts || {};
    var t = { hours: 0, labour: 0, paint: 0, other: 0, litres: {}, base_hours: 0, daily_hours: 0 }, rate = Math.max(0, num(c.labour_rate, 0));
    (lines || []).forEach(function (l) { if (!l || !l.key || l.optional) return; var u = unitCost(l.key, c); if (!u) return; var q = parseFloat(l.qty) || 0; if (q < 0) q = 0; t.hours += u.hours * q; t.labour += u.labour * q; t.paint += u.paint * q; t.other += u.other * q; if (u.litres) t.litres[u.paint_type] = (t.litres[u.paint_type] || 0) + u.litres * q; });
    // scaffold is a pass-through at the typed amount
    (lines || []).forEach(function (l) { if (l && l.key === 'p_scaffold' && !l.optional) t.other += Math.max(0, parseFloat(l.amount) || 0); });
    t.base_hours = t.hours;
    var crew = Math.max(1, Math.round(pos(c.crew, 1))), hpd = pos(c.hours_per_day, 8), capacity = crew * hpd;
    var siteDays = t.hours > 0 ? Math.max(1, Math.ceil(t.hours / capacity - 1e-9)) : 0;
    t.daily_hours = siteDays * Math.max(0, num(c.daily_hours, 0)) * crew; t.hours += t.daily_hours; t.labour += t.daily_hours * rate;
    t.crew = crew; t.hours_per_day = hpd; t.site_days = t.hours > 0 ? Math.max(1, Math.ceil(t.hours / capacity - 1e-9)) : 0;
    // what actually gets bought: whole tins per paint type, cheapest mix of sizes
    t.tins = {}; t.paint_tins = 0; t.paint_extra_litres = 0; t.paint_extra_cost = 0;
    Object.keys(t.litres).forEach(function (k) { var tf = tinsFor(t.litres[k], tinSizes(c, k), c.tin_price_factor), price = Math.max(0, num((c.paint_price || {})[k], 0)), cost = tf.units * price; t.tins[k] = { used: t.litres[k], litres: tf.litres, label: tf.label, tins: tf.tins, cost: cost }; t.paint_tins += cost; t.paint_extra_litres += tf.litres - t.litres[k]; t.paint_extra_cost += Math.max(0, cost - t.litres[k] * price); });
    t.paint_used = t.paint; if (c.charge_tins === true) t.paint = t.paint_tins;
    if (opts.client_paint) { t.paint = 0; t.paint_used = 0; t.client_paint = true; }
    t.cost = t.labour + t.paint + t.other; t.margin = (subtotal || 0) - t.cost; t.margin_pct = subtotal ? Math.round(100 * t.margin / subtotal) : 0; t.markup_pct = t.cost ? Math.round(100 * t.margin / t.cost) : 0; t.days = t.hours / capacity;
    return t;
  }
  window.QCCosting = { BASE: BASE, PAINT: PAINT, COVERAGE: COVERAGE, TIN_SIZES: TIN_SIZES, TIN_FACTOR: TIN_FACTOR, defaults: defaults, unitCost: unitCost, deriveRates: deriveRates, deriveDiff: deriveDiff, breakdown: breakdown, tinsFor: tinsFor, tinSizes: tinSizes, coverageFor: coverageFor };
})();
