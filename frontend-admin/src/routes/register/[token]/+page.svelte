<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { authStore } from '$lib/stores/auth.svelte';
  import { api } from '$lib/api/client';

  const token = $derived($page.params.token);

  let isValidating = $state(true);
  let isValid = $state(false);
  let preFilledName = $state<string | null>(null);
  let validationError = $state<string | null>(null);

  let deviceName = $state('');
  let isRegistering = $state(false);
  let registerError = $state<string | null>(null);

  onMount(async () => {
    try {
      const response = await api.get<{ valid: boolean; pre_filled_name: string | null }>(
        `/api/auth/registration/${token}`
      );
      isValid = response.valid;
      preFilledName = response.pre_filled_name;
    } catch (err: unknown) {
      validationError = err instanceof Error ? err.message : 'Invalid or expired registration link';
    } finally {
      isValidating = false;
    }
  });

  async function handleRegister() {
    if (!preFilledName?.trim()) return;

    isRegistering = true;
    registerError = null;

    try {
      await authStore.register(token, preFilledName, deviceName || undefined);
      goto(base + '/');
    } catch (err: unknown) {
      registerError = err instanceof Error ? err.message : 'Registration failed';
    } finally {
      isRegistering = false;
    }
  }
</script>

<div class="page-center">
  <div class="card">
    <h1>Live Menu Admin</h1>

    {#if isValidating}
      <p class="info">Validating registration link...</p>
    {:else if validationError}
      <div class="alert alert-error">{validationError}</div>
      <a href="{base}/login" class="btn btn-secondary">Go to Login</a>
    {:else if isValid && preFilledName}
      <h2>Register with Passkey</h2>

      {#if registerError}
        <div class="alert alert-error">{registerError}</div>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); handleRegister(); }}>
        <div class="form-group">
          <label class="form-label" for="name">Name</label>
          <input type="text" id="name" class="form-input" value={preFilledName} disabled readonly />
          <small>Your name is set by the administrator.</small>
        </div>

        <div class="form-group">
          <label class="form-label" for="deviceName">Device Name (optional)</label>
          <input
            type="text"
            id="deviceName"
            class="form-input"
            bind:value={deviceName}
            placeholder="e.g., My iPhone"
          />
        </div>

        <button type="submit" class="btn btn-primary" disabled={isRegistering}>
          {#if isRegistering}
            <span class="spinner"></span>
          {:else}
            Register Passkey
          {/if}
        </button>
      </form>
    {:else}
      <div class="alert alert-error">Invalid registration link.</div>
      <a href="{base}/login" class="btn btn-secondary">Go to Login</a>
    {/if}
  </div>
</div>

<style>
  .page-center {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 1rem;
    background: #f5f5f5;
  }

  .card {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  h1 {
    margin: 0 0 1.5rem 0;
    font-size: 1.5rem;
    text-align: center;
  }

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1.2rem;
  }

  .alert-error {
    background: #f8d7da;
    color: #721c24;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .info {
    color: #666;
    text-align: center;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
  }

  .form-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    box-sizing: border-box;
  }

  .form-input:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  small {
    display: block;
    color: #666;
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    width: 100%;
    transition: background-color 0.2s;
    text-decoration: none;
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
  }

  .btn-secondary:hover {
    background: #5a6268;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
