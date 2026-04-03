<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';

  let count = $state<number | null>(null);
  let loading = $state(false);
  let cleaning = $state(false);
  let error = $state('');
  let lastDeleted = $state<number | null>(null);

  async function loadCount() {
    loading = true;
    error = '';
    try {
      const result = await api.get<{ count: number }>('/api/auth/sessions/expired/count');
      count = result.count;
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to load count';
    } finally {
      loading = false;
    }
  }

  async function cleanUp() {
    cleaning = true;
    error = '';
    lastDeleted = null;
    try {
      const result = await api.delete<{ deleted: number }>('/api/auth/sessions/expired');
      lastDeleted = result.deleted;
      await loadCount();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to clean up sessions';
    } finally {
      cleaning = false;
    }
  }

  onMount(() => {
    loadCount();
  });
</script>

<div class="cleanup-section">
  <div class="cleanup-header">
    <h3>Expired Sessions</h3>
    <button onclick={loadCount} class="btn-refresh" disabled={loading} title="Refresh count">
      {loading ? '...' : '↻'}
    </button>
  </div>

  {#if error}
    <div class="error-banner">
      {error}
      <button onclick={() => error = ''} class="close-error">×</button>
    </div>
  {/if}

  <div class="cleanup-body">
    <p class="count-label">
      {#if loading && count === null}
        Loading...
      {:else if count === null}
        —
      {:else}
        <strong>{count}</strong> expired {count === 1 ? 'session' : 'sessions'} in database
      {/if}
    </p>

    {#if lastDeleted !== null}
      <p class="success-msg">Deleted {lastDeleted} expired {lastDeleted === 1 ? 'session' : 'sessions'}.</p>
    {/if}

    <button
      onclick={cleanUp}
      class="btn-cleanup"
      disabled={cleaning || count === 0}
    >
      {cleaning ? 'Cleaning...' : 'Clean Up'}
    </button>
  </div>
</div>

<style>
  .cleanup-section {
    border-top: 1px solid #eee;
    padding-top: 1rem;
    margin-top: 1rem;
  }

  .cleanup-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .cleanup-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .btn-refresh {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    color: #0066cc;
    padding: 0.1rem 0.3rem;
    opacity: 0.7;
    transition: opacity 0.15s;
  }

  .btn-refresh:hover:not(:disabled) {
    opacity: 1;
  }

  .btn-refresh:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .error-banner {
    background: #f8d7da;
    color: #721c24;
    padding: 0.6rem 0.75rem;
    border-radius: 4px;
    margin-bottom: 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.9rem;
  }

  .close-error {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: inherit;
    padding: 0;
    line-height: 1;
  }

  .cleanup-body {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .count-label {
    margin: 0;
    font-size: 0.9rem;
    color: #444;
  }

  .success-msg {
    margin: 0;
    font-size: 0.85rem;
    color: #155724;
  }

  .btn-cleanup {
    padding: 0.35rem 0.8rem;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.15s;
  }

  .btn-cleanup:hover:not(:disabled) {
    background: #c82333;
  }

  .btn-cleanup:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
