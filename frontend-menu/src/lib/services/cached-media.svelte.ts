const MEDIA_CACHE = 'menu-media-v1';

async function isMediaCached(url: string): Promise<boolean> {
  try {
    const cache = await caches.open(MEDIA_CACHE);
    const response = await cache.match(url);
    return !!response;
  } catch {
    return false;
  }
}

export function createCachedMediaUrl(getDesiredUrl: () => string | null) {
  let displayedUrl = $state<string | null>(null);
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  function cleanup() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  $effect(() => {
    const desired = getDesiredUrl();

    // Same URL or cleared — update immediately
    if (desired === displayedUrl) return;
    if (!desired) { cleanup(); displayedUrl = null; return; }

    // Check if the new media is already in the SW cache
    cleanup();
    isMediaCached(desired).then(cached => {
      if (cached) {
        displayedUrl = desired;
      } else {
        // Poll until the SW has cached it (background download in progress)
        pollInterval = setInterval(async () => {
          if (await isMediaCached(desired)) {
            displayedUrl = desired;
            cleanup();
          }
        }, 200);
      }
    });

    // Cleanup on effect re-run or component destroy
    return cleanup;
  });

  return {
    get url() { return displayedUrl; }
  };
}
