<script lang="ts">
  import { onMount } from 'svelte';
  import { onNavigate } from '$app/navigation';
  import { registerServiceWorker } from '$lib/services/sw-bridge';

  let { children } = $props();

  onMount(() => {
    registerServiceWorker();
  });

  onNavigate((navigation) => {
    if (!('startViewTransition' in document)) return;

    const from = navigation.from?.url.pathname ?? '';
    const to = navigation.to?.url.pathname ?? '';

    let direction: 'forward' | 'backward' | null = null;
    if (from === '/' && to === '/customer') direction = 'forward';
    else if (from === '/customer' && to === '/') direction = 'backward';

    if (!direction) return;

    document.documentElement.dataset.navDirection = direction;

    return new Promise<void>((resolve) => {
      (document as Document & { startViewTransition: (cb: () => Promise<void>) => void })
        .startViewTransition(async () => {
          resolve();
          await navigation.complete;
          delete document.documentElement.dataset.navDirection;
        });
    });
  });
</script>

<div class="app-shell">
  {@render children()}
</div>

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

  /* ── Page slide transitions (View Transitions API) ── */
  :global {
    @keyframes pg-slide-out-left {
      from { transform: translateX(0); }
      to   { transform: translateX(-100%); }
    }
    @keyframes pg-slide-in-right {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }
    @keyframes pg-slide-out-right {
      from { transform: translateX(0); }
      to   { transform: translateX(100%); }
    }
    @keyframes pg-slide-in-left {
      from { transform: translateX(-100%); }
      to   { transform: translateX(0); }
    }

    /* Disable default cross-fade */
    ::view-transition-old(root),
    ::view-transition-new(root) {
      animation: none;
    }

    /* Gallery → Customer: old slides left, new enters from right */
    [data-nav-direction="forward"]::view-transition-old(root) {
      animation: 600ms cubic-bezier(0.77, 0, 0.175, 1) pg-slide-out-left both;
    }
    [data-nav-direction="forward"]::view-transition-new(root) {
      animation: 600ms cubic-bezier(0.77, 0, 0.175, 1) pg-slide-in-right both;
    }

    /* Customer → Gallery: old slides right, new enters from left */
    [data-nav-direction="backward"]::view-transition-old(root) {
      animation: 600ms cubic-bezier(0.77, 0, 0.175, 1) pg-slide-out-right both;
    }
    [data-nav-direction="backward"]::view-transition-new(root) {
      animation: 600ms cubic-bezier(0.77, 0, 0.175, 1) pg-slide-in-left both;
    }
  }
</style>
