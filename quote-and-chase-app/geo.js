/* Quote & Chase: travel from the job's postcode to the business postcode, offline, using postcode centroids. */
(function () {
  'use strict';
  function postcodeOf(address) { var m = String(address || '').match(/\b([0-9]{4})\b(?!.*\b[0-9]{4}\b)/); return m ? m[1] : ''; }
  function centroid(pc) { var t = window.QCPostcodes || {}; return t[String(pc)] || null; }
  function haversineKm(a, b) { var R = 6371, toR = Math.PI / 180, dLat = (b[0] - a[0]) * toR, dLon = (b[1] - a[1]) * toR, s = Math.sin(dLat / 2), c = Math.sin(dLon / 2); var h = s * s + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * c * c; return 2 * R * Math.asin(Math.sqrt(h)); }
  // Returns { km (one way, road estimate), from, to, known } or null when either postcode is unknown
  function distance(fromPc, toPc, roadFactor) { var a = centroid(fromPc), b = centroid(toPc); if (!a || !b) return null; return { km: Math.round(haversineKm(a, b) * (roadFactor || 1.3) * 10) / 10, from: fromPc, to: toPc }; }
  // Travel charge for a job under the rules: free radius, $/km beyond, both ways
  function travel(job, settings) {
    var rules = settings.rules || {}, det = settings.details || {}, rate = parseFloat(rules.travel_per_km) || 0;
    var manual = parseFloat(job.travel_km) || 0;
    if (manual > 0) { var amt0 = Math.round(manual * rate * (rules.travel_return === false ? 1 : 2)); return { km: manual, chargeable: manual, amount: amt0, source: 'km typed on the job', note: manual + ' km each way typed on the job' + (rules.travel_return === false ? '' : ', charged both ways') + '.' }; }
    var to = postcodeOf(job.client && job.client.address), from = String(det.postcode || '').trim();
    if (!to || !from) return { km: 0, chargeable: 0, amount: 0, source: to ? 'no business postcode set' : 'no postcode in the job address', note: '' };
    var d = distance(from, to, rules.road_factor || 1.3); if (!d) return { km: 0, chargeable: 0, amount: 0, source: 'postcode not recognised', note: 'Postcode ' + (centroid(from) ? to : from) + ' not recognised, travel not charged.' };
    var free = parseFloat(rules.free_radius_km) || 0, ch = Math.max(0, Math.round((d.km - free) * 10) / 10), both = rules.travel_return !== false;
    var amount = Math.round(ch * rate * (both ? 2 : 1));
    return { km: d.km, chargeable: ch, amount: amount, source: 'postcode ' + to + ' from ' + from, note: ch > 0 ? ('Travel: about ' + d.km + ' km from postcode ' + from + ' to ' + to + ', ' + free + ' km free, ' + ch + ' km charged' + (both ? ' each way' : '') + ' at $' + rate + '/km.') : ('Travel: about ' + d.km + ' km from postcode ' + from + ', within the ' + free + ' km free radius.') };
  }
  window.QCGeo = { postcodeOf: postcodeOf, centroid: centroid, distance: distance, travel: travel, haversineKm: haversineKm };
})();
