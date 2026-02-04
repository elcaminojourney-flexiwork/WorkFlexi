// FlexiWork Service Worker v6
const CACHE_NAME = 'flexiwork-v6';

// Install - skip waiting
self.addEventListener('install', (event) => {
  console.log('[SW] Install v6');
  self.skipWaiting();
});

// Activate - claim clients and clear old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate v6');
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Network first, cache fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip API calls and external resources
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, return index.html
          if (event.request.mode === 'navigate') {
            return caches.match('index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'FlexiWork', {
      body: data.body || 'New notification',
      icon: 'icons/icon-192x192.png',
      badge: 'icons/icon-72x72.png',
    })
  );
});
