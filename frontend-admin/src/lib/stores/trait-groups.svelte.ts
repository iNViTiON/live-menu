import type { TraitGroupWithDetails, TraitWithDetails } from '@live-menu/shared';
import { api } from '$lib/api/client';

class TraitGroupStore {
  items = $state.raw<TraitGroupWithDetails[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);

  async load() {
    this.isLoading = true;
    this.error = null;
    try {
      this.items = await api.get<TraitGroupWithDetails[]>('/api/trait-groups');
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Failed to load trait groups';
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async create() {
    const group = await api.post<TraitGroupWithDetails>('/api/trait-groups');
    this.items = [...this.items, group];
    return group;
  }

  async remove(id: number) {
    await api.delete(`/api/trait-groups/${id}`);
    this.items = this.items.filter(g => g.id !== id);
  }

  async reorder(orderedItems: TraitGroupWithDetails[]) {
    const items = orderedItems.map((item, index) => ({ id: item.id, sort_order: index }));
    await api.put('/api/trait-groups/reorder', { items });
    this.items = orderedItems;
  }

  async setName(groupId: number, lang: string, name: string, description: string) {
    await api.put(`/api/trait-groups/${groupId}/names/${lang}`, { name, description });
    await this.load();
  }

  async deleteName(groupId: number, lang: string) {
    await api.delete(`/api/trait-groups/${groupId}/names/${lang}`);
    await this.load();
  }

  async addTrait(groupId: number, traitId: number) {
    await api.put(`/api/trait-groups/${groupId}/traits/${traitId}`);
    await this.load();
  }

  async removeTrait(groupId: number, traitId: number) {
    await api.delete(`/api/trait-groups/${groupId}/traits/${traitId}`);
    await this.load();
  }

  async reorderTraits(groupId: number, orderedTraits: TraitWithDetails[]) {
    const items = orderedTraits.map((t, index) => ({ id: t.id, sort_order: index }));
    await api.put(`/api/trait-groups/${groupId}/traits/reorder`, { items });
    await this.load();
  }
}

export const traitGroupStore = new TraitGroupStore();
