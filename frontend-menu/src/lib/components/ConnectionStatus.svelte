<script lang="ts">
  import { fade } from 'svelte/transition';
  import { connectionStatus } from '$lib/stores/connection-status.svelte';
</script>

{#if connectionStatus.isOffline}
  <div class="connection-pill" transition:fade={{ duration: 200 }} aria-live="assertive">
    <span class="dot dot-offline"></span>
    <span>Offline</span>
  </div>
{:else if connectionStatus.showBackOnline}
  <div class="connection-pill online" transition:fade={{ duration: 200 }} aria-live="polite">
    <span class="dot dot-online"></span>
    <span>Back online</span>
  </div>
{/if}

<style>
  .connection-pill {
    position: fixed;
    bottom: 1rem;
    left: 1rem;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    border-radius: 99px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 500;
    pointer-events: none;
  }

  .dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dot-offline {
    background: #f44;
  }

  .dot-online {
    background: #4c4;
  }
</style>
