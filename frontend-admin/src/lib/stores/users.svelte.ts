import type { User } from '@live-menu/shared';
import { api } from '$lib/api/client';

class UsersStore {
  users = $state.raw<User[]>([]);
  isLoading = $state(false);

  async loadUsers() {
    this.isLoading = true;
    try {
      this.users = await api.get<User[]>('/api/users');
    } catch (error) {
      console.error('Failed to load users:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async updateUser(id: number, data: Partial<Pick<User, 'name' | 'role' | 'is_active'>>) {
    const updated = await api.patch<User>(`/api/users/${id}`, data);
    const index = this.users.findIndex(u => u.id === id);
    if (index !== -1) {
      this.users[index] = updated;
    }
    return updated;
  }

  async deleteUser(id: number) {
    await api.delete(`/api/users/${id}`);
    this.users = this.users.filter(u => u.id !== id);
  }
}

export const usersStore = new UsersStore();
