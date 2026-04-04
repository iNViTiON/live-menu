<script lang="ts">
  import { onMount } from 'svelte';
  import { menuStore } from '$lib/stores/menu.svelte';
  import { createIdleTimer } from '$lib/services/idle-timer';
  import { menuSync } from '$lib/services/version-sync';
  import MediaItem from '$lib/components/MediaItem.svelte';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  import GalleryBar from '$lib/components/GalleryBar.svelte';

  onMount(() => {
    menuStore.load();
    menuSync.connect();

    const idle = createIdleTimer(60_000, () => {
      menuStore.resetToDefault();
      const scrollEl = document.querySelector('.scroll-container');
      if (scrollEl) scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
    });
    const stopIdle = idle.start();
    return () => {
      stopIdle();
      menuSync.disconnect();
    };
  });
</script>

<svelte:head>
  <title>Menu</title>
</svelte:head>

<main class="page">
  {#if menuStore.isLoading}
    <div class="loading">Loading…</div>
  {:else if menuStore.error}
    <div class="error">{menuStore.error}</div>
  {:else}
    <div class="scroll-container">
      {#each menuStore.items as item (item.id)}
        <MediaItem {item} />
      {/each}
    </div>

    <LanguageSwitcher languages={menuStore.languages} />
    <GalleryBar items={menuStore.items} />
    <a href="/customer" class="customer-mode-btn" aria-label="Interactive menu">
      <span>{menuStore.settings[`ui:find_your_drink:${menuStore.selectedLanguage}`] || menuStore.settings['ui:find_your_drink:GB'] || 'Find your drink'}</span>
    </a>
  {/if}
</main>

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
