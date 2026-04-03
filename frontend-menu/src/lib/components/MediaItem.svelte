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

  // Track visibility
  $effect(() => {
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  });

  // Manage video source changes seamlessly (handles initial load + language switches)
  let loadedSrc: string | null = null;
  $effect(() => {
    if (!videoEl || !isVideo || !mediaUrl) return;
    if (mediaUrl === loadedSrc) return;

    const savedTime = videoEl.currentTime || 0;

    // On language switch (not initial load), capture current frame as poster to prevent blink
    if (loadedSrc) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth || videoEl.clientWidth;
        canvas.height = videoEl.videoHeight || videoEl.clientHeight;
        canvas.getContext('2d')!.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        videoEl.poster = canvas.toDataURL('image/jpeg', 0.8);
      } catch {}
    }

    loadedSrc = mediaUrl;
    videoEl.src = mediaUrl;

    const onReady = () => {
      if (savedTime > 0) videoEl.currentTime = savedTime;
      if (isVisible) videoEl.play().catch(() => {});
      videoEl.poster = '';
      videoEl.removeEventListener('loadeddata', onReady);
    };
    videoEl.addEventListener('loadeddata', onReady);

    return () => videoEl.removeEventListener('loadeddata', onReady);
  });

  // Play/pause based on visibility
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
  }

  .media-content {
    width: 100%;
    height: auto;
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
