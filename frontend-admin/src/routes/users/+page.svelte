<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import UserManagement from '$lib/components/admin/UserManagement.svelte';
  import RegistrationLinkGenerator from '$lib/components/admin/RegistrationLinkGenerator.svelte';
  import RegistrationTokenList from '$lib/components/admin/RegistrationTokenList.svelte';

  // Redirect non-admins
  $effect(() => {
    if (!authStore.isLoading && !authStore.isAdmin) {
      goto(base + '/');
    }
  });
</script>

{#if authStore.isAdmin}
  <div class="page">
    <div class="page-header">
      <h1>Users</h1>
    </div>

    <section class="section">
      <UserManagement />
    </section>

    <div class="bottom-grid">
      <section class="section">
        <RegistrationLinkGenerator />
        <RegistrationTokenList />
      </section>
    </div>
  </div>
{/if}

<style>
  .page {
    padding: 1.5rem;
    max-width: 1100px;
  }

  .page-header {
    margin-bottom: 1.25rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .section {
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 1.25rem;
    margin-bottom: 1.25rem;
  }

  .bottom-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
</style>
