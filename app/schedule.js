/* Quote & Chase: ballpark from room presets, and slot suggestions that respect travel between the day's jobs and visits. */
(function () {
  'use strict';
  // ---------- room presets for phone enquiries: [label, length m, width m, doors both sides, windows, one-side doors, wardrobe pairs, paintable wall fraction]
  // Wet areas are mostly tile and cupboards; robes are mirror or melamine more often than not, so they start at 0. Hall doors are priced from the bedroom side.
  var PRESETS = { bedroom: ['Bedroom', 3.3, 3.2, 1, 1, 0, 0, 1], master: ['Main bedroom', 4.2, 3.6, 1, 1, 0, 0, 1], lounge: ['Lounge / living', 5, 4, 1, 2, 0, 0, 1], kitchen: ['Kitchen / meals', 4.5, 3.5, 1, 1, 0, 0, 0.5], hallway: ['Hallway', 1.3, 7, 0, 0, 0, 0, 1], bathroom: ['Bathroom / ensuite', 2.5, 2.2, 1, 1, 0, 0, 0.4], laundry: ['Laundry', 2.2, 2.5, 1, 1, 0, 0, 0.7], study: ['Study / spare', 3.2, 3, 1, 1, 0, 0, 1] };
  var SIZES = { S: 0.85, M: 1, L: 1.2 };
  var SCOPES = { walls: 'Walls only', walls_ceilings: 'Walls and ceilings', all: 'Walls, ceilings, trim and doors' };
  var BAND = 0.2;
  // picks: [{type, size, n}]; scope: 'walls' | 'walls_ceilings' | 'all' (default)
  function roomsFrom(picks, condition, H, scope) {
    scope = SCOPES[scope] ? scope : 'all'; var out = [];
    (picks || []).forEach(function (p) {
      var pr = PRESETS[p.type]; if (!pr) return; var f = Math.sqrt(SIZES[p.size] || 1); var cnt = Math.min(50, Math.max(1, parseInt(p.n, 10) || 1));
      for (var i = 0; i < cnt; i++) {
        var L = +(pr[1] * f).toFixed(1), W = +(pr[2] * f).toFixed(1), h = parseFloat(H) || 2.4, frac = pr[7] == null ? 1 : pr[7], exclude = frac < 1 ? Math.round(2 * (L + W) * h * (1 - frac) * 10) / 10 : 0;
        out.push({ id: p.type + i, name: pr[0] + (cnt > 1 ? ' ' + (i + 1) : ''), type: 'interior', method: 'typed', L: L, W: W, H: H || '', walls: [], ceiling_m2: '', condition: condition || 'good',
          surfaces: { walls: true, ceiling: scope !== 'walls', skirting: scope === 'all' }, doors: scope === 'all' ? pr[3] : 0, windows: scope === 'all' ? pr[4] : 0, doors_one_side: scope === 'all' ? pr[5] : 0, wardrobe_pairs: scope === 'all' ? pr[6] : 0,
          feature_m2: 0, wallpaper_m2: 0, exclude_m2: exclude, ext: {} });
      }
    });
    return out;
  }
  function ballpark(picks, condition, settings, address, opts) {
    opts = opts || {}; var scope = SCOPES[opts.scope] ? opts.scope : 'all';
    var rooms = roomsFrom(picks, condition, settings.rules.ceiling_height_m, scope), job = { rooms: rooms, extras: [], travel_km: 0, premium_paint: false, client: { address: address || '' } };
    var p = QCPricing.priceJob(job, settings), lo = Math.floor(p.total * (1 - BAND) / 50) * 50, hi = Math.ceil(p.total * (1 + BAND) / 50) * 50;
    return { low: lo, high: hi, mid: p.total, rooms: rooms, priced: p, scope: scope, scope_label: SCOPES[scope], band_pct: BAND * 100 };
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
      if (j.booking && j.booking.start <= date && date < j.booking.end) { var sh = (j.booking.hour || bk.start_hour || 7) * 60, eh = (parseInt(bk.end_hour, 10) || 15) * 60; items.push({ start: sh, end: eh, pc: p, label: 'Job: ' + name, job: j, kind: 'job' }); }
      if (j.visit && j.visit.date === date) items.push({ start: j.visit.start_min, end: j.visit.start_min + (j.visit.minutes || 30), pc: p, label: 'Quote visit: ' + name, job: j, kind: 'visit' });
    });
    return items.sort(function (a, b) { return a.start - b.start; });
  }
  // suggest slots for a visit of `minutes` at `address`: at most one morning and one afternoon slot per day, ranked by driving, day and the painter's preference
  function suggest(opts) {
    var jobs = opts.jobs || [], s = opts.settings, bk = s.booking || {}, home = String(s.details.postcode || ''), to = pc(opts.address), minutes = opts.minutes || parseInt(bk.visit_minutes, 10) || 30;
    var pref = opts.pref || bk.visit_pref || 'any', onTools = bk.boss_on_tools !== false, afterFrom = (parseInt(bk.after_work_from, 10) || 16) * 60, noon = 12 * 60;
    var qFrom = (parseInt(bk.quote_from, 10) || 7) * 60, qTo = (parseInt(bk.quote_to, 10) || 18) * 60, days = opts.days || 14, out = [];
    var today = QCStore.today(), now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    function penalty(start, dow) { if (pref === 'after_work') return (start >= afterFrom || dow === 6) ? 0 : 10; if (pref === 'mornings') return start < noon ? 0 : 10; return start > 17 * 60 ? 6 : 0; }
    for (var d = 0; d < days; d++) {
      var date = QCStore.addDays(today, d), dow = new Date(date + 'T00:00:00').getDay(); if (dow === 0 && !bk.sundays) continue; if (dow === 6 && bk.saturdays === false) continue;
      var items = dayItems(jobs, date, s).filter(function (it) { return onTools || it.kind !== 'job'; }), cands = [];
      var nodes = [{ end: qFrom, pc: home, label: 'home', home: true }].concat(items).concat([{ start: qTo, pc: home, label: 'home', home: true }]);
      for (var i = 0; i < nodes.length - 1; i++) {
        var prev = nodes[i], next = nodes[i + 1];
        var tIn = prev.home ? travelMin(home, to) : travelMin(prev.pc, to), tOut = next.home ? travelMin(to, home) : travelMin(to, next.pc);
        var earliest = Math.max(prev.end + (prev.home ? 0 : tIn), qFrom); if (d === 0) earliest = Math.max(earliest, nowMin + 60);
        earliest = Math.ceil(earliest / 15) * 15;
        var latestStart = (next.home ? qTo : next.start - tOut) - minutes; if (earliest > latestStart) continue;
        var direct = (prev.home && next.home) ? 0 : (prev.home ? travelMin(home, next.pc) : next.home ? travelMin(prev.pc, home) : travelMin(prev.pc, next.pc));
        var detour = (prev.home && next.home) ? 2 * travelMin(home, to) : (tIn + tOut - direct);
        var why = prev.home && next.home ? (items.length ? 'nothing else near it that day' : 'a clear day, ' + travelMin(home, to) + ' min from base') : (!prev.home ? tIn + ' min after ' + prev.label + (next.home ? '' : ', ' + tOut + ' min before ' + next.label) : tOut + ' min before ' + next.label);
        // one start in the morning (the earliest), and one in the afternoon (after-work time when that is the preference)
        var starts = [earliest], aft = Math.max(earliest, pref === 'after_work' && dow !== 6 ? afterFrom : noon); if (aft !== earliest && aft <= latestStart) starts.push(aft);
        starts.forEach(function (st) { cands.push({ date: date, start_min: st, end_min: st + minutes, period: st < noon ? 'am' : 'pm', detour: Math.max(0, detour), score: Math.max(0, detour) + d * 4 + penalty(st, dow), why: why, after: prev.home ? null : prev.label, before: next.home ? null : next.label }); });
      }
      cands.sort(function (a, b) { return a.score - b.score; });
      var am = cands.filter(function (c) { return c.period === 'am'; })[0], pm = cands.filter(function (c) { return c.period === 'pm'; })[0];
      if (am) out.push(am); if (pm) out.push(pm);
    }
    out.sort(function (a, b) { return a.score - b.score; });
    return { slots: out.slice(0, opts.count || 6), postcode: to, known: !!(to && QCGeo.centroid(to)), minutes: minutes, pref: pref };
  }
  window.QCSched = { PRESETS: PRESETS, SIZES: SIZES, SCOPES: SCOPES, BAND: BAND, roomsFrom: roomsFrom, ballpark: ballpark, travelMin: travelMin, km: km, dayItems: dayItems, suggest: suggest, hm: hm, nice: nice };
})();
