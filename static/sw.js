// Lightweight service worker — app shell + runtime caching.
// Bumps cache version on each deploy by SvelteKit's build hash via filename.
const VERSION = 'v1';
const APP_CACHE = `weather-app-${VERSION}`;
const RUNTIME_CACHE = `weather-runtime-${VERSION}`;

const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![APP_CACHE, RUNTIME_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Open-Meteo: stale-while-revalidate.
  if (url.hostname.endsWith('open-meteo.com')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Same-origin: network-first for navigation (HTML), cache-first for hashed assets.
  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      event.respondWith(networkFirst(request));
    } else {
      event.respondWith(cacheFirst(request));
    }
    return;
  }

  // Other (fonts etc.): stale-while-revalidate.
  event.respondWith(staleWhileRevalidate(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok && res.type === 'basic') cache.put(request, res.clone());
    return res;
  } catch {
    if (request.mode === 'navigate') {
      const fallback = await cache.match('/');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || network;
}
