const CACHE_NAME = 'spin-wheel-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon.svg',
  './css/base.css',
  './css/layout.css',
  './css/wheel.css',
  './css/settings.css',
  './css/modals.css',
  './css/animations.css',
  './js/config.js',
  './js/state.js',
  './js/audio.js',
  './js/wheel.js',
  './js/knockout.js',
  './js/confetti.js',
  './js/notifications.js',
  './js/storage.js',
  './js/modes.js',
  './js/physics.js',
  './js/main.js'
];

// Install Event - Pre-cache all static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Force the waiting service worker to become active
  );
});

// Activate Event - Clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Start controlling all open tabs immediately
  );
});

// Fetch Event - Cache-First with Network Fallback
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Handle navigation requests falling back to cached index.html
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html') || caches.match('index.html');
      }

      return fetch(event.request).then((networkResponse) => {
        // Verify response is valid before caching
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Return index.html as a final resort for offline navigation failures
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
