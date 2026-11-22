const CACHE_NAME = 'pocket-finance-v3';
const APP_ROOT = new URL('./', self.registration.scope).toString();
const CORE_ASSETS = [
  APP_ROOT,
  new URL('manifest.webmanifest', APP_ROOT).toString(),
  new URL('icon-192.png', APP_ROOT).toString(),
  new URL('icon-512.png', APP_ROOT).toString(),
  new URL('icon-maskable-512.png', APP_ROOT).toString(),
  new URL('icon.svg', APP_ROOT).toString(),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('pocket-finance-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(APP_ROOT)
  ) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(APP_ROOT, copy)));
          }
          return response;
        })
        .catch(async () => (await caches.match(APP_ROOT)) || Response.error()),
    );
    return;
  }

  if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
          }
          return response;
        }),
      ),
    );
  }
});
