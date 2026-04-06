// Injected at build time by scripts/generate-precache-manifest.mjs
const PRECACHE_MANIFEST = [];

const SHELL_CACHE = 'menu-shell-v1';
const MANIFEST_CACHE = 'menu-manifest-v1';
const MEDIA_CACHE = 'menu-media-v1';

const MENU_API = '/api/public/menu';
const GALLERY_API = '/api/public/gallery';

// Build a Set of precache URLs for fast lookup
const PRECACHE_URLS = new Set(PRECACHE_MANIFEST.map((entry) => entry.url));

// ── Lifecycle ──

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      // Cache all shell assets from the manifest
      for (const entry of PRECACHE_MANIFEST) {
        try {
          const response = await fetch(entry.url);
          if (response.ok) {
            await cache.put(entry.url, response);
          }
        } catch {
          // Skip failed fetches during install — non-critical
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      // Remove old entries not in the current manifest
      const keys = await cache.keys();
      for (const request of keys) {
        const url = new URL(request.url);
        if (!PRECACHE_URLS.has(url.pathname)) {
          await cache.delete(request);
        }
      }
    }).then(() => self.clients.claim())
  );
});

// ── Fetch routing ──

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // API: cache-then-network
  if (url.pathname === MENU_API) {
    return event.respondWith(cacheThenNetwork(event, 'menu'));
  }
  if (url.pathname === GALLERY_API) {
    return event.respondWith(cacheThenNetwork(event, 'gallery'));
  }

  // Media: cache-first
  if (url.pathname.startsWith('/media/')) {
    return event.respondWith(cacheFirstMedia(event.request));
  }

  // Navigation: serve index.html from shell cache (SPA fallback)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html', { cacheName: SHELL_CACHE })
        .then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Shell assets: cache-first
  if (PRECACHE_URLS.has(url.pathname)) {
    event.respondWith(
      caches.match(url.pathname, { cacheName: SHELL_CACHE })
        .then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Everything else: network passthrough
});

// ── Cache-then-network for API data ──

async function cacheThenNetwork(event, resourceType) {
  const cache = await caches.open(MANIFEST_CACHE);
  const cached = await cache.match(event.request);

  // Start background network fetch
  const networkPromise = fetchAndUpdate(event.request, resourceType, cache, cached);
  event.waitUntil(networkPromise);

  // Return cached immediately if available, otherwise wait for network
  if (cached) {
    return cached;
  }
  return networkPromise;
}

async function fetchAndUpdate(request, resourceType, cache, cachedResponse) {
  try {
    const response = await fetch(request);
    if (!response.ok) {
      return cachedResponse || response;
    }

    // Compare response bodies to detect actual data changes
    const newText = await response.clone().text();
    let changed = true;
    if (cachedResponse) {
      try {
        const oldText = await cachedResponse.clone().text();
        changed = newText !== oldText;
      } catch {
        // Treat read failure as changed
      }
    }

    const newData = JSON.parse(newText);

    // Update cache
    await cache.put(request, response.clone());

    // Notify clients if data changed (before media caching so a media error doesn't block it)
    if (changed && cachedResponse) {
      await notifyClients({ type: 'data-updated', resource: resourceType });
    }

    // Pre-cache media from this response
    try {
      if (resourceType === 'menu') {
        await cacheAllMenuMedia(newData);
      } else if (resourceType === 'gallery') {
        await cacheAllGalleryMedia(newData);
      }

      // Evict orphaned media (only when both endpoints are cached)
      await evictOrphanMedia();
    } catch {
      // Media caching failure is non-fatal
    }

    return response;
  } catch {
    // Network error — return cached or offline error
    return cachedResponse || new Response(
      JSON.stringify({ error: 'offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ── Cache-first for media ──

async function cacheFirstMedia(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response(
      JSON.stringify({ error: 'offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ── Media pre-caching ──

async function cacheAllMenuMedia(menuData) {
  const cache = await caches.open(MEDIA_CACHE);
  for (const item of menuData.items || []) {
    for (const media of item.media || []) {
      const url = '/media/' + media.r2_key;
      const existing = await cache.match(url);
      if (!existing) {
        try {
          const resp = await fetch(url);
          if (resp.ok) await cache.put(url, resp);
        } catch {
          // Skip — will retry on next sync
        }
      }
    }
  }
}

async function cacheAllGalleryMedia(galleryData) {
  const cache = await caches.open(MEDIA_CACHE);
  for (const page of galleryData.pages || []) {
    for (const media of page.media || []) {
      const url = '/media/' + media.r2_key;
      const existing = await cache.match(url);
      if (!existing) {
        try {
          const resp = await fetch(url);
          if (resp.ok) await cache.put(url, resp);
        } catch {
          // Skip
        }
      }
    }
  }
}

async function evictOrphanMedia() {
  const manifestCache = await caches.open(MANIFEST_CACHE);
  const mediaCache = await caches.open(MEDIA_CACHE);

  // Only evict if both API responses are cached
  const menuResp = await manifestCache.match(MENU_API);
  const galleryResp = await manifestCache.match(GALLERY_API);
  if (!menuResp || !galleryResp) return;

  const neededUrls = new Set();

  // Collect from menu data
  try {
    const menuData = await menuResp.clone().json();
    for (const item of menuData.items || []) {
      for (const media of item.media || []) {
        neededUrls.add('/media/' + media.r2_key);
      }
    }
  } catch {}

  // Collect from gallery data
  try {
    const galleryData = await galleryResp.clone().json();
    for (const page of galleryData.pages || []) {
      for (const media of page.media || []) {
        neededUrls.add('/media/' + media.r2_key);
      }
    }
  } catch {}

  // Delete orphans
  const keys = await mediaCache.keys();
  for (const request of keys) {
    const pathname = new URL(request.url).pathname;
    if (!neededUrls.has(pathname)) {
      await mediaCache.delete(request);
    }
  }
}

// ── Client notification ──

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage(message);
  }
}
