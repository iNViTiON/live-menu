<script lang="ts">
  import type { GalleryPageWithDetails } from '@live-menu/shared';
  import { galleryStore } from '$lib/stores/gallery.svelte';

  let { items }: { items: GalleryPageWithDetails[] } = $props();

  let activeId = $state<number | null>(null);
  let visible = $state(true);
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let navEl = $state<HTMLElement | null>(null);

  function resetTimer() {
    visible = true;
    if (hideTimer !== null) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      visible = false;
    }, 3000);
  }

  $effect(() => {
    resetTimer();

    // These events bubble to document normally
    const docEvents = ['touchstart', 'click', 'mousemove'] as const;
    docEvents.forEach((e) => document.addEventListener(e, resetTimer, { passive: true }));

    // Scroll does NOT bubble from .scroll-container — listen directly on it
    const scrollContainer = document.querySelector('.scroll-container');
    scrollContainer?.addEventListener('scroll', resetTimer, { passive: true });

    // Also reset timer when the user interacts with the gallery bar itself
    navEl?.addEventListener('touchstart', resetTimer, { passive: true });
    navEl?.addEventListener('click', resetTimer, { passive: true });

    return () => {
      if (hideTimer !== null) clearTimeout(hideTimer);
      docEvents.forEach((e) => document.removeEventListener(e, resetTimer));
      scrollContainer?.removeEventListener('scroll', resetTimer);
      navEl?.removeEventListener('touchstart', resetTimer);
      navEl?.removeEventListener('click', resetTimer);
    };
  });

  $effect(() => {
    if (activeId === null && items.length > 0) {
      activeId = items[0].id;
    }
  });

  function scrollToItem(id: number) {
    document.getElementById(`item-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  }

  $effect(() => {
    const elements = items.map((item) => document.getElementById(`item-${item.id}`));
    const observers: IntersectionObserver[] = [];

    elements.forEach((el, i) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            activeId = items[i].id;
          }
        },
        {
          // Shrink the observation zone to a thin strip at the vertical center so
          // an item is only "intersecting" when it crosses the center of the viewport
          rootMargin: '-49.9% 0px -49.9% 0px'
        }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  });
</script>

<nav
  bind:this={navEl}
  class="gallery-bar"
  class:hidden={!visible}
  aria-label="Menu navigation"
>
  {#each items as item (item.id)}
    {@const media = galleryStore.getMediaVariant(item, galleryStore.selectedLanguage)}
    {@const name = galleryStore.getName(item, galleryStore.selectedLanguage)}
    <button
      class="thumb-btn"
      class:active={activeId === item.id}
      onclick={() => scrollToItem(item.id)}
      title={name}
      aria-label={name}
    >
      <div class="thumb-media">
        {#if media}
          {#if media.media_type === 'video'}
            <video
              src={`/media/${media.r2_key}#t=0.001`}
              muted
              playsinline
              preload="metadata"
              class="thumb-content"
            ></video>
          {:else}
            <img src={`/media/${media.r2_key}`} alt={name} class="thumb-content" />
          {/if}
        {:else}
          <div class="thumb-empty"></div>
        {/if}
      </div>
      <span class="thumb-name">{name}</span>
    </button>
  {/each}
</nav>

<style>
  .gallery-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 5rem;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    gap: 0.5rem;
    padding: 0.4rem 0.5rem;
    z-index: 50;
    scrollbar-width: none;
    transform: translateY(0);
    transition: transform 300ms ease;
  }

  .gallery-bar.hidden {
    transform: translateY(100%);
  }

  .gallery-bar::-webkit-scrollbar {
    display: none;
  }

  .thumb-btn {
    flex-shrink: 0;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.08);
    border: 2px solid transparent;
    border-radius: 0.4rem;
    cursor: pointer;
    padding: 0.3rem 0.5rem;
    color: #fff;
    transition: border-color 0.15s, color 0.15s;
  }

  .thumb-btn:hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .thumb-btn.active {
    border-color: #fff;
  }

  .thumb-media {
    width: 3rem;
    height: 3rem;
    overflow: hidden;
    border-radius: 0.25rem;
    background: #222;
    flex-shrink: 0;
  }

  .thumb-content {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .thumb-empty {
    width: 100%;
    height: 100%;
    background: #333;
  }

  .thumb-name {
    font-size: 1.6rem;
    white-space: nowrap;
    color: #fff;
  }
</style>
