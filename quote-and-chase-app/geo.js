/* Quote & Chase: travel from the job's postcode to the business postcode, offline, using postcode centroids. */
(function () {
  'use strict';
  function postcodeOf(address) { var m = String(address || '').match(/\b([0-9]{4})\b(?!.*\b[0-9]{4}\b)/); return m ? m[1] : ''; }
  function centroid(pc) { var t = window.QCPostcodes || {}; return t[String(pc)] || null; }
  function haversineKm(a, b) { var R = 6371, toR = Math.PI / 180, dLat = (b[0] - a[0]) * toR, dLon = (b[1] - a[1]) * toR, s = Math.sin(dLat / 2), c = Math.sin(dLon / 2); var h = s * s + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * c * c; return 2 * R * Math.asin(Math.sqrt(h)); }
  function round2(x) { return Math.round(x * 100) / 100; }
  // State from an Australian postcode (Australia Post ranges), '' when unknown
  function stateOf(pc) {
    var p = parseInt(pc, 10); if (isNaN(p)) return '';
    if ((p >= 200 && p <= 299) || (p >= 2600 && p <= 2618) || (p >= 2900 && p <= 2920)) return 'ACT';
    if ((p >= 1000 && p <= 2599) || (p >= 2619 && p <= 2899) || (p >= 2921 && p <= 2999)) return 'NSW';
    if ((p >= 3000 && p <= 3999) || (p >= 8000 && p <= 8999)) return 'VIC';
    if ((p >= 4000 && p <= 4999) || (p >= 9000 && p <= 9999)) return 'QLD';
    if (p >= 5000 && p <= 5999) return 'SA';
    if (p >= 6000 && p <= 6999) return 'WA';
    if (p >= 7000 && p <= 7999) return 'TAS';
    if (p >= 800 && p <= 999) return 'NT';
    return '';
  }
  // Returns { km (one way, road estimate), from, to } or null when either postcode is unknown
  function distance(fromPc, toPc, roadFactor) { var a = centroid(fromPc), b = centroid(toPc); if (!a || !b) return null; return { km: Math.round(haversineKm(a, b) * (roadFactor || 1.2) * 10) / 10, from: fromPc, to: toPc }; }
  // Travel charge for a job under the rules: free radius, $/km beyond, both ways, × days on site when rules.travel_per_day
  function travel(job, settings, days) {
    var rules = settings.rules || {}, det = settings.details || {}, rate = parseFloat(rules.travel_per_km) || 0, both = rules.travel_return !== false;
    var nDays = rules.travel_per_day === false ? 1 : Math.max(1, parseInt(days, 10) || 1), perDay = nDays > 1 ? ' × ' + nDays + ' days' : '';
    var manual = parseFloat(job.travel_km) || 0;
    if (manual > 0) { var per0 = round2(manual * rate * (both ? 2 : 1)); return { km: manual, chargeable: manual, per_trip: per0, days: nDays, amount: round2(per0 * nDays), source: 'km typed on the job', note: manual + ' km each way typed on the job' + (both ? ', charged both ways' : '') + perDay + '.' }; }
    var js = job.site || {}, hs = det.site || {};
    if (js.lat && hs.lat) { var kmMap = Math.round(haversineKm([hs.lat, hs.lng], [js.lat, js.lng]) * (parseFloat(rules.road_factor) || 1.2) * 10) / 10, freeM = parseFloat(rules.free_radius_km) || 0, chM = Math.max(0, Math.round((kmMap - freeM) * 10) / 10), perM = round2(chM * rate * (both ? 2 : 1)); return { km: kmMap, chargeable: chM, per_trip: perM, days: nDays, amount: round2(perM * nDays), source: 'map addresses', note: chM > 0 ? ('Travel: about ' + kmMap + ' km from your address to the job, ' + freeM + ' km free, ' + chM + ' km charged' + (both ? ' each way' : '') + ' at $' + rate + '/km' + perDay + '.') : '' }; }
    var to = postcodeOf(job.client && job.client.address), from = String(det.postcode || '').trim();
    if (!to || !from) return { km: 0, chargeable: 0, per_trip: 0, days: nDays, amount: 0, source: to ? 'no business postcode set' : 'no postcode in the job address', note: '' };
    var d = distance(from, to, parseFloat(rules.road_factor) || 1.2); if (!d) return { km: 0, chargeable: 0, per_trip: 0, days: nDays, amount: 0, source: 'postcode not recognised', note: 'Postcode ' + (centroid(from) ? to : from) + ' not recognised, travel not charged.' };
    var free = parseFloat(rules.free_radius_km) || 0, ch = Math.max(0, Math.round((d.km - free) * 10) / 10);
    var per = round2(ch * rate * (both ? 2 : 1)), amount = round2(per * nDays);
    return { km: d.km, chargeable: ch, per_trip: per, days: nDays, amount: amount, source: 'postcode ' + to + ' from ' + from, note: ch > 0 ? ('Travel: about ' + d.km + ' km from postcode ' + from + ' to ' + to + ', ' + free + ' km free, ' + ch + ' km charged' + (both ? ' each way' : '') + ' at $' + rate + '/km' + perDay + '.') : ('Travel: about ' + d.km + ' km from postcode ' + from + ', within the ' + free + ' km free radius.') };
  }
  window.QCGeo = { postcodeOf: postcodeOf, centroid: centroid, distance: distance, travel: travel, haversineKm: haversineKm, stateOf: stateOf };
})();
