import { api } from '$lib/api/client';

class SettingsStore {
  settings = $state.raw<Record<string, string>>({});
  isLoading = $state(false);
  error = $state<string | null>(null);

  async load() {
    this.isLoading = true;
    this.error = null;
    try {
      this.settings = await api.get<Record<string, string>>('/api/settings');
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Failed to load settings';
      throw err;
    } finally {
      this.isLoading = false;
    }
  }

  async set(key: string, value: string) {
    await api.put(`/api/settings/${key}`, { value });
    this.settings = { ...this.settings, [key]: value };
  }
}

export const settingsStore = new SettingsStore();
