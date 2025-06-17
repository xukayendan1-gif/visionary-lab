const CACHE_NAME = 'visionary-lab-v1';
const STATIC_CACHE = 'static-v1';
const IMAGE_CACHE = 'images-v1';
const API_CACHE = 'api-v1';
const VIDEO_THUMBNAILS_CACHE = 'video-thumbnails-v1';
const AZURE_BLOB_CACHE = 'azure-blob-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/_next/static/css/',
  '/_next/static/js/',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS.filter(url => url !== '/_next/static/css/' && url !== '/_next/static/js/'));
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE && 
              cacheName !== IMAGE_CACHE && cacheName !== API_CACHE &&
              cacheName !== VIDEO_THUMBNAILS_CACHE && cacheName !== AZURE_BLOB_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests with appropriate caching strategies
  if (url.pathname.startsWith('/_next/static/')) {
    // Static assets - cache first with long TTL
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (url.pathname.startsWith('/api/image/')) {
    // Images - cache first with medium TTL
    event.respondWith(cacheFirst(request, IMAGE_CACHE, 7 * 24 * 60 * 60 * 1000)); // 7 days
  } else if (url.hostname.includes('.blob.core.windows.net')) {
    // Azure Blob Storage requests
    if (isVideoThumbnailOrPoster(url.pathname)) {
      // Cache video thumbnails and posters
      event.respondWith(cacheFirst(request, VIDEO_THUMBNAILS_CACHE, 7 * 24 * 60 * 60 * 1000)); // 7 days
    } else if (isVideoFile(url.pathname)) {
      // Don't cache actual video files (too large), but add headers for better streaming
      event.respondWith(handleVideoRequest(request));
    } else {
      // Other Azure Blob assets (images) - cache with medium TTL
      event.respondWith(cacheFirst(request, AZURE_BLOB_CACHE, 24 * 60 * 60 * 1000)); // 24 hours
    }
  } else if (url.pathname.startsWith('/api/')) {
    // API calls - network first with short TTL
    event.respondWith(networkFirst(request, API_CACHE, 5 * 60 * 1000)); // 5 minutes
  } else if (url.origin === self.location.origin) {
    // Same origin requests - stale while revalidate
    event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
  }
});

// Cache first strategy - good for static assets
async function cacheFirst(request, cacheName, maxAge = 365 * 24 * 60 * 60 * 1000) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    const cachedDate = new Date(cachedResponse.headers.get('date') || 0);
    const now = new Date();
    
    // Check if cache is still valid
    if (now - cachedDate < maxAge) {
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return cached version if network fails
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Network first strategy - good for API calls
async function networkFirst(request, cacheName, maxAge = 5 * 60 * 1000) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const cachedDate = new Date(cachedResponse.headers.get('date') || 0);
      const now = new Date();
      
      // Return cached version if it's not too old
      if (now - cachedDate < maxAge) {
        return cachedResponse;
      }
    }
    throw error;
  }
}

// Stale while revalidate strategy - good for pages
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in background
  const networkResponsePromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  return networkResponsePromise;
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  console.log('Background sync triggered');
}

// Helper functions for Azure Blob Storage video handling
function isVideoFile(pathname) {
  const videoExtensions = /\.(mp4|webm|ogg|avi|mov|wmv|flv|mkv|m4v|3gp|m3u8|mpd)(\?.*)?$/i;
  return videoExtensions.test(pathname);
}

function isVideoThumbnailOrPoster(pathname) {
  return pathname.includes('_poster.') || pathname.includes('_thumb_') || pathname.includes('_thumbnail.');
}

// Special handling for video requests - don't cache but optimize headers
async function handleVideoRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Clone response to modify headers
      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'Cache-Control': 'public, max-age=3600', // 1 hour browser cache
          'Accept-Ranges': 'bytes', // Enable range requests for video seeking
        }
      });
      
      return modifiedResponse;
    }
    
    return response;
  } catch (error) {
    console.error('Video request failed:', error);
    throw error;
  }
} 