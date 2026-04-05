import type {
  GalleryPage,
  GalleryPageName,
  GalleryPageMedia,
  GalleryAvailabilityRule,
  GalleryPageWithDetails,
  Language,
} from '@live-menu/shared';

type MediaType = 'image' | 'video';

export class GalleryService {
  constructor(
    private db: D1Database,
    private bucket: R2Bucket
  ) {}

  /** List all gallery pages with names, media, and availability rules */
  async list(): Promise<GalleryPageWithDetails[]> {
    const pages = await this.db
      .prepare('SELECT * FROM gallery_pages ORDER BY sort_order')
      .all<GalleryPage>();

    if (pages.results.length === 0) return [];

    return this._hydrate(pages.results);
  }

  /** Get a single gallery page with details */
  async getById(id: number): Promise<GalleryPageWithDetails | null> {
    const page = await this.db
      .prepare('SELECT * FROM gallery_pages WHERE id = ?')
      .bind(id)
      .first<GalleryPage>();

    if (!page) return null;

    const [namesResult, mediaResult, rulesResult] = await this.db.batch([
      this.db.prepare('SELECT * FROM gallery_page_names WHERE gallery_page_id = ?').bind(id),
      this.db.prepare('SELECT * FROM gallery_page_media WHERE gallery_page_id = ?').bind(id),
      this.db.prepare('SELECT * FROM gallery_page_availability_rules WHERE gallery_page_id = ? ORDER BY id').bind(id),
    ]);

    return {
      ...page,
      names: namesResult.results as GalleryPageName[],
      media: mediaResult.results as GalleryPageMedia[],
      availabilityRules: rulesResult.results as GalleryAvailabilityRule[],
    };
  }

  /** Create a new gallery page with sort_order = max + 1 */
  async create(): Promise<GalleryPage> {
    const now = new Date().toISOString();

    const maxRow = await this.db
      .prepare('SELECT MAX(sort_order) as max_order FROM gallery_pages')
      .first<{ max_order: number | null }>();

    const sortOrder = (maxRow?.max_order ?? -1) + 1;

    const result = await this.db
      .prepare(
        'INSERT INTO gallery_pages (sort_order, is_visible, created_at, updated_at) VALUES (?, 1, ?, ?)'
      )
      .bind(sortOrder, now, now)
      .run();

    const page = await this.db
      .prepare('SELECT * FROM gallery_pages WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<GalleryPage>();

    return page!;
  }

  /** Update is_visible, schedule_start, and/or schedule_end on a gallery page */
  async update(id: number, data: {
    is_visible?: boolean;
    schedule_start?: string | null;
    schedule_end?: string | null;
  }): Promise<GalleryPage | null> {
    const now = new Date().toISOString();
    const setClauses: string[] = [];
    const binds: (number | string | null)[] = [];

    if (data.is_visible !== undefined) {
      setClauses.push('is_visible = ?');
      binds.push(data.is_visible ? 1 : 0);
    }
    if ('schedule_start' in data) {
      setClauses.push('schedule_start = ?');
      binds.push(data.schedule_start ?? null);
    }
    if ('schedule_end' in data) {
      setClauses.push('schedule_end = ?');
      binds.push(data.schedule_end ?? null);
    }

    if (setClauses.length === 0) {
      return this.db.prepare('SELECT * FROM gallery_pages WHERE id = ?').bind(id).first<GalleryPage>();
    }

    setClauses.push('updated_at = ?');
    binds.push(now);

    const result = await this.db
      .prepare(`UPDATE gallery_pages SET ${setClauses.join(', ')} WHERE id = ?`)
      .bind(...binds, id)
      .run();

    if (result.meta.changes === 0) return null;

    return this.db.prepare('SELECT * FROM gallery_pages WHERE id = ?').bind(id).first<GalleryPage>();
  }

  /**
   * Delete a gallery page.
   * Collects R2 keys before deletion; FK CASCADE handles names, media, and rules.
   */
  async delete(id: number): Promise<string[]> {
    const mediaRows = await this.db
      .prepare('SELECT r2_key FROM gallery_page_media WHERE gallery_page_id = ?')
      .bind(id)
      .all<{ r2_key: string }>();

    const r2Keys = mediaRows.results.map((r) => r.r2_key);

    await this.db
      .prepare('DELETE FROM gallery_pages WHERE id = ?')
      .bind(id)
      .run();

    return r2Keys;
  }

  /** Batch update sort_order for multiple pages */
  async reorder(items: { id: number; sort_order: number }[]): Promise<void> {
    const now = new Date().toISOString();
    await this.db.batch(
      items.map((item) =>
        this.db
          .prepare('UPDATE gallery_pages SET sort_order = ?, updated_at = ? WHERE id = ?')
          .bind(item.sort_order, now, item.id)
      )
    );
  }

  /** Upsert a name for a gallery page + language */
  async setName(
    pageId: number,
    languageCode: string,
    name: string,
    description: string | null
  ): Promise<GalleryPageName> {
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO gallery_page_names (gallery_page_id, language_code, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(gallery_page_id, language_code) DO UPDATE
           SET name = excluded.name, description = excluded.description, updated_at = excluded.updated_at`
      )
      .bind(pageId, languageCode, name, description, now, now)
      .run();

    const row = await this.db
      .prepare('SELECT * FROM gallery_page_names WHERE gallery_page_id = ? AND language_code = ?')
      .bind(pageId, languageCode)
      .first<GalleryPageName>();

    return row!;
  }

  /** Delete a name for a gallery page + language */
  async deleteName(pageId: number, languageCode: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM gallery_page_names WHERE gallery_page_id = ? AND language_code = ?')
      .bind(pageId, languageCode)
      .run();
  }

  /** Upload media for a gallery page + language (replaces existing) */
  async uploadMedia(
    pageId: number,
    languageCode: string,
    file: File
  ): Promise<GalleryPageMedia> {
    const contentType = file.type;

    const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']);
    if (!ALLOWED_TYPES.has(contentType)) throw new Error('Unsupported file type');

    const mediaType: MediaType = contentType.startsWith('video/') ? 'video' : 'image';
    const ext = contentType.split('/')[1]?.split(';')[0] ?? 'bin';
    const r2Key = `gallery/${pageId}/${languageCode}/${crypto.randomUUID()}.${ext}`;

    // Delete existing media if any
    const existing = await this.db
      .prepare('SELECT r2_key FROM gallery_page_media WHERE gallery_page_id = ? AND language_code = ?')
      .bind(pageId, languageCode)
      .first<{ r2_key: string }>();

    if (existing) {
      await Promise.all([
        this.bucket.delete(existing.r2_key),
        this.db
          .prepare('DELETE FROM gallery_page_media WHERE gallery_page_id = ? AND language_code = ?')
          .bind(pageId, languageCode)
          .run(),
      ]);
    }

    await this.bucket.put(r2Key, file.stream(), { httpMetadata: { contentType } });

    const now = new Date().toISOString();
    const result = await this.db
      .prepare(
        `INSERT INTO gallery_page_media
           (gallery_page_id, language_code, media_type, r2_key, original_filename, content_type, file_size, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(pageId, languageCode, mediaType, r2Key, file.name ?? '', contentType, file.size, now, now)
      .run();

    const media = await this.db
      .prepare('SELECT * FROM gallery_page_media WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<GalleryPageMedia>();

    return media!;
  }

  /** Delete media for a gallery page + language (R2 + DB) */
  async deleteMedia(pageId: number, languageCode: string): Promise<void> {
    const media = await this.db
      .prepare('SELECT r2_key FROM gallery_page_media WHERE gallery_page_id = ? AND language_code = ?')
      .bind(pageId, languageCode)
      .first<{ r2_key: string }>();

    if (!media) return;

    await Promise.all([
      this.bucket.delete(media.r2_key),
      this.db
        .prepare('DELETE FROM gallery_page_media WHERE gallery_page_id = ? AND language_code = ?')
        .bind(pageId, languageCode)
        .run(),
    ]);
  }

  /** List all availability rules for a gallery page */
  async listRules(pageId: number): Promise<GalleryAvailabilityRule[]> {
    const result = await this.db
      .prepare('SELECT * FROM gallery_page_availability_rules WHERE gallery_page_id = ? ORDER BY id')
      .bind(pageId)
      .all<GalleryAvailabilityRule>();
    return result.results;
  }

  /** Create an availability rule for a gallery page */
  async createRule(pageId: number, data: {
    start_time: string;
    end_time: string;
    day_sun: number;
    day_mon: number;
    day_tue: number;
    day_wed: number;
    day_thu: number;
    day_fri: number;
    day_sat: number;
  }): Promise<GalleryAvailabilityRule> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare(
        `INSERT INTO gallery_page_availability_rules
         (gallery_page_id, start_time, end_time, day_sun, day_mon, day_tue, day_wed, day_thu, day_fri, day_sat, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(pageId, data.start_time, data.end_time, data.day_sun, data.day_mon, data.day_tue, data.day_wed, data.day_thu, data.day_fri, data.day_sat, now, now)
      .run();

    const rule = await this.db
      .prepare('SELECT * FROM gallery_page_availability_rules WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<GalleryAvailabilityRule>();

    return rule!;
  }

  /** Update an availability rule — returns null if not found */
  async updateRule(ruleId: number, data: Partial<{
    start_time: string;
    end_time: string;
    day_sun: number;
    day_mon: number;
    day_tue: number;
    day_wed: number;
    day_thu: number;
    day_fri: number;
    day_sat: number;
  }>): Promise<GalleryAvailabilityRule | null> {
    const now = new Date().toISOString();
    const setClauses: string[] = [];
    const binds: (string | number)[] = [];

    if (data.start_time !== undefined) { setClauses.push('start_time = ?'); binds.push(data.start_time); }
    if (data.end_time !== undefined) { setClauses.push('end_time = ?'); binds.push(data.end_time); }
    if (data.day_sun !== undefined) { setClauses.push('day_sun = ?'); binds.push(data.day_sun); }
    if (data.day_mon !== undefined) { setClauses.push('day_mon = ?'); binds.push(data.day_mon); }
    if (data.day_tue !== undefined) { setClauses.push('day_tue = ?'); binds.push(data.day_tue); }
    if (data.day_wed !== undefined) { setClauses.push('day_wed = ?'); binds.push(data.day_wed); }
    if (data.day_thu !== undefined) { setClauses.push('day_thu = ?'); binds.push(data.day_thu); }
    if (data.day_fri !== undefined) { setClauses.push('day_fri = ?'); binds.push(data.day_fri); }
    if (data.day_sat !== undefined) { setClauses.push('day_sat = ?'); binds.push(data.day_sat); }

    setClauses.push('updated_at = ?');
    binds.push(now);

    const result = await this.db
      .prepare(`UPDATE gallery_page_availability_rules SET ${setClauses.join(', ')} WHERE id = ?`)
      .bind(...binds, ruleId)
      .run();

    if (result.meta.changes === 0) return null;

    return this.db
      .prepare('SELECT * FROM gallery_page_availability_rules WHERE id = ?')
      .bind(ruleId)
      .first<GalleryAvailabilityRule>();
  }

  /** Delete an availability rule — returns false if not found */
  async deleteRule(ruleId: number): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM gallery_page_availability_rules WHERE id = ?')
      .bind(ruleId)
      .run();
    return result.meta.changes > 0;
  }

  /**
   * Fetch all data needed for the public gallery endpoint.
   * Returns visible pages with names, media, rules, and languages.
   */
  async listPublicGallery(): Promise<{
    pages: GalleryPageWithDetails[];
    languages: Language[];
  }> {
    const pagesResult = await this.db
      .prepare('SELECT * FROM gallery_pages WHERE is_visible = 1 ORDER BY sort_order')
      .all<GalleryPage>();

    const [langResult] = await this.db.batch([
      this.db.prepare('SELECT * FROM languages ORDER BY sort_order'),
    ]);

    const languages = langResult.results as Language[];

    if (pagesResult.results.length === 0) {
      return { pages: [], languages };
    }

    const pages = await this._hydrate(pagesResult.results);
    return { pages, languages };
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  private async _hydrate(pages: GalleryPage[]): Promise<GalleryPageWithDetails[]> {
    const ids = pages.map((p) => p.id);
    const placeholders = ids.map(() => '?').join(',');

    const [namesResult, mediaResult, rulesResult] = await this.db.batch([
      this.db.prepare(`SELECT * FROM gallery_page_names WHERE gallery_page_id IN (${placeholders})`).bind(...ids),
      this.db.prepare(`SELECT * FROM gallery_page_media WHERE gallery_page_id IN (${placeholders})`).bind(...ids),
      this.db.prepare(`SELECT * FROM gallery_page_availability_rules WHERE gallery_page_id IN (${placeholders}) ORDER BY id`).bind(...ids),
    ]);

    const allNames = namesResult.results as GalleryPageName[];
    const allMedia = mediaResult.results as GalleryPageMedia[];
    const allRules = rulesResult.results as GalleryAvailabilityRule[];

    const namesByPage = Map.groupBy(allNames, (n: GalleryPageName) => n.gallery_page_id);
    const mediaByPage = Map.groupBy(allMedia, (m: GalleryPageMedia) => m.gallery_page_id);
    const rulesByPage = Map.groupBy(allRules, (r: GalleryAvailabilityRule) => r.gallery_page_id);

    return pages.map((page) => ({
      ...page,
      names: namesByPage.get(page.id) ?? [],
      media: mediaByPage.get(page.id) ?? [],
      availabilityRules: rulesByPage.get(page.id) ?? [],
    }));
  }
}
