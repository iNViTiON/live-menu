import type { MenuItemWithDetails } from '@live-menu/shared';
import { api } from '$lib/api/client';

class MenuStore {
  items = $state.raw<MenuItemWithDetails[]>([]);
  isLoading = $state(false);
  /** True while a local mutation is in flight — suppresses WS-triggered reloads */
  mutating = false;
  private mutatingTimer: ReturnType<typeof setTimeout> | null = null;

  async loadItems() {
    // Only show loading on initial load — refreshes must not destroy
    // the MenuItemList component tree (which resets expandedId).
    if (this.items.length === 0) this.isLoading = true;
    try {
      this.items = await api.get<MenuItemWithDetails[]>('/api/menu-items');
    } catch (error) {
      console.error('Failed to load menu items:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private async mutate(fn: () => Promise<void>) {
    this.mutating = true;
    if (this.mutatingTimer) clearTimeout(this.mutatingTimer);
    try {
      await fn();
    } finally {
      // Keep the guard up briefly so the WS echo doesn't trigger a reload
      this.mutatingTimer = setTimeout(() => { this.mutating = false; }, 500);
    }
  }

  async createItem() {
    await this.mutate(async () => {
      await api.post('/api/menu-items');
      await this.loadItems();
    });
  }

  async updateItem(id: number, data: { is_visible?: boolean; is_unavailable?: boolean; base_price?: number }) {
    await this.mutate(async () => {
      await api.patch(`/api/menu-items/${id}`, data);
      await this.loadItems();
    });
  }

  async deleteItem(id: number) {
    await this.mutate(async () => {
      await api.delete(`/api/menu-items/${id}`);
      this.items = this.items.filter(i => i.id !== id);
    });
  }

  async reorderItems(orderedItems: MenuItemWithDetails[]) {
    await this.mutate(async () => {
      const items = orderedItems.map((item, index) => ({ id: item.id, sort_order: index }));
      await api.put('/api/menu-items/reorder', { items });
      this.items = orderedItems;
    });
  }

  async setName(itemId: number, lang: string, name: string, description?: string) {
    await this.mutate(async () => {
      await api.put(`/api/menu-items/${itemId}/names/${lang}`, { name, description });
      await this.loadItems();
    });
  }

  async deleteName(itemId: number, lang: string) {
    await this.mutate(async () => {
      await api.delete(`/api/menu-items/${itemId}/names/${lang}`);
      await this.loadItems();
    });
  }

  async assignTrait(itemId: number, traitId: number) {
    await this.mutate(async () => {
      await api.put(`/api/menu-items/${itemId}/traits/${traitId}`);
      await this.loadItems();
    });
  }

  async removeTrait(itemId: number, traitId: number) {
    await this.mutate(async () => {
      await api.delete(`/api/menu-items/${itemId}/traits/${traitId}`);
      await this.loadItems();
    });
  }

  async assignOptionGroup(itemId: number, groupId: number) {
    await this.mutate(async () => {
      await api.put(`/api/menu-items/${itemId}/option-groups/${groupId}`);
      await this.loadItems();
    });
  }

  async removeOptionGroup(itemId: number, groupId: number) {
    await this.mutate(async () => {
      await api.delete(`/api/menu-items/${itemId}/option-groups/${groupId}`);
      await this.loadItems();
    });
  }

  async uploadMedia(itemId: number, lang: string, file: File) {
    await this.mutate(async () => {
      await api.upload(`/api/menu-items/${itemId}/media/${lang}`, file);
      await this.loadItems();
    });
  }

  async deleteMedia(itemId: number, lang: string) {
    await this.mutate(async () => {
      await api.delete(`/api/menu-items/${itemId}/media/${lang}`);
      await this.loadItems();
    });
  }

}

export const menuStore = new MenuStore();
