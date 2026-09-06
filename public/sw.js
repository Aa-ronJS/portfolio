/* Offline support. The whole site is eleven static files, so the strategy is
   simple: take the lot at install, serve pages network-first so a deploy still
   lands, serve the immutable assets cache-first, and never touch cross-origin
   requests — the live MCP counts keep talking to the real servers and keep
   their honest "did not answer from here" fallback when there is no network. */

var VERSION = 'v1';
var CACHE = 'portfolio-' + VERSION;

var ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/img/hero.jpg',
  '/img/aaron.jpg',
  '/img/glass.jpg',
  '/img/slab.jpg',
  '/img/seam.jpg',
  '/img/doors.jpg',
  '/fonts/clash-display-var.woff2',
  '/fonts/satoshi-var.woff2',
  '/fonts/ibm-plex-mono-400.woff2',
  '/fonts/ibm-plex-mono-500.woff2',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k !== CACHE) return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(function (r) {
          var copy = r.clone();
          caches.open(CACHE).then(function (c) { c.put('/', copy); });
          return r;
        })
        .catch(function () { return caches.match('/'); })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (r) {
        var copy = r.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return r;
      });
    })
  );
});
