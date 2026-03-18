// STAR TRONICS — Service Worker
// Caches the app shell for offline use

const CACHE_NAME = 'star-tronics-v5';

const ASSETS_TO_CACHE = [
  '/star-tronics/',
  '/star-tronics/index.html',
  '/star-tronics/manifest.json',
  '/star-tronics/icon-192.png',
  '/star-tronics/icon-512.png',
];

// External CDN scripts to cache
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
];

// ── Install: cache everything ─────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Cache local assets
      await cache.addAll(ASSETS_TO_CACHE).catch(() => {});
      // Cache CDN assets individually (don't fail if one is unavailable)
      for (const url of CDN_ASSETS) {
        await fetch(url, { mode: 'cors' })
          .then(res => { if (res.ok) cache.put(url, res); })
          .catch(() => {});
      }
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache, fall back to network ────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip Google APIs — always go to network for auth & drive
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('google.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          // Cache successful GET responses
          if (
            event.request.method === 'GET' &&
            response.status === 200
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // If offline and not cached, return the main app page
          if (event.request.mode === 'navigate') {
            return caches.match('/star-tronics/index.html');
          }
        });
    })
  );
});
