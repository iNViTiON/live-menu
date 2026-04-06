<script lang="ts">
  import { onMount } from 'svelte';
  import { beforeNavigate, goto } from '$app/navigation';
  import { page } from '$app/state';
  import { registerServiceWorker, onDataUpdated } from '$lib/services/sw-bridge';
  import { connectionStatus } from '$lib/stores/connection-status.svelte';
  import { galleryStore } from '$lib/stores/gallery.svelte';
  import { menuStore } from '$lib/stores/menu.svelte';
  import { customerStore } from '$lib/stores/customer.svelte';
  import { menuSync } from '$lib/services/version-sync';
  import { createIdleTimer } from '$lib/services/idle-timer';
  import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';
  import IdleWarningOverlay from '$lib/components/IdleWarningOverlay.svelte';

  function getUiText(settings: Record<string, string>, key: string, lang: string): string {
    return settings[`ui:${key}:${lang}`] || settings[`ui:${key}:GB`] || key;
  }

  let { children } = $props();

  let direction = $state<1 | -1>(1);
  let warningVisible = $state(false);
  let warningSeconds = $state(5);

  const overlaySettings = $derived(
    page.url.pathname === '/customer'
      ? (customerStore.data?.settings ?? menuStore.settings)
      : galleryStore.settings
  );
  const overlayLanguage = $derived(
    page.url.pathname === '/customer' ? menuStore.selectedLanguage : galleryStore.selectedLanguage
  );

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

    // Single app-wide idle timer
    let isIdle = false;
    let countdownInterval: ReturnType<typeof setInterval> | null = null;

    menuSync.onAppVersionChange = () => {
      if (isIdle) location.reload();
    };

    const idle = createIdleTimer({
      timeoutMs: 60_000,
      warningMs: 5_000,
      onWarning: () => {
        warningVisible = true;
        warningSeconds = 5;
        countdownInterval = setInterval(() => {
          warningSeconds = Math.max(0, warningSeconds - 1);
        }, 1000);
      },
      onDismiss: () => {
        warningVisible = false;
        if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
      },
      onIdle: () => {
        isIdle = true;
        warningVisible = false;
        if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
        if (menuSync.appVersionChanged) {
          location.reload();
          return;
        }
        customerStore.reset();
        menuStore.resetToDefault();
        galleryStore.resetToDefault();
        if (page.url.pathname === '/customer') {
          goto('/');
        } else {
          const scrollEl = document.querySelector('.scroll-container');
          if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
    });
    const stopIdle = idle.start();

    return () => {
      unsubData();
      stopPolling();
      stopIdle();
      if (countdownInterval) clearInterval(countdownInterval);
      menuSync.onConnectionChange = null;
      menuSync.onAppVersionChange = null;
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

<IdleWarningOverlay
  visible={warningVisible}
  secondsLeft={warningSeconds}
  title={getUiText(overlaySettings, 'idle_warning_title', overlayLanguage)}
  hint={getUiText(overlaySettings, 'idle_warning_hint', overlayLanguage)}
/>

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
