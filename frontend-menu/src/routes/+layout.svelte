<script lang="ts">
  import { onMount } from 'svelte';
  import { registerServiceWorker, onDataUpdated } from '$lib/services/sw-bridge';
  import { connectionStatus } from '$lib/stores/connection-status.svelte';
  import { galleryStore } from '$lib/stores/gallery.svelte';
  import { menuStore } from '$lib/stores/menu.svelte';
  import { customerStore } from '$lib/stores/customer.svelte';
  import { viewStore } from '$lib/stores/view.svelte';
  import { menuSync } from '$lib/services/version-sync';
  import { createIdleTimer } from '$lib/services/idle-timer';
  import { languageStore } from '$lib/stores/language.svelte';
  import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';
  import IdleWarningOverlay from '$lib/components/IdleWarningOverlay.svelte';

  function getUiText(settings: Record<string, string>, key: string, lang: string): string {
    return settings[`ui:${key}:${lang}`] || settings[`ui:${key}:GB`] || key;
  }

  let { children } = $props();

  let warningVisible = $state(false);
  let warningSeconds = $state(5);

  const overlaySettings = $derived(
    viewStore.activeView === 'customer'
      ? (customerStore.data?.settings ?? menuStore.settings)
      : galleryStore.settings
  );
  const overlayLanguage = $derived(
    viewStore.activeView === 'customer' ? menuStore.selectedLanguage : galleryStore.selectedLanguage
  );

  onMount(() => {
    registerServiceWorker();
    connectionStatus.init();

    const unsubData = onDataUpdated((resource) => {
      if (resource === 'gallery') galleryStore.load();
      if (resource === 'menu') {
        menuStore.load().then(() => {
          if (customerStore.data) customerStore.load();
        });
      }
    });

    // Wire WS connection state into connection status
    menuSync.onConnectionChange = (connected) => {
      connectionStatus.setWsConnected(connected);
    };

    const stopPolling = galleryStore.startSchedulePolling();

    // Single app-wide idle timer
    let isIdle = true;
    let countdownInterval: ReturnType<typeof setInterval> | null = null;
    let firstTickTimeout: ReturnType<typeof setTimeout> | null = null;

    menuSync.onAppVersionChange = () => {
      if (isIdle) location.reload();
    };

    const idle = createIdleTimer({
      timeoutMs: 60_000,
      warningMs: 5_000,
      shouldWarn: () => {
        // Skip warning if the app is already in the reset/home state.
        const scrollEl = document.querySelector('.scroll-container');
        const scrollTop = scrollEl?.scrollTop ?? 0;
        const alreadyHome =
          viewStore.activeView === 'gallery' &&
          languageStore.selectedLanguage === 'GB' &&
          scrollTop <= 5;
        return !alreadyHome;
      },
      onWarning: () => {
        warningVisible = true;
        warningSeconds = 5;
        firstTickTimeout = setTimeout(() => {
          firstTickTimeout = null;
          warningSeconds = 4;
          countdownInterval = setInterval(() => {
            warningSeconds = Math.max(0, warningSeconds - 1);
          }, 1000);
        }, 800);
      },
      onDismiss: () => {
        warningVisible = false;
        if (firstTickTimeout) { clearTimeout(firstTickTimeout); firstTickTimeout = null; }
        if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
      },
      onActivity: () => {
        isIdle = false;
      },
      onIdle: () => {
        isIdle = true;
        warningVisible = false;
        if (firstTickTimeout) { clearTimeout(firstTickTimeout); firstTickTimeout = null; }
        if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
        // Always do the smooth reset first so there's no blink.
        customerStore.reset();
        menuStore.resetToDefault();
        galleryStore.resetToDefault();
        viewStore.setGallery();
        const scrollEl = document.querySelector('.scroll-container');
        if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
        // Reload after the transition completes if a new app version is waiting.
        if (menuSync.appVersionChanged) {
          setTimeout(() => location.reload(), 500);
        }
      },
    });
    const stopIdle = idle.start();

    return () => {
      stopPolling();
      stopIdle();
      unsubData();
      if (firstTickTimeout) clearTimeout(firstTickTimeout);
      if (countdownInterval) clearInterval(countdownInterval);
      menuSync.onConnectionChange = null;
      menuSync.onAppVersionChange = null;
    };
  });
</script>

<div class="app-shell">
  {@render children()}
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
</style>
