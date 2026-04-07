import type { Language } from '@live-menu/shared';

export class LanguageService {
  constructor(
    private db: D1Database,
    private bucket: R2Bucket
  ) {}

  /** List all languages ordered by sort_order */
  async list(): Promise<Language[]> {
    const result = await this.db
      .prepare('SELECT * FROM languages ORDER BY sort_order')
      .all<Language>();
    return result.results;
  }

  /** Add a new language. code must be exactly 2 chars. */
  async add(code: string, displayName: string): Promise<Language> {
    const now = Math.floor(Date.now() / 1000);
    const lang = await this.db
      .prepare(
        `INSERT INTO languages (code, display_name, is_base, sort_order, created_at)
         VALUES (?, ?, 0, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM languages), ?)
         RETURNING *`
      )
      .bind(code, displayName, now)
      .first<Language>();
    return lang!;
  }

  /**
   * Delete a language.
   * Cannot delete the base language.
   * Cleans up R2 objects for all media_variants in this language before deleting.
   * FK CASCADE handles DB rows for menu_item_names and media_variants.
   */
  async delete(code: string): Promise<void> {
    const lang = await this.db
      .prepare('SELECT is_base FROM languages WHERE code = ?')
      .bind(code)
      .first<{ is_base: number }>();

    if (!lang) {
      throw new Error('Language not found');
    }

    if (lang.is_base) {
      throw new Error('Cannot delete the base language');
    }

    // Get R2 keys for all media variants in this language
    const mediaRows = await this.db
      .prepare('SELECT r2_key FROM media_variants WHERE language_code = ?')
      .bind(code)
      .all<{ r2_key: string }>();

    // Delete R2 objects
    await Promise.all(
      mediaRows.results.map((row) => this.bucket.delete(row.r2_key))
    );

    // Delete language — FK CASCADE removes menu_item_names and media_variants rows
    await this.db
      .prepare('DELETE FROM languages WHERE code = ?')
      .bind(code)
      .run();
  }
}
