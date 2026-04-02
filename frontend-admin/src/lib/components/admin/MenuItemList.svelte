<script lang="ts">
  import type { MenuItemWithDetails, Language } from '@live-menu/shared';
  import { menuStore } from '$lib/stores/menu.svelte';
  import MenuItemEditor from './MenuItemEditor.svelte';

  interface Props {
    languages: Language[];
  }

  let { languages }: Props = $props();

  const items = $derived(menuStore.items);

  let expandedId = $state<number | null>(null);
  let togglingId = $state<number | null>(null);
  let deletingId = $state<number | null>(null);
  let error = $state<string | null>(null);

  function getBaseName(item: MenuItemWithDetails): string {
    const base = languages.find(l => l.is_base);
    if (!base) return item.names[0]?.name ?? `Item #${item.id}`;
    return item.names.find(n => n.language_code === base.code)?.name ?? `Item #${item.id}`;
  }

  async function toggleVisible(item: MenuItemWithDetails) {
    togglingId = item.id;
    try {
      await menuStore.updateItem(item.id, { is_visible: !item.is_visible });
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to update visibility';
    } finally {
      togglingId = null;
    }
  }

  async function deleteItem(item: MenuItemWithDetails) {
    if (!confirm(`Delete "${getBaseName(item)}"?`)) return;
    deletingId = item.id;
    try {
      await menuStore.deleteItem(item.id);
      if (expandedId === item.id) expandedId = null;
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to delete item';
    } finally {
      deletingId = null;
    }
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    const reordered = [...items];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    try {
      await menuStore.reorderItems(reordered);
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to reorder';
    }
  }

  async function moveDown(index: number) {
    if (index === items.length - 1) return;
    const reordered = [...items];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    try {
      await menuStore.reorderItems(reordered);
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to reorder';
    }
  }
</script>

<div class="item-list">
  {#if error}
    <div class="error-banner">
      {error}
      <button onclick={() => error = null} class="close-btn">×</button>
    </div>
  {/if}

  {#each items as item, index (item.id)}
    <div class="item-card" class:expanded={expandedId === item.id}>
      <div class="item-row">
        <div class="reorder-btns">
          <button onclick={() => moveUp(index)} disabled={index === 0} class="order-btn" title="Move up">▲</button>
          <button onclick={() => moveDown(index)} disabled={index === items.length - 1} class="order-btn" title="Move down">▼</button>
        </div>

        <span class="item-name">{getBaseName(item)}</span>

        <div class="item-actions">
          <label class="visibility-toggle" title={item.is_visible ? 'Visible — click to hide' : 'Hidden — click to show'}>
            <input
              type="checkbox"
              checked={item.is_visible}
              onchange={() => toggleVisible(item)}
              disabled={togglingId === item.id}
            />
            <span class="toggle-label">{item.is_visible ? 'Visible' : 'Hidden'}</span>
          </label>

          <button
            class="btn-expand"
            onclick={() => expandedId = expandedId === item.id ? null : item.id}
          >
            {expandedId === item.id ? 'Close' : 'Edit'}
          </button>

          <button
            class="btn-delete"
            onclick={() => deleteItem(item)}
            disabled={deletingId === item.id}
            title="Delete item"
          >
            {deletingId === item.id ? '...' : '🗑️'}
          </button>
        </div>
      </div>

      {#if expandedId === item.id}
        <MenuItemEditor {item} {languages} />
      {/if}
    </div>
  {/each}

  {#if items.length === 0}
    <p class="empty">No menu items yet. Add one above.</p>
  {/if}
</div>

<style>
  .item-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .error-banner {
    background: #f8d7da;
    color: #721c24;
    padding: 0.75rem 1rem;
    border-radius: 4px;
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

  .item-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    overflow: hidden;
  }

  .item-card.expanded {
    border-color: #0066cc;
  }

  .item-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .reorder-btns {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .order-btn {
    padding: 0.1rem 0.4rem;
    background: none;
    border: 1px solid #ddd;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.7rem;
    line-height: 1;
    transition: background-color 0.15s;
  }

  .order-btn:hover:not(:disabled) {
    background: #eee;
  }

  .order-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .item-name {
    flex: 1;
    font-weight: 500;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .visibility-toggle {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .visibility-toggle input {
    cursor: pointer;
  }

  .toggle-label {
    color: #666;
  }

  .btn-expand {
    padding: 0.3rem 0.6rem;
    background: #0066cc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background-color 0.15s;
  }

  .btn-expand:hover {
    background: #0052a3;
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

  .empty {
    text-align: center;
    color: #999;
    font-style: italic;
    padding: 2rem;
  }
</style>
