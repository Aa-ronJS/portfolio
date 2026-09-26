/* Chasem: offline shell. Bump VERSION on every deploy. */
var VERSION = 'qc-app-v55';
var FILES = ['./', 'index.html', 'app.css', 'app.js', 'postcodes.js', 'config.js', 'maps.js', 'geo.js', 'costing.js', 'cal.js', 'stripe.js', 'msg.js', 'sync.js', 'testdrive.js', 'pics.js', 'ingest.js', 'schedule.js', 'store.js', 'pricing.js', 'detect.js', 'ar.js', 'measure.js', 'pdf.js', 'manifest.webmanifest',
  'lib/cv.js', 'lib/aruco.js', 'lib/jspdf.umd.min.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
// App code is fetched from the network first, so a painter is never looking at last week's screens: the cache
// is the fallback for when there is no signal, not the first answer. The big libraries that never change are
// still served from the cache straight away.
var LIB = /\/(lib|icons)\//;
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url), mine = url.origin === location.origin;
  var keep = function (res) {
    if (res && res.ok && mine) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }).catch(function () {}); }
    return res;
  };
  if (mine && !LIB.test(url.pathname)) {
    e.respondWith(fetch(e.request).then(keep).catch(function () {
      return caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
        // offline and never cached: the shell still opens, which is the whole point of having one
        return hit || (e.request.mode === 'navigate' ? caches.match('index.html') : Promise.reject(new Error('offline')));
      });
    }));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(e.request).then(keep);
  }));
});
