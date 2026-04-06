// Injected at build time by scripts/generate-precache-manifest.mjs
const PRECACHE_MANIFEST = [];

const SHELL_CACHE = 'menu-shell-v1';
const MANIFEST_CACHE = 'menu-manifest-v1';
const MEDIA_CACHE = 'menu-media-v1';

const MENU_API = '/api/public/menu';
const GALLERY_API = '/api/public/gallery';

// Build a Set of precache URLs for fast lookup
const PRECACHE_URLS = new Set(PRECACHE_MANIFEST.map((entry) => entry.url));

// Track recently-updated URLs to avoid redundant background fetches
const recentlyUpdated = new Map(); // url → timestamp
const RECENT_THRESHOLD_MS = 750;

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

  // API: cache-then-network (instant cached response + background update)
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

  const url = event.request.url;
  const lastUpdate = recentlyUpdated.get(url);
  const isRecent = lastUpdate && (Date.now() - lastUpdate < RECENT_THRESHOLD_MS);

  if (cached && isRecent) {
    // Cache was just updated by a background fetch — return without another network request
    return cached;
  }

  // Normal cache-then-network: start background fetch, return cached immediately
  const networkPromise = fetchAndUpdate(event.request, resourceType, cache, cached);
  event.waitUntil(networkPromise);

  if (cached) {
    return cached;
  }
  return networkPromise;
}

async function fetchAndUpdate(request, resourceType, cache, cached) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const newText = await response.clone().text();
      // Only update cache and notify if data actually changed
      const oldText = cached ? await cached.clone().text() : null;
      if (newText !== oldText) {
        await cache.put(request, new Response(newText, { headers: response.headers }));
        // Mark URL as recently updated to suppress redundant background fetches
        recentlyUpdated.set(request.url, Date.now());
        // Notify clients before media caching (don't block notification on media)
        const newData = JSON.parse(newText);
        await notifyClients({ type: 'data-updated', resource: resourceType });
        // Pre-cache media (non-blocking)
        try {
          if (resourceType === 'menu') await cacheAllMenuMedia(newData);
          else if (resourceType === 'gallery') await cacheAllGalleryMedia(newData);
          await evictOrphanMedia();
        } catch {}
      }
    }
    return response;
  } catch {
    // Offline — return cached or error
    return cached || new Response(
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
