type DataUpdateCallback = (resource: 'menu' | 'gallery') => void;
const listeners = new Set<DataUpdateCallback>();

export function onDataUpdated(cb: DataUpdateCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('SW registered:', registration.scope);
  } catch (err) {
    console.error('SW registration failed:', err);
  }

  // On first SW activation (controller was null), re-fetch API data through the SW
  // so cacheThenNetwork runs, media pre-caching triggers, and media-cached messages arrive.
  if (!navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      fetch('/api/public/menu');
      fetch('/api/public/gallery');
    }, { once: true });
  }

  // Listen for messages from SW (cache-then-network background updates)
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data;
    if (data?.type === 'data-updated') {
      for (const cb of listeners) {
        cb(data.resource);
      }
    }
  });
}
