<script lang="ts">
  import { onMount } from 'svelte';
  import { galleryStore } from '$lib/stores/gallery.svelte';
  import { menuStore } from '$lib/stores/menu.svelte';
  import { createIdleTimer } from '$lib/services/idle-timer';
  import { menuSync } from '$lib/services/version-sync';
  import GalleryMediaItem from '$lib/components/GalleryMediaItem.svelte';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  import GalleryBar from '$lib/components/GalleryBar.svelte';
  import IdleWarningOverlay from '$lib/components/IdleWarningOverlay.svelte';

  function getUiText(settings: Record<string, string>, key: string, lang: string): string {
    return settings[`ui:${key}:${lang}`] || settings[`ui:${key}:GB`] || key;
  }

  let warningVisible = $state(false);
  let warningSeconds = $state(5);

  onMount(() => {
    galleryStore.load();
    menuSync.connect();

    let isIdle = false;

    menuSync.onAppVersionChange = () => {
      if (isIdle) location.reload();
    };

    let countdownInterval: ReturnType<typeof setInterval> | null = null;

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
        galleryStore.resetToDefault();
        const scrollEl = document.querySelector('.scroll-container');
        if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
    const stopIdle = idle.start();
    return () => {
      stopIdle();
      if (countdownInterval) clearInterval(countdownInterval);
      menuSync.onAppVersionChange = null;
      menuSync.disconnect();
    };
  });
</script>

<svelte:head>
  <title>Menu</title>
</svelte:head>

<main class="page">
  {#if galleryStore.isLoading}
    <div class="loading">Loading…</div>
  {:else if galleryStore.error}
    <div class="error">{galleryStore.error}</div>
  {:else}
    <div class="scroll-container">
      {#each galleryStore.visiblePages as page (page.id)}
        <GalleryMediaItem {page} />
      {/each}
    </div>

    <LanguageSwitcher
      languages={galleryStore.languages}
      selectedLanguage={galleryStore.selectedLanguage}
      onLanguageChange={(code) => galleryStore.setLanguage(code)}
    />
    <GalleryBar items={galleryStore.visiblePages} />
    <a href="/customer" class="customer-mode-btn" aria-label="Interactive menu">
      <span>{getUiText(menuStore.settings, 'find_your_drink', galleryStore.selectedLanguage)}</span>
    </a>
  {/if}
</main>

<IdleWarningOverlay
  visible={warningVisible}
  secondsLeft={warningSeconds}
  title={getUiText(galleryStore.settings, 'idle_warning_title', galleryStore.selectedLanguage)}
  hint={getUiText(galleryStore.settings, 'idle_warning_hint', galleryStore.selectedLanguage)}
/>

<style>
  .page {
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    position: relative;
    background: #000;
  }

  .scroll-container {
    width: 100%;
    height: 100dvh;
    overflow-y: scroll;
    scrollbar-width: none;
    /* leave room for the gallery bar */
    padding-bottom: 5rem;
  }

  .scroll-container::-webkit-scrollbar {
    display: none;
  }

  .loading,
  .error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #aaa;
    font-size: 1.1rem;
  }

  .error {
    color: #f66;
  }

  .customer-mode-btn {
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.45rem 0.85rem;
    border-radius: 99px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    color: #fff;
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 500;
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: background 0.15s, border-color 0.15s;
  }

  .customer-mode-btn:hover {
    background: rgba(0, 0, 0, 0.7);
    border-color: rgba(255, 255, 255, 0.4);
  }
</style>
