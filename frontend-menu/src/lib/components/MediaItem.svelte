<script lang="ts">
  import type { MenuItemWithDetails } from '@live-menu/shared';
  import { menuStore } from '$lib/stores/menu.svelte';

  let { item }: { item: MenuItemWithDetails } = $props();

  let element: HTMLElement = $state()!;
  let isVisible = $state(false);
  let videoEl: HTMLVideoElement = $state()!;

  const media = $derived(menuStore.getMediaVariant(item));
  const mediaUrl = $derived(media ? `/media/${media.r2_key}` : null);
  const isVideo = $derived(media?.media_type === 'video');

  // Track visibility only — play/pause is handled by the effect below
  $effect(() => {
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; },
      { threshold: 0.5 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  });

  // Play/pause when visibility OR video element readiness changes.
  // This covers the first item on initial load (observer fires before
  // videoEl is bound, but this effect re-runs once videoEl is ready).
  $effect(() => {
    if (!isVideo || !videoEl) return;
    if (isVisible) {
      videoEl.play().catch(() => {});
    } else {
      videoEl.pause();
    }
  });
</script>

<div bind:this={element} class="media-item" id="item-{item.id}">
  {#if mediaUrl}
    {#if isVideo}
      <video
        bind:this={videoEl}
        src={mediaUrl}
        muted
        loop
        playsinline
        class="media-content"
      ></video>
    {:else}
      <img src={mediaUrl} alt={menuStore.getName(item)} class="media-content" />
    {/if}
  {:else}
    <div class="placeholder">
      <span>{menuStore.getName(item) || 'No media'}</span>
    </div>
  {/if}
</div>

<style>
  .media-item {
    width: 100%;
    flex-shrink: 0;
    position: relative;
    background: #111;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100dvh;
  }

  .media-content {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #555;
    font-size: 1.2rem;
  }
</style>
