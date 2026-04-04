import type { OptionGroupWithDetails, OptionWithDetails } from '@live-menu/shared';
import { api } from '$lib/api/client';

class OptionGroupStore {
  items = $state.raw<OptionGroupWithDetails[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);

  async load() {
    this.isLoading = true;
    this.error = null;
    try {
      this.items = await api.get<OptionGroupWithDetails[]>('/api/option-groups');
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Failed to load option groups';
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async create() {
    const group = await api.post<OptionGroupWithDetails>('/api/option-groups');
    this.items = [...this.items, group];
    return group;
  }

  async update(id: number, data: { multi_select?: boolean; required?: boolean }) {
    await api.patch(`/api/option-groups/${id}`, data);
    await this.load();
  }

  async remove(id: number) {
    await api.delete(`/api/option-groups/${id}`);
    this.items = this.items.filter(g => g.id !== id);
  }

  async reorder(orderedItems: OptionGroupWithDetails[]) {
    const items = orderedItems.map((item, index) => ({ id: item.id, sort_order: index }));
    await api.put('/api/option-groups/reorder', { items });
    this.items = orderedItems;
  }

  async setName(groupId: number, lang: string, name: string, description: string) {
    await api.put(`/api/option-groups/${groupId}/names/${lang}`, { name, description });
    await this.load();
  }

  async deleteName(groupId: number, lang: string) {
    await api.delete(`/api/option-groups/${groupId}/names/${lang}`);
    await this.load();
  }

  async createOption(groupId: number) {
    const option = await api.post<OptionWithDetails>('/api/options', { option_group_id: groupId });
    await this.load();
    return option;
  }

  async updateOption(optionId: number, data: { price_delta?: number }) {
    await api.patch(`/api/options/${optionId}`, data);
    await this.load();
  }

  async removeOption(optionId: number) {
    await api.delete(`/api/options/${optionId}`);
    await this.load();
  }

  async reorderOptions(orderedOptions: OptionWithDetails[]) {
    const items = orderedOptions.map((o, index) => ({ id: o.id, sort_order: index }));
    await api.put('/api/options/reorder', { items });
    await this.load();
  }

  async setOptionName(optionId: number, lang: string, name: string, description: string) {
    await api.put(`/api/options/${optionId}/names/${lang}`, { name, description });
    await this.load();
  }

  async deleteOptionName(optionId: number, lang: string) {
    await api.delete(`/api/options/${optionId}/names/${lang}`);
    await this.load();
  }
}

export const optionGroupStore = new OptionGroupStore();
