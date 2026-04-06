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

  $effect(() => {
    const desired = getDesiredUrl();

    if (desired === displayedUrl) return;
    if (!desired) { displayedUrl = null; return; }

    // Push-based: SW sends { type: 'media-cached', url } after each cache.put
    function onMessage(event: MessageEvent) {
      if (event.data?.type === 'media-cached' && event.data.url === desired) {
        displayedUrl = desired;
      }
    }

    const sw = 'serviceWorker' in navigator ? navigator.serviceWorker : null;
    sw?.addEventListener('message', onMessage);

    // Also check immediately — media may already be cached (e.g. returning visitor)
    isMediaCached(desired).then(cached => {
      if (cached) displayedUrl = desired;
    });

    return () => sw?.removeEventListener('message', onMessage);
  });

  return {
    get url() { return displayedUrl; }
  };
}
