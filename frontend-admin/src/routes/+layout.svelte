<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { authStore } from '$lib/stores/auth.svelte';
  import { versionSync } from '$lib/services/version-sync.svelte';
  import { menuStore } from '$lib/stores/menu.svelte';
  import { languagesStore } from '$lib/stores/languages.svelte';
  import { usersStore } from '$lib/stores/users.svelte';
  import { traitStore } from '$lib/stores/traits.svelte';
  import { traitGroupStore } from '$lib/stores/trait-groups.svelte';
  import { optionGroupStore } from '$lib/stores/option-groups.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';

  interface Props {
    children: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  const isLoading = $derived(authStore.isLoading);
  const isAuthenticated = $derived(authStore.isAuthenticated);
  const isAdmin = $derived(authStore.isAdmin);
  const currentPath = $derived($page.url.pathname);

  const isAuthRoute = $derived(
    currentPath.startsWith('/admin/login') ||
    currentPath.startsWith('/admin/register') ||
    currentPath === base + '/login' ||
    currentPath.startsWith(base + '/register')
  );

  $effect(() => {
    if (!isLoading && !isAuthenticated && !isAuthRoute) {
      goto(base + '/login');
    }
  });

  // Realtime sync
  $effect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = versionSync.onChange((staleResources) => {
      if (staleResources.includes('menuItem') || staleResources.includes('media')) {
        // Skip if a local mutation is in flight — it will load fresh data itself
        if (!menuStore.mutating) {
          menuStore.loadItems();
        }
      }
      if (staleResources.includes('language')) {
        languagesStore.loadLanguages();
      }
      if (staleResources.includes('user')) {
        usersStore.loadUsers();
      }
      if (staleResources.includes('trait')) {
        traitStore.load();
      }
      if (staleResources.includes('traitGroup')) {
        traitGroupStore.load();
      }
      if (staleResources.includes('option') || staleResources.includes('optionGroup')) {
        optionGroupStore.load();
      }
      if (staleResources.includes('setting')) {
        settingsStore.load();
      }
    });

    return () => unsubscribe();
  });

  async function handleLogout() {
    await authStore.logout();
    goto(base + '/login');
  }
</script>

{#if isLoading}
  <div class="loading-screen">Loading...</div>
{:else if isAuthRoute}
  {@render children()}
{:else if isAuthenticated}
  <div class="app-shell">
    <nav class="sidebar">
      <div class="sidebar-header">
        <span class="logo">Live Menu</span>
        <span class="role-badge">{authStore.user?.role}</span>
      </div>

      <ul class="nav-links">
        <li>
          <a href="{base}/" class:active={currentPath === base + '/' || currentPath === base}>
            Menu
          </a>
        </li>
        <li>
          <a href="{base}/languages" class:active={currentPath === base + '/languages'}>
            Languages
          </a>
        </li>
        <li>
          <a href="{base}/customer-menu" class:active={currentPath === base + '/customer-menu'}>
            Customer Menu
          </a>
        </li>
        {#if isAdmin}
          <li>
            <a href="{base}/users" class:active={currentPath === base + '/users'}>
              Users
            </a>
          </li>
        {/if}
      </ul>

      <div class="sidebar-footer">
        <span class="user-name">{authStore.user?.name}</span>
        <button class="logout-btn" onclick={handleLogout}>Sign out</button>
      </div>
    </nav>

    <main class="main-content">
      {@render children()}
    </main>
  </div>
{/if}

<style>
  .loading-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: #666;
  }

  .app-shell {
    display: flex;
    min-height: 100vh;
  }

  .sidebar {
    width: 220px;
    background: #1a1a2e;
    color: white;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .sidebar-header {
    padding: 1.5rem 1rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .logo {
    font-size: 1.1rem;
    font-weight: 700;
  }

  .role-badge {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: rgba(255, 255, 255, 0.15);
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    align-self: flex-start;
  }

  .nav-links {
    list-style: none;
    margin: 0;
    padding: 1rem 0;
    flex: 1;
  }

  .nav-links li {
    margin: 0;
  }

  .nav-links a {
    display: block;
    padding: 0.75rem 1rem;
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    transition: background-color 0.15s, color 0.15s;
  }

  .nav-links a:hover,
  .nav-links a.active {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .nav-links a.active {
    border-left: 3px solid #4a9eff;
    padding-left: calc(1rem - 3px);
  }

  .sidebar-footer {
    padding: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .user-name {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.8);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .logout-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.8);
    padding: 0.4rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background-color 0.15s;
  }

  .logout-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .main-content {
    flex: 1;
    overflow: auto;
    background: #f8f9fa;
  }

  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #333;
  }
</style>
