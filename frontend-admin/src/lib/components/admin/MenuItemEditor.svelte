<script lang="ts">
  import type { MenuItemWithDetails, Language } from '@live-menu/shared';
  import { menuStore } from '$lib/stores/menu.svelte';
  import MediaUploader from './MediaUploader.svelte';

  interface Props {
    item: MenuItemWithDetails;
    languages: Language[];
  }

  let { item, languages }: Props = $props();

  let activeTab = $state<string>('');

  $effect(() => {
    if (!activeTab && languages.length > 0) {
      activeTab = languages[0].code;
    }
  });
  let nameInputs = $state<Record<string, string>>({});
  let savingLang = $state<string | null>(null);
  let saveError = $state<string | null>(null);

  // "Last known server value" per language — used to detect whether the
  // user has an unsaved local edit.  Stored separately from nameInputs so
  // incoming realtime updates can be applied to unmodified fields without
  // touching fields the user is actively editing.
  let serverNames = $state<Record<string, string>>({});

  // Track the item ID we last initialised inputs for, so we only reset
  // form state when a genuinely different item is opened — not on every
  // loadItems() call that replaces the array with fresh object references.
  let initialisedForId = $state<number | null>(null);

  $effect(() => {
    if (initialisedForId !== item.id) {
      // Editor just opened for a new item — hard reset all inputs.
      initialisedForId = item.id;
      const inputs: Record<string, string> = {};
      const server: Record<string, string> = {};
      for (const lang of languages) {
        const value = item.names.find(n => n.language_code === lang.code)?.name ?? '';
        inputs[lang.code] = value;
        server[lang.code] = value;
      }
      nameInputs = inputs;
      serverNames = server;
      return;
    }

    // Same item, but item prop was replaced (loadItems after a save or
    // realtime update).  Only update inputs for languages where the user
    // has NOT made a local edit (i.e. their current value still matches
    // the previous server value).
    for (const lang of languages) {
      const newServerValue = item.names.find(n => n.language_code === lang.code)?.name ?? '';
      const prev = serverNames[lang.code] ?? '';
      if (newServerValue !== prev) {
        // Server data changed for this language.
        const userEdited = nameInputs[lang.code] !== prev;
        if (!userEdited) {
          // Safe to apply — user hasn't touched this field.
          nameInputs[lang.code] = newServerValue;
        }
        serverNames[lang.code] = newServerValue;
      }
    }
  });

  async function saveName(lang: string) {
    const name = nameInputs[lang]?.trim() ?? '';
    savingLang = lang;
    saveError = null;

    try {
      if (name) {
        await menuStore.setName(item.id, lang, name);
      } else {
        await menuStore.deleteName(item.id, lang);
      }
      // Record the saved value as the new server baseline so that the
      // subsequent loadItems() re-render doesn't treat this field as
      // having an unsaved local edit.
      serverNames[lang] = name;
    } catch (err: unknown) {
      saveError = err instanceof Error ? err.message : 'Failed to save name';
    } finally {
      savingLang = null;
    }
  }

  function getMediaForLang(lang: string) {
    return item.media.find(m => m.language_code === lang);
  }
</script>

<div class="editor">
  {#if saveError}
    <div class="save-error">{saveError}</div>
  {/if}

  <div class="tabs">
    {#each languages as lang (lang.code)}
      <button
        class="tab"
        class:active={activeTab === lang.code}
        onclick={() => activeTab = lang.code}
      >
        {lang.display_name}
        {#if lang.is_base}<span class="base-tag">base</span>{/if}
      </button>
    {/each}
  </div>

  {#each languages as lang (lang.code)}
    {#if activeTab === lang.code}
      <div class="tab-panel">
        <div class="field-group">
          <label class="field-label" for="name-{lang.code}">Name ({lang.display_name})</label>
          <div class="name-row">
            <input
              type="text"
              id="name-{lang.code}"
              class="field-input"
              bind:value={nameInputs[lang.code]}
              placeholder="Enter item name..."
              onkeydown={(e) => { if (e.key === 'Enter') saveName(lang.code); }}
            />
            <button
              class="btn-save"
              onclick={() => saveName(lang.code)}
              disabled={savingLang === lang.code}
            >
              {savingLang === lang.code ? '...' : 'Save'}
            </button>
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">Media ({lang.display_name})</label>
          <MediaUploader
            itemId={item.id}
            lang={lang.code}
            currentMedia={getMediaForLang(lang.code)}
          />
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .editor {
    padding: 1rem;
    background: #f9f9f9;
    border-top: 1px solid #eee;
  }

  .save-error {
    background: #f8d7da;
    color: #721c24;
    padding: 0.5rem;
    border-radius: 4px;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #ddd;
  }

  .tab {
    padding: 0.5rem 0.75rem;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: #666;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    transition: color 0.15s;
  }

  .tab:hover {
    color: #333;
  }

  .tab.active {
    color: #0066cc;
    border-bottom-color: #0066cc;
  }

  .base-tag {
    font-size: 0.65rem;
    text-transform: uppercase;
    background: #e8f0fe;
    color: #1a56db;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    letter-spacing: 0.04em;
  }

  .tab-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #444;
  }

  .name-row {
    display: flex;
    gap: 0.5rem;
  }

  .field-input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.95rem;
  }

  .btn-save {
    padding: 0.5rem 0.75rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    white-space: nowrap;
    transition: background-color 0.2s;
  }

  .btn-save:hover:not(:disabled) {
    background: #218838;
  }

  .btn-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
