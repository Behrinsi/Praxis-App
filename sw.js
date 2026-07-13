/* Service Worker · Praxis Behringer Abrechnung
   Update-sichere Strategie:
   - HTML / App-Start (Navigation): NETWORK-FIRST -> immer die aktuellste App, wenn online;
     nur wenn offline, wird die zuletzt gespeicherte Version aus dem Cache genutzt.
   - Übrige Dateien (Icons, Manifest, Schriften): CACHE-FIRST (schnell, offline-fähig).
   Bei jeder neuen Version unten die Versionsnummer erhöhen. */
const CACHE = 'praxis-behringer-v15';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(ASSETS.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isHTML(req) {
  return req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Katalog-Status immer aus dem Netz (nie veraltet); offline: letzter Stand
  if (req.url.indexOf('hmk-status.json') !== -1) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  if (isHTML(req)) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => { try { c.put(req, copy); } catch (_) {} });
        return res;
      }).catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => { try { c.put(req, copy); } catch (_) {} });
      return res;
    }).catch(() => cached))
  );
});
