import type { MenuItemWithDetails } from '@live-menu/shared';
import { api } from '$lib/api/client';

class MenuStore {
  items = $state<MenuItemWithDetails[]>([]);
  isLoading = $state(false);

  async loadItems() {
    this.isLoading = true;
    try {
      this.items = await api.get<MenuItemWithDetails[]>('/api/menu/items');
    } catch (error) {
      console.error('Failed to load menu items:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async createItem() {
    const item = await api.post<MenuItemWithDetails>('/api/menu/items');
    this.items = [...this.items, item];
    return item;
  }

  async updateItem(id: number, data: { is_visible?: boolean }) {
    const updated = await api.patch<MenuItemWithDetails>(`/api/menu/items/${id}`, data);
    this.items = this.items.map(i => (i.id === id ? updated : i));
    return updated;
  }

  async deleteItem(id: number) {
    await api.delete(`/api/menu/items/${id}`);
    this.items = this.items.filter(i => i.id !== id);
  }

  async reorderItems(orderedItems: MenuItemWithDetails[]) {
    const order = orderedItems.map((item, index) => ({ id: item.id, sort_order: index }));
    await api.post('/api/menu/items/reorder', { order });
    this.items = orderedItems;
  }

  async setName(itemId: number, lang: string, name: string) {
    const updated = await api.put<MenuItemWithDetails>(`/api/menu/items/${itemId}/names/${lang}`, { name });
    this.items = this.items.map(i => (i.id === itemId ? updated : i));
    return updated;
  }

  async deleteName(itemId: number, lang: string) {
    const updated = await api.delete<MenuItemWithDetails>(`/api/menu/items/${itemId}/names/${lang}`);
    this.items = this.items.map(i => (i.id === itemId ? updated : i));
  }

  async uploadMedia(itemId: number, lang: string, file: File) {
    const updated = await api.upload<MenuItemWithDetails>(
      `/api/menu/items/${itemId}/media/${lang}`,
      file
    );
    this.items = this.items.map(i => (i.id === itemId ? updated : i));
    return updated;
  }

  async deleteMedia(itemId: number, lang: string) {
    const updated = await api.delete<MenuItemWithDetails>(`/api/menu/items/${itemId}/media/${lang}`);
    this.items = this.items.map(i => (i.id === itemId ? updated : i));
  }
}

export const menuStore = new MenuStore();
