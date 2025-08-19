// sw.js - Service Worker
// This is a simplified version for debugging PWA installation.
const CACHE_NAME = 'dr-zerquera-cache-v2'; // Increment version to force update

// A 'fetch' event handler is required for a web app to be installable.
self.addEventListener('fetch', (event) => {
  // This is a simple pass-through fetch handler. It doesn't do any caching,
  // but its presence satisfies the PWA criteria.
  event.respondWith(fetch(event.request));
});

// The 'install' event.
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  // skipWaiting() forces the waiting service worker to become the
  // active service worker immediately.
  event.waitUntil(self.skipWaiting());
});

// The 'activate' event, which is used to clean up old caches.
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any caches that are not our current one.
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages under this SW's scope immediately.
      return self.clients.claim();
    })
  );
});