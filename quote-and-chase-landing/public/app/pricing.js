/* Quote & Chase app: the pricing engine. Same rules as the pack's price list, deterministic, no guessing. Cents are kept; amounts round to 2 dp. */
(function () {
  'use strict';
  // Doors and windows being painted are extra-over: their openings are not taken off the wall area. Robe openings are (nothing behind the doors is painted).
  var DOOR_W = 0.9, ROBE_M2 = 3.8, ROBE_LM = 1.8;
  var EXTRA_LABELS = { p_scaffold: ['Scaffold, as quoted by the scaffolder', 'job'] };
  var CLIENT_DESC = { p_prep_mod: 'Preparation allowance', p_prep_heavy: 'Heavy preparation allowance', p_sealer: 'Sealer or stain block', p_setup: 'Set-up, protection and clean-up', p_scaffold: 'Scaffold', p_colour_change: 'Extra coat for colour change', p_ext_coat: 'Third coat', p_door_panel: 'Panelled doors, extra', p_high_access: 'Stairwell or void access', p_new_plaster: 'New plaster, sealer coat' };
  function n(v, d) { var x = parseFloat(v); return isNaN(x) ? (d || 0) : x; }
  function pos(v) { var x = parseFloat(v); return isNaN(x) || x < 0 ? 0 : x; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function round2(x) { return Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100; }
  function label(prices, key) { var it = (window.QCStore ? QCStore.PRICE_ITEMS : []).filter(function (p) { return p[0] === key; })[0]; if (it) return { label: it[1], unit: it[2] }; var x = EXTRA_LABELS[key]; return x ? { label: x[0], unit: x[1] } : { label: key, unit: '' }; }

  // Quantities for one room or exterior area, with a source note for each line. q.assumptions are for the client, q.notes are for the painter.
  function roomQuantities(room, rules) {
    rules = rules || {};
    var ext = room.type === 'exterior', q = { room: room.name || (ext ? 'Exterior' : 'Room'), lines: [], assumptions: [], notes: [], source: 'typed', typed: false };
    var H = n(room.H) || n(rules.ceiling_height_m) || 2.4, poorPct = Math.min(100, Math.max(0, n(rules.poor_seal_pct, 30))) / 100;
    function push(key, qty, source, extra) { if (!(qty > 0)) return null; var l = { key: key, qty: r1(qty), source: source }; if (extra) Object.keys(extra).forEach(function (k) { l[k] = extra[k]; }); q.lines.push(l); return l; }
    var cond = room.condition === 'fair' || room.condition === 'poor' ? room.condition : 'good';
    if (ext) {
      var e = room.ext || {}, two = n(room.storeys != null ? room.storeys : e.storeys) >= 2, coats = n(room.coats != null ? room.coats : e.coats, 2), up = two ? { uplift: true } : null;
      if (e.condition === 'fair' || e.condition === 'poor') cond = e.condition; else if (e.condition === 'good') cond = 'good';
      var wb = pos(e.weatherboard), rd = pos(e.render), face = wb + rd, src = 'from your numbers';
      push('p_weatherboard', wb, src, up); push('p_render', rd, src, up);
      if (coats >= 3 && face > 0) { push('p_ext_coat', face, 'rule: 3 coats = one extra coat on walls', up); q.assumptions.push(q.room + ': three coats on the walls.'); }
      push('p_eaves', pos(e.eaves), src, up); push('p_gutters', pos(e.gutters), src, up);
      push('p_ext_door', pos(e.ext_door), 'count'); push('p_ext_window', pos(e.ext_window), 'count', up); push('p_ext_window_alu', pos(e.ext_window_alu), 'count', up);
      push('p_deck', pos(e.deck), src); push('p_fence', pos(e.fence), src); push('p_pressure', pos(e.pressure), src);
      if (cond === 'fair' && face > 0) { push('p_prep_mod', face / 20, 'rule: fair = 1 hr per 20 m²'); q.assumptions.push(q.room + ': surfaces in fair condition, preparation allowance included.'); }
      if (cond === 'poor' && face > 0) { push('p_prep_heavy', face / 8, 'rule: poor = 1 hr per 8 m²'); push('p_sealer', face * poorPct, 'rule: poor = spot prime ' + Math.round(poorPct * 100) + '% of the area'); q.assumptions.push(q.room + ': surfaces in poor condition (peeling, bare timber), heavy preparation and spot priming allowed.'); }
      var scaf = pos(e.scaffold); if (scaf > 0) push('p_scaffold', 1, 'scaffolder\'s quote typed on the area', { rate_override: scaf });
      push('p_tower', pos(e.tower), 'days typed');
      if (two) q.assumptions.push(q.room + ': two storey, priced for work off ladders, planks and the access listed.');
      return q;
    }
    var doorsBoth = pos(room.doors), doorsOne = pos(room.doors_one_side), doorsTotal = doorsBoth + doorsOne, windows = pos(room.windows), robes = pos(room.wardrobe_pairs);
    var feature = pos(room.feature_m2), wallpaper = pos(room.wallpaper_m2), exclude = pos(room.exclude_m2), newPlaster = pos(room.new_plaster_m2);
    var wallArea = 0, ceilingArea = 0, skirting = 0, perim = 0, src2 = 'from your numbers';
    if (room.method === 'measured' && room.walls && room.walls.length) {
      wallArea = room.walls.reduce(function (s, w) { return s + n(w.paint_area_m2); }, 0);
      var widths = room.walls.map(function (w) { return n(w.width_mm) / 1000; }).sort(function (a, b) { return b - a; });
      var doorWidths = 0; room.walls.forEach(function (w) { (w.openings || []).forEach(function (o) { if (o.type === 'door') doorWidths += n(o.width_mm) / 1000; }); });
      perim = widths.reduce(function (s, w) { return s + w; }, 0); skirting = perim - doorWidths - ROBE_LM * robes; wallArea -= ROBE_M2 * robes;
      ceilingArea = n(room.ceiling_m2) || (widths.length >= 2 ? widths[0] * widths[1] : 0);
      var err = Math.max.apply(null, room.walls.map(function (w) { return n(w.expected_error_pct, 2); }));
      src2 = room.walls[0].method === 'roomplan-lidar' ? 'measured (LiDAR)' : 'measured (photo ±' + err + '%)';
      q.source = 'measured';
      if (room.walls.length < 4) q.assumptions.push(q.room + ': ' + room.walls.length + ' of the walls measured; the rest are not in this quote.');
      if (!n(room.ceiling_m2) && widths.length >= 2) q.notes.push(q.room + ': ceiling taken as the two longest measured walls multiplied (' + r1(ceilingArea) + ' m²).');
    } else {
      var L = n(room.L), W = n(room.W), P = n(room.perimeter_m), C = n(room.ceiling_m2);
      if (P > 0) perim = P; else if (L > 0 && W > 0) perim = 2 * (L + W);
      if (C > 0) ceilingArea = C; else if (L > 0 && W > 0) ceilingArea = L * W;
      if (perim > 0) {
        wallArea = perim * H - ROBE_M2 * robes; skirting = perim - DOOR_W * doorsTotal - ROBE_LM * robes; q.typed = true;
        if (!n(room.H)) q.notes.push(q.room + ': ceiling height taken as ' + H + ' m.');
        q.notes.push(q.room + ': ' + (P > 0 ? 'wall perimeter ' + P + ' m' : 'room size ' + L + ' × ' + W + ' m') + ' as typed, not measured.');
      }
    }
    wallArea = Math.max(0, wallArea - feature - exclude); skirting = Math.max(0, skirting); perim = Math.max(0, perim);
    if (exclude > 0) q.notes.push(q.room + ': ' + exclude + ' m² of wall left out (behind built-ins or not painted).');
    var s = room.surfaces || {}, paintWalls = s.walls !== false && wallArea > 0, paintCeil = s.ceiling !== false && ceilingArea > 0;
    if (paintWalls) push('p_walls', wallArea, src2);
    if (paintCeil) push('p_ceilings', ceilingArea, src2);
    if (room.cornice && perim > 0) push('p_cornice', perim, 'room perimeter');
    if (s.skirting !== false && skirting > 0) push('p_skirting', skirting, src2);
    push('p_door', doorsBoth, 'count'); push('p_door_one', doorsOne, 'count');
    var panelled = Math.min(pos(room.panelled_doors), doorsTotal); push('p_door_panel', panelled, 'count, on top of the door price');
    push(room.window_kind === 'timber' ? 'p_window_timber' : 'p_window', windows, 'count');
    push('p_wardrobe', robes, 'count');
    push('p_feature', feature, 'from your numbers, taken off the wall area');
    if (room.colour_change && paintWalls) { push('p_colour_change', wallArea, 'rule: colour change = one extra coat on the walls'); q.assumptions.push(q.room + ': colour change, three coats on the walls.'); }
    push('p_wallpaper', wallpaper, 'from your numbers');
    push('p_new_plaster', newPlaster, 'from your numbers');
    if (room.high_access) { push('p_high_access', 1, 'stairwell or void ticked'); q.assumptions.push(q.room + ': high access (stairwell or void) allowed for.'); }
    // condition and wallpaper: prep hours and sealer. Walls and ceilings both count; ceilings need less filling so they carry half the rate.
    var aw = paintWalls ? wallArea : 0, ac = paintCeil ? ceilingArea : 0, prepMod = 0, prepHeavy = 0, seal = 0, modWhy = [];
    if (wallpaper > 0) { seal += wallpaper; if (cond !== 'poor') { prepMod += wallpaper / 10; modWhy.push('wallpaper = 1 hr per 10 m² stripped'); } q.assumptions.push(q.room + ': wallpaper removal includes a sealer coat and joint preparation on the stripped walls.'); }
    if (cond === 'fair' && aw > 0) { prepMod += aw / 25; modWhy.push('fair = 1 hr per 25 m² of wall'); q.assumptions.push(q.room + ': walls in fair condition (scuffs, marks, small dents), preparation allowance included.'); }
    if (cond === 'poor' && (aw + ac) > 0) { prepHeavy += aw / 6 + ac / 12; seal += poorPct * (Math.max(0, aw - wallpaper) + ac); q.assumptions.push(q.room + ': ' + (aw ? 'walls' : 'ceiling') + ' in poor condition (peeling, damage), heavy preparation and spot sealing allowed.'); }
    seal = Math.min(seal, Math.max(aw + ac, wallpaper));
    push('p_prep_mod', prepMod, 'rule: ' + modWhy.join(' + '));
    push('p_prep_heavy', prepHeavy, 'rule: poor = 1 hr per 6 m² of wall, 12 m² of ceiling');
    push('p_sealer', seal, wallpaper > 0 && cond === 'poor' ? 'rule: stripped walls sealed, spot seal ' + Math.round(poorPct * 100) + '% of the rest' : wallpaper > 0 ? 'rule: stripped walls get a sealer coat' : 'rule: poor = spot seal ' + Math.round(poorPct * 100) + '% of the area');
    return q;
  }

  var PAINT_KEYS = { p_walls: 1, p_ceilings: 1, p_cornice: 1, p_skirting: 1, p_door: 1, p_door_one: 1, p_door_panel: 1, p_window: 1, p_window_timber: 1, p_wardrobe: 1, p_feature: 1, p_colour_change: 1, p_weatherboard: 1, p_render: 1, p_ext_coat: 1, p_eaves: 1, p_gutters: 1, p_ext_door: 1, p_ext_window: 1, p_ext_window_alu: 1, p_deck: 1, p_fence: 1 };
  function stateFor(settings) { var det = settings.details || {}; return String(det.state || (window.QCGeo ? QCGeo.stateOf(det.postcode) : '') || '').toUpperCase(); }
  function clientDesc(key, lab, l) { return (CLIENT_DESC[key] || lab.label) + (l.uplift ? ', two storey' : ''); }

  function priceJob(job, settings) {
    job = job || {}; settings = settings || {};
    var prices = settings.prices || {}, rules = settings.rules || {}, costing = settings.costing || null, det = settings.details || {}, lines = [], assumptions = [], notes = [], confirm = [];
    var prem = job.premium_paint ? (1 + Math.max(0, n(rules.premium_paint_pct)) / 100) : 1, upPct = Math.max(0, n(rules.storey_uplift_pct, 20)), mk = 1 + Math.max(0, n(costing && costing.margin_pct)) / 100;
    var clientPaint = !!job.client_paint, anyTyped = false, hasExt = false, hasInt = false, C = window.QCCosting && costing ? QCCosting : null;
    if (job.premium_paint) assumptions.push('Premium paint requested: ' + n(rules.premium_paint_pct) + '% added to painting lines.');
    (job.rooms || []).forEach(function (room) {
      var q = roomQuantities(room, rules); if (q.typed) anyTyped = true;
      if (q.lines.length) { if (room.type === 'exterior') hasExt = true; else hasInt = true; }
      q.lines.forEach(function (l) {
        var lab = label(prices, l.key), rate = prices[l.key], missing, eff, prov = l.source;
        if (l.rate_override != null) { eff = pos(l.rate_override); missing = false; }
        else { missing = (rate === null || rate === undefined || rate === '' || isNaN(parseFloat(rate))); eff = missing ? 0 : pos(rate); }
        if (PAINT_KEYS[l.key] && prem !== 1) { eff *= prem; prov += '; premium paint +' + n(rules.premium_paint_pct) + '%'; }
        if (l.uplift && upPct > 0) { eff *= (1 + upPct / 100); prov += '; two storey +' + upPct + '%'; }
        if (clientPaint && !missing && C && PAINT_KEYS[l.key]) { var u = C.unitCost(l.key, costing); if (u && u.paint > 0) { var off = round2(u.paint * mk); eff = Math.max(0, eff - off); prov += '; client supplies paint, $' + off + ' per ' + lab.unit + ' off'; } }
        eff = round2(eff);
        lines.push({ key: l.key, room: q.room, group: q.room, desc: lab.label + (l.uplift ? ', two storey' : ''), client_desc: clientDesc(l.key, lab, l), qty: l.qty, unit: lab.unit, rate: eff, amount: round2(l.qty * eff), source: l.source, provenance: prov, confirm: missing });
        if (missing) confirm.push(q.room + ': no rate for "' + lab.label + '" in your price list.');
      });
      assumptions = assumptions.concat(q.assumptions); notes = notes.concat(q.notes);
    });
    if (lines.length && rules.setup_line !== false) {
      var sr = prices.p_setup, sMissing = (sr === null || sr === undefined || sr === '' || isNaN(parseFloat(sr))), sl = label(prices, 'p_setup'), sEff = sMissing ? 0 : round2(pos(sr));
      lines.push({ key: 'p_setup', room: 'Job', group: 'Job', desc: sl.label, client_desc: clientDesc('p_setup', sl, {}), qty: 1, unit: sl.unit || 'job', rate: sEff, amount: sEff, source: 'once per job', provenance: 'once per job: drop sheets, masking, moving light furniture, clean-up', confirm: sMissing });
      if (sMissing) confirm.push('Job: no rate for "' + sl.label + '" in your price list.');
    }
    (job.extras || []).forEach(function (x) {
      var qty = n(x.qty, 1), rateOk = x.rate !== '' && x.rate != null && !isNaN(parseFloat(x.rate)), rate = rateOk ? pos(x.rate) : 0, amount = round2(qty * rate), needs = !!x.confirm || !rateOk, optional = !!x.optional;
      lines.push({ room: 'Extras', group: 'Extras', desc: x.desc || 'Extra item', client_desc: x.desc || 'Extra item', qty: qty, unit: x.unit || 'each', rate: round2(rate), amount: amount, source: 'added by you', provenance: 'added by you' + (optional ? ', optional' : ''), confirm: needs, optional: optional });
      if (needs) confirm.push('Extras: "' + (x.desc || 'Extra item') + '" marked TO CONFIRM.');
    });
    // days on site from the hours behind the lines, before travel is added
    var bd0 = C && lines.length ? C.breakdown(lines, costing, 0, { client_paint: clientPaint }) : null, days = bd0 && bd0.site_days ? bd0.site_days : 1;
    var tr = window.QCGeo ? QCGeo.travel(job, settings, days) : { amount: 0, days: 1 };
    if (tr.amount > 0) {
      var both = rules.travel_return !== false, tq = round2(tr.chargeable * (both ? 2 : 1) * (tr.days || 1));
      lines.push({ key: 'travel', room: 'Travel', group: 'Travel', desc: 'Travel, ' + tr.chargeable + ' km beyond ' + n(rules.free_radius_km) + ' km' + (both ? ' each way' : '') + (tr.days > 1 ? ', ' + tr.days + ' days' : ''), client_desc: 'Travel' + (tr.days > 1 ? ', ' + tr.days + ' days' : ''), qty: tq, unit: 'km', rate: round2(n(rules.travel_per_km)), amount: tr.amount, source: tr.source, provenance: tr.source + (tr.days > 1 ? ', × ' + tr.days + ' days on site' : ''), confirm: false });
    }
    if (tr.note) notes.push(tr.note);
    var billable = function (l) { return !l.optional; };
    var subtotal = round2(lines.filter(billable).reduce(function (s, l) { return s + l.amount; }, 0));
    // whole tins: only when the painter has switched it on, and never on a small quote
    if (C && costing && costing.charge_tins === true && lines.length) {
      var bd = C.breakdown(lines, costing, 0, { client_paint: clientPaint }), extraL = bd.paint_extra_litres, extra$ = round2(bd.paint_extra_cost * mk);
      var tinNote = Object.keys(bd.tins).filter(function (k) { return bd.tins[k].litres > 0; }).map(function (k) { return bd.tins[k].label + ' ' + k; }).join(', ');
      if (!clientPaint && extraL > 0.05 && extra$ >= 1 && subtotal >= 2000) { var tq2 = r1(extraL); lines.push({ key: 'paint_tins', room: 'Job', group: 'Job', desc: 'Paint rounding to whole tins', client_desc: 'Paint rounding to whole tins', qty: tq2, unit: 'L', rate: round2(extra$ / tq2), amount: extra$, source: tinNote, provenance: tinNote, confirm: false }); subtotal = round2(subtotal + extra$); }
      if (tinNote) notes.push('Paint in whole tins: ' + tinNote + '.');
    }
    var minimum = false, minJob = n(rules.minimum_job);
    if (lines.some(billable) && subtotal < minJob) { var diff = round2(minJob - subtotal); lines.push({ key: 'minimum', room: 'Adjustments', group: 'Adjustments', desc: 'Minimum job charge', client_desc: 'Minimum job charge', qty: 1, unit: 'job', rate: diff, amount: diff, source: 'rule: minimum job $' + minJob, provenance: 'rule: minimum job $' + minJob + ', lines came to $' + subtotal, confirm: false }); subtotal = round2(minJob); minimum = true; }
    var gst = det.gst ? round2(subtotal * 0.1) : 0, total = round2(subtotal + gst);
    var optionsTotal = round2(lines.filter(function (l) { return l.optional; }).reduce(function (s, l) { return s + l.amount; }, 0));
    var measured = (job.rooms || []).filter(function (r) { return r.method === 'measured' && r.walls && r.walls.length; }).length, total_rooms = (job.rooms || []).length;
    var cost = C ? C.breakdown(lines, costing, subtotal, { client_paint: clientPaint }) : null;
    if (anyTyped) assumptions.unshift('Sizes supplied by client, confirmed on site.');
    if (clientPaint) assumptions.push('Paint supplied by client; our price covers labour, sundries and equipment.');
    // deposit: per job or default, capped by the state rule for domestic work
    var pct = depositPct(settings, job), state = stateFor(settings), requested = round2(total * pct / 100), deposit = requested, capped = null;
    var ctype = job.client && job.client.type, domestic = ctype !== 'builder' && ctype !== 'commercial';
    if (domestic && total > 0) { var cap = depositCap(total, state); if (requested > cap.amount + 0.004) { deposit = round2(cap.amount); capped = { requested: pct, requested_amount: requested, cap: cap.pct, amount: deposit, reason: cap.reason, state: state }; } }
    return { lines: lines, subtotal: subtotal, gst: gst, total: total, minimum_applied: minimum, assumptions: assumptions, notes: notes, confirm: confirm, travel: tr, cost: cost, days: days,
      measured_rooms: measured, total_rooms: total_rooms, deposit: deposit, deposit_pct: pct, deposit_capped: capped, client_paint: clientPaint, has_exterior: hasExt, has_interior: hasInt, options_total: optionsTotal, state: state };
  }
  function blank(v) { return v === '' || v == null || isNaN(parseFloat(v)); }
  // per-job override, else the business default (rules.deposit_pct, older installs details.deposit_pct), else 10
  function depositPct(settings, job) {
    settings = settings || {}; var v = job ? job.deposit_pct : null;
    if (blank(v)) v = settings.rules ? settings.rules.deposit_pct : null;
    if (blank(v)) v = settings.details ? settings.details.deposit_pct : null;
    if (blank(v)) return 10; return Math.min(100, Math.max(0, parseFloat(v)));
  }
  // statutory deposit cap on domestic building work by state: {pct, amount, reason}
  function depositCap(total_inc_gst, state) {
    var total = Math.max(0, n(total_inc_gst)), st = String(state || '').toUpperCase();
    function r(pct, reason) { return { pct: pct, amount: round2(total * pct / 100), reason: reason, state: st }; }
    if (st === 'NSW') return r(10, 'NSW: deposits capped at 10% (Home Building Act)');
    if (st === 'VIC') return total < 20000 ? r(10, 'VIC: 10% under $20,000 (Domestic Building Contracts Act)') : r(5, 'VIC: 5% at $20,000 and over (Domestic Building Contracts Act)');
    if (st === 'QLD') return total < 20000 ? r(10, 'QLD: 10% under $20,000 (QBCC)') : r(5, 'QLD: 5% at $20,000 and over (QBCC)');
    if (st === 'SA') { if (total <= 20000) { var amt = Math.min(1000, total); return { pct: total > 0 ? round2(amt / total * 100) : 100, amount: round2(amt), reason: 'SA: $1,000 up to $20,000 (Building Work Contractors Act)', state: st }; } return r(5, 'SA: 5% over $20,000 (Building Work Contractors Act)'); }
    if (st === 'WA') return total >= 7500 ? r(6.5, 'WA: 6.5% at $7,500 and over (Home Building Contracts Act)') : r(10, 'WA: no statutory cap under $7,500; 10% as a conservative default');
    if (st === 'TAS' || st === 'NT' || st === 'ACT') return r(10, st + ': no specific cap applied; 10% as a conservative default');
    return r(10, 'no state set; 10% as a conservative default');
  }

  window.QCPricing = { roomQuantities: roomQuantities, priceJob: priceJob, label: label, depositPct: depositPct, depositCap: depositCap, round2: round2, PAINT_KEYS: PAINT_KEYS, CLIENT_DESC: CLIENT_DESC };
})();
