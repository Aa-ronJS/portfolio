/* Chasem app: the pricing engine. Same rules as the pack's price list, deterministic, no guessing. Cents are kept; amounts round to 2 dp. */
(function () {
  'use strict';
  // Doors and windows being painted are extra-over: their openings are not taken off the wall area. Robe openings are (nothing behind the doors is painted).
  var DOOR_W = 0.9, ROBE_M2 = 3.8, ROBE_LM = 1.8;
  var EXTRA_LABELS = { p_scaffold: ['Scaffold, scaffolder\'s quote', 'job'] };
  var CLIENT_DESC = { p_prep_mod: 'Preparation, filling and sanding', p_prep_heavy: 'Heavy preparation, scraping and sanding', p_sealer: 'Sealer or stain block', p_setup: 'Set-up, protection and clean-up', p_scaffold: 'Scaffold', p_colour_change: 'Extra coat for colour change', p_ext_coat: 'Third coat', p_door_panel: 'Panelled doors, extra', p_high_access: 'Stairwell or void, working at height', p_new_plaster: 'New plaster, sealer coat' };
  // the one sizes line on a quote: measured by the painter, or supplied by the client (any room marked measured_by 'client')
  var SIZES_TEXT = { us: 'Sizes measured on site.', client: 'Room sizes supplied by the client, confirmed on site before work starts.' };
  var BUSINESS_TYPES = { agent: 1, strata: 1, builder: 1, commercial: 1 };
  function n(v, d) { var x = parseFloat(v); return isNaN(x) ? (d || 0) : x; }
  function pos(v) { var x = parseFloat(v); return isNaN(x) || x < 0 ? 0 : x; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function round2(x) { return Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100; }
  function blank(v) { return v === '' || v == null || isNaN(parseFloat(v)); }
  function label(prices, key) { var it = (window.QCStore ? QCStore.PRICE_ITEMS : []).filter(function (p) { return p[0] === key; })[0]; if (it) return { label: it[1], unit: it[2] }; var x = EXTRA_LABELS[key]; return x ? { label: x[0], unit: x[1] } : { label: key, unit: '' }; }
  function isBusiness(job) { var t = job && job.client ? job.client.type : ''; return !!BUSINESS_TYPES[t]; }
  // room.price_override: the painter's own price for the room, ex GST; blank, 0 or rubbish means none
  function overrideOf(room) { var v = room ? room.price_override : null; if (blank(v)) return null; v = parseFloat(v); return v > 0 ? round2(v) : null; }

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
      // how much of the house is in that condition: all of it, about half, or one side (the weather side)
      var cs = e.condition_scope === 'half' || e.condition_scope === 'side' ? e.condition_scope : 'all', pf = cs === 'half' ? 0.5 : cs === 'side' ? 0.3 : 1;
      var where = cs === 'half' ? 'about half the surfaces' : cs === 'side' ? 'one side' : 'surfaces', whereRule = cs === 'half' ? ', about half the area' : cs === 'side' ? ', one side (30% of the area)' : '';
      var wb = pos(e.weatherboard), rd = pos(e.render), face = wb + rd, src = 'from your numbers';
      push('p_weatherboard', wb, src, up); push('p_render', rd, src, up);
      if (coats >= 3 && face > 0) { push('p_ext_coat', face, 'rule: 3 coats = one extra coat on walls', up); q.assumptions.push(q.room + ': three coats on the walls.'); }
      push('p_eaves', pos(e.eaves), src, up); push('p_gutters', pos(e.gutters), src, up);
      push('p_ext_door', pos(e.ext_door), 'count'); push('p_ext_window', pos(e.ext_window), 'count', up); push('p_ext_window_alu', pos(e.ext_window_alu), 'count', up);
      push('p_deck', pos(e.deck), src); push('p_fence', pos(e.fence), src); push('p_pressure', pos(e.pressure), src);
      if (cond === 'fair' && face > 0) { push('p_prep_mod', face * pf / 20, 'rule: fair = 1 hr per 20 m²' + whereRule); q.assumptions.push(q.room + ': ' + where + ' in fair condition (chalky, some flaking), preparation included.'); }
      if (cond === 'poor' && face > 0) { push('p_prep_heavy', face * pf / 8, 'rule: poor = 1 hr per 8 m²' + whereRule); push('p_sealer', face * pf * poorPct, 'rule: poor = spot prime ' + Math.round(poorPct * 100) + '% of the area' + whereRule); q.assumptions.push(q.room + ': ' + where + ' in poor condition (peeling, bare timber), heavy preparation and spot priming included.'); }
      var scaf = pos(e.scaffold); if (scaf > 0) push('p_scaffold', 1, 'scaffolder\'s quote typed on the area', { rate_override: scaf });
      push('p_tower', pos(e.tower), 'days typed');
      if (two) q.assumptions.push(q.room + ': two storey, priced for work off ladders, planks and the scaffold or tower listed.');
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
        q.notes.push(q.room + ': ' + (P > 0 ? 'wall perimeter ' + P + ' m' : 'room size ' + L + ' × ' + W + ' m') + ' as typed' + (room.measured_by === 'client' ? ', sizes from the client' : '') + '.');
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
    if (room.high_access) { push('p_high_access', 1, 'stairwell or void ticked'); q.assumptions.push(q.room + ': stairwell or void, working at height included.'); }
    // condition and wallpaper: prep hours and sealer. Walls and ceilings both count; ceilings need less filling so they carry half the rate.
    var aw = paintWalls ? wallArea : 0, ac = paintCeil ? ceilingArea : 0, prepMod = 0, prepHeavy = 0, seal = 0, modWhy = [];
    if (wallpaper > 0) { seal += wallpaper; if (cond !== 'poor') { prepMod += wallpaper / 10; modWhy.push('wallpaper = 1 hr per 10 m² stripped'); } q.assumptions.push(q.room + ': wallpaper removal includes a sealer coat and joint preparation on the stripped walls.'); }
    if (cond === 'fair' && aw > 0) { prepMod += aw / 25; modWhy.push('fair = 1 hr per 25 m² of wall'); q.assumptions.push(q.room + ': walls in fair condition (scuffs, marks, small dents), preparation included.'); }
    if (cond === 'poor' && (aw + ac) > 0) { prepHeavy += aw / 6 + ac / 12; seal += poorPct * (Math.max(0, aw - wallpaper) + ac); q.assumptions.push(q.room + ': ' + (aw ? 'walls' : 'ceiling') + ' in poor condition (peeling, damage), heavy preparation and spot sealing included.'); }
    seal = Math.min(seal, Math.max(aw + ac, wallpaper));
    push('p_prep_mod', prepMod, 'rule: ' + modWhy.join(' + '));
    push('p_prep_heavy', prepHeavy, 'rule: poor = 1 hr per 6 m² of wall, 12 m² of ceiling');
    push('p_sealer', seal, wallpaper > 0 && cond === 'poor' ? 'rule: stripped walls sealed, spot seal ' + Math.round(poorPct * 100) + '% of the rest' : wallpaper > 0 ? 'rule: stripped walls get a sealer coat' : 'rule: poor = spot seal ' + Math.round(poorPct * 100) + '% of the area');
    return q;
  }

  var PAINT_KEYS = { p_walls: 1, p_ceilings: 1, p_cornice: 1, p_skirting: 1, p_door: 1, p_door_one: 1, p_door_panel: 1, p_window: 1, p_window_timber: 1, p_wardrobe: 1, p_feature: 1, p_colour_change: 1, p_weatherboard: 1, p_render: 1, p_ext_coat: 1, p_eaves: 1, p_gutters: 1, p_ext_door: 1, p_ext_window: 1, p_ext_window_alu: 1, p_deck: 1, p_fence: 1 };
  function stateFor(settings) { var det = settings.details || {}; return String(det.state || (window.QCGeo ? QCGeo.stateOf(det.postcode) : '') || '').toUpperCase(); }
  function clientDesc(key, lab, l) { return (CLIENT_DESC[key] || lab.label) + (l.uplift ? ', two storey' : ''); }

  // the per-job figures every room line needs: rates, premium and storey loadings, client paint
  function context(job, settings) {
    job = job || {}; settings = settings || {};
    var rules = settings.rules || {}, costing = settings.costing || null;
    return { job: job, settings: settings, prices: settings.prices || {}, rules: rules, costing: costing,
      prem: job.premium_paint ? (1 + Math.max(0, n(rules.premium_paint_pct)) / 100) : 1, upPct: Math.max(0, n(rules.storey_uplift_pct, 20)), mk: 1 + Math.max(0, n(costing && costing.margin_pct)) / 100,
      clientPaint: !!job.client_paint, C: window.QCCosting && costing ? QCCosting : null };
  }
  // one room or area through the engine: {room, lines (what the quote shows), cost_lines (what the hours and litres come from), assumptions, notes, confirm, typed, source, override, engine_subtotal}
  function roomLines(room, ctx) {
    var q = roomQuantities(room, ctx.rules), prices = ctx.prices, rules = ctx.rules, lines = [], confirm = [], ext = room.type === 'exterior';
    q.lines.forEach(function (l) {
      var lab = label(prices, l.key), rate = prices[l.key], missing, eff, prov = l.source, base, loading = 0, loadingDesc = '';
      if (l.rate_override != null) { eff = pos(l.rate_override); missing = false; }
      else { missing = (rate === null || rate === undefined || rate === '' || isNaN(parseFloat(rate))); eff = missing ? 0 : pos(rate); }
      if (PAINT_KEYS[l.key] && ctx.prem !== 1) { eff *= ctx.prem; prov += '; premium paint +' + n(rules.premium_paint_pct) + '%'; }
      if (ctx.clientPaint && !missing && ctx.C && PAINT_KEYS[l.key]) { var u = ctx.C.unitCost(l.key, ctx.costing); if (u && u.paint > 0) { var off = round2(u.paint * ctx.mk); eff = Math.max(0, eff - off); prov += '; client supplies paint, $' + off + ' per ' + lab.unit + ' off'; } }
      base = round2(eff);
      if (l.uplift && ctx.upPct > 0) { eff *= (1 + ctx.upPct / 100); loading = ctx.upPct; loadingDesc = 'two storey +' + ctx.upPct + '%'; prov += '; ' + loadingDesc; }
      eff = round2(eff);
      lines.push({ key: l.key, room: q.room, group: q.room, desc: lab.label + (l.uplift ? ', two storey' : ''), client_desc: clientDesc(l.key, lab, l), qty: l.qty, unit: lab.unit, rate: eff, base_rate: base, loading: loading, loading_desc: loadingDesc, amount: round2(l.qty * eff), source: l.source, provenance: prov, confirm: missing });
      if (missing) confirm.push(q.room + ': no rate for "' + lab.label + '" in your price list.');
    });
    var out = { room: q.room, lines: lines, cost_lines: lines, assumptions: q.assumptions, notes: q.notes, confirm: confirm, typed: q.typed, source: q.source, override: false, engine_subtotal: round2(lines.reduce(function (s, l) { return s + l.amount; }, 0)) };
    // the painter's own price for this room: one line on the quote; the engine's lines still give the hours and litres for the private costing
    var ov = overrideOf(room);
    if (ov != null) {
      var what = ext ? 'area' : 'room';
      out.lines = [{ key: 'room_price', room: q.room, group: q.room, desc: q.room + ', as quoted', client_desc: q.room + ', as quoted', qty: 1, unit: what, rate: ov, base_rate: ov, loading: 0, loading_desc: '', amount: ov, source: 'your price for this ' + what, provenance: 'your price for this ' + what + (lines.length ? '; the price list came to $' + out.engine_subtotal : ''), confirm: false, override: true, engine_amount: out.engine_subtotal }];
      out.confirm = []; out.override = true;
      if (lines.length) out.notes = out.notes.concat([q.room + ': your price $' + ov + ' used; the price list came to $' + out.engine_subtotal + '.']);
    }
    return out;
  }

  function priceJob(job, settings) {
    job = job || {}; settings = settings || {};
    var ctx = context(job, settings), prices = ctx.prices, rules = ctx.rules, costing = ctx.costing, det = settings.details || {}, C = ctx.C, mk = ctx.mk, clientPaint = ctx.clientPaint;
    var lines = [], costLines = [], assumptions = [], notes = [], confirm = [], anyTyped = false, hasExt = false, hasInt = false, anyClient = false;
    if (job.premium_paint) assumptions.push('Premium paint requested: ' + n(rules.premium_paint_pct) + '% added to painting lines.');
    (job.rooms || []).forEach(function (room) {
      var rl = roomLines(room, ctx); if (rl.typed) anyTyped = true;
      if (rl.lines.length) { if (room.type === 'exterior') hasExt = true; else hasInt = true; if (room.measured_by === 'client') anyClient = true; }
      lines = lines.concat(rl.lines); costLines = costLines.concat(rl.cost_lines);
      assumptions = assumptions.concat(rl.assumptions); notes = notes.concat(rl.notes); confirm = confirm.concat(rl.confirm);
    });
    if (lines.length && rules.setup_line !== false) {
      var sr = prices.p_setup, sMissing = (sr === null || sr === undefined || sr === '' || isNaN(parseFloat(sr))), sl = label(prices, 'p_setup'), sEff = sMissing ? 0 : round2(pos(sr));
      var setup = { key: 'p_setup', room: 'Job', group: 'Job', desc: sl.label, client_desc: clientDesc('p_setup', sl, {}), qty: 1, unit: sl.unit || 'job', rate: sEff, base_rate: sEff, loading: 0, loading_desc: '', amount: sEff, source: 'once per job', provenance: 'once per job: drop sheets, masking, moving light furniture, clean-up', confirm: sMissing };
      lines.push(setup); costLines.push(setup);
      if (sMissing) confirm.push('Job: no rate for "' + sl.label + '" in your price list.');
    }
    (job.extras || []).forEach(function (x) {
      var qty = n(x.qty, 1), rateOk = x.rate !== '' && x.rate != null && !isNaN(parseFloat(x.rate)), rate = rateOk ? pos(x.rate) : 0, amount = round2(qty * rate), needs = !!x.confirm || !rateOk, optional = !!x.optional;
      var xl = { room: 'Extras', group: 'Extras', desc: x.desc || 'Extra item', client_desc: x.desc || 'Extra item', qty: qty, unit: x.unit || 'each', rate: round2(rate), base_rate: round2(rate), loading: 0, loading_desc: '', amount: amount, source: 'added by you', provenance: 'added by you' + (optional ? ', optional' : ''), confirm: needs, optional: optional };
      lines.push(xl); costLines.push(xl);
      if (needs) confirm.push('Extras: "' + (x.desc || 'Extra item') + '" marked TO CONFIRM.');
    });
    // days on site from the hours behind the lines, before travel is added
    var bd0 = C && costLines.length ? C.breakdown(costLines, costing, 0, { client_paint: clientPaint }) : null, days = bd0 && bd0.site_days ? bd0.site_days : 1;
    var tr = window.QCGeo ? QCGeo.travel(job, settings, days) : { amount: 0, days: 1 };
    if (tr.amount > 0) {
      var both = rules.travel_return !== false, tq = round2(tr.chargeable * (both ? 2 : 1) * (tr.days || 1)), tRate = round2(n(rules.travel_per_km));
      var tl = { key: 'travel', room: 'Travel', group: 'Travel', desc: 'Travel, ' + tr.chargeable + ' km beyond ' + n(rules.free_radius_km) + ' km' + (both ? ' each way' : '') + (tr.days > 1 ? ', ' + tr.days + ' days' : ''), client_desc: 'Travel' + (tr.days > 1 ? ', ' + tr.days + ' days' : ''), qty: tq, unit: 'km', rate: tRate, base_rate: tRate, loading: 0, loading_desc: '', amount: tr.amount, source: tr.source, provenance: tr.source + (tr.days > 1 ? ', × ' + tr.days + ' days on site' : ''), confirm: false };
      lines.push(tl); costLines.push(tl);
    }
    if (tr.note) notes.push(tr.note);
    var billable = function (l) { return !l.optional; };
    var subtotal = round2(lines.filter(billable).reduce(function (s, l) { return s + l.amount; }, 0));
    // whole tins: only when the painter has switched it on, and never on a small quote
    if (C && costing && costing.charge_tins === true && costLines.length) {
      var bd = C.breakdown(costLines, costing, 0, { client_paint: clientPaint }), extraL = bd.paint_extra_litres, extra$ = round2(bd.paint_extra_cost * mk);
      var tinNote = Object.keys(bd.tins).filter(function (k) { return bd.tins[k].litres > 0; }).map(function (k) { return bd.tins[k].label + ' ' + k; }).join(', ');
      if (!clientPaint && extraL > 0.05 && extra$ >= 1 && subtotal >= 2000) { var tq2 = r1(extraL), tinsL = { key: 'paint_tins', room: 'Job', group: 'Job', desc: 'Paint rounding to whole tins', client_desc: 'Paint rounding to whole tins', qty: tq2, unit: 'L', rate: round2(extra$ / tq2), base_rate: round2(extra$ / tq2), loading: 0, loading_desc: '', amount: extra$, source: tinNote, provenance: tinNote, confirm: false }; lines.push(tinsL); costLines.push(tinsL); subtotal = round2(subtotal + extra$); }
      if (tinNote) notes.push('Paint in whole tins: ' + tinNote + '.');
    }
    var minimum = false, minJob = n(rules.minimum_job);
    if (lines.some(billable) && subtotal < minJob) { var diff = round2(minJob - subtotal), ml = { key: 'minimum', room: 'Adjustments', group: 'Adjustments', desc: 'Minimum job charge', client_desc: 'Minimum job charge', qty: 1, unit: 'job', rate: diff, base_rate: diff, loading: 0, loading_desc: '', amount: diff, source: 'rule: minimum job $' + minJob, provenance: 'rule: minimum job $' + minJob + ', lines came to $' + subtotal, confirm: false }; lines.push(ml); costLines.push(ml); subtotal = round2(minJob); minimum = true; }
    var gst = det.gst ? round2(subtotal * 0.1) : 0, total = round2(subtotal + gst);
    var optionsTotal = round2(lines.filter(function (l) { return l.optional; }).reduce(function (s, l) { return s + l.amount; }, 0));
    var measured = (job.rooms || []).filter(function (r) { return r.method === 'measured' && r.walls && r.walls.length; }).length, total_rooms = (job.rooms || []).length;
    var cost = C ? C.breakdown(costLines, costing, subtotal, { client_paint: clientPaint }) : null;
    // one sizes line per quote: the client's sentence when any room's sizes came from the client, otherwise measured by us
    var sizesLine = (hasInt || hasExt) ? (anyClient ? SIZES_TEXT.client : SIZES_TEXT.us) : '';
    if (sizesLine) assumptions.unshift(sizesLine);
    if (clientPaint) assumptions.push('Paint supplied by client; our price covers labour, sundries and equipment.');
    // deposit: per job, business terms, or the default; capped by the state rule for domestic work
    var pct = depositPct(settings, job), state = stateFor(settings), requested = round2(total * pct / 100), deposit = requested, capped = null;
    var ctype = job.client && job.client.type, domestic = ctype !== 'builder' && ctype !== 'commercial';
    if (domestic && total > 0) { var cap = depositCap(total, state); if (requested > cap.amount + 0.004) { deposit = round2(cap.amount); capped = { requested: pct, requested_amount: requested, cap: cap.pct, amount: deposit, reason: cap.reason, law: cap.law || '', state: state }; } }
    return { lines: lines, subtotal: subtotal, gst: gst, total: total, minimum_applied: minimum, assumptions: assumptions, notes: notes, confirm: confirm, travel: tr, cost: cost, days: days,
      measured_rooms: measured, total_rooms: total_rooms, deposit: deposit, deposit_pct: pct, deposit_capped: capped, balance_days: balanceDays(settings, job), business_terms: isBusiness(job), sizes_line: sizesLine, sizes_by: anyClient ? 'client' : 'us',
      client_paint: clientPaint, has_exterior: hasExt, has_interior: hasInt, options_total: optionsTotal, state: state };
  }
  // one room or outside area on its own, the same engine path as the quote: {room, lines, subtotal, hours, litres, litres_by_type, confirm, assumptions, notes, override, engine_lines, engine_subtotal, source}
  function roomTotal(room, settings, job) {
    settings = settings || {}; var ctx = context(job, settings), rl = roomLines(room || {}, ctx);
    var subtotal = round2(rl.lines.filter(function (l) { return !l.optional; }).reduce(function (s, l) { return s + l.amount; }, 0));
    var bd = ctx.C && rl.cost_lines.length ? ctx.C.breakdown(rl.cost_lines, ctx.costing, subtotal, { client_paint: ctx.clientPaint }) : null, byType = bd ? bd.litres : {};
    var litres = Object.keys(byType).reduce(function (s, k) { return s + byType[k]; }, 0);
    return { room: rl.room, lines: rl.lines, subtotal: subtotal, hours: bd ? r1(bd.base_hours) : 0, litres: r1(litres), litres_by_type: byType, confirm: rl.confirm, assumptions: rl.assumptions, notes: rl.notes,
      override: rl.override, engine_lines: rl.override ? rl.cost_lines : rl.lines, engine_subtotal: rl.engine_subtotal, source: rl.source, typed: rl.typed };
  }
  // per-job override, else business terms for agent / strata / builder / commercial clients, else the business default (rules.deposit_pct, older installs details.deposit_pct), else 10
  function depositPct(settings, job) {
    settings = settings || {}; var rules = settings.rules || {}, v = job ? job.deposit_pct : null;
    if (blank(v) && isBusiness(job)) v = rules.business_deposit_pct;
    if (blank(v)) v = rules.deposit_pct;
    if (blank(v)) v = settings.details ? settings.details.deposit_pct : null;
    if (blank(v)) return 10; return Math.min(100, Math.max(0, parseFloat(v)));
  }
  // days to pay the balance: per-job, else business terms for business clients, else rules.balance_days, else details.balance_days, else 7
  function balanceDays(settings, job) {
    settings = settings || {}; var rules = settings.rules || {}, v = job ? job.balance_days : null;
    if (blank(v) && isBusiness(job)) v = rules.business_days;
    if (blank(v)) v = rules.balance_days;
    if (blank(v)) v = settings.details ? settings.details.balance_days : null;
    var d = parseInt(v, 10); return isNaN(d) || d < 0 ? 7 : d;
  }
  // what terms a job is on and where they came from, for the job screen's plain sentence
  function termsFor(settings, job) {
    var biz = isBusiness(job), rules = (settings || {}).rules || {}, jd = job && !blank(job.deposit_pct), jb = job && !blank(job.balance_days);
    return { deposit_pct: depositPct(settings, job), balance_days: balanceDays(settings, job), business: biz,
      deposit_source: jd ? 'job' : biz && !blank(rules.business_deposit_pct) ? 'business' : 'default', days_source: jb ? 'job' : biz && !blank(rules.business_days) ? 'business' : 'default' };
  }
  // statutory deposit cap on domestic building work by state: {pct, amount, reason, law, state, none}. Where the state sets no cap the typed % stands (pct 100).
  function depositCap(total_inc_gst, state) {
    var total = Math.max(0, n(total_inc_gst)), st = String(state || '').toUpperCase();
    function r(pct, reason, law) { return { pct: pct, amount: round2(total * pct / 100), reason: reason, law: law || '', state: st, none: false }; }
    function none(reason) { return { pct: 100, amount: round2(total), reason: reason, law: '', state: st, none: true }; }
    if (st === 'NSW') return r(10, 'the legal limit in NSW is 10%', 'Home Building Act 1989 (NSW)');
    if (st === 'VIC') return total < 20000 ? r(10, 'the legal limit in VIC is 10% on jobs under $20,000', 'Domestic Building Contracts Act 1995 (Vic)') : r(5, 'the legal limit in VIC is 5% on jobs of $20,000 and over', 'Domestic Building Contracts Act 1995 (Vic)');
    if (st === 'QLD') return total < 20000 ? r(10, 'the legal limit in QLD is 10% on jobs under $20,000', 'QBCC Act 1991 (Qld)') : r(5, 'the legal limit in QLD is 5% on jobs of $20,000 and over', 'QBCC Act 1991 (Qld)');
    if (st === 'SA') { if (total <= 20000) { var amt = Math.min(1000, total); return { pct: total > 0 ? round2(amt / total * 100) : 100, amount: round2(amt), reason: 'the legal limit in SA is $1,000 on jobs up to $20,000', law: 'Building Work Contractors Act 1995 (SA)', state: st, none: false }; } return r(5, 'the legal limit in SA is 5% on jobs over $20,000', 'Building Work Contractors Act 1995 (SA)'); }
    if (st === 'WA') return total >= 7500 ? r(6.5, 'the legal limit in WA is 6.5% on jobs of $7,500 and over', 'Home Building Contracts Act 1991 (WA)') : none('no legal cap in WA on jobs under $7,500');
    if (st === 'TAS' || st === 'NT' || st === 'ACT') return none('no legal cap in ' + st);
    return r(10, 'no state set in Set-up; held at 10% until it is');
  }

  window.QCPricing = { roomQuantities: roomQuantities, roomLines: roomLines, roomTotal: roomTotal, priceJob: priceJob, label: label, depositPct: depositPct, balanceDays: balanceDays, termsFor: termsFor, depositCap: depositCap, isBusiness: isBusiness, round2: round2, PAINT_KEYS: PAINT_KEYS, CLIENT_DESC: CLIENT_DESC, SIZES_TEXT: SIZES_TEXT, BUSINESS_TYPES: BUSINESS_TYPES };
})();
