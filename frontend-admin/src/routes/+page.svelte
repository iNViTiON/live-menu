<script lang="ts">
  import { onMount } from 'svelte';
  import { menuStore } from '$lib/stores/menu.svelte';
  import { languagesStore } from '$lib/stores/languages.svelte';
  import MenuItemList from '$lib/components/admin/MenuItemList.svelte';

  const items = $derived(menuStore.items);
  const languages = $derived(languagesStore.languages);
  const isLoading = $derived(menuStore.isLoading || languagesStore.isLoading);

  let isAdding = $state(false);
  let addError = $state<string | null>(null);

  onMount(async () => {
    await Promise.all([menuStore.loadItems(), languagesStore.loadLanguages()]);
  });

  async function addItem() {
    isAdding = true;
    addError = null;
    try {
      await menuStore.createItem();
    } catch (err: unknown) {
      addError = err instanceof Error ? err.message : 'Failed to add item';
    } finally {
      isAdding = false;
    }
  }
</script>

<div class="page">
  <div class="page-header">
    <h1>Menu</h1>
    <button class="btn-add" onclick={addItem} disabled={isAdding}>
      {isAdding ? 'Adding...' : '+ Add item'}
    </button>
  </div>

  {#if addError}
    <div class="error-banner">
      {addError}
      <button onclick={() => addError = null} class="close-btn">×</button>
    </div>
  {/if}

  {#if isLoading}
    <div class="loading">Loading...</div>
  {:else}
    <div class="items-summary">
      {items.length} item{items.length !== 1 ? 's' : ''}
      {items.filter(i => i.is_visible).length} visible
    </div>
    <MenuItemList {languages} />
  {/if}
</div>

<style>
  .page {
    padding: 1.5rem;
    max-width: 900px;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .btn-add {
    padding: 0.5rem 1rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
    transition: background-color 0.2s;
  }

  .btn-add:hover:not(:disabled) {
    background: #0052a3;
  }

  .btn-add:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-banner {
    background: #f8d7da;
    color: #721c24;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.3rem;
    cursor: pointer;
    color: inherit;
    line-height: 1;
    padding: 0;
  }

  .loading {
    text-align: center;
    color: #666;
    padding: 2rem;
  }

  .items-summary {
    font-size: 0.85rem;
    color: #666;
    margin-bottom: 0.75rem;
  }
</style>
