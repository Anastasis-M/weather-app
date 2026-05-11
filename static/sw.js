// Lightweight service worker — app shell + runtime caching.
// Bumps cache version on each deploy by SvelteKit's build hash via filename.
const VERSION = "v1";
const APP_CACHE = `weather-app-${VERSION}`;
const RUNTIME_CACHE = `weather-runtime-${VERSION}`;

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((c) => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![APP_CACHE, RUNTIME_CACHE].includes(k))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Open-Meteo: network-first so the page always receives fresh weather data.
  // Falls back to the last cached response only when the network is unreachable.
  if (url.hostname.endsWith("open-meteo.com")) {
    event.respondWith(networkFirstWeather(request));
    return;
  }

  // Same-origin: network-first for navigation (HTML), cache-first for hashed assets.
  if (url.origin === self.location.origin) {
    if (request.mode === "navigate") {
      event.respondWith(networkFirst(request));
    } else {
      event.respondWith(cacheFirst(request));
    }
    return;
  }

  // Other cross-origin requests (fonts, CDN assets, etc.): let the browser
  // handle them natively. Intercepting cross-origin fetches from the SW context
  // can break CORS negotiation for third-party resources.
});

async function cacheFirst(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok && res.type === "basic") cache.put(request, res.clone());
    return res;
  } catch {
    if (request.mode === "navigate") {
      const fallback = await cache.match("/");
      if (fallback) return fallback;
    }
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    // Offline navigation: a deep link like /?lat=…&lon=… won't match the
    // cached "/" entry by exact URL, so ignore query and fall back to the
    // app shell. The SPA then rehydrates from localStorage.
    const cached =
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match("/"));
    return cached || new Response("Offline", { status: 503 });
  }
}

async function networkFirstWeather(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    // Network unavailable — serve the last known data so the app stays usable
    // offline. ignoreSearch lets us tolerate volatile params (e.g. a bumped
    // forecast_days) and still return a useful payload for the same location.
    const cached =
      (await cache.match(request)) ||
      (await cache.match(request, { ignoreSearch: true }));
    return cached ?? new Response(null, { status: 503 });
  }
}
