const CACHE_NAME = 'yoel-the-g-v3';
const GAME_CACHE = 'yoel-games-v3';
const STATIC_CACHE = 'yoel-static-v3';

const APP_SHELL = [
  '/',
  '/developers',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.ico',
];

const GAME_FILES = [
  '/games/airplane-ocean/index.html',
  '/games/cute-rescue/index.html',
  '/games/johnny-trigger-sniper-3d/index.html',
  '/games/lilo-stitch-chess/index.html',
  '/games/loti-it0/index.html',
  '/games/loto/index.html',
  '/games/pilot-tollt/index.html',
  '/games/remember-family/index.html',
  '/games/robot-battle/index.html',
  '/games/simon-says/index.html',
  '/games/sky-battle/index.html',
  '/games/sparkle-shop/index.html',
];

// The Next.js play wrapper pages — must be cached for offline play
const PLAY_PAGES = [
  '/play/airplane-ocean',
  '/play/cute-rescue',
  '/play/johnny-trigger-sniper-3d',
  '/play/lilo-stitch-chess',
  '/play/loti-it0',
  '/play/loto',
  '/play/pilot-tollt',
  '/play/remember-family',
  '/play/robot-battle',
  '/play/simon-says',
  '/play/sky-battle',
  '/play/sparkle-shop',
];

// Resilient caching — individual URL failures don't abort the SW install
async function resilientCacheAll(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) await cache.put(url, response);
      } catch (_) {}
    })
  );
}

// Install: pre-cache everything needed for offline play
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // App shell — atomic (these must succeed)
      caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
      // Games + play pages — resilient (individual failures are ok)
      resilientCacheAll(GAME_CACHE, GAME_FILES),
      resilientCacheAll(CACHE_NAME, PLAY_PAGES),
    ])
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, GAME_CACHE, STATIC_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !currentCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API routes: network only (never cache — play counts, auth, etc.)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Next.js static assets: cache-forever (content-hashed filenames)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Game files: cache-first (pre-cached on install)
  if (url.pathname.startsWith('/games/')) {
    event.respondWith(
      caches.open(GAME_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Play pages + everything else: network-first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
