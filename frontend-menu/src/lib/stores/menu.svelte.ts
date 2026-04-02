import type { MenuItemWithDetails, Language, PublicMenuResponse } from '@live-menu/shared';

class MenuStore {
  items = $state<MenuItemWithDetails[]>([]);
  languages = $state<Language[]>([]);
  version = $state(0);
  selectedLanguage = $state('GB');
  isLoading = $state(true);
  error = $state<string | null>(null);

  get baseLanguage() {
    return 'GB';
  }

  getMediaUrl(item: MenuItemWithDetails): string | null {
    let media = item.media.find((m) => m.language_code === this.selectedLanguage);
    if (!media) {
      media = item.media.find((m) => m.language_code === this.baseLanguage);
    }
    return media ? `/media/${media.r2_key}` : null;
  }

  getMediaVariant(item: MenuItemWithDetails) {
    let media = item.media.find((m) => m.language_code === this.selectedLanguage);
    if (!media) {
      media = item.media.find((m) => m.language_code === this.baseLanguage);
    }
    return media || null;
  }

  getName(item: MenuItemWithDetails): string {
    let name = item.names.find((n) => n.language_code === this.selectedLanguage);
    if (!name) {
      name = item.names.find((n) => n.language_code === this.baseLanguage);
    }
    return name?.name || '';
  }

  async load() {
    try {
      this.isLoading = true;
      this.error = null;
      const res = await fetch('/api/public/menu');
      if (!res.ok) throw new Error('Failed to load menu');
      const data: PublicMenuResponse = await res.json();
      this.items = data.items;
      this.languages = data.languages;
      this.version = data.version;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to load menu:', err);
    } finally {
      this.isLoading = false;
    }
  }

  setLanguage(code: string) {
    this.selectedLanguage = code;
  }

  resetToDefault() {
    this.selectedLanguage = 'GB';
  }
}

export const menuStore = new MenuStore();
