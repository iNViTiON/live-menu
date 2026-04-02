<script lang="ts">
  import { onMount } from 'svelte';
  import { registerServiceWorker } from '$lib/services/sw-bridge';

  let { children } = $props();

  onMount(() => {
    registerServiceWorker();
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
</style>
