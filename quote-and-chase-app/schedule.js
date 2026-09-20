/* Quote & Chase: ballpark from room presets, and slot suggestions that respect travel between the day's jobs and visits. */
(function () {
  'use strict';
  // ---------- room presets for phone enquiries: [length m, width m, doors, windows, one-side doors, wardrobe pairs]
  var PRESETS = { bedroom: ['Bedroom', 3.3, 3.2, 1, 1, 0, 1], master: ['Main bedroom', 4.2, 3.6, 1, 1, 0, 1], lounge: ['Lounge / living', 5, 4, 1, 2, 0, 0], kitchen: ['Kitchen / meals', 4.5, 3.5, 1, 1, 0, 0], hallway: ['Hallway', 1.3, 7, 0, 0, 4, 0], bathroom: ['Bathroom / ensuite', 2.5, 2.2, 1, 1, 0, 0], laundry: ['Laundry', 2.2, 2.5, 1, 1, 0, 0], study: ['Study / spare', 3.2, 3, 1, 1, 0, 0] };
  var SIZES = { S: 0.85, M: 1, L: 1.2 };
  function roomsFrom(picks, condition, H) { // picks: [{type, size, n}]
    var out = []; (picks || []).forEach(function (p) { var pr = PRESETS[p.type]; if (!pr) return; var f = Math.sqrt(SIZES[p.size] || 1); for (var i = 0; i < (p.n || 1); i++) out.push({ id: p.type + i, name: pr[0] + ((p.n || 1) > 1 ? ' ' + (i + 1) : ''), type: 'interior', method: 'typed', L: +(pr[1] * f).toFixed(1), W: +(pr[2] * f).toFixed(1), H: H || '', walls: [], ceiling_m2: '', condition: condition || 'good', surfaces: { walls: true, ceiling: true, skirting: true }, doors: pr[3], windows: pr[4], doors_one_side: pr[5], wardrobe_pairs: pr[6], feature_m2: 0, wallpaper_m2: 0, ext: {} }); }); return out;
  }
  function ballpark(picks, condition, settings, address) {
    var rooms = roomsFrom(picks, condition, settings.rules.ceiling_height_m), job = { rooms: rooms, extras: [], travel_km: 0, premium_paint: false, client: { address: address || '' } };
    var p = QCPricing.priceJob(job, settings), lo = Math.floor(p.total * 0.85 / 50) * 50, hi = Math.ceil(p.total * 1.15 / 50) * 50;
    return { low: lo, high: hi, mid: p.total, rooms: rooms, priced: p };
  }

  // ---------- travel: minutes between two postcodes (crude but consistent: centroid distance, road factor, city speeds, parking)
  function km(pcA, pcB) { if (!pcA || !pcB) return null; if (String(pcA) === String(pcB)) return 3; var d = QCGeo.distance(pcA, pcB, 1.3); return d ? Math.max(3, d.km) : null; }
  function minutesFor(k) { if (k == null) return 20; return Math.round((k <= 10 ? k * 2.0 : 20 + (k - 10) * 0.75) + 5); } // ~30 km/h in town, ~80 km/h beyond, 5 min to park
  function travelMin(pcA, pcB) { return minutesFor(km(pcA, pcB)); }
  function pc(addr) { return QCGeo.postcodeOf(addr); }
  function hm(min) { var h = Math.floor(min / 60), m = min % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function nice(min) { var h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? 'pm' : 'am', hh = h % 12 || 12; return hh + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ap; }
  // what is already on a given day: booked job days and quote visits, sorted, with postcodes
  function dayItems(jobs, date, settings) {
    var items = [], bk = settings.booking || {};
    (jobs || []).forEach(function (j) {
      var p = pc(j.client && j.client.address), name = (j.client && j.client.name) || j.quote_no;
      if (j.booking && j.booking.start <= date && date < j.booking.end) { var sh = (j.booking.hour || bk.start_hour || 7) * 60, eh = (parseInt(bk.end_hour, 10) || 15) * 60; items.push({ start: sh, end: eh, pc: p, label: 'Job: ' + name, job: j }); }
      if (j.visit && j.visit.date === date) items.push({ start: j.visit.start_min, end: j.visit.start_min + (j.visit.minutes || 30), pc: p, label: 'Quote visit: ' + name, job: j });
    });
    return items.sort(function (a, b) { return a.start - b.start; });
  }
  // suggest slots for a visit of `minutes` at `address`
  function suggest(opts) {
    var jobs = opts.jobs || [], s = opts.settings, bk = s.booking || {}, home = String(s.details.postcode || ''), to = pc(opts.address), minutes = opts.minutes || parseInt(bk.visit_minutes, 10) || 30;
    var qFrom = (parseInt(bk.quote_from, 10) || 7) * 60, qTo = (parseInt(bk.quote_to, 10) || 18) * 60, days = opts.days || 14, out = [];
    var today = QCStore.today(), now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    for (var d = 0; d < days; d++) {
      var date = QCStore.addDays(today, d), dow = new Date(date + 'T00:00:00').getDay(); if (dow === 0 && !bk.sundays) continue; if (dow === 6 && bk.saturdays === false) continue;
      var items = dayItems(jobs, date, s), cands = [];
      var nodes = [{ end: qFrom, pc: home, label: 'home', home: true }].concat(items).concat([{ start: qTo, pc: home, label: 'home', home: true }]);
      for (var i = 0; i < nodes.length - 1; i++) {
        var prev = nodes[i], next = nodes[i + 1];
        var tIn = prev.home ? travelMin(home, to) : travelMin(prev.pc, to), tOut = next.home ? travelMin(to, home) : travelMin(to, next.pc);
        var earliest = Math.max(prev.end + (prev.home ? 0 : tIn), qFrom + (prev.home ? 0 : 0)); if (d === 0) earliest = Math.max(earliest, nowMin + 60);
        earliest = Math.ceil(earliest / 15) * 15;
        var latestStart = (next.home ? qTo : next.start - tOut) - minutes; if (earliest > latestStart) continue;
        var direct = (prev.home && next.home) ? 0 : (prev.home ? travelMin(home, next.pc) : next.home ? travelMin(prev.pc, home) : travelMin(prev.pc, next.pc));
        var detour = (prev.home && next.home) ? 2 * travelMin(home, to) : (tIn + tOut - direct);
        var why = prev.home && next.home ? (items.length ? 'nothing else near it that day' : 'a clear day, ' + travelMin(home, to) + ' min from base') : (!prev.home ? tIn + ' min after ' + prev.label + (next.home ? '' : ', ' + tOut + ' min before ' + next.label) : tOut + ' min before ' + next.label);
        cands.push({ date: date, start_min: earliest, end_min: earliest + minutes, detour: Math.max(0, detour), score: Math.max(0, detour) + d * 4 + (earliest > 17 * 60 ? 6 : 0), why: why, after: prev.home ? null : prev.label, before: next.home ? null : next.label });
      }
      cands.sort(function (a, b) { return a.score - b.score; }); out = out.concat(cands.slice(0, 2));
    }
    out.sort(function (a, b) { return a.score - b.score; });
    return { slots: out.slice(0, opts.count || 6), postcode: to, known: !!(to && QCGeo.centroid(to)), minutes: minutes };
  }
  window.QCSched = { PRESETS: PRESETS, SIZES: SIZES, roomsFrom: roomsFrom, ballpark: ballpark, travelMin: travelMin, km: km, dayItems: dayItems, suggest: suggest, hm: hm, nice: nice };
})();
