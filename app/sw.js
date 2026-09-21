/* Quote & Chase: offline shell. Bump VERSION on every deploy. */
var VERSION = 'qc-app-v32';
var FILES = ['./', 'index.html', 'app.css', 'app.js', 'postcodes.js', 'config.js', 'maps.js', 'geo.js', 'costing.js', 'cal.js', 'stripe.js', 'msg.js', 'schedule.js', 'store.js', 'pricing.js', 'detect.js', 'ar.js', 'measure.js', 'pdf.js', 'manifest.webmanifest',
  'lib/cv.js', 'lib/aruco.js', 'lib/jspdf.umd.min.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    var net = fetch(e.request).then(function (res) { if (res && res.ok && new URL(e.request.url).origin === location.origin) { var copy = res.clone(); caches.has(VERSION).then(function (still) { if (still) caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); }); } return res; }).catch(function () { return hit; }); // has() guard: an outgoing worker must not resurrect its cache after the new one has deleted it
    return hit || net;
  }));
});
