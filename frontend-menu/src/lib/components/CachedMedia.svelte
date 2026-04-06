<script lang="ts">
  import { createCachedMediaUrl } from '$lib/services/cached-media.svelte';

  interface Props {
    src: string | null;
    type?: 'image' | 'video';
    alt?: string;
    class?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    playsinline?: boolean;
  }

  let {
    src,
    type = 'image',
    alt = '',
    class: cls = '',
    autoplay,
    loop,
    muted,
    playsinline
  }: Props = $props();

  const cached = createCachedMediaUrl(() => src);
</script>

{#if cached.url}
  {#if type === 'video'}
    <video src={cached.url} class={cls} {autoplay} {loop} {muted} {playsinline}></video>
  {:else}
    <img src={cached.url} {alt} class={cls} />
  {/if}
{/if}
