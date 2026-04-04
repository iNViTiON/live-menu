import type { PublicMenuResponse } from '@live-menu/shared';
import { menuStore } from './menu.svelte';
import {
  filterItems,
  getName as getNameUtil,
  getDescription as getDescriptionUtil,
  formatPrice as formatPriceUtil,
  formatDelta as formatDeltaUtil,
  toggleTrait as toggleTraitUtil,
} from './customer-utils';

class CustomerStore {
  data = $state.raw<PublicMenuResponse | null>(null);
  isLoading = $state(false);
  error = $state<string | null>(null);

  // Single-select per group: Map<groupId, traitId>
  selectedTraits = $state<Map<number, number>>(new Map());
  expandedItemId = $state<number | null>(null);

  filteredItems = $derived.by(() => {
    if (!this.data) return [];
    return filterItems(this.data.items, this.selectedTraits);
  });

  currency = $derived(this.data?.settings?.currency ?? '€');

  async load() {
    try {
      if (!this.data) this.isLoading = true;
      this.error = null;
      if (menuStore.items.length === 0) {
        await menuStore.load();
      }
      this.data = {
        items: menuStore.items,
        languages: menuStore.languages,
        traitGroups: menuStore.traitGroups,
        optionGroups: menuStore.optionGroups,
        settings: menuStore.settings,
        version: menuStore.version,
      };
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      this.isLoading = false;
    }
  }

  toggleTrait(groupId: number, traitId: number) {
    this.selectedTraits = toggleTraitUtil(this.selectedTraits, groupId, traitId);
  }

  toggleExpand(itemId: number) {
    this.expandedItemId = this.expandedItemId === itemId ? null : itemId;
  }

  surpriseMe() {
    const items = this.filteredItems;
    if (items.length === 0) return;
    const random = items[Math.floor(Math.random() * items.length)];
    this.expandedItemId = random.id;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document
          .getElementById(`ci-item-${random.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  reset() {
    this.selectedTraits = new Map();
    this.expandedItemId = null;
  }

  // Fallback chain: selected language → GB → first available
  getName(names: { language_code: string; name: string }[]): string {
    return getNameUtil(names, menuStore.selectedLanguage);
  }

  getDescription(names: { language_code: string; description: string | null }[]): string | null {
    return getDescriptionUtil(names, menuStore.selectedLanguage);
  }

  formatPrice(cents: number): string {
    return formatPriceUtil(cents, this.currency, menuStore.selectedLanguage);
  }

  formatDelta(cents: number): string | null {
    return formatDeltaUtil(cents, this.currency, menuStore.selectedLanguage);
  }
}

export const customerStore = new CustomerStore();
