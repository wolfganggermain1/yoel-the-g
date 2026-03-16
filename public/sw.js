const CACHE_NAME = 'yoel-the-g-v2';
const GAME_CACHE = 'yoel-games-v2';
const STATIC_CACHE = 'yoel-static-v2';

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

// Install: pre-cache app shell + all games (all under 5MB)
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
      caches.open(GAME_CACHE).then((cache) => cache.addAll(GAME_FILES)),
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

  // Game files: cache-first (pre-cached on install, static HTML)
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

  // App pages + everything else: network-first with cache fallback
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
