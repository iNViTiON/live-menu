<script lang="ts">
  import { onMount } from 'svelte';
  import { menuStore } from '$lib/stores/menu.svelte';
  import { createIdleTimer } from '$lib/services/idle-timer';
  import MediaItem from '$lib/components/MediaItem.svelte';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  import GalleryBar from '$lib/components/GalleryBar.svelte';

  onMount(() => {
    menuStore.load();

    const idle = createIdleTimer(60_000, () => {
      menuStore.resetToDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return idle.start();
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
    scroll-snap-type: y mandatory;
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
</style>
