<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import type { PasskeyCredential } from '@live-menu/shared';

  interface Props {
    userId: number;
    userName: string;
    userRole: string;
    onClose: () => void;
  }

  let { userId, userName, userRole, onClose }: Props = $props();

  let passkeys = $state<PasskeyCredential[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let deletingCredentialId = $state<string | null>(null);
  let deleteConfirmCredentialId = $state<string | null>(null);

  let generatedUrl = $state<string | null>(null);
  let isGenerating = $state(false);
  let generateError = $state<string | null>(null);

  async function loadPasskeys() {
    try {
      loading = true;
      error = null;
      passkeys = await api.get<PasskeyCredential[]>(`/api/users/${userId}/passkeys`);
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to load passkeys';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    loadPasskeys();
  });

  async function handleDelete(credentialId: string) {
    if (passkeys.length === 1) {
      alert('Cannot delete the last passkey. User needs at least one to log in.');
      return;
    }

    try {
      deletingCredentialId = credentialId;
      error = null;
      await api.delete(`/api/users/${userId}/passkeys/${credentialId}`);
      deleteConfirmCredentialId = null;
      await loadPasskeys();
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to delete passkey';
    } finally {
      deletingCredentialId = null;
    }
  }

  async function generateRegistrationLink() {
    isGenerating = true;
    generateError = null;
    generatedUrl = null;

    try {
      const response = await api.post<{ url: string }>(
        '/api/auth/registration-links',
        { preFilledName: userName, role: userRole }
      );
      generatedUrl = response.url;
    } catch (err: unknown) {
      generateError = err instanceof Error ? err.message : 'Failed to generate link';
    } finally {
      isGenerating = false;
    }
  }

  function copyToClipboard() {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }
</script>

<div class="passkey-management">
  <div class="header">
    <h3>Manage Passkeys — {userName}</h3>
    <button class="close-button" onclick={onClose}>&times;</button>
  </div>

  {#if error}
    <div class="alert alert-error">
      {error}
      <button onclick={() => error = null} class="close-error">×</button>
    </div>
  {/if}

  <div class="section">
    <h4>Registered Passkeys</h4>

    {#if loading}
      <div class="loading">Loading passkeys...</div>
    {:else if passkeys.length === 0}
      <p class="empty-state">No passkeys registered</p>
    {:else}
      <table class="passkeys-table">
        <thead>
          <tr>
            <th>Device Name</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each passkeys as passkey (passkey.credential_id)}
            <tr class:deleting={deletingCredentialId === passkey.credential_id}>
              <td>{passkey.device_name || 'Unknown Device'}</td>
              <td>{formatDate(passkey.created_at)}</td>
              <td>
                {#if deleteConfirmCredentialId === passkey.credential_id}
                  <div class="delete-confirm">
                    <span>Delete?</span>
                    <button
                      class="btn-delete-confirm"
                      onclick={() => handleDelete(passkey.credential_id)}
                      disabled={deletingCredentialId !== null}
                    >Yes</button>
                    <button
                      class="btn-delete-cancel"
                      onclick={() => deleteConfirmCredentialId = null}
                      disabled={deletingCredentialId !== null}
                    >No</button>
                  </div>
                {:else}
                  <button
                    class="btn-delete"
                    onclick={() => deleteConfirmCredentialId = passkey.credential_id}
                    disabled={passkeys.length === 1 || deletingCredentialId !== null}
                    title={passkeys.length === 1 ? 'Cannot delete the last passkey' : 'Delete passkey'}
                  >
                    {deletingCredentialId === passkey.credential_id ? '...' : '🗑️'}
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      {#if passkeys.length === 1}
        <p class="warning-text">⚠️ This is the last passkey. Cannot be deleted.</p>
      {/if}
    {/if}
  </div>

  <div class="section">
    <h4>Add New Passkey</h4>
    <p class="info-text">
      Generate a registration link for {userName} to register an additional device.
    </p>

    {#if generateError}
      <div class="alert alert-error" style="margin-bottom: 0.75rem;">
        {generateError}
        <button onclick={() => generateError = null} class="close-error">×</button>
      </div>
    {/if}

    <button class="btn btn-primary" onclick={generateRegistrationLink} disabled={isGenerating}>
      {isGenerating ? 'Generating...' : 'Generate Registration Link'}
    </button>

    {#if generatedUrl}
      <div class="alert alert-success" style="margin-top: 0.75rem;">
        <p><strong>Link generated!</strong> Expires in 6 hours.</p>
        <div class="copy-row">
          <input type="text" class="form-input" value={generatedUrl} readonly />
          <button class="btn btn-secondary" onclick={copyToClipboard}>Copy</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .passkey-management {
    max-width: 700px;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }

  .header h3 {
    margin: 0;
    font-size: 1.1rem;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.8rem;
    cursor: pointer;
    color: #666;
    line-height: 1;
    padding: 0;
  }

  .close-button:hover {
    color: #333;
  }

  .alert {
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 0.75rem;
    position: relative;
    font-size: 0.9rem;
  }

  .alert-error {
    background: #f8d7da;
    color: #721c24;
  }

  .alert-success {
    background: #d4edda;
    color: #155724;
  }

  .alert-success p {
    margin: 0 0 0.5rem 0;
  }

  .close-error {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    color: inherit;
  }

  .section {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #eee;
  }

  .section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .section h4 {
    margin: 0 0 0.75rem 0;
    font-size: 0.95rem;
  }

  .loading, .empty-state {
    color: #999;
    font-style: italic;
    font-size: 0.9rem;
  }

  .passkeys-table {
    width: 100%;
    border-collapse: collapse;
  }

  .passkeys-table thead tr {
    border-bottom: 2px solid #ddd;
  }

  .passkeys-table th {
    text-align: left;
    padding: 0.5rem 0.75rem;
    font-weight: 600;
    font-size: 0.85rem;
    color: #555;
  }

  .passkeys-table tbody tr {
    border-bottom: 1px solid #eee;
  }

  .passkeys-table tbody tr.deleting {
    opacity: 0.4;
  }

  .passkeys-table td {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }

  .btn-delete {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.2rem 0.4rem;
    opacity: 0.6;
    transition: opacity 0.15s;
  }

  .btn-delete:hover:not(:disabled) {
    opacity: 1;
  }

  .btn-delete:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .delete-confirm {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.85rem;
    color: #dc3545;
  }

  .btn-delete-confirm,
  .btn-delete-cancel {
    padding: 0.2rem 0.6rem;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .btn-delete-confirm {
    background: #dc3545;
    color: white;
  }

  .btn-delete-confirm:hover:not(:disabled) {
    background: #c82333;
  }

  .btn-delete-cancel {
    background: #6c757d;
    color: white;
  }

  .btn-delete-cancel:hover:not(:disabled) {
    background: #5a6268;
  }

  .btn-delete-confirm:disabled,
  .btn-delete-cancel:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .warning-text {
    color: #856404;
    background: #fff3cd;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    margin-top: 0.75rem;
    font-size: 0.85rem;
  }

  .info-text {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }

  .copy-row {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .form-input {
    flex: 1;
    padding: 0.4rem 0.6rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
    min-width: 0;
  }

  .btn {
    padding: 0.4rem 0.75rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background-color 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #0066cc;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #0052a3;
  }

  .btn-secondary {
    background: #6c757d;
    color: white;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .btn-secondary:hover {
    background: #5a6268;
  }

  @media (max-width: 768px) {
    .passkey-management {
      max-width: none;
    }

    .header h3 {
      font-size: 0.95rem;
    }

    .passkeys-table {
      display: block;
    }

    .passkeys-table thead {
      display: none;
    }

    .passkeys-table tbody {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .passkeys-table tbody tr {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem 0.75rem;
      align-items: center;
      padding: 0.6rem;
      border: 1px solid #eee;
      border-radius: 6px;
    }

    .passkeys-table td {
      padding: 0;
    }

    .passkeys-table td:nth-child(1) {
      flex: 1;
      font-weight: 500;
    }

    .passkeys-table td:nth-child(2) {
      font-size: 0.78rem;
      color: #888;
      width: 100%;
      order: 3;
    }

    .copy-row {
      flex-direction: column;
    }

    .copy-row .form-input {
      font-size: 0.82rem;
    }
  }
</style>
