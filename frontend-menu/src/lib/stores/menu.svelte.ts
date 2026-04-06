import { tick } from 'svelte';
import type { MenuItemWithDetails, Language, PublicMenuResponse, TraitGroupWithDetails, OptionGroupWithDetails } from '@live-menu/shared';
import { languageStore } from './language.svelte';

class MenuStore {
  items = $state.raw<MenuItemWithDetails[]>([]);
  languages = $state.raw<Language[]>([]);
  traitGroups = $state.raw<TraitGroupWithDetails[]>([]);
  optionGroups = $state.raw<OptionGroupWithDetails[]>([]);
  settings = $state.raw<Record<string, string>>({});
  isLoading = $state(true);

  get selectedLanguage() { return languageStore.selectedLanguage; }
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
      // Only show loading spinner on initial load — refreshes must not
      // destroy the scroll-container (which resets scrollTop to 0).
      if (this.items.length === 0) this.isLoading = true;
      this.error = null;
      const res = await fetch('/api/public/menu');
      if (!res.ok) throw new Error('Failed to load menu');
      const data: PublicMenuResponse = await res.json();

      const scrollEl = document.querySelector('.scroll-container');
      const savedScroll = scrollEl?.scrollTop ?? 0;

      this.items = data.items;
      this.languages = data.languages;
      this.traitGroups = data.traitGroups;
      this.optionGroups = data.optionGroups;
      this.settings = data.settings ?? {};

      requestAnimationFrame(() => {
        if (scrollEl) (scrollEl as HTMLElement).scrollTop = savedScroll;
      });
    } catch (err: unknown) {
      if (this.items.length === 0) {
        this.error = err instanceof Error ? err.message : 'Unknown error';
      }
      console.error('Failed to load menu:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async setLanguage(code: string) {
    const scrollEl = document.querySelector('.scroll-container') as HTMLElement | null;
    const savedScroll = scrollEl?.scrollTop ?? 0;

    // Lock each media item's height to prevent collapse while new images load
    const items = document.querySelectorAll<HTMLElement>('.media-item');
    items.forEach((el) => { el.style.minHeight = `${el.offsetHeight}px`; });

    languageStore.selectedLanguage = code;

    // tick() resolves after Svelte DOM update but before browser paint
    await tick();
    if (scrollEl) scrollEl.scrollTop = savedScroll;

    // Release height locks after images have loaded
    setTimeout(() => {
      items.forEach((el) => { el.style.minHeight = ''; });
    }, 500);
  }

  resetToDefault() {
    languageStore.resetToDefault();
  }
}

export const menuStore = new MenuStore();
