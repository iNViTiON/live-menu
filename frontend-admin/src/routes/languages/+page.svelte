<script lang="ts">
  import { onMount } from 'svelte';
  import { languagesStore } from '$lib/stores/languages.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';

  const languages = $derived(languagesStore.languages);
  const isLoading = $derived(languagesStore.isLoading);

  let newCode = $state('');
  let newDisplayName = $state('');
  let isAdding = $state(false);
  let addError = $state<string | null>(null);
  let deletingCode = $state<string | null>(null);
  let deleteError = $state<string | null>(null);

  // Local draft values for all ui: settings
  let localValues = $state<Record<string, string>>({});

  // Derived: group ui:key:lang settings by translation key
  const uiTranslations = $derived.by(() => {
    const grouped: Record<string, Record<string, string>> = {};
    for (const [k, v] of Object.entries(settingsStore.settings)) {
      const parts = k.split(':');
      if (parts.length === 3 && parts[0] === 'ui') {
        const tKey = parts[1];
        if (!grouped[tKey]) grouped[tKey] = {};
        grouped[tKey][parts[2]] = v;
      }
    }
    return grouped;
  });

  const translationKeys = $derived(Object.keys(uiTranslations).sort());

  // Sync localValues when settings load / change
  $effect(() => {
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(settingsStore.settings)) {
      if (k.startsWith('ui:')) next[k] = v;
    }
    localValues = next;
  });

  onMount(() => {
    languagesStore.loadLanguages();
    settingsStore.load();
  });

  async function addLanguage() {
    const code = newCode.trim().toUpperCase();
    const displayName = newDisplayName.trim();

    if (!code || code.length !== 2) {
      addError = 'Code must be exactly 2 characters';
      return;
    }
    if (!displayName) {
      addError = 'Display name is required';
      return;
    }

    isAdding = true;
    addError = null;

    try {
      await languagesStore.addLanguage(code, displayName);
      newCode = '';
      newDisplayName = '';
    } catch (err: unknown) {
      addError = err instanceof Error ? err.message : 'Failed to add language';
    } finally {
      isAdding = false;
    }
  }

  async function deleteLanguage(code: string, displayName: string) {
    if (!confirm(`Delete language "${displayName}" (${code})? This will remove all associated names and media.`)) return;

    deletingCode = code;
    deleteError = null;

    try {
      await languagesStore.deleteLanguage(code);
    } catch (err: unknown) {
      deleteError = err instanceof Error ? err.message : 'Failed to delete language';
    } finally {
      deletingCode = null;
    }
  }

  // Translations
  let savingKeys = $state(new Set<string>());

  async function handleTranslationBlur(tKey: string, langCode: string) {
    const settingKey = `ui:${tKey}:${langCode}`;
    const value = localValues[settingKey] ?? '';
    const saved = settingsStore.settings[settingKey] ?? '';
    if (value === saved) return;

    savingKeys = new Set([...savingKeys, settingKey]);
    try {
      await settingsStore.set(settingKey, value);
    } catch (err) {
      console.error('Failed to save translation:', err);
    } finally {
      const next = new Set(savingKeys);
      next.delete(settingKey);
      savingKeys = next;
    }
  }

</script>

<div class="page">
  <div class="page-header">
    <h1>Languages</h1>
  </div>

  {#if deleteError}
    <div class="error-banner">
      {deleteError}
      <button onclick={() => deleteError = null} class="close-btn">×</button>
    </div>
  {/if}

  {#if isLoading}
    <div class="loading">Loading...</div>
  {:else}
    <div class="lang-list">
      {#each languages as lang (lang.code)}
        <div class="lang-row" class:base={lang.is_base}>
          <div class="lang-info">
            <span class="lang-code">{lang.code}</span>
            <span class="lang-name">{lang.display_name}</span>
            {#if lang.is_base}
              <span class="base-badge">base</span>
            {/if}
          </div>
          <button
            class="btn-delete"
            onclick={() => deleteLanguage(lang.code, lang.display_name)}
            disabled={lang.is_base || deletingCode === lang.code}
            title={lang.is_base ? 'Base language cannot be deleted' : 'Delete language'}
          >
            {deletingCode === lang.code ? '...' : '🗑️'}
          </button>
        </div>
      {/each}

      {#if languages.length === 0}
        <p class="empty">No languages configured.</p>
      {/if}
    </div>
  {/if}

  <div class="add-section">
    <h2>Add Language</h2>

    {#if addError}
      <div class="error-banner" style="margin-bottom: 0.75rem;">
        {addError}
        <button onclick={() => addError = null} class="close-btn">×</button>
      </div>
    {/if}

    <form class="add-form" onsubmit={(e) => { e.preventDefault(); addLanguage(); }}>
      <div class="form-group">
        <label class="form-label" for="lang-code">Code (2 chars)</label>
        <input
          type="text"
          id="lang-code"
          class="form-input"
          bind:value={newCode}
          maxlength="2"
          placeholder="e.g. EN"
          required
        />
      </div>
      <div class="form-group">
        <label class="form-label" for="lang-name">Display Name</label>
        <input
          type="text"
          id="lang-name"
          class="form-input"
          bind:value={newDisplayName}
          placeholder="e.g. English"
          required
        />
      </div>
      <button type="submit" class="btn btn-primary" disabled={isAdding}>
        {isAdding ? 'Adding...' : 'Add Language'}
      </button>
    </form>
  </div>

  <!-- UI Translations -->
  <div class="translations-section">
    <h2>UI Translations</h2>
    <p class="section-desc">Translations for UI strings shown to customers. Stored as <code>ui:key:LANG</code> settings.</p>

    {#if settingsStore.isLoading}
      <div class="loading">Loading translations...</div>
    {:else if translationKeys.length > 0}
      <div class="translations-table-wrap">
        <table class="translations-table">
          <thead>
            <tr>
              <th class="col-key">Key</th>
              {#each languages as lang (lang.code)}
                <th class="col-lang">{lang.code}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each translationKeys as tKey (tKey)}
              <tr>
                <td class="cell-key">
                  <code>{tKey}</code>
                </td>
                {#each languages as lang (lang.code)}
                  {@const settingKey = `ui:${tKey}:${lang.code}`}
                  {@const isSaving = savingKeys.has(settingKey)}
                  <td class="cell-value" class:saving={isSaving}>
                    <input
                      type="text"
                      class="trans-input"
                      value={localValues[settingKey] ?? ''}
                      oninput={(e) => { localValues[settingKey] = e.currentTarget.value; }}
                      onblur={() => handleTranslationBlur(tKey, lang.code)}
                      placeholder="—"
                      aria-label={`${tKey} in ${lang.code}`}
                    />
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="empty">No UI translations found.</p>
    {/if}
  </div>
</div>

<style>
  .page {
    padding: 1.5rem;
    max-width: 900px;
  }

  .page-header {
    margin-bottom: 1.25rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
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
    padding: 0;
    line-height: 1;
  }

  .loading, .empty {
    color: #999;
    font-style: italic;
    padding: 0.5rem 0;
  }

  .lang-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 2rem;
  }

  .lang-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
  }

  .lang-row.base {
    border-color: #0066cc;
  }

  .lang-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .lang-code {
    font-family: monospace;
    font-size: 1rem;
    font-weight: 700;
    color: #333;
    background: #f0f0f0;
    padding: 0.1rem 0.45rem;
    border-radius: 3px;
  }

  .lang-name {
    font-size: 0.95rem;
  }

  .base-badge {
    font-size: 0.7rem;
    text-transform: uppercase;
    background: #e8f0fe;
    color: #1a56db;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    letter-spacing: 0.04em;
  }

  .btn-delete {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.6;
    padding: 0.2rem 0.4rem;
    transition: opacity 0.15s;
  }

  .btn-delete:hover:not(:disabled) {
    opacity: 1;
  }

  .btn-delete:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }

  .add-section {
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 1.25rem;
    max-width: 600px;
  }

  h2 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
  }

  .add-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-label {
    font-size: 0.85rem;
    font-weight: 600;
  }

  .form-input {
    padding: 0.45rem 0.6rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.95rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.95rem;
    transition: background-color 0.2s;
    align-self: flex-start;
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

  /* Translations section */
  .translations-section {
    margin-top: 2rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 1.25rem;
  }

  .section-desc {
    font-size: 0.85rem;
    color: #666;
    margin: -0.5rem 0 1rem 0;
  }

  .section-desc code {
    background: #f0f0f0;
    padding: 0.05rem 0.3rem;
    border-radius: 3px;
    font-size: 0.82rem;
  }

  .translations-table-wrap {
    overflow-x: auto;
    margin-bottom: 1.5rem;
  }

  .translations-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .translations-table thead th {
    text-align: left;
    padding: 0.4rem 0.6rem;
    background: #f5f5f5;
    border: 1px solid #ddd;
    font-size: 0.82rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .col-key {
    min-width: 160px;
  }

  .col-lang {
    min-width: 140px;
  }

  .translations-table tbody tr:hover td {
    background: #fafafa;
  }

  .cell-key {
    padding: 0.35rem 0.6rem;
    border: 1px solid #eee;
    vertical-align: middle;
  }

  .cell-key code {
    font-size: 0.82rem;
    color: #555;
    background: #f0f0f0;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
  }

  .cell-value {
    padding: 0.25rem 0.4rem;
    border: 1px solid #eee;
    vertical-align: middle;
    transition: background 0.15s;
  }

  .cell-value.saving {
    background: #fffbe6;
  }

  .trans-input {
    width: 100%;
    padding: 0.35rem 0.5rem;
    border: 1px solid transparent;
    border-radius: 4px;
    font-size: 0.9rem;
    background: transparent;
    transition: border-color 0.15s, background 0.15s;
    box-sizing: border-box;
  }

  .trans-input:hover {
    border-color: #ccc;
    background: white;
  }

  .trans-input:focus {
    outline: none;
    border-color: #0066cc;
    background: white;
  }

  @media (max-width: 768px) {
    .page {
      padding: 1rem;
    }

    h1 {
      font-size: 1.25rem;
    }

    .add-section {
      max-width: none;
    }

    .btn-delete {
      min-height: 36px;
      min-width: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .col-key {
      min-width: 100px;
    }

    .col-lang {
      min-width: 100px;
    }
  }

</style>
