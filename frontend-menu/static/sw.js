const MANIFEST_CACHE = 'menu-manifest-v1';
const MEDIA_CACHE = 'menu-media-v1';
const MENU_API = '/api/public/menu';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === MENU_API) {
    event.respondWith(networkFirstMenu(event.request));
    return;
  }

  if (url.pathname.startsWith('/media/')) {
    event.respondWith(cacheFirstMedia(event.request));
    return;
  }
});

async function networkFirstMenu(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(MANIFEST_CACHE);
      cache.put(request, response.clone());
      const data = await response.clone().json();
      cacheAllMedia(data);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function cacheFirstMedia(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(MEDIA_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function cacheAllMedia(menuData) {
  const cache = await caches.open(MEDIA_CACHE);
  const currentKeys = await cache.keys();
  const currentUrls = new Set(currentKeys.map((r) => new URL(r.url).pathname));
  const newUrls = new Set();

  for (const item of menuData.items) {
    for (const media of item.media) {
      const url = '/media/' + media.r2_key;
      newUrls.add(url);
      if (!currentUrls.has(url)) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch {
          // skip failed media
        }
      }
    }
  }

  for (const request of currentKeys) {
    const pathname = new URL(request.url).pathname;
    if (!newUrls.has(pathname)) {
      await cache.delete(request);
    }
  }
}
