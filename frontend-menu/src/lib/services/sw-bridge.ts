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
