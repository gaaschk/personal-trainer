// Simple service worker for PWA offline shell
// Bump CACHE_NAME on each deploy to force cache invalidation
const CACHE_NAME = 'ai-trainer-v2';

self.addEventListener('install', (event) => {
  // Only cache truly static assets (manifest + icons)
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/manifest.json', '/icons/icon-192.png']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Delete all old caches on activate
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Always use network for everything — no caching of pages or JS
  // This ensures users always get the latest app code after a deploy
});
