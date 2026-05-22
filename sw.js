const CACHE = 'kd-cache-v3';
const STATIC = [
  '/',
  '/index.html',
  '/favicon.ico',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(STATIC);
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API calls — never cache, always network
  if (url.pathname.startsWith('/api/')) return;

  // Same-origin static assets — cache-first
  if (url.origin === self.location.origin) {
    e.respondWith(
      (async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        const res = await fetch(e.request);
        if (res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(e.request, res.clone());
        }
        return res;
      })()
    );
    return;
  }

  // CDN resources (Tailwind, Desmos, Google Fonts) — cache-first
  e.respondWith(
    (async () => {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      try {
        const res = await fetch(e.request);
        if (res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(e.request, res.clone());
        }
        return res;
      } catch {
        return new Response('', { status: 408 });
      }
    })()
  );
});
