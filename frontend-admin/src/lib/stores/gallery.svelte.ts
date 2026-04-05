import type { GalleryPageWithDetails } from '@live-menu/shared';
import { api } from '$lib/api/client';

export type { GalleryPageWithDetails } from '@live-menu/shared';

type RuleData = {
  start_time: string;
  end_time: string;
  day_sun: number;
  day_mon: number;
  day_tue: number;
  day_wed: number;
  day_thu: number;
  day_fri: number;
  day_sat: number;
};

class GalleryStore {
  pages = $state.raw<GalleryPageWithDetails[]>([]);
  isLoading = $state(false);
  error = $state<string | null>(null);
  mutating = false;
  private mutatingTimer: ReturnType<typeof setTimeout> | null = null;

  private async mutate(fn: () => Promise<void>) {
    this.mutating = true;
    if (this.mutatingTimer) clearTimeout(this.mutatingTimer);
    try {
      await fn();
    } finally {
      this.mutatingTimer = setTimeout(() => { this.mutating = false; }, 500);
    }
  }

  async loadPages() {
    if (this.pages.length === 0) this.isLoading = true;
    try {
      this.error = null;
      this.pages = await api.get<GalleryPageWithDetails[]>('/api/gallery');
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Failed to load gallery pages';
      console.error('Failed to load gallery pages:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async createPage() {
    await this.mutate(async () => {
      await api.post('/api/gallery');
      await this.loadPages();
    });
  }

  async updatePage(id: number, data: { is_visible?: boolean; schedule_start?: string | null; schedule_end?: string | null }) {
    await this.mutate(async () => {
      await api.patch(`/api/gallery/${id}`, data);
      await this.loadPages();
    });
  }

  async deletePage(id: number) {
    await this.mutate(async () => {
      await api.delete(`/api/gallery/${id}`);
      this.pages = this.pages.filter(p => p.id !== id);
    });
  }

  async reorderPages(orderedPages: GalleryPageWithDetails[]) {
    await this.mutate(async () => {
      const items = orderedPages.map((p, index) => ({ id: p.id, sort_order: index }));
      await api.put('/api/gallery/reorder', { items });
      this.pages = orderedPages;
    });
  }

  async setName(pageId: number, lang: string, name: string, description?: string) {
    await this.mutate(async () => {
      await api.put(`/api/gallery/${pageId}/names/${lang}`, { name, description: description ?? null });
      await this.loadPages();
    });
  }

  async deleteName(pageId: number, lang: string) {
    await this.mutate(async () => {
      await api.delete(`/api/gallery/${pageId}/names/${lang}`);
      await this.loadPages();
    });
  }

  async uploadMedia(pageId: number, lang: string, file: File) {
    await this.mutate(async () => {
      await api.upload(`/api/gallery/${pageId}/media/${lang}`, file);
      await this.loadPages();
    });
  }

  async deleteMedia(pageId: number, lang: string) {
    await this.mutate(async () => {
      await api.delete(`/api/gallery/${pageId}/media/${lang}`);
      await this.loadPages();
    });
  }

  async createRule(pageId: number, data: RuleData) {
    await this.mutate(async () => {
      await api.post(`/api/gallery/${pageId}/availability-rules`, data);
      await this.loadPages();
    });
  }

  async updateRule(ruleId: number, data: Partial<RuleData>) {
    await this.mutate(async () => {
      await api.patch(`/api/gallery/availability-rules/${ruleId}`, data);
      await this.loadPages();
    });
  }

  async deleteRule(ruleId: number) {
    await this.mutate(async () => {
      await api.delete(`/api/gallery/availability-rules/${ruleId}`);
      await this.loadPages();
    });
  }
}

export const galleryStore = new GalleryStore();
