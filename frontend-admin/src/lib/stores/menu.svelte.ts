import type { MenuItemWithDetails } from '@live-menu/shared';
import { api } from '$lib/api/client';

class MenuStore {
  items = $state<MenuItemWithDetails[]>([]);
  isLoading = $state(false);

  async loadItems() {
    this.isLoading = true;
    try {
      this.items = await api.get<MenuItemWithDetails[]>('/api/menu-items');
    } catch (error) {
      console.error('Failed to load menu items:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async createItem() {
    await api.post('/api/menu-items');
    await this.loadItems();
  }

  async updateItem(id: number, data: { is_visible?: boolean }) {
    await api.patch(`/api/menu-items/${id}`, data);
    await this.loadItems();
  }

  async deleteItem(id: number) {
    await api.delete(`/api/menu-items/${id}`);
    this.items = this.items.filter(i => i.id !== id);
  }

  async reorderItems(orderedItems: MenuItemWithDetails[]) {
    const items = orderedItems.map((item, index) => ({ id: item.id, sort_order: index }));
    await api.put('/api/menu-items/reorder', { items });
    this.items = orderedItems;
  }

  async setName(itemId: number, lang: string, name: string) {
    await api.put(`/api/menu-items/${itemId}/names/${lang}`, { name });
    await this.loadItems();
  }

  async deleteName(itemId: number, lang: string) {
    await api.delete(`/api/menu-items/${itemId}/names/${lang}`);
    await this.loadItems();
  }

  async uploadMedia(itemId: number, lang: string, file: File) {
    await api.upload(`/api/menu-items/${itemId}/media/${lang}`, file);
    await this.loadItems();
  }

  async deleteMedia(itemId: number, lang: string) {
    await api.delete(`/api/menu-items/${itemId}/media/${lang}`);
    await this.loadItems();
  }
}

export const menuStore = new MenuStore();
