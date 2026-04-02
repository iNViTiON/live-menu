<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  let isLoading = $state(false);
  let error = $state<string | null>(null);

  async function handleLogin() {
    isLoading = true;
    error = null;

    try {
      await authStore.login();
      goto(base + '/');
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Login failed';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="page-center">
  <div class="card">
    <h1>Live Menu Admin</h1>

    {#if error}
      <div class="alert alert-error">{error}</div>
    {/if}

    <p class="info">Sign in using your passkey (biometric or security key).</p>

    <button class="btn btn-primary" onclick={handleLogin} disabled={isLoading}>
      {#if isLoading}
        <span class="spinner"></span>
      {:else}
        Sign In with Passkey
      {/if}
    </button>

    <p class="register-link">
      Have an invitation link? <a href="{base}/register/...">Register here</a>
    </p>
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
    text-align: center;
  }

  h1 {
    margin: 0 0 1.5rem 0;
    font-size: 1.5rem;
  }

  .alert-error {
    background: #f8d7da;
    color: #721c24;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    text-align: left;
    font-size: 0.9rem;
  }

  .info {
    color: #666;
    margin: 0 0 1.5rem 0;
    font-size: 0.95rem;
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
    transition: background-color 0.2s;
    width: 100%;
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

  .register-link {
    margin: 1rem 0 0 0;
    font-size: 0.85rem;
    color: #666;
  }

  .register-link a {
    color: #0066cc;
  }
</style>
