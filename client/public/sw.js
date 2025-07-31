const CACHE_NAME = 'sprachmeister-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const STATIC_CACHE_FILES = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// API endpoints to cache for offline use
const API_CACHE_FILES = [
  '/api/vocabulary',
  '/api/dashboard/stats',
  '/api/settings'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static files');
      return cache.addAll(STATIC_CACHE_FILES);
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - network first, then cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests (page loads)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If successful, cache the response and return it
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If offline, try to serve from cache or show offline page
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET requests
          if (request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // For GET requests, try to serve from cache
          if (request.method === 'GET') {
            return caches.match(request);
          }
          // For POST/PUT/DELETE, return error response
          return new Response(
            JSON.stringify({ 
              error: 'Offline - this action requires internet connection',
              offline: true 
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Handle static assets (CSS, JS, images)
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // For all other requests, use network-first strategy
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync-vocabulary') {
    event.waitUntil(syncVocabularyData());
  }
});

// Sync vocabulary data when back online
async function syncVocabularyData() {
  try {
    // Check if there are any pending offline actions stored in IndexedDB
    // This would sync vocabulary additions, progress updates, etc.
    console.log('[SW] Syncing vocabulary data...');
    
    // Implementation would depend on your offline storage strategy
    // For now, just invalidate cache to get fresh data
    const cache = await caches.open(CACHE_NAME);
    const apiKeys = await cache.keys();
    const apiRequests = apiKeys.filter(request => 
      request.url.includes('/api/')
    );
    
    for (const request of apiRequests) {
      await cache.delete(request);
    }
    
    console.log('[SW] Vocabulary data sync completed');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Handle push notifications (for WhatsApp reminders)
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'Time to practice your German!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'learn',
        title: 'Start Learning',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SprachMeister Reminder', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'learn') {
    event.waitUntil(
      clients.openWindow('/learn')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});