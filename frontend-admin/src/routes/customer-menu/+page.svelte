<script lang="ts">
  import { onMount } from 'svelte';
  import type { TraitWithDetails, TraitGroupWithDetails, OptionGroupWithDetails, OptionWithDetails, MenuItemWithDetails } from '@live-menu/shared';
  import { languagesStore } from '$lib/stores/languages.svelte';
  import { traitStore } from '$lib/stores/traits.svelte';
  import { traitGroupStore } from '$lib/stores/trait-groups.svelte';
  import { optionGroupStore } from '$lib/stores/option-groups.svelte';
  import { settingsStore } from '$lib/stores/settings.svelte';
  import { menuStore } from '$lib/stores/menu.svelte';

  type Tab = 'settings' | 'traits' | 'traitGroups' | 'optionGroups' | 'assignments';

  let activeTab = $state<Tab>('settings');
  let editingLang = $state('GB');

  const languages = $derived(languagesStore.languages);
  const traits = $derived(traitStore.items);
  const traitGroups = $derived(traitGroupStore.items);
  const optionGroups = $derived(optionGroupStore.items);
  const menuItems = $derived(menuStore.items);

  // Toast
  let toastMsg = $state<string | null>(null);
  let toastIsError = $state(false);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function showToast(msg: string, error = false) {
    toastMsg = msg;
    toastIsError = error;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastMsg = null; }, 3000);
  }

  // ---- Settings ----
  let currencyInput = $state('');
  let savingCurrency = $state(false);

  async function saveCurrency() {
    savingCurrency = true;
    try {
      await settingsStore.set('currency', currencyInput.trim());
      showToast('Currency saved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save', true);
    } finally {
      savingCurrency = false;
    }
  }

  // ---- Traits ----
  let addingTrait = $state(false);
  let expandedTrait = $state<number | null>(null);
  let traitEditName = $state('');
  let traitEditDesc = $state('');
  let savingTraitName = $state(false);

  function openTrait(trait: TraitWithDetails) {
    expandedTrait = trait.id;
    const n = trait.names.find(x => x.language_code === editingLang);
    traitEditName = n?.name ?? '';
    traitEditDesc = n?.description ?? '';
  }

  $effect(() => {
    if (expandedTrait === null) return;
    const trait = traits.find(t => t.id === expandedTrait);
    if (!trait) return;
    const n = trait.names.find(x => x.language_code === editingLang);
    traitEditName = n?.name ?? '';
    traitEditDesc = n?.description ?? '';
  });

  async function addTrait() {
    addingTrait = true;
    try {
      await traitStore.create();
      showToast('Trait added');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    } finally {
      addingTrait = false;
    }
  }

  async function deleteTrait(id: number) {
    if (!confirm('Delete this trait?')) return;
    try {
      await traitStore.remove(id);
      if (expandedTrait === id) expandedTrait = null;
      showToast('Trait deleted');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  async function saveTraitName() {
    if (expandedTrait === null) return;
    savingTraitName = true;
    try {
      await traitStore.setName(expandedTrait, editingLang, traitEditName, traitEditDesc);
      showToast('Saved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    } finally {
      savingTraitName = false;
    }
  }

  async function deleteTraitName() {
    if (expandedTrait === null) return;
    try {
      await traitStore.deleteName(expandedTrait, editingLang);
      traitEditName = '';
      traitEditDesc = '';
      showToast('Name deleted');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  async function moveTrait(index: number, dir: -1 | 1) {
    const arr = [...traits];
    const ni = index + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[index], arr[ni]] = [arr[ni], arr[index]];
    try {
      await traitStore.reorder(arr);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Reorder failed', true);
    }
  }

  // ---- Trait Groups ----
  let addingTraitGroup = $state(false);
  let expandedTraitGroup = $state<number | null>(null);
  let tgEditName = $state('');
  let tgEditDesc = $state('');
  let savingTgName = $state(false);

  function openTraitGroup(group: TraitGroupWithDetails) {
    expandedTraitGroup = group.id;
    const n = group.names.find(x => x.language_code === editingLang);
    tgEditName = n?.name ?? '';
    tgEditDesc = n?.description ?? '';
  }

  $effect(() => {
    if (expandedTraitGroup === null) return;
    const group = traitGroups.find(g => g.id === expandedTraitGroup);
    if (!group) return;
    const n = group.names.find(x => x.language_code === editingLang);
    tgEditName = n?.name ?? '';
    tgEditDesc = n?.description ?? '';
  });

  async function addTraitGroup() {
    addingTraitGroup = true;
    try {
      await traitGroupStore.create();
      showToast('Trait group added');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    } finally {
      addingTraitGroup = false;
    }
  }

  async function deleteTraitGroup(id: number) {
    if (!confirm('Delete this trait group?')) return;
    try {
      await traitGroupStore.remove(id);
      if (expandedTraitGroup === id) expandedTraitGroup = null;
      showToast('Deleted');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  async function saveTgName() {
    if (expandedTraitGroup === null) return;
    savingTgName = true;
    try {
      await traitGroupStore.setName(expandedTraitGroup, editingLang, tgEditName, tgEditDesc);
      showToast('Saved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    } finally {
      savingTgName = false;
    }
  }

  async function deleteTgName() {
    if (expandedTraitGroup === null) return;
    try {
      await traitGroupStore.deleteName(expandedTraitGroup, editingLang);
      tgEditName = '';
      tgEditDesc = '';
      showToast('Name deleted');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  async function moveTraitGroup(index: number, dir: -1 | 1) {
    const arr = [...traitGroups];
    const ni = index + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[index], arr[ni]] = [arr[ni], arr[index]];
    try {
      await traitGroupStore.reorder(arr);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Reorder failed', true);
    }
  }

  function isTraitInGroup(group: TraitGroupWithDetails, traitId: number) {
    return group.traits.some(t => t.id === traitId);
  }

  async function toggleTraitInGroup(groupId: number, traitId: number, assigned: boolean) {
    try {
      if (assigned) {
        await traitGroupStore.removeTrait(groupId, traitId);
      } else {
        await traitGroupStore.addTrait(groupId, traitId);
      }
      showToast('Saved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  async function moveTraitInGroup(group: TraitGroupWithDetails, index: number, dir: -1 | 1) {
    const arr = [...group.traits];
    const ni = index + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[index], arr[ni]] = [arr[ni], arr[index]];
    try {
      await traitGroupStore.reorderTraits(group.id, arr);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Reorder failed', true);
    }
  }

  // ---- Option Groups ----
  let addingOptionGroup = $state(false);
  let expandedOptionGroup = $state<number | null>(null);
  let ogEditName = $state('');
  let ogEditDesc = $state('');
  let savingOgName = $state(false);

  // Per-option expanded state
  let expandedOption = $state<number | null>(null);
  let optEditName = $state('');
  let optEditDesc = $state('');
  let optEditPrice = $state('');
  let savingOptName = $state(false);
  let savingOptPrice = $state(false);

  function openOptionGroup(group: OptionGroupWithDetails) {
    expandedOptionGroup = group.id;
    expandedOption = null;
    const n = group.names.find(x => x.language_code === editingLang);
    ogEditName = n?.name ?? '';
    ogEditDesc = n?.description ?? '';
  }

  $effect(() => {
    if (expandedOptionGroup === null) return;
    const group = optionGroups.find(g => g.id === expandedOptionGroup);
    if (!group) return;
    const n = group.names.find(x => x.language_code === editingLang);
    ogEditName = n?.name ?? '';
    ogEditDesc = n?.description ?? '';
  });

  function openOption(opt: OptionWithDetails) {
    expandedOption = opt.id;
    const n = opt.names.find(x => x.language_code === editingLang);
    optEditName = n?.name ?? '';
    optEditDesc = n?.description ?? '';
    optEditPrice = String(opt.price_delta);
  }

  $effect(() => {
    if (expandedOption === null) return;
    const group = optionGroups.find(g => g.options.some(o => o.id === expandedOption));
    if (!group) return;
    const opt = group.options.find(o => o.id === expandedOption);
    if (!opt) return;
    const n = opt.names.find(x => x.language_code === editingLang);
    optEditName = n?.name ?? '';
    optEditDesc = n?.description ?? '';
  });

  async function addOptionGroup() {
    addingOptionGroup = true;
    try {
      await optionGroupStore.create();
      showToast('Option group added');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    } finally {
      addingOptionGroup = false;
    }
  }

  async function deleteOptionGroup(id: number) {
    if (!confirm('Delete this option group?')) return;
    try {
      await optionGroupStore.remove(id);
      if (expandedOptionGroup === id) expandedOptionGroup = null;
      showToast('Deleted');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  async function saveOgName() {
    if (expandedOptionGroup === null) return;
    savingOgName = true;
    try {
      await optionGroupStore.setName(expandedOptionGroup, editingLang, ogEditName, ogEditDesc);
      showToast('Saved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    } finally {
      savingOgName = false;
    }
  }

  async function deleteOgName() {
    if (expandedOptionGroup === null) return;
    try {
      await optionGroupStore.deleteName(expandedOptionGroup, editingLang);
      ogEditName = '';
      ogEditDesc = '';
      showToast('Name deleted');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  async function moveOptionGroup(index: number, dir: -1 | 1) {
    const arr = [...optionGroups];
    const ni = index + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[index], arr[ni]] = [arr[ni], arr[index]];
    try {
      await optionGroupStore.reorder(arr);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Reorder failed', true);
    }
  }

  async function toggleFlag(groupId: number, field: 'multi_select' | 'required', currentVal: number) {
    try {
      await optionGroupStore.update(groupId, { [field]: !currentVal });
      showToast('Saved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  async function addOption(groupId: number) {
    try {
      await optionGroupStore.createOption(groupId);
      showToast('Option added');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  async function deleteOption(optId: number) {
    if (!confirm('Delete this option?')) return;
    try {
      await optionGroupStore.removeOption(optId);
      if (expandedOption === optId) expandedOption = null;
      showToast('Deleted');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  async function saveOptName() {
    if (expandedOption === null) return;
    savingOptName = true;
    try {
      await optionGroupStore.setOptionName(expandedOption, editingLang, optEditName, optEditDesc);
      showToast('Saved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    } finally {
      savingOptName = false;
    }
  }

  async function deleteOptName() {
    if (expandedOption === null) return;
    try {
      await optionGroupStore.deleteOptionName(expandedOption, editingLang);
      optEditName = '';
      optEditDesc = '';
      showToast('Name deleted');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  async function saveOptPrice() {
    if (expandedOption === null) return;
    const price = parseFloat(optEditPrice);
    if (isNaN(price)) { showToast('Invalid price', true); return; }
    savingOptPrice = true;
    try {
      await optionGroupStore.updateOption(expandedOption, { price_delta: price });
      showToast('Saved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    } finally {
      savingOptPrice = false;
    }
  }

  async function moveOption(group: OptionGroupWithDetails, index: number, dir: -1 | 1) {
    const arr = [...group.options];
    const ni = index + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[index], arr[ni]] = [arr[ni], arr[index]];
    try {
      await optionGroupStore.reorderOptions(arr);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Reorder failed', true);
    }
  }

  // ---- Assignments ----
  let expandedMenuItem = $state<number | null>(null);
  // per item base_price edit
  let itemPriceEdit = $state<Record<number, string>>({});
  let savingItemPrice = $state<number | null>(null);

  function openMenuItem(item: MenuItemWithDetails) {
    expandedMenuItem = item.id;
    if (!(item.id in itemPriceEdit)) {
      itemPriceEdit = { ...itemPriceEdit, [item.id]: String(item.base_price) };
    }
  }

  async function saveItemPrice(item: MenuItemWithDetails) {
    const price = parseFloat(itemPriceEdit[item.id] ?? '');
    if (isNaN(price)) { showToast('Invalid price', true); return; }
    savingItemPrice = item.id;
    try {
      await menuStore.updateItem(item.id, { base_price: price });
      showToast('Price saved');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    } finally {
      savingItemPrice = null;
    }
  }

  async function toggleItemTrait(itemId: number, traitId: number, assigned: boolean) {
    try {
      if (assigned) {
        await menuStore.removeTrait(itemId, traitId);
      } else {
        await menuStore.assignTrait(itemId, traitId);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  async function toggleItemOptionGroup(itemId: number, groupId: number, assigned: boolean) {
    try {
      if (assigned) {
        await menuStore.removeOptionGroup(itemId, groupId);
      } else {
        await menuStore.assignOptionGroup(itemId, groupId);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed', true);
    }
  }

  // ---- Helpers ----
  function displayName(names: { language_code: string; name: string }[], lang: string): string {
    return names.find(n => n.language_code === lang)?.name
      ?? names.find(n => n.language_code === 'GB')?.name
      ?? names[0]?.name
      ?? 'Unnamed';
  }

  onMount(async () => {
    await Promise.all([
      languagesStore.loadLanguages(),
      traitStore.load(),
      traitGroupStore.load(),
      optionGroupStore.load(),
      settingsStore.load(),
      menuStore.loadItems(),
    ]);
    currencyInput = settingsStore.settings['currency'] ?? '';
    if (languagesStore.baseLanguage) {
      editingLang = languagesStore.baseLanguage.code;
    }
  });
</script>

{#if toastMsg}
  <div class="toast" class:toast-error={toastIsError}>{toastMsg}</div>
{/if}

<div class="page">
  <div class="page-header">
    <h1>Customer Menu</h1>
    {#if languages.length > 1}
      <div class="lang-selector">
        <label for="editing-lang" class="lang-label">Editing language:</label>
        <select id="editing-lang" class="lang-select" bind:value={editingLang}>
          {#each languages as lang (lang.code)}
            <option value={lang.code}>{lang.display_name} ({lang.code})</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>

  <div class="tabs">
    {#each (['settings', 'traits', 'traitGroups', 'optionGroups', 'assignments'] as Tab[]) as tab}
      <button
        class="tab-btn"
        class:active={activeTab === tab}
        onclick={() => activeTab = tab}
      >
        {tab === 'settings' ? 'Settings' :
         tab === 'traits' ? 'Traits' :
         tab === 'traitGroups' ? 'Trait Groups' :
         tab === 'optionGroups' ? 'Option Groups' :
         'Assignments'}
      </button>
    {/each}
  </div>

  <!-- ============ SETTINGS ============ -->
  {#if activeTab === 'settings'}
    <div class="section">
      <div class="card">
        <h2>Settings</h2>
        <form class="form-row" onsubmit={(e) => { e.preventDefault(); saveCurrency(); }}>
          <div class="form-group">
            <label class="form-label" for="currency">Currency symbol</label>
            <input
              id="currency"
              type="text"
              class="form-input"
              bind:value={currencyInput}
              placeholder="e.g. £ or $"
              maxlength="5"
            />
          </div>
          <button type="submit" class="btn btn-primary" disabled={savingCurrency}>
            {savingCurrency ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>
    </div>

  <!-- ============ TRAITS ============ -->
  {:else if activeTab === 'traits'}
    <div class="section">
      <div class="section-header">
        <span class="count">{traits.length} trait{traits.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-primary" onclick={addTrait} disabled={addingTrait}>
          {addingTrait ? 'Adding...' : '+ Add Trait'}
        </button>
      </div>

      {#if traitStore.isLoading}
        <div class="loading">Loading...</div>
      {:else}
        <div class="item-list">
          {#each traits as trait, i (trait.id)}
            <div class="item-card" class:expanded={expandedTrait === trait.id}>
              <div class="item-row">
                <div class="item-info">
                  <span class="item-name">{displayName(trait.names, editingLang)}</span>
                  <span class="item-id">#{trait.id}</span>
                </div>
                <div class="item-actions">
                  <button class="btn-icon" onclick={() => moveTrait(i, -1)} disabled={i === 0} title="Move up">↑</button>
                  <button class="btn-icon" onclick={() => moveTrait(i, 1)} disabled={i === traits.length - 1} title="Move down">↓</button>
                  <button
                    class="btn-icon"
                    onclick={() => expandedTrait === trait.id ? expandedTrait = null : openTrait(trait)}
                    title={expandedTrait === trait.id ? 'Collapse' : 'Edit'}
                  >
                    {expandedTrait === trait.id ? '▲' : '▼'}
                  </button>
                  <button class="btn-icon btn-danger" onclick={() => deleteTrait(trait.id)} title="Delete">✕</button>
                </div>
              </div>

              {#if expandedTrait === trait.id}
                <div class="edit-panel">
                  <div class="form-group">
                    <label class="form-label" for="trait-name-{trait.id}">Name ({editingLang})</label>
                    <input
                      id="trait-name-{trait.id}"
                      type="text"
                      class="form-input"
                      bind:value={traitEditName}
                      placeholder="Name"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="trait-desc-{trait.id}">Description ({editingLang})</label>
                    <input
                      id="trait-desc-{trait.id}"
                      type="text"
                      class="form-input"
                      bind:value={traitEditDesc}
                      placeholder="Description (optional)"
                    />
                  </div>
                  <div class="btn-group">
                    <button class="btn btn-primary" onclick={saveTraitName} disabled={savingTraitName || !traitEditName.trim()}>
                      {savingTraitName ? 'Saving...' : 'Save name'}
                    </button>
                    {#if trait.names.some(n => n.language_code === editingLang)}
                      <button class="btn btn-outline" onclick={deleteTraitName}>Delete name</button>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          {/each}

          {#if traits.length === 0}
            <p class="empty">No traits yet. Add one to get started.</p>
          {/if}
        </div>
      {/if}
    </div>

  <!-- ============ TRAIT GROUPS ============ -->
  {:else if activeTab === 'traitGroups'}
    <div class="section">
      <div class="section-header">
        <span class="count">{traitGroups.length} group{traitGroups.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-primary" onclick={addTraitGroup} disabled={addingTraitGroup}>
          {addingTraitGroup ? 'Adding...' : '+ Add Trait Group'}
        </button>
      </div>

      {#if traitGroupStore.isLoading}
        <div class="loading">Loading...</div>
      {:else}
        <div class="item-list">
          {#each traitGroups as group, i (group.id)}
            <div class="item-card" class:expanded={expandedTraitGroup === group.id}>
              <div class="item-row">
                <div class="item-info">
                  <span class="item-name">{displayName(group.names, editingLang)}</span>
                  <span class="item-id">#{group.id} · {group.traits.length} trait{group.traits.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="item-actions">
                  <button class="btn-icon" onclick={() => moveTraitGroup(i, -1)} disabled={i === 0} title="Move up">↑</button>
                  <button class="btn-icon" onclick={() => moveTraitGroup(i, 1)} disabled={i === traitGroups.length - 1} title="Move down">↓</button>
                  <button
                    class="btn-icon"
                    onclick={() => expandedTraitGroup === group.id ? expandedTraitGroup = null : openTraitGroup(group)}
                    title={expandedTraitGroup === group.id ? 'Collapse' : 'Edit'}
                  >
                    {expandedTraitGroup === group.id ? '▲' : '▼'}
                  </button>
                  <button class="btn-icon btn-danger" onclick={() => deleteTraitGroup(group.id)} title="Delete">✕</button>
                </div>
              </div>

              {#if expandedTraitGroup === group.id}
                <div class="edit-panel">
                  <h3 class="panel-section-title">Name ({editingLang})</h3>
                  <div class="form-group">
                    <label class="form-label" for="tg-name-{group.id}">Name</label>
                    <input
                      id="tg-name-{group.id}"
                      type="text"
                      class="form-input"
                      bind:value={tgEditName}
                      placeholder="Name"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="tg-desc-{group.id}">Description</label>
                    <input
                      id="tg-desc-{group.id}"
                      type="text"
                      class="form-input"
                      bind:value={tgEditDesc}
                      placeholder="Description (optional)"
                    />
                  </div>
                  <div class="btn-group" style="margin-bottom: 1.25rem;">
                    <button class="btn btn-primary" onclick={saveTgName} disabled={savingTgName || !tgEditName.trim()}>
                      {savingTgName ? 'Saving...' : 'Save name'}
                    </button>
                    {#if group.names.some(n => n.language_code === editingLang)}
                      <button class="btn btn-outline" onclick={deleteTgName}>Delete name</button>
                    {/if}
                  </div>

                  <h3 class="panel-section-title">Traits in this group</h3>
                  {#if traits.length === 0}
                    <p class="empty">No traits defined yet. Add traits first.</p>
                  {:else}
                    <div class="trait-checkboxes">
                      {#each traits as trait (trait.id)}
                        {@const assigned = isTraitInGroup(group, trait.id)}
                        <label class="checkbox-label">
                          <input
                            type="checkbox"
                            checked={assigned}
                            onchange={() => toggleTraitInGroup(group.id, trait.id, assigned)}
                          />
                          {displayName(trait.names, editingLang)}
                        </label>
                      {/each}
                    </div>
                  {/if}

                  {#if group.traits.length > 0}
                    <h3 class="panel-section-title" style="margin-top: 1rem;">Trait order</h3>
                    <div class="mini-list">
                      {#each group.traits as t, ti (t.id)}
                        <div class="mini-row">
                          <span>{displayName(t.names, editingLang)}</span>
                          <div class="mini-actions">
                            <button class="btn-icon" onclick={() => moveTraitInGroup(group, ti, -1)} disabled={ti === 0} title="Move up">↑</button>
                            <button class="btn-icon" onclick={() => moveTraitInGroup(group, ti, 1)} disabled={ti === group.traits.length - 1} title="Move down">↓</button>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}

          {#if traitGroups.length === 0}
            <p class="empty">No trait groups yet.</p>
          {/if}
        </div>
      {/if}
    </div>

  <!-- ============ OPTION GROUPS ============ -->
  {:else if activeTab === 'optionGroups'}
    <div class="section">
      <div class="section-header">
        <span class="count">{optionGroups.length} group{optionGroups.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-primary" onclick={addOptionGroup} disabled={addingOptionGroup}>
          {addingOptionGroup ? 'Adding...' : '+ Add Option Group'}
        </button>
      </div>

      {#if optionGroupStore.isLoading}
        <div class="loading">Loading...</div>
      {:else}
        <div class="item-list">
          {#each optionGroups as group, i (group.id)}
            <div class="item-card" class:expanded={expandedOptionGroup === group.id}>
              <div class="item-row">
                <div class="item-info">
                  <span class="item-name">{displayName(group.names, editingLang)}</span>
                  <div class="flag-badges">
                    {#if group.multi_select}
                      <span class="badge badge-blue">multi</span>
                    {/if}
                    {#if group.required}
                      <span class="badge badge-orange">required</span>
                    {/if}
                    <span class="item-id">{group.options.length} option{group.options.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div class="item-actions">
                  <button class="btn-icon" onclick={() => moveOptionGroup(i, -1)} disabled={i === 0} title="Move up">↑</button>
                  <button class="btn-icon" onclick={() => moveOptionGroup(i, 1)} disabled={i === optionGroups.length - 1} title="Move down">↓</button>
                  <button
                    class="btn-icon"
                    onclick={() => expandedOptionGroup === group.id ? expandedOptionGroup = null : openOptionGroup(group)}
                    title={expandedOptionGroup === group.id ? 'Collapse' : 'Edit'}
                  >
                    {expandedOptionGroup === group.id ? '▲' : '▼'}
                  </button>
                  <button class="btn-icon btn-danger" onclick={() => deleteOptionGroup(group.id)} title="Delete">✕</button>
                </div>
              </div>

              {#if expandedOptionGroup === group.id}
                <div class="edit-panel">
                  <h3 class="panel-section-title">Name ({editingLang})</h3>
                  <div class="form-group">
                    <label class="form-label" for="og-name-{group.id}">Name</label>
                    <input
                      id="og-name-{group.id}"
                      type="text"
                      class="form-input"
                      bind:value={ogEditName}
                      placeholder="Name"
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="og-desc-{group.id}">Description</label>
                    <input
                      id="og-desc-{group.id}"
                      type="text"
                      class="form-input"
                      bind:value={ogEditDesc}
                      placeholder="Description (optional)"
                    />
                  </div>
                  <div class="btn-group" style="margin-bottom: 1.25rem;">
                    <button class="btn btn-primary" onclick={saveOgName} disabled={savingOgName || !ogEditName.trim()}>
                      {savingOgName ? 'Saving...' : 'Save name'}
                    </button>
                    {#if group.names.some(n => n.language_code === editingLang)}
                      <button class="btn btn-outline" onclick={deleteOgName}>Delete name</button>
                    {/if}
                  </div>

                  <h3 class="panel-section-title">Flags</h3>
                  <div class="flag-toggles">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        checked={!!group.multi_select}
                        onchange={() => toggleFlag(group.id, 'multi_select', group.multi_select)}
                      />
                      Multi-select (customer can pick multiple options)
                    </label>
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        checked={!!group.required}
                        onchange={() => toggleFlag(group.id, 'required', group.required)}
                      />
                      Required (must select at least one)
                    </label>
                  </div>

                  <h3 class="panel-section-title" style="margin-top: 1.25rem;">Options</h3>
                  <div class="item-list nested">
                    {#each group.options as opt, oi (opt.id)}
                      <div class="item-card nested-card" class:expanded={expandedOption === opt.id}>
                        <div class="item-row">
                          <div class="item-info">
                            <span class="item-name">{displayName(opt.names, editingLang)}</span>
                            <span class="item-id">Δ {opt.price_delta}</span>
                          </div>
                          <div class="item-actions">
                            <button class="btn-icon" onclick={() => moveOption(group, oi, -1)} disabled={oi === 0} title="Move up">↑</button>
                            <button class="btn-icon" onclick={() => moveOption(group, oi, 1)} disabled={oi === group.options.length - 1} title="Move down">↓</button>
                            <button
                              class="btn-icon"
                              onclick={() => expandedOption === opt.id ? expandedOption = null : openOption(opt)}
                              title={expandedOption === opt.id ? 'Collapse' : 'Edit'}
                            >
                              {expandedOption === opt.id ? '▲' : '▼'}
                            </button>
                            <button class="btn-icon btn-danger" onclick={() => deleteOption(opt.id)} title="Delete">✕</button>
                          </div>
                        </div>

                        {#if expandedOption === opt.id}
                          <div class="edit-panel">
                            <div class="form-group">
                              <label class="form-label" for="opt-name-{opt.id}">Name ({editingLang})</label>
                              <input
                                id="opt-name-{opt.id}"
                                type="text"
                                class="form-input"
                                bind:value={optEditName}
                                placeholder="Option name"
                              />
                            </div>
                            <div class="form-group">
                              <label class="form-label" for="opt-desc-{opt.id}">Description</label>
                              <input
                                id="opt-desc-{opt.id}"
                                type="text"
                                class="form-input"
                                bind:value={optEditDesc}
                                placeholder="Description (optional)"
                              />
                            </div>
                            <div class="btn-group" style="margin-bottom: 1rem;">
                              <button class="btn btn-primary" onclick={saveOptName} disabled={savingOptName || !optEditName.trim()}>
                                {savingOptName ? 'Saving...' : 'Save name'}
                              </button>
                              {#if opt.names.some(n => n.language_code === editingLang)}
                                <button class="btn btn-outline" onclick={deleteOptName}>Delete name</button>
                              {/if}
                            </div>
                            <div class="form-row">
                              <div class="form-group">
                                <label class="form-label" for="opt-price-{opt.id}">Price delta</label>
                                <input
                                  id="opt-price-{opt.id}"
                                  type="number"
                                  class="form-input form-input-sm"
                                  bind:value={optEditPrice}
                                  step="0.01"
                                  placeholder="0"
                                />
                              </div>
                              <button class="btn btn-primary" onclick={saveOptPrice} disabled={savingOptPrice}>
                                {savingOptPrice ? 'Saving...' : 'Save price'}
                              </button>
                            </div>
                          </div>
                        {/if}
                      </div>
                    {/each}

                    {#if group.options.length === 0}
                      <p class="empty">No options yet.</p>
                    {/if}
                  </div>

                  <button class="btn btn-outline" style="margin-top: 0.5rem;" onclick={() => addOption(group.id)}>
                    + Add Option
                  </button>
                </div>
              {/if}
            </div>
          {/each}

          {#if optionGroups.length === 0}
            <p class="empty">No option groups yet.</p>
          {/if}
        </div>
      {/if}
    </div>

  <!-- ============ ASSIGNMENTS ============ -->
  {:else if activeTab === 'assignments'}
    <div class="section">
      <p class="section-hint">Assign traits and option groups to menu items.</p>

      {#if menuStore.isLoading}
        <div class="loading">Loading...</div>
      {:else}
        <div class="item-list">
          {#each menuItems as item (item.id)}
            <div class="item-card" class:expanded={expandedMenuItem === item.id}>
              <div class="item-row">
                <div class="item-info">
                  <span class="item-name">{displayName(item.names, editingLang)}</span>
                  <span class="item-id">
                    {item.traits.length} trait{item.traits.length !== 1 ? 's' : ''} ·
                    {item.optionGroups.length} group{item.optionGroups.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div class="item-actions">
                  <button
                    class="btn-icon"
                    onclick={() => expandedMenuItem === item.id ? expandedMenuItem = null : openMenuItem(item)}
                    title={expandedMenuItem === item.id ? 'Collapse' : 'Expand'}
                  >
                    {expandedMenuItem === item.id ? '▲' : '▼'}
                  </button>
                </div>
              </div>

              {#if expandedMenuItem === item.id}
                <div class="edit-panel">
                  <div class="form-row" style="margin-bottom: 1.25rem;">
                    <div class="form-group">
                      <label class="form-label" for="item-price-{item.id}">Base price</label>
                      <input
                        id="item-price-{item.id}"
                        type="number"
                        class="form-input form-input-sm"
                        bind:value={itemPriceEdit[item.id]}
                        step="0.01"
                        placeholder="0"
                      />
                    </div>
                    <button
                      class="btn btn-primary"
                      onclick={() => saveItemPrice(item)}
                      disabled={savingItemPrice === item.id}
                    >
                      {savingItemPrice === item.id ? 'Saving...' : 'Save price'}
                    </button>
                  </div>

                  {#if traits.length > 0}
                    <h3 class="panel-section-title">Traits</h3>
                    <div class="trait-checkboxes">
                      {#each traits as trait (trait.id)}
                        {@const assigned = item.traits.some(t => t.id === trait.id)}
                        <label class="checkbox-label">
                          <input
                            type="checkbox"
                            checked={assigned}
                            onchange={() => toggleItemTrait(item.id, trait.id, assigned)}
                          />
                          {displayName(trait.names, editingLang)}
                        </label>
                      {/each}
                    </div>
                  {/if}

                  {#if optionGroups.length > 0}
                    <h3 class="panel-section-title" style="margin-top: 1rem;">Option Groups</h3>
                    <div class="trait-checkboxes">
                      {#each optionGroups as group (group.id)}
                        {@const assigned = item.optionGroups.some(g => g.id === group.id)}
                        <label class="checkbox-label">
                          <input
                            type="checkbox"
                            checked={assigned}
                            onchange={() => toggleItemOptionGroup(item.id, group.id, assigned)}
                          />
                          {displayName(group.names, editingLang)}
                          {#if group.multi_select}<span class="badge badge-blue">multi</span>{/if}
                          {#if group.required}<span class="badge badge-orange">req</span>{/if}
                        </label>
                      {/each}
                    </div>
                  {/if}

                  {#if traits.length === 0 && optionGroups.length === 0}
                    <p class="empty">No traits or option groups defined yet.</p>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}

          {#if menuItems.length === 0}
            <p class="empty">No menu items.</p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .page {
    padding: 1.5rem;
    max-width: 900px;
    position: relative;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .lang-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .lang-label {
    font-size: 0.85rem;
    color: #555;
  }

  .lang-select {
    padding: 0.3rem 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9rem;
    background: white;
  }

  /* Tabs */
  .tabs {
    display: flex;
    gap: 0;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid #e0e0e0;
  }

  .tab-btn {
    padding: 0.6rem 1.1rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    cursor: pointer;
    font-size: 0.9rem;
    color: #666;
    transition: color 0.15s;
  }

  .tab-btn:hover {
    color: #333;
  }

  .tab-btn.active {
    color: #0066cc;
    border-bottom-color: #0066cc;
    font-weight: 600;
  }

  /* Section */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .section-hint {
    color: #666;
    font-size: 0.9rem;
    margin: 0 0 1rem 0;
  }

  .count {
    font-size: 0.85rem;
    color: #666;
  }

  /* Cards */
  .card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }

  .card h2 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
  }

  .item-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .item-list.nested {
    margin-top: 0.5rem;
    gap: 0.3rem;
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

  .nested-card {
    background: #fafafa;
    border-color: #e0e0e0;
  }

  .nested-card.expanded {
    border-color: #4a9eff;
  }

  .item-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.7rem 1rem;
    gap: 0.5rem;
  }

  .item-info {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
    flex: 1;
  }

  .item-name {
    font-size: 0.95rem;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-id {
    font-size: 0.78rem;
    color: #999;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .item-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  /* Edit panel */
  .edit-panel {
    padding: 1rem;
    border-top: 1px solid #e8edf2;
    background: #f8f9fa;
  }

  .panel-section-title {
    margin: 0 0 0.6rem 0;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #555;
  }

  /* Forms */
  .form-row {
    display: flex;
    align-items: flex-end;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .form-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #444;
  }

  .form-input {
    padding: 0.45rem 0.6rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.95rem;
    width: 100%;
    box-sizing: border-box;
  }

  .form-input-sm {
    width: 120px;
  }

  .btn-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  /* Buttons */
  .btn {
    padding: 0.45rem 0.9rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.88rem;
    transition: background-color 0.15s, opacity 0.15s;
    white-space: nowrap;
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

  .btn-outline {
    background: white;
    color: #555;
    border: 1px solid #ccc;
  }

  .btn-outline:hover:not(:disabled) {
    background: #f0f0f0;
  }

  .btn-icon {
    background: none;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    padding: 0.25rem 0.45rem;
    font-size: 0.8rem;
    color: #555;
    transition: background-color 0.1s;
    line-height: 1.2;
  }

  .btn-icon:hover:not(:disabled) {
    background: #f0f0f0;
  }

  .btn-icon:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-danger {
    color: #cc2200;
    border-color: #ffcccc;
  }

  .btn-danger:hover:not(:disabled) {
    background: #fff0ee;
    border-color: #cc2200;
  }

  /* Checkboxes */
  .trait-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .flag-toggles {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.2rem 0;
  }

  /* Badges */
  .flag-badges {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .badge {
    font-size: 0.7rem;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .badge-blue {
    background: #e8f0fe;
    color: #1a56db;
  }

  .badge-orange {
    background: #fff3e0;
    color: #cc6600;
  }

  /* Mini list (trait reorder within group) */
  .mini-list {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .mini-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.35rem 0.6rem;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    font-size: 0.88rem;
  }

  .mini-actions {
    display: flex;
    gap: 0.2rem;
  }

  /* Loading / empty */
  .loading {
    text-align: center;
    color: #999;
    padding: 2rem;
    font-style: italic;
  }

  .empty {
    color: #999;
    font-style: italic;
    padding: 0.5rem 0;
    margin: 0;
    font-size: 0.9rem;
  }

  /* Toast */
  .toast {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    background: #1a7f5a;
    color: white;
    padding: 0.6rem 1.1rem;
    border-radius: 6px;
    font-size: 0.9rem;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    animation: slide-in 0.2s ease;
  }

  .toast.toast-error {
    background: #cc2200;
  }

  @keyframes slide-in {
    from { transform: translateY(10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>
