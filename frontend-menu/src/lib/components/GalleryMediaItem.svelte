<script lang="ts">
  import type { GalleryPageWithDetails } from '@live-menu/shared';
  import { galleryStore } from '$lib/stores/gallery.svelte';

  let { page }: { page: GalleryPageWithDetails } = $props();

  let element: HTMLElement = $state()!;
  let isVisible = $state(false);
  let videoEl: HTMLVideoElement = $state()!;

  const media = $derived(galleryStore.getMediaVariant(page, galleryStore.selectedLanguage));
  const mediaUrl = $derived(media ? `/media/${media.r2_key}` : null);
  const isVideo = $derived(media?.media_type === 'video');
  const altText = $derived(galleryStore.getName(page, galleryStore.selectedLanguage));

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
  let loadedEl: HTMLVideoElement | null = null;
  $effect(() => {
    if (!videoEl || !isVideo || !mediaUrl) return;
    if (videoEl !== loadedEl) {
      loadedSrc = null;
      loadedEl = videoEl;
    }
    if (mediaUrl === loadedSrc) return;

    const el = videoEl;
    const savedTime = el.currentTime || 0;

    if (loadedSrc) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = el.videoWidth || el.clientWidth;
        canvas.height = el.videoHeight || el.clientHeight;
        canvas.getContext('2d')!.drawImage(el, 0, 0, canvas.width, canvas.height);
        el.poster = canvas.toDataURL('image/jpeg', 0.8);
      } catch {}
    }

    loadedSrc = mediaUrl;
    el.src = mediaUrl;

    const onReady = () => {
      if (savedTime > 0) el.currentTime = savedTime;
      if (isVisible) el.play().catch(() => {});
      el.poster = '';
      el.removeEventListener('loadeddata', onReady);
    };
    el.addEventListener('loadeddata', onReady);

    return () => el.removeEventListener('loadeddata', onReady);
  });

  // Keep video visible during video→image transition until image loads
  let imageReady = $state(true);
  let wasVideo = false;
  $effect(() => {
    if (wasVideo && !isVideo) imageReady = false;
    wasVideo = isVideo;
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

<div bind:this={element} class="media-item" id="item-{page.id}">
  {#if mediaUrl}
    <video
      bind:this={videoEl}
      muted
      loop
      playsinline
      class="media-content"
      class:hidden={!isVideo && imageReady}
    ></video>
    <img
      src={isVideo ? undefined : mediaUrl}
      alt={altText}
      class="media-content"
      class:hidden={isVideo}
      onload={() => { imageReady = true; }}
    />
  {:else}
    <div class="placeholder">
      <span>{altText || 'No media'}</span>
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

  .media-content.hidden {
    display: none;
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
