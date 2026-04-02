import type { Language } from '@live-menu/shared';
import { api } from '$lib/api/client';

class LanguagesStore {
  languages = $state<Language[]>([]);
  isLoading = $state(false);

  async loadLanguages() {
    this.isLoading = true;
    try {
      this.languages = await api.get<Language[]>('/api/languages');
    } catch (error) {
      console.error('Failed to load languages:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async addLanguage(code: string, displayName: string) {
    const lang = await api.post<Language>('/api/languages', { code, displayName });
    this.languages = [...this.languages, lang];
    return lang;
  }

  async deleteLanguage(code: string) {
    await api.delete(`/api/languages/${code}`);
    this.languages = this.languages.filter(l => l.code !== code);
  }

  get baseLanguage() {
    return this.languages.find(l => l.is_base);
  }
}

export const languagesStore = new LanguagesStore();
