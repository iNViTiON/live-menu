<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import type { RegistrationToken } from '@live-menu/shared';

  type TokenWithUserName = RegistrationToken & { user_name: string };

  let tokens = $state<TokenWithUserName[]>([]);
  let loading = $state(true);
  let error = $state('');
  let revokingToken = $state<string | null>(null);

  async function loadTokens() {
    try {
      loading = true;
      error = '';
      tokens = await api.get<TokenWithUserName[]>('/api/auth/registration-tokens');
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to load tokens';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadTokens();
  });

  function copyLink(token: string) {
    const url = `${window.location.origin}/admin/register/${token}`;
    navigator.clipboard.writeText(url);
  }

  async function revokeToken(token: string, userName: string) {
    if (!confirm(`Revoke registration link for ${userName}?`)) return;

    try {
      revokingToken = token;
      await api.delete(`/api/auth/registration-tokens/${token}`);
      await loadTokens();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to revoke token';
    } finally {
      revokingToken = null;
    }
  }

  function formatTimeLeft(expiresAt: number): string {
    const diff = expiresAt - Math.floor(Date.now() / 1000);
    if (diff < 0) return 'Expired';
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }
</script>

<div class="token-list">
  <h3>Active Registration Links</h3>

  {#if error}
    <div class="error-banner">
      {error}
      <button onclick={() => error = ''} class="close-error">×</button>
    </div>
  {/if}

  {#if loading}
    <div class="loading">Loading...</div>
  {:else if tokens.length === 0}
    <p class="empty">No active registration links</p>
  {:else}
    <table class="tokens-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Role</th>
          <th>Expires</th>
          <th>Time Left</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each tokens as token (token.token)}
          <tr class:revoking={revokingToken === token.token}>
            <td>{token.user_name}</td>
            <td><span class="role-badge role-{token.role}">{token.role}</span></td>
            <td style="font-size: 0.85rem;">{formatDate(token.expires_at)}</td>
            <td>{formatTimeLeft(token.expires_at)}</td>
            <td>
              <div class="actions">
                <button
                  class="btn-action btn-copy"
                  onclick={() => copyLink(token.token)}
                  title="Copy link"
                >
                  📋
                </button>
                <button
                  class="btn-action btn-revoke"
                  onclick={() => revokeToken(token.token, token.user_name)}
                  disabled={revokingToken === token.token}
                  title="Revoke"
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .token-list {
    margin-top: 1.5rem;
  }

  h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
  }

  .error-banner {
    background: #f8d7da;
    color: #721c24;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .close-error {
    background: none;
    border: none;
    font-size: 1.3rem;
    cursor: pointer;
    color: inherit;
  }

  .loading,
  .empty {
    color: #999;
    font-style: italic;
    padding: 0.5rem 0;
    font-size: 0.9rem;
  }

  .tokens-table {
    width: 100%;
    border-collapse: collapse;
  }

  .tokens-table thead tr {
    border-bottom: 2px solid #ddd;
  }

  .tokens-table th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .tokens-table tbody tr {
    border-bottom: 1px solid #eee;
  }

  .tokens-table tbody tr.revoking {
    opacity: 0.5;
  }

  .tokens-table td {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }

  .role-badge {
    padding: 0.15rem 0.45rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .role-staff {
    background: #e3f2fd;
    color: #1976d2;
  }

  .role-admin {
    background: #fce4ec;
    color: #c2185b;
  }

  .actions {
    display: flex;
    gap: 0.35rem;
  }

  .btn-action {
    padding: 0.3rem 0.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: opacity 0.2s;
  }

  .btn-copy {
    background: #e8f0fe;
  }

  .btn-copy:hover {
    opacity: 0.8;
  }

  .btn-revoke {
    background: #fce4ec;
  }

  .btn-revoke:hover:not(:disabled) {
    opacity: 0.8;
  }

  .btn-revoke:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    .tokens-table {
      display: block;
    }

    .tokens-table thead {
      display: none;
    }

    .tokens-table tbody {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .tokens-table tbody tr {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem 0.75rem;
      align-items: center;
      padding: 0.6rem;
      border: 1px solid #eee;
      border-radius: 6px;
    }

    .tokens-table td {
      padding: 0;
    }

    /* Name */
    .tokens-table td:nth-child(1) {
      font-weight: 500;
      flex: 1;
    }

    /* Role */
    .tokens-table td:nth-child(2) {
      order: 2;
    }

    /* Expires */
    .tokens-table td:nth-child(3) {
      width: 100%;
      order: 5;
      font-size: 0.78rem !important;
      color: #888;
    }

    /* Time Left */
    .tokens-table td:nth-child(4) {
      order: 3;
      font-size: 0.82rem;
    }

    /* Actions */
    .tokens-table td:nth-child(5) {
      order: 4;
    }

    .btn-action {
      min-height: 36px;
      min-width: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
