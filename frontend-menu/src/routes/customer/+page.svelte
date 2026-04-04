<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly, slide } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { customerStore } from '$lib/stores/customer.svelte';
  import { menuStore } from '$lib/stores/menu.svelte';
  import { menuSync } from '$lib/services/version-sync';
  import { createIdleTimer } from '$lib/services/idle-timer';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

  function getUiText(settings: Record<string, string>, key: string, lang: string): string {
    return settings[`ui:${key}:${lang}`] || settings[`ui:${key}:GB`] || key;
  }

  onMount(() => {
    customerStore.load();
    menuSync.connect();

    const idle = createIdleTimer(60_000, () => {
      menuStore.resetToDefault();
      goto('/');
    });
    const stopIdle = idle.start();

    return () => {
      stopIdle();
      menuSync.disconnect();
    };
  });

  onDestroy(() => {
    customerStore.reset();
  });
</script>

<svelte:head>
  <title>{getUiText(menuStore.settings, 'find_your_drink', menuStore.selectedLanguage)}</title>
</svelte:head>

<main class="page">
  {#if customerStore.isLoading}
    <div class="loading">{getUiText(menuStore.settings, 'loading', menuStore.selectedLanguage)}</div>
  {:else if customerStore.error}
    <div class="error">{customerStore.error}</div>
  {:else if customerStore.data}
    <div class="scroll-container">

      <header class="page-header">
        <a href="/" class="back-btn" aria-label="Back to menu">
          <span class="back-icon">‹</span> {getUiText(customerStore.data.settings, 'menu', menuStore.selectedLanguage)}
        </a>
        <h1 class="page-title">{getUiText(customerStore.data.settings, 'find_your_drink', menuStore.selectedLanguage)}</h1>
      </header>

      {#if customerStore.data.languages.length > 1}
        <LanguageSwitcher languages={customerStore.data.languages} />
      {/if}

      <!-- Trait filters -->
      <section class="filters">
        {#if customerStore.selectedTraits.size > 0}
          <div class="reset-bar" transition:slide={{ duration: 200 }}>
            <span class="reset-label">
              {customerStore.selectedTraits.size} {getUiText(customerStore.data.settings, 'filters_active', menuStore.selectedLanguage)}
            </span>
            <button class="reset-btn" onclick={() => customerStore.reset()}>{getUiText(customerStore.data.settings, 'clear_all', menuStore.selectedLanguage)}</button>
          </div>
        {/if}

        {#each customerStore.data.traitGroups as group (group.id)}
          {@const groupName = customerStore.getName(group.names)}
          {@const groupDesc = customerStore.getDescription(group.names)}
          <div class="trait-group">
            <div class="group-header">
              <h2 class="group-name">{groupName}</h2>
              {#if groupDesc}
                <p class="group-desc">{groupDesc}</p>
              {/if}
            </div>
            <div class="trait-pills">
              {#each group.traits as trait (trait.id)}
                {@const traitName = customerStore.getName(trait.names)}
                {@const isSelected = customerStore.selectedTraits.get(group.id) === trait.id}
                <button
                  class="trait-pill"
                  class:selected={isSelected}
                  onclick={() => customerStore.toggleTrait(group.id, trait.id)}
                  aria-pressed={isSelected}
                >
                  {traitName}
                </button>
              {/each}
            </div>
          </div>
        {/each}

        <div class="surprise-wrap">
          <button
            class="surprise-btn"
            onclick={() => customerStore.surpriseMe()}
            disabled={customerStore.filteredItems.length === 0}
          >
            ✨ {getUiText(customerStore.data.settings, 'surprise_me', menuStore.selectedLanguage)}
          </button>
        </div>
      </section>

      <!-- Item list -->
      <section class="items">
        <p class="items-count">
          {#if customerStore.selectedTraits.size > 0}
            {customerStore.filteredItems.length} {getUiText(customerStore.data.settings, 'of', menuStore.selectedLanguage)} {customerStore.scheduleVisibleCount} {getUiText(customerStore.data.settings, 'drinks', menuStore.selectedLanguage)}
          {:else}
            {customerStore.scheduleVisibleCount} {getUiText(customerStore.data.settings, 'drinks', menuStore.selectedLanguage)}
          {/if}
        </p>

        {#if customerStore.filteredItems.length === 0}
          <div class="no-results" in:fly={{ y: 10, duration: 250 }}>
            {getUiText(customerStore.data.settings, 'no_results', menuStore.selectedLanguage)}
          </div>
        {/if}

        {#each customerStore.filteredItems as item, i (item.id)}
          {@const name = customerStore.getName(item.names)}
          {@const desc = customerStore.getDescription(item.names)}
          {@const isExpanded = customerStore.expandedItemId === item.id}
          <div
            class="item-card"
            id="ci-item-{item.id}"
            in:fly={{ y: 18, duration: 300, delay: Math.min(i * 35, 280) }}
            out:fly={{ y: -10, duration: 180 }}
          >
            <button
              class="item-header"
              onclick={() => customerStore.toggleExpand(item.id)}
              aria-expanded={isExpanded}
            >
              <span class="item-name">{name}</span>
              <span class="item-right">
                <span class="item-price">{customerStore.formatPrice(item.base_price)}</span>
                <span class="expand-icon" class:open={isExpanded}>›</span>
              </span>
            </button>

            {#if desc}
              <p class="item-desc">{desc}</p>
            {/if}

            {#if isExpanded}
              <div class="option-groups" transition:slide={{ duration: 300 }}>
                {#if item.optionGroups.length === 0}
                  <p class="no-options">{getUiText(customerStore.data.settings, 'no_options', menuStore.selectedLanguage)}</p>
                {:else}
                  {#each item.optionGroups as og (og.id)}
                    {@const ogName = customerStore.getName(og.names)}
                    {@const ogDesc = customerStore.getDescription(og.names)}
                    <div class="option-group">
                      <h3 class="og-name">
                        {ogName}
                        {#if og.multi_select}
                          <span class="og-badge">multi</span>
                        {/if}
                      </h3>
                      {#if ogDesc}
                        <p class="og-desc">{ogDesc}</p>
                      {/if}
                      <ul class="options-list">
                        {#each og.options as opt (opt.id)}
                          {@const optName = customerStore.getName(opt.names)}
                          {@const delta = customerStore.formatDelta(opt.price_delta)}
                          <li class="option-item">
                            <span class="opt-dot">○</span>
                            <span class="opt-name">{optName}</span>
                            {#if delta}
                              <span class="opt-delta">{delta}</span>
                            {/if}
                          </li>
                        {/each}
                      </ul>
                    </div>
                  {/each}
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </section>
    </div>
  {/if}
</main>

<style>
  .page {
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    background: #f5f0e8;
    color: #3a2e1e;
    position: relative;
  }

  .scroll-container {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: #d4c4a8 transparent;
    padding-bottom: 3rem;
  }

  /* ── Header ── */
  .page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.2rem 1.25rem 0.8rem;
    border-bottom: 1px solid #e8dfd0;
    position: sticky;
    top: 0;
    background: #f5f0e8;
    z-index: 10;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    color: #7c5c2e;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.4rem 0.75rem;
    border-radius: 99px;
    border: 1.5px solid #c9aa78;
    background: transparent;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .back-btn:hover {
    background: #ede5d5;
  }

  .back-icon {
    font-size: 1.1rem;
    line-height: 1;
  }

  .page-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #3a2e1e;
    margin: 0;
    flex: 1;
  }

  /* ── Filters ── */
  .filters {
    padding: 1.25rem 1.25rem 0.5rem;
  }

  .reset-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #ede5d5;
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    margin-bottom: 1rem;
    font-size: 0.85rem;
  }

  .reset-label {
    color: #7a6a5a;
  }

  .reset-btn {
    background: none;
    border: none;
    color: #7c5c2e;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    transition: background 0.15s;
  }

  .reset-btn:hover {
    background: #d4c4a8;
  }

  .trait-group {
    margin-bottom: 1.25rem;
  }

  .group-header {
    margin-bottom: 0.6rem;
  }

  .group-name {
    font-size: 0.95rem;
    font-weight: 700;
    color: #3a2e1e;
    margin: 0 0 0.2rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .group-desc {
    font-size: 0.8rem;
    color: #7a6a5a;
    margin: 0;
    font-style: italic;
  }

  .trait-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .trait-pill {
    padding: 0.45rem 0.9rem;
    border-radius: 99px;
    border: 1.5px solid #c9aa78;
    background: transparent;
    color: #3a2e1e;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s;
    min-height: 2.5rem;
    display: flex;
    align-items: center;
  }

  .trait-pill:hover {
    background: #ede5d5;
  }

  .trait-pill.selected {
    background: #7c5c2e;
    border-color: #7c5c2e;
    color: #fff;
  }

  .trait-pill:active {
    transform: scale(0.97);
  }

  .surprise-wrap {
    display: flex;
    justify-content: center;
    padding: 0.75rem 0 0.25rem;
  }

  .surprise-btn {
    padding: 0.7rem 2rem;
    border-radius: 99px;
    border: none;
    background: #7c5c2e;
    color: #fff;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
    box-shadow: 0 2px 8px rgba(124, 92, 46, 0.3);
  }

  .surprise-btn:hover:not(:disabled) {
    background: #6b4e27;
    box-shadow: 0 4px 12px rgba(124, 92, 46, 0.4);
  }

  .surprise-btn:active:not(:disabled) {
    transform: scale(0.97);
  }

  .surprise-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ── Items ── */
  .items {
    padding: 0.75rem 1.25rem 0;
    border-top: 1px solid #e8dfd0;
  }

  .items-count {
    font-size: 0.8rem;
    color: #7a6a5a;
    margin: 0 0 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .no-results {
    text-align: center;
    color: #7a6a5a;
    font-style: italic;
    padding: 2rem 1rem;
    font-size: 0.95rem;
  }

  .item-card {
    background: #fff;
    border-radius: 0.75rem;
    box-shadow: 0 1px 4px rgba(58, 46, 30, 0.08);
    margin-bottom: 0.75rem;
    overflow: hidden;
    border: 1px solid #e8dfd0;
    border-left: 3px solid transparent;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }

  .item-card:has(.item-header[aria-expanded="true"]) {
    border-left-color: #7c5c2e;
    box-shadow: 0 4px 16px rgba(124, 92, 46, 0.18);
    background: #fdf8f2;
  }

  .item-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.9rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: #3a2e1e;
    gap: 0.75rem;
    min-height: 3.25rem;
  }

  .item-header:hover {
    background: #faf7f2;
  }

  .item-name {
    font-size: 1rem;
    font-weight: 600;
    flex: 1;
    line-height: 1.3;
  }

  .item-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .item-price {
    font-size: 1rem;
    font-weight: 700;
    color: #7c5c2e;
  }

  .expand-icon {
    font-size: 1.3rem;
    color: #a08060;
    display: inline-block;
    transition: transform 0.25s;
    line-height: 1;
  }

  .expand-icon.open {
    transform: rotate(90deg);
  }

  .item-desc {
    font-size: 0.85rem;
    color: #7a6a5a;
    margin: 0;
    padding: 0 1rem 0.75rem;
    line-height: 1.5;
  }

  /* ── Option groups ── */
  .option-groups {
    border-top: 1px solid #f0e8dc;
    padding: 0.75rem 1rem 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .no-options {
    font-size: 0.85rem;
    color: #a08060;
    font-style: italic;
    margin: 0;
    padding: 0.25rem 0;
  }

  .og-name {
    font-size: 0.82rem;
    font-weight: 700;
    color: #5a4228;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 0.3rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .og-badge {
    font-size: 0.65rem;
    background: #d4c4a8;
    color: #5a4228;
    border-radius: 99px;
    padding: 0.1rem 0.4rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .og-desc {
    font-size: 0.78rem;
    color: #7a6a5a;
    margin: 0 0 0.4rem;
    font-style: italic;
    line-height: 1.4;
  }

  .options-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .option-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.88rem;
    color: #3a2e1e;
    padding: 0.15rem 0;
  }

  .opt-dot {
    color: #a08060;
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  .opt-name {
    flex: 1;
  }

  .opt-delta {
    font-size: 0.8rem;
    font-weight: 600;
    color: #7c5c2e;
    background: #f5eddf;
    border-radius: 0.3rem;
    padding: 0.1rem 0.4rem;
    white-space: nowrap;
  }

  /* ── States ── */
  .loading,
  .error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 1rem;
    color: #7a6a5a;
  }

  .error {
    color: #c0392b;
  }
</style>
