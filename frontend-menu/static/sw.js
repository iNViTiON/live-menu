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

// Module-level active media URL sets — populated during caching, used by evictOrphanMedia
// null = not yet initialised (both APIs must be seen before orphan eviction runs)
let menuMediaUrls = null;
let galleryMediaUrls = null;

// ── Lifecycle ──

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      // Cache all shell assets from the manifest
      for (const entry of PRECACHE_MANIFEST) {
        try {
          const response = await fetch(entry.url);
          if (response.ok) {
            // Strip redirected flag so cached responses work with respondWith()
            const clean = response.redirected
              ? new Response(response.body, { status: response.status, statusText: response.statusText, headers: response.headers })
              : response;
            await cache.put(entry.url, clean);
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
  // Always construct a fresh Response to strip the `redirected` flag — navigation
  // requests use redirect:'manual', and respondWith() rejects redirected responses.
  // Both cached and fetched responses can have redirected:true (CF Pages _redirects).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html', { cacheName: SHELL_CACHE })
        .then((r) => r || fetch('/index.html'))
        .then((r) => new Response(r.body, {
          status: r.status,
          statusText: r.statusText,
          headers: r.headers,
        }))
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
  // Clone cached for fetchAndUpdate — the original will be returned to the caller
  // and its body consumed, which would make .clone() throw in fetchAndUpdate.
  const networkPromise = fetchAndUpdate(event.request, resourceType, cache, cached?.clone());
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

// Fetch up to `concurrency` URLs at a time; skip already-cached entries.
// Calls onCached(url) after each successful cache.put.
async function cacheUrlsConcurrently(urls, cache, concurrency = 4, onCached) {
  for (let i = 0; i < urls.length; i += concurrency) {
    await Promise.all(urls.slice(i, i + concurrency).map(async (url) => {
      if (await cache.match(url)) return;
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          await cache.put(url, resp);
          if (onCached) await onCached(url);
        }
      } catch {
        // Skip — will retry on next sync
      }
    }));
  }
}

async function cacheAllMenuMedia(menuData) {
  const cache = await caches.open(MEDIA_CACHE);
  const urls = [];
  for (const item of menuData.items || []) {
    for (const media of item.media || []) {
      urls.push('/media/' + media.r2_key);
    }
  }
  // Update module-level set so evictOrphanMedia doesn't need to re-parse
  menuMediaUrls = new Set(urls);
  await cacheUrlsConcurrently(urls, cache, 4, (url) => notifyClients({ type: 'media-cached', url }));
}

async function cacheAllGalleryMedia(galleryData) {
  const cache = await caches.open(MEDIA_CACHE);
  const urls = [];
  for (const page of galleryData.pages || []) {
    for (const media of page.media || []) {
      urls.push('/media/' + media.r2_key);
    }
  }
  // Update module-level set so evictOrphanMedia doesn't need to re-parse
  galleryMediaUrls = new Set(urls);
  await cacheUrlsConcurrently(urls, cache, 4, (url) => notifyClients({ type: 'media-cached', url }));
}

async function evictOrphanMedia() {
  // Only evict once both API responses have been processed (sets are populated)
  if (!menuMediaUrls || !galleryMediaUrls) return;

  const mediaCache = await caches.open(MEDIA_CACHE);
  const neededUrls = new Set([...menuMediaUrls, ...galleryMediaUrls]);

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
