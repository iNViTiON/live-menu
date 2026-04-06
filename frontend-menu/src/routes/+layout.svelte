<script lang="ts">
  import { onMount } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { registerServiceWorker, onDataUpdated } from '$lib/services/sw-bridge';
  import { connectionStatus } from '$lib/stores/connection-status.svelte';
  import { galleryStore } from '$lib/stores/gallery.svelte';
  import { menuStore } from '$lib/stores/menu.svelte';
  import { customerStore } from '$lib/stores/customer.svelte';
  import { menuSync } from '$lib/services/version-sync';
  import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';

  let { children } = $props();

  let direction = $state<1 | -1>(1);

  onMount(() => {
    registerServiceWorker();
    connectionStatus.init();

    // Wire WS connection state into connection status
    menuSync.onConnectionChange = (connected) => {
      connectionStatus.setWsConnected(connected);
    };

    const unsubData = onDataUpdated((resource) => {
      if (resource === 'gallery') galleryStore.load();
      if (resource === 'menu') {
        menuStore.load().then(() => {
          if (customerStore.data) customerStore.load();
        });
      }
    });

    const stopPolling = galleryStore.startSchedulePolling();
    return () => {
      unsubData();
      stopPolling();
      menuSync.onConnectionChange = null;
    };
  });

  beforeNavigate(({ from, to }) => {
    const fromPath = from?.url.pathname ?? '/';
    const toPath = to?.url.pathname ?? '/';
    if (fromPath === '/' && toPath === '/customer') direction = 1;
    else if (fromPath === '/customer' && toPath === '/') direction = -1;
  });

  // Pure translateX slide — no opacity, pages appear connected side-by-side
  function slideX(_node: Element, { x, duration }: { x: number; duration: number }) {
    return {
      duration,
      css: (t: number) => {
        // Custom cubic-bezier(0.77, 0, 0.175, 1) approximation
        const ease = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
        return `transform: translateX(${(1 - ease) * x}%)`;
      }
    };
  }
</script>

<div class="app-shell">
  {#key page.url.pathname}
    <div
      class="page-wrapper"
      in:slideX={{ x: direction * 100, duration: 600 }}
      out:slideX={{ x: direction * -100, duration: 600 }}
    >
      {@render children()}
    </div>
  {/key}
</div>

<ConnectionStatus />

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #000;
    color: #fff;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .app-shell {
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    position: relative;
  }

  .page-wrapper {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
</style>
