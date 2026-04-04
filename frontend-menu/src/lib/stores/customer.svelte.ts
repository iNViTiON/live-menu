import type { PublicMenuResponse } from '@live-menu/shared';
import { menuStore } from './menu.svelte';

class CustomerStore {
  data = $state.raw<PublicMenuResponse | null>(null);
  isLoading = $state(false);
  error = $state<string | null>(null);

  // Single-select per group: Map<groupId, traitId>
  selectedTraits = $state<Map<number, number>>(new Map());
  expandedItemId = $state<number | null>(null);

  filteredItems = $derived.by(() => {
    if (!this.data) return [];
    const selected = [...this.selectedTraits.values()];
    if (selected.length === 0) return this.data.items;
    return this.data.items.filter((item) =>
      selected.every((traitId) => item.traits.some((t) => t.id === traitId))
    );
  });

  currency = $derived(this.data?.settings?.currency ?? '€');

  async load() {
    try {
      if (!this.data) this.isLoading = true;
      this.error = null;
      const res = await fetch('/api/public/menu');
      if (!res.ok) throw new Error('Failed to load menu');
      this.data = (await res.json()) as PublicMenuResponse;
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      this.isLoading = false;
    }
  }

  toggleTrait(groupId: number, traitId: number) {
    const current = this.selectedTraits.get(groupId);
    const next = new Map(this.selectedTraits);
    if (current === traitId) next.delete(groupId);
    else next.set(groupId, traitId);
    this.selectedTraits = next;
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
    const lang = menuStore.selectedLanguage;
    return (
      names.find((n) => n.language_code === lang)?.name ??
      names.find((n) => n.language_code === 'GB')?.name ??
      names[0]?.name ??
      ''
    );
  }

  getDescription(names: { language_code: string; description: string | null }[]): string | null {
    const lang = menuStore.selectedLanguage;
    const m =
      names.find((n) => n.language_code === lang) ??
      names.find((n) => n.language_code === 'GB') ??
      names[0];
    return m?.description ?? null;
  }

  formatPrice(amount: number): string {
    return `${this.currency}${amount.toFixed(2)}`;
  }

  formatDelta(delta: number): string {
    if (delta === 0) return '';
    const abs = Math.abs(delta).toFixed(2);
    return `${delta > 0 ? '+' : '-'}${this.currency}${abs}`;
  }
}

export const customerStore = new CustomerStore();
