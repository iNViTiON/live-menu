import { tick } from 'svelte';
import type { GalleryPageWithDetails, Language, PublicGalleryResponse } from '@live-menu/shared';
import { isScheduleVisible } from './schedule-utils';

class GalleryStore {
  pages = $state.raw<GalleryPageWithDetails[]>([]);
  languages = $state.raw<Language[]>([]);
  settings = $state.raw<Record<string, string>>({});
  version = $state(0);
  selectedLanguage = $state('GB');
  isLoading = $state(true);
  error = $state<string | null>(null);
  currentTime = $state(new Date());

  visiblePages = $derived.by(() =>
    this.pages.filter((p) =>
      p.is_visible &&
      isScheduleVisible(p.schedule_start, p.schedule_end, p.availabilityRules, this.currentTime)
    )
  );

  get baseLanguage() {
    return 'GB';
  }

  getMediaVariant(page: GalleryPageWithDetails, lang: string) {
    let media = page.media.find((m) => m.language_code === lang);
    if (!media) media = page.media.find((m) => m.language_code === this.baseLanguage);
    return media || null;
  }

  getMediaUrl(page: GalleryPageWithDetails, lang: string): string | null {
    const media = this.getMediaVariant(page, lang);
    return media ? `/media/${media.r2_key}` : null;
  }

  getName(page: GalleryPageWithDetails, lang: string): string {
    let name = page.names.find((n) => n.language_code === lang);
    if (!name) name = page.names.find((n) => n.language_code === this.baseLanguage);
    if (!name) name = page.names[0];
    return name?.name || '';
  }

  async load() {
    try {
      if (this.pages.length === 0) this.isLoading = true;
      this.error = null;
      const res = await fetch('/api/public/gallery');
      if (!res.ok) throw new Error('Failed to load gallery');
      const data: PublicGalleryResponse = await res.json();

      const scrollEl = document.querySelector('.scroll-container');
      const savedScroll = scrollEl?.scrollTop ?? 0;

      this.pages = data.pages;
      this.languages = data.languages;
      this.version = data.version;

      requestAnimationFrame(() => {
        if (scrollEl) (scrollEl as HTMLElement).scrollTop = savedScroll;
      });
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to load gallery:', err);
    } finally {
      this.isLoading = false;
    }
  }

  startSchedulePolling(): () => void {
    const id = setInterval(() => {
      this.currentTime = new Date();
    }, 60_000);
    return () => clearInterval(id);
  }

  async setLanguage(code: string) {
    const scrollEl = document.querySelector('.scroll-container') as HTMLElement | null;
    const savedScroll = scrollEl?.scrollTop ?? 0;

    const items = document.querySelectorAll<HTMLElement>('.media-item');
    items.forEach((el) => { el.style.minHeight = `${el.offsetHeight}px`; });

    this.selectedLanguage = code;

    await tick();
    if (scrollEl) scrollEl.scrollTop = savedScroll;

    setTimeout(() => {
      items.forEach((el) => { el.style.minHeight = ''; });
    }, 500);
  }

  resetToDefault() {
    this.selectedLanguage = 'GB';
  }
}

export const galleryStore = new GalleryStore();
