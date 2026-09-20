/* Quote & Chase app: the pricing engine. Same rules as the pack's price list, deterministic, no guessing. */
(function () {
  'use strict';
  var DOOR_M2 = 1.7, WINDOW_M2 = 1.5, DOOR_W = 0.9;
  function n(v, d) { var x = parseFloat(v); return isNaN(x) ? (d || 0) : x; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function label(prices, key) { var it = QCStore.PRICE_ITEMS.filter(function (p) { return p[0] === key; })[0]; return it ? { label: it[1], unit: it[2] } : { label: key, unit: '' }; }

  // Quantities for one room, with a source note for each
  function roomQuantities(room, rules) {
    var q = { room: room.name || 'Room', lines: [], assumptions: [], source: 'typed' };
    var H = n(room.H, 0) || rules.ceiling_height_m || 2.4;
    if (room.type === 'exterior') {
      var e = room.ext || {};
      [['p_weatherboard', e.weatherboard], ['p_render', e.render], ['p_eaves', e.eaves], ['p_gutters', e.gutters], ['p_ext_door', e.ext_door],
       ['p_ext_window', e.ext_window], ['p_deck', e.deck], ['p_fence', e.fence], ['p_pressure', e.pressure], ['p_scaffold', e.scaffold]].forEach(function (p) {
        var v = n(p[1], 0); if (v > 0) q.lines.push({ key: p[0], qty: r1(v), source: 'from your numbers' });
      });
      q.source = 'typed';
      return q;
    }
    var doorsTotal = Math.max(0, n(room.doors)) + Math.max(0, n(room.doors_one_side)), windows = Math.max(0, n(room.windows));
    var wallArea = 0, ceilingArea = 0, skirting = 0, src = 'from your numbers';
    if (room.method === 'measured' && room.walls && room.walls.length) {
      wallArea = room.walls.reduce(function (s, w) { return s + n(w.paint_area_m2); }, 0);
      var widths = room.walls.map(function (w) { return n(w.width_mm) / 1000; }).sort(function (a, b) { return b - a; });
      var doorWidths = 0; room.walls.forEach(function (w) { (w.openings || []).forEach(function (o) { if (o.type === 'door') doorWidths += n(o.width_mm) / 1000; }); });
      skirting = widths.reduce(function (s, w) { return s + w; }, 0) - doorWidths;
      ceilingArea = n(room.ceiling_m2) || (widths.length >= 2 ? widths[0] * widths[1] : 0);
      var err = Math.max.apply(null, room.walls.map(function (w) { return n(w.expected_error_pct, 2); }));
      src = room.walls[0].method === 'roomplan-lidar' ? 'measured (LiDAR)' : 'measured (photo ±' + err + '%)';
      q.source = 'measured';
      if (room.walls.length < 4) q.assumptions.push(q.room + ': ' + room.walls.length + ' of the walls measured; the rest are not in this quote.');
      if (!n(room.ceiling_m2) && widths.length >= 2) q.assumptions.push(q.room + ': ceiling taken as the two longest measured walls multiplied (' + r1(ceilingArea) + ' m²).');
    } else {
      var L = n(room.L), W = n(room.W);
      if (L > 0 && W > 0) {
        var perim = 2 * (L + W);
        wallArea = perim * H - DOOR_M2 * doorsTotal - WINDOW_M2 * windows;
        ceilingArea = L * W; skirting = perim - DOOR_W * doorsTotal;
        if (!n(room.H)) q.assumptions.push(q.room + ': ceiling height assumed ' + H + ' m.');
        q.assumptions.push(q.room + ': room size ' + L + ' × ' + W + ' m as advised, not measured.');
      }
    }
    wallArea = Math.max(0, wallArea); skirting = Math.max(0, skirting);
    var s = room.surfaces || {};
    if (s.walls !== false && wallArea > 0) q.lines.push({ key: 'p_walls', qty: r1(wallArea), source: src });
    if (s.ceiling !== false && ceilingArea > 0) q.lines.push({ key: 'p_ceilings', qty: r1(ceilingArea), source: src });
    if (s.skirting !== false && skirting > 0) q.lines.push({ key: 'p_skirting', qty: r1(skirting), source: src });
    if (n(room.doors) > 0) q.lines.push({ key: 'p_door', qty: n(room.doors), source: 'count' });
    if (n(room.doors_one_side) > 0) q.lines.push({ key: 'p_door_one', qty: n(room.doors_one_side), source: 'count' });
    if (n(room.wardrobe_pairs) < 0) room.wardrobe_pairs = 0; if (n(room.feature_m2) < 0) room.feature_m2 = 0; if (n(room.wallpaper_m2) < 0) room.wallpaper_m2 = 0;
    if (windows > 0) q.lines.push({ key: 'p_window', qty: windows, source: 'count' });
    if (n(room.wardrobe_pairs) > 0) q.lines.push({ key: 'p_wardrobe', qty: n(room.wardrobe_pairs), source: 'count' });
    if (n(room.feature_m2) > 0) q.lines.push({ key: 'p_feature', qty: r1(n(room.feature_m2)), source: 'from your numbers' });
    if (n(room.wallpaper_m2) > 0) q.lines.push({ key: 'p_wallpaper', qty: r1(n(room.wallpaper_m2)), source: 'from your numbers' });
    if (wallArea > 0 && s.walls !== false) {
      if (room.condition === 'fair') { q.lines.push({ key: 'p_prep_mod', qty: r1(wallArea / 20), source: 'rule: fair = 1 hr per 20 m²' }); q.assumptions.push(q.room + ': walls in fair condition (scuffs, marks, small dents).'); }
      if (room.condition === 'poor') { q.lines.push({ key: 'p_prep_heavy', qty: r1(wallArea / 10), source: 'rule: poor = 1 hr per 10 m²' }); q.lines.push({ key: 'p_sealer', qty: r1(wallArea), source: 'rule: poor = sealer coat' }); q.assumptions.push(q.room + ': walls in poor condition (peeling, damage), heavy prep and a sealer coat allowed.'); }
    }
    return q;
  }

  var PAINT_KEYS = { p_walls: 1, p_ceilings: 1, p_skirting: 1, p_door: 1, p_door_one: 1, p_window: 1, p_wardrobe: 1, p_feature: 1, p_weatherboard: 1, p_render: 1, p_eaves: 1, p_gutters: 1, p_ext_door: 1, p_ext_window: 1, p_deck: 1, p_fence: 1 };

  function priceJob(job, settings) {
    var prices = settings.prices, rules = settings.rules, lines = [], assumptions = [], confirm = [];
    var prem = job.premium_paint ? (1 + n(rules.premium_paint_pct) / 100) : 1;
    if (job.premium_paint) assumptions.push('Premium paint requested: ' + n(rules.premium_paint_pct) + '% added to painting lines.');
    (job.rooms || []).forEach(function (room) {
      var q = roomQuantities(room, rules);
      q.lines.forEach(function (l) {
        var rate = prices[l.key], lab = label(prices, l.key), missing = (rate === null || rate === undefined || rate === '');
        var eff = missing ? 0 : n(rate) * (PAINT_KEYS[l.key] ? prem : 1);
        var amount = Math.round(l.qty * eff);
        lines.push({ key: l.key, room: q.room, desc: lab.label, qty: l.qty, unit: lab.unit, rate: Math.round(eff * 100) / 100, amount: amount, source: l.source, confirm: missing });
        if (missing) confirm.push(q.room + ': no rate for "' + lab.label + '" in your price list.');
      });
      assumptions = assumptions.concat(q.assumptions);
    });
    (job.extras || []).forEach(function (x) {
      var qty = n(x.qty, 1), rateOk = x.rate !== '' && x.rate != null && !isNaN(parseFloat(x.rate)), rate = rateOk ? n(x.rate, 0) : 0, amount = Math.round(qty * rate), needs = !!x.confirm || !rateOk;
      lines.push({ room: 'Extras', desc: x.desc || 'Extra item', qty: qty, unit: x.unit || 'each', rate: rate, amount: amount, source: 'added by you', confirm: needs });
      if (needs) confirm.push('Extras: "' + (x.desc || 'Extra item') + '" marked TO CONFIRM.');
    });
    var tr = window.QCGeo ? QCGeo.travel(job, settings) : { amount: 0 };
    if (tr.amount > 0) { lines.push({ room: 'Travel', desc: 'Travel, ' + tr.chargeable + ' km beyond ' + n(rules.free_radius_km) + ' km' + (rules.travel_return === false ? '' : ' each way'), qty: tr.chargeable * (rules.travel_return === false ? 1 : 2), unit: 'km', rate: n(rules.travel_per_km), amount: tr.amount, source: tr.source, confirm: false }); }
    if (tr.note) assumptions.push(tr.note);
    var subtotal = lines.reduce(function (s, l) { return s + l.amount; }, 0), minimum = false;
    if (lines.length && subtotal < n(rules.minimum_job)) { subtotal = n(rules.minimum_job); minimum = true; assumptions.push('Minimum job charge of $' + n(rules.minimum_job) + ' applied.'); }
    var gst = settings.details.gst ? Math.round(subtotal * 0.1) : 0;
    var measured = (job.rooms || []).filter(function (r) { return r.method === 'measured' && r.walls && r.walls.length; }).length, total_rooms = (job.rooms || []).length;
    var cost = window.QCCosting && settings.costing ? QCCosting.breakdown(lines, settings.costing, subtotal) : null;
    return { lines: lines, subtotal: subtotal, gst: gst, total: subtotal + gst, minimum_applied: minimum, assumptions: assumptions, confirm: confirm, travel: tr, cost: cost,
      measured_rooms: measured, total_rooms: total_rooms, deposit: Math.round((subtotal + gst) * depositPct(settings) / 100) };
  }
  function depositPct(settings) { var v = settings.details.deposit_pct; if (v === '' || v == null || isNaN(parseFloat(v))) return 20; return Math.min(100, Math.max(0, parseFloat(v))); 
  }

  window.QCPricing = { roomQuantities: roomQuantities, priceJob: priceJob, label: label, depositPct: depositPct };
})();
