/* This address is retired; the app lives at https://chasem.app/app/.
   The old worker was cache-first, so removing the files is not enough -- an installed copy would
   keep serving itself forever. This replaces it: it takes over at once, deletes every cache the
   old one made, unregisters itself, and reloads whatever pages it had claimed so they land on the
   tombstone page instead of a cached app. */
self.addEventListener('install', function (e) { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll({ type: 'window' }); })
      .then(function (cs) { cs.forEach(function (c) { c.navigate(c.url); }); })
  );
});
/* No fetch handler on purpose: every request goes straight to the network while this lives. */
