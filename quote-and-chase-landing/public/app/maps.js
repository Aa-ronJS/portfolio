/* Chasem: address lookup, satellite photo and house size from Google (Places, Static Maps, Solar).
   Needs a Google Maps key: the painter's own in Set-up, or the one in config.js for the hosted app.
   Everything here degrades to nothing: no key or no network means the address field is a plain text box. */
(function () {
  'use strict';
  var PLACES = 'https://places.googleapis.com/v1/', STATIC = 'https://maps.googleapis.com/maps/api/staticmap', SOLAR = 'https://solar.googleapis.com/v1/buildingInsights:findClosest';
  var WALL_H = 2.7, ZOOM = 20, SIZE = [600, 450], SCALE = 2;
  function fetcher() { return window.__qcMapsFetch || window.fetch; }
  function key(settings) { var s = settings || {}; var own = String((s.maps && s.maps.key) || '').trim(); if (own) return own; var c = window.QC_APP || {}; return String(c.maps_key || '').trim(); }
  function ready(settings) { return !!key(settings) && (typeof navigator === 'undefined' || navigator.onLine !== false); }
  function token() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function num(v) { var x = parseFloat(v); return isNaN(x) ? 0 : x; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function toR(d) { return d * Math.PI / 180; }
  function haversineM(a, b) { var R = 6371000, dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng), s = Math.sin(dLat / 2), c = Math.sin(dLng / 2); var h = s * s + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * c * c; return 2 * R * Math.asin(Math.sqrt(h)); }
  function jsonOrThrow(res) { return res.text().then(function (t) { var j = {}; try { j = t ? JSON.parse(t) : {}; } catch (e) {} if (!res.ok) { var m = (j.error && j.error.message) || ('HTTP ' + res.status); throw new Error(m); } return j; }); }

  // Address suggestions while typing. near = {lat, lng} biases to the painter's area. Resolves [{id, text, main, secondary}].
  function suggest(text, sessionToken, near, settings) {
    var k = key(settings); text = String(text || '').trim(); if (!k || text.length < 3) return Promise.resolve([]);
    var body = { input: text, sessionToken: sessionToken || token(), includedRegionCodes: ['au'], languageCode: 'en-AU' };
    if (near && num(near.lat)) body.locationBias = { circle: { center: { latitude: num(near.lat), longitude: num(near.lng) }, radius: 50000 } };
    return fetcher()(PLACES + 'places:autocomplete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': k }, body: JSON.stringify(body) }).then(jsonOrThrow).then(function (j) {
      return (j.suggestions || []).map(function (s) { var p = s.placePrediction || {}; var sf = p.structuredFormat || {}; return { id: p.placeId || p.place, text: (p.text && p.text.text) || '', main: (sf.mainText && sf.mainText.text) || '', secondary: (sf.secondaryText && sf.secondaryText.text) || '' }; }).filter(function (s) { return s.id && s.text; });
    });
  }
  // One picked suggestion: the full address and where it is. Resolves {place_id, address, short, lat, lng, postcode, state, suburb}.
  function details(placeId, sessionToken, settings) {
    var k = key(settings); if (!k || !placeId) return Promise.reject(new Error('No place'));
    var id = String(placeId).replace(/^places\//, '');
    return fetcher()(PLACES + 'places/' + encodeURIComponent(id) + (sessionToken ? '?sessionToken=' + encodeURIComponent(sessionToken) : ''), { headers: { 'X-Goog-Api-Key': k, 'X-Goog-FieldMask': 'id,formattedAddress,shortFormattedAddress,location,addressComponents' } }).then(jsonOrThrow).then(function (j) {
      var out = { place_id: id, address: j.formattedAddress || '', short: j.shortFormattedAddress || '', lat: j.location ? num(j.location.latitude) : null, lng: j.location ? num(j.location.longitude) : null, postcode: '', state: '', suburb: '' };
      (j.addressComponents || []).forEach(function (c) { var t = c.types || []; if (t.indexOf('postal_code') >= 0) out.postcode = c.longText || c.shortText || ''; if (t.indexOf('administrative_area_level_1') >= 0) out.state = c.shortText || ''; if (t.indexOf('locality') >= 0) out.suburb = c.longText || ''; });
      out.address = out.address.replace(/,\s*Australia$/, '');
      return out;
    });
  }
  // The satellite photo of the site. Same picture size every time so the trace maths holds: SIZE at SCALE = SIZE×SCALE pixels.
  function satelliteUrl(lat, lng, settings, opts) { var k = key(settings); if (!k || !num(lat)) return ''; var o = opts || {}; return STATIC + '?center=' + num(lat) + ',' + num(lng) + '&zoom=' + (o.zoom || ZOOM) + '&size=' + SIZE[0] + 'x' + SIZE[1] + '&scale=' + SCALE + '&maptype=satellite' + (o.marker === false ? '' : '&markers=size:tiny%7Ccolor:0x2166BC%7C' + num(lat) + ',' + num(lng)) + '&key=' + encodeURIComponent(k); }
  // Metres per picture pixel at this latitude (Web Mercator).
  function metresPerPixel(lat, zoom, scale) { return 156543.03392 * Math.cos(toR(num(lat))) / Math.pow(2, zoom == null ? ZOOM : zoom) / (scale || SCALE); }
  // Traced outline in picture pixels -> footprint and perimeter in metres. points = [{x, y}] in the natural (SIZE×SCALE) pixel space.
  function traced(points, lat, zoom, scale) {
    var pts = (points || []).filter(function (p) { return p && isFinite(p.x) && isFinite(p.y); }); if (pts.length < 3) return { footprint_m2: 0, perimeter_m: 0, n: pts.length };
    var mpp = metresPerPixel(lat, zoom, scale), a = 0, per = 0;
    for (var i = 0; i < pts.length; i++) { var p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; per += Math.sqrt((q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y)); }
    return { footprint_m2: r1(Math.abs(a) / 2 * mpp * mpp), perimeter_m: r1(per * mpp), n: pts.length, mpp: mpp };
  }
  // Google's building data for the roof over this point. Resolves {roof_m2, footprint_m2, perimeter_m, width_m, depth_m, quality, segments} or null when Google has none here.
  function building(lat, lng, settings) {
    var k = key(settings); if (!k || !num(lat)) return Promise.resolve(null);
    return fetcher()(SOLAR + '?location.latitude=' + num(lat) + '&location.longitude=' + num(lng) + '&requiredQuality=LOW&key=' + encodeURIComponent(k)).then(function (res) { if (res.status === 404) return null; return jsonOrThrow(res); }).then(function (j) {
      if (!j || !j.solarPotential) return null;
      var st = j.solarPotential.wholeRoofStats || {}, bb = j.boundingBox || {}, w = 0, d = 0;
      if (bb.sw && bb.ne) { w = haversineM({ lat: bb.sw.latitude, lng: bb.sw.longitude }, { lat: bb.sw.latitude, lng: bb.ne.longitude }); d = haversineM({ lat: bb.sw.latitude, lng: bb.sw.longitude }, { lat: bb.ne.latitude, lng: bb.sw.longitude }); }
      var ground = num(st.groundAreaMeters2) || num(st.areaMeters2) * 0.93, roof = num(st.areaMeters2);
      // eaves overhang sits inside the roof outline; the walls run about 0.45 m in from it on each side
      var foot = Math.max(0, ground - 0.45 * 2 * (w + d) + 4 * 0.45 * 0.45), per = w && d ? 2 * ((w - 0.9) + (d - 0.9)) : (foot ? 4 * Math.sqrt(foot) : 0);
      if (foot > 0 && per > 0 && per < 4 * Math.sqrt(foot)) per = 4 * Math.sqrt(foot); // a footprint cannot have less edge than a square of the same area
      return { roof_m2: r1(roof), footprint_m2: r1(foot), perimeter_m: r1(per), width_m: r1(Math.max(0, w - 0.9)), depth_m: r1(Math.max(0, d - 0.9)), quality: j.imageryQuality || '', segments: (j.solarPotential.roofSegmentStats || []).length, center: j.center || null };
    }).catch(function (e) { if (/not found|404/i.test(e.message)) return null; throw e; });
  }
  // What the outside job is likely to hold, from footprint and perimeter. Painters check these on site; the numbers pre-fill the outside area.
  function estimate(site, storeys) {
    var per = num(site && site.perimeter_m), foot = num(site && site.footprint_m2), n = Math.max(1, parseInt(storeys, 10) || 1);
    if (!per && foot) per = 4 * Math.sqrt(foot);
    return { walls_m2: r1(per * WALL_H * n), eaves_m: r1(per), gutters_m: r1(per), floor_m2: r1(foot * n), perimeter_m: r1(per), footprint_m2: r1(foot), storeys: n, wall_h: WALL_H };
  }
  function siteLine(site) {
    if (!site || !(num(site.footprint_m2) > 0)) return '';
    var src = site.source === 'traced' ? 'traced on the photo' : 'from Google’s building data';
    return 'House about ' + Math.round(site.footprint_m2) + ' m² on the ground, ' + Math.round(site.perimeter_m) + ' m around (' + src + ').';
  }
  window.QCMaps = { key: key, ready: ready, token: token, suggest: suggest, details: details, satelliteUrl: satelliteUrl, metresPerPixel: metresPerPixel, traced: traced, building: building, estimate: estimate, siteLine: siteLine, haversineM: haversineM, SIZE: SIZE, SCALE: SCALE, ZOOM: ZOOM, WALL_H: WALL_H };
})();
