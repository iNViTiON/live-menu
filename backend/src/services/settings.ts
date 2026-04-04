import type { Setting } from '@live-menu/shared';

export class SettingsService {
  constructor(private db: D1Database) {}

  /** Get all settings as a key→value map */
  async getAll(): Promise<Record<string, string>> {
    const rows = await this.db
      .prepare('SELECT * FROM settings')
      .all<Setting>();

    return Object.fromEntries(rows.results.map((r) => [r.key, r.value]));
  }

  /** Get a single setting value */
  async get(key: string): Promise<string | null> {
    const row = await this.db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .bind(key)
      .first<{ value: string }>();

    return row?.value ?? null;
  }

  /** Upsert a setting */
  async set(key: string, value: string): Promise<Setting> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .bind(key, value, now)
      .run();

    const row = await this.db
      .prepare('SELECT * FROM settings WHERE key = ?')
      .bind(key)
      .first<Setting>();

    return row!;
  }

  /** Delete a setting */
  async delete(key: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM settings WHERE key = ?')
      .bind(key)
      .run();
  }
}
