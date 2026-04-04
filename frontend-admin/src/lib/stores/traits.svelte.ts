import type { TraitWithDetails } from '@live-menu/shared';
import { api } from '$lib/api/client';

class TraitStore {
  items = $state.raw<TraitWithDetails[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);

  async load() {
    this.isLoading = true;
    this.error = null;
    try {
      this.items = await api.get<TraitWithDetails[]>('/api/traits');
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Failed to load traits';
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async create() {
    const trait = await api.post<TraitWithDetails>('/api/traits');
    this.items = [...this.items, trait];
    return trait;
  }

  async remove(id: number) {
    await api.delete(`/api/traits/${id}`);
    this.items = this.items.filter(t => t.id !== id);
  }

  async reorder(orderedItems: TraitWithDetails[]) {
    const items = orderedItems.map((item, index) => ({ id: item.id, sort_order: index }));
    await api.put('/api/traits/reorder', { items });
    this.items = orderedItems;
  }

  async setName(traitId: number, lang: string, name: string, description: string) {
    await api.put(`/api/traits/${traitId}/names/${lang}`, { name, description });
    await this.load();
  }

  async deleteName(traitId: number, lang: string) {
    await api.delete(`/api/traits/${traitId}/names/${lang}`);
    await this.load();
  }
}

export const traitStore = new TraitStore();
