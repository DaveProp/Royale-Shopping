var CACHE = 'royale-shopping-v7';
var FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './app.js',
  './anim.js',
  './logo-royale.svg',
  './firebase-config.js',
  './icon-192.png',
  './icon-512.png',
  './logo-ar.png',
  './tshirt-blanc.jpg',
  './tshirt-bleu.jpg',
  './tshirt-noir.jpg',
  './tshirt-jaune.jpg'
];

// Chaque fichier est mis en cache séparément : un fichier absent ne bloque plus l'installation.
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(FILES.map(function (f) {
        return c.add(f).catch(function () {});
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        if (res && res.status === 200 && new URL(e.request.url).origin === location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match('./index.html');
        });
      })
  );
});
