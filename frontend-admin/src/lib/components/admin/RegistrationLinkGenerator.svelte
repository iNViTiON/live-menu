<script lang="ts">
  import type { UserRole } from '@live-menu/shared';
  import { api } from '$lib/api/client';

  let name = $state('');
  let role = $state<UserRole>('staff');
  let generatedUrl = $state<string | null>(null);
  let generatedUserId = $state<number | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  async function generateLink() {
    if (!name.trim()) {
      error = 'Name is required';
      return;
    }

    isLoading = true;
    error = null;
    generatedUrl = null;
    generatedUserId = null;

    try {
      const response = await api.post<{ url: string; userId: number }>(
        '/api/auth/registration-links',
        { preFilledName: name.trim(), role }
      );

      generatedUrl = response.url;
      generatedUserId = response.userId;
      name = '';
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to generate link';
    } finally {
      isLoading = false;
    }
  }

  function copyToClipboard() {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
    }
  }
</script>

<div class="card">
  <h3>Generate Registration Link</h3>

  {#if error}
    <div class="alert-error">{error}</div>
  {/if}

  <form onsubmit={(e) => { e.preventDefault(); generateLink(); }}>
    <div class="form-group">
      <label class="form-label" for="reg-name">User Name *</label>
      <input
        type="text"
        id="reg-name"
        class="form-input"
        bind:value={name}
        placeholder="Enter the user's full name"
        required
      />
      <small>Users cannot change their name after registration.</small>
    </div>

    <div class="form-group">
      <label class="form-label" for="reg-role">Role *</label>
      <select id="reg-role" class="form-input" bind:value={role} required>
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
      </select>
    </div>

    <button type="submit" class="btn btn-primary" disabled={isLoading}>
      {isLoading ? 'Generating...' : 'Generate Link'}
    </button>
  </form>

  {#if generatedUrl}
    <div class="alert-success">
      <p><strong>Registration link generated!</strong></p>
      <p>User ID: <strong>{generatedUserId}</strong> — Link expires in 6 hours.</p>
      <div class="copy-row">
        <input type="text" class="form-input" value={generatedUrl} readonly />
        <button class="btn btn-secondary" onclick={copyToClipboard}>Copy</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 1.25rem;
  }

  h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
  }

  .alert-error {
    background: #f8d7da;
    color: #721c24;
    padding: 0.6rem;
    border-radius: 4px;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
  }

  .alert-success {
    background: #d4edda;
    color: #155724;
    padding: 0.75rem;
    border-radius: 4px;
    margin-top: 1rem;
    font-size: 0.9rem;
  }

  .alert-success p {
    margin: 0 0 0.4rem 0;
  }

  .form-group {
    margin-bottom: 0.75rem;
  }

  .form-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .form-input {
    width: 100%;
    padding: 0.4rem 0.6rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.95rem;
    box-sizing: border-box;
  }

  small {
    display: block;
    color: #666;
    font-size: 0.8rem;
    margin-top: 0.2rem;
  }

  .copy-row {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
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
</style>
