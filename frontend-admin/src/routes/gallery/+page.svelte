<script lang="ts">
  import { onMount } from 'svelte';
  import type { Language, GalleryPageWithDetails } from '@live-menu/shared';
  import { galleryStore } from '$lib/stores/gallery.svelte';
  import { languagesStore } from '$lib/stores/languages.svelte';
  import GalleryPageEditor from '$lib/components/admin/GalleryPageEditor.svelte';

  const pages = $derived(galleryStore.pages);
  const languages = $derived(languagesStore.languages);
  const isLoading = $derived(galleryStore.isLoading || languagesStore.isLoading);

  let isAdding = $state(false);
  let addError = $state<string | null>(null);
  let expandedId = $state<number | null>(null);
  let togglingId = $state<number | null>(null);
  let deletingId = $state<number | null>(null);
  let listError = $state<string | null>(null);

  onMount(async () => {
    await Promise.all([galleryStore.loadPages(), languagesStore.loadLanguages()]);
  });

  async function addPage() {
    isAdding = true;
    addError = null;
    try {
      await galleryStore.createPage();
    } catch (err: unknown) {
      addError = err instanceof Error ? err.message : 'Failed to add page';
    } finally {
      isAdding = false;
    }
  }

  function getBaseName(page: GalleryPageWithDetails): string {
    const base = languages.find((l: Language) => l.is_base);
    if (!base) return page.names[0]?.name ?? `Page #${page.id}`;
    return page.names.find(n => n.language_code === base.code)?.name ?? `Page #${page.id}`;
  }

  async function toggleVisible(page: GalleryPageWithDetails) {
    togglingId = page.id;
    try {
      await galleryStore.updatePage(page.id, { is_visible: !page.is_visible });
    } catch (err: unknown) {
      listError = err instanceof Error ? err.message : 'Failed to update visibility';
    } finally {
      togglingId = null;
    }
  }

  async function deletePage(page: GalleryPageWithDetails) {
    if (!confirm(`Delete "${getBaseName(page)}"?`)) return;
    deletingId = page.id;
    try {
      await galleryStore.deletePage(page.id);
      if (expandedId === page.id) expandedId = null;
    } catch (err: unknown) {
      listError = err instanceof Error ? err.message : 'Failed to delete page';
    } finally {
      deletingId = null;
    }
  }

  async function moveUp(index: number) {
    if (index === 0) return;
    const reordered = [...pages];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    try {
      await galleryStore.reorderPages(reordered);
    } catch (err: unknown) {
      listError = err instanceof Error ? err.message : 'Failed to reorder';
    }
  }

  async function moveDown(index: number) {
    if (index === pages.length - 1) return;
    const reordered = [...pages];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    try {
      await galleryStore.reorderPages(reordered);
    } catch (err: unknown) {
      listError = err instanceof Error ? err.message : 'Failed to reorder';
    }
  }
</script>

<div class="page">
  <div class="page-header">
    <h1>Gallery</h1>
    <button class="btn-add" onclick={addPage} disabled={isAdding}>
      {isAdding ? 'Adding...' : '+ Add page'}
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
    <div class="pages-summary">
      {pages.length} page{pages.length !== 1 ? 's' : ''}
      · {pages.filter(p => p.is_visible).length} visible
    </div>


    <div class="page-list">
      {#if listError}
        <div class="error-banner">
          {listError}
          <button onclick={() => listError = null} class="close-btn">×</button>
        </div>
      {/if}

      {#each pages as page, index (page.id)}
        <div class="page-card" class:expanded={expandedId === page.id}>
          <div class="page-row">
            <div class="reorder-btns">
              <button onclick={() => moveUp(index)} disabled={index === 0} class="order-btn" title="Move up">▲</button>
              <button onclick={() => moveDown(index)} disabled={index === pages.length - 1} class="order-btn" title="Move down">▼</button>
            </div>

            <span class="page-name">{getBaseName(page)}</span>

            {#if page.schedule_start || page.schedule_end || page.availabilityRules.length > 0}
              <span class="sched-badge" title="Has schedule">🕐</span>
            {/if}

            <div class="page-actions">
              <label class="visibility-toggle" title={page.is_visible ? 'Visible — click to hide' : 'Hidden — click to show'}>
                <input
                  type="checkbox"
                  checked={!!page.is_visible}
                  onchange={() => toggleVisible(page)}
                  disabled={togglingId === page.id}
                />
                <span class="toggle-label">{page.is_visible ? 'Visible' : 'Hidden'}</span>
              </label>

              <button
                class="btn-expand"
                onclick={() => expandedId = expandedId === page.id ? null : page.id}
              >
                {expandedId === page.id ? 'Close' : 'Edit'}
              </button>

              <button
                class="btn-delete"
                onclick={() => deletePage(page)}
                disabled={deletingId === page.id}
                title="Delete page"
              >
                {deletingId === page.id ? '...' : '🗑️'}
              </button>
            </div>
          </div>

          {#if expandedId === page.id}
            <GalleryPageEditor {page} {languages} />
          {/if}
        </div>
      {/each}

      {#if pages.length === 0}
        <p class="empty">No gallery pages yet. Add one above.</p>
      {/if}
    </div>
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

  .pages-summary {
    font-size: 0.85rem;
    color: #666;
    margin-bottom: 0.75rem;
  }

  .page-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .page-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    overflow: hidden;
  }

  .page-card.expanded {
    border-color: #0066cc;
  }

  .page-row {
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

  .page-name {
    flex: 1;
    font-weight: 500;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sched-badge {
    font-size: 0.85rem;
    flex-shrink: 0;
    opacity: 0.7;
  }

  .page-actions {
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

  @media (max-width: 768px) {
    .page {
      padding: 1rem;
    }

    .page-header {
      margin-bottom: 1rem;
    }

    h1 {
      font-size: 1.25rem;
    }

    .page-row {
      flex-wrap: wrap;
    }

    .page-actions {
      width: 100%;
      justify-content: flex-end;
      padding-top: 0.25rem;
    }

    .btn-expand, .order-btn {
      min-height: 36px;
      min-width: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
