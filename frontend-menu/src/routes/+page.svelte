<script lang="ts">
  import { onMount } from 'svelte';
  import { galleryStore } from '$lib/stores/gallery.svelte';
  import { menuStore } from '$lib/stores/menu.svelte';
  import { customerStore } from '$lib/stores/customer.svelte';
  import { viewStore } from '$lib/stores/view.svelte';
  import { menuSync } from '$lib/services/version-sync';
  import GalleryMediaItem from '$lib/components/GalleryMediaItem.svelte';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  import GalleryBar from '$lib/components/GalleryBar.svelte';
  import CustomerView from '$lib/components/CustomerView.svelte';

  function getUiText(settings: Record<string, string>, key: string, lang: string): string {
    return settings[`ui:${key}:${lang}`] || settings[`ui:${key}:GB`] || key;
  }

  function goToCustomer() {
    viewStore.setCustomer();
    customerStore.load();
  }

  function goToGallery() {
    customerStore.reset();
    viewStore.setGallery();
  }

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

  onMount(() => {
    galleryStore.load();
    menuStore.load();
    menuSync.connect();
    return () => {
      menuSync.disconnect();
    };
  });
</script>

<svelte:head>
  {#if viewStore.activeView === 'gallery'}
    <title>Menu</title>
  {/if}
</svelte:head>

{#key viewStore.activeView}
  <div
    class="page-wrapper"
    in:slideX={{ x: viewStore.transitionDirection * 100, duration: 600 }}
    out:slideX={{ x: viewStore.transitionDirection * -100, duration: 600 }}
  >
    {#if viewStore.activeView === 'gallery'}
      <main class="page">
        {#if galleryStore.isLoading}
          <div class="loading">Loading…</div>
        {:else if galleryStore.error}
          <div class="error">{galleryStore.error}</div>
        {:else}
          <div class="scroll-container">
            {#each galleryStore.visiblePages as gpage (gpage.id)}
              <GalleryMediaItem page={gpage} />
            {/each}
          </div>

          <LanguageSwitcher
            languages={galleryStore.languages}
            selectedLanguage={galleryStore.selectedLanguage}
            onLanguageChange={(code) => galleryStore.setLanguage(code)}
          />
          <GalleryBar items={galleryStore.visiblePages} />
          <button class="customer-mode-btn" onclick={goToCustomer} aria-label="Interactive menu">
            <span>{getUiText(menuStore.settings, 'find_your_drink', galleryStore.selectedLanguage)}</span>
          </button>
        {/if}
      </main>
    {:else}
      <CustomerView onBack={goToGallery} />
    {/if}
  </div>
{/key}

<style>
  .page-wrapper {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

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
    font-size: 0.85rem;
    font-weight: 500;
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .customer-mode-btn:hover {
    background: rgba(0, 0, 0, 0.7);
    border-color: rgba(255, 255, 255, 0.4);
  }
</style>
