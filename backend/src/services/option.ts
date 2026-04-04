import type { Option, OptionName, OptionWithDetails } from '@live-menu/shared';

export class OptionService {
  constructor(private db: D1Database) {}

  /** List all options with names, optionally filtered by option group */
  async list(groupId?: number): Promise<OptionWithDetails[]> {
    const options = groupId !== undefined
      ? await this.db
          .prepare('SELECT * FROM options WHERE option_group_id = ? ORDER BY sort_order')
          .bind(groupId)
          .all<Option>()
      : await this.db
          .prepare('SELECT * FROM options ORDER BY sort_order')
          .all<Option>();

    if (options.results.length === 0) return [];

    const ids = options.results.map((o) => o.id);
    const placeholders = ids.map(() => '?').join(',');

    const names = await this.db
      .prepare(`SELECT * FROM option_names WHERE option_id IN (${placeholders})`)
      .bind(...ids)
      .all<OptionName>();

    const namesByOption = Map.groupBy(names.results, (n: OptionName) => n.option_id);

    return options.results.map((opt) => ({
      ...opt,
      names: namesByOption.get(opt.id) ?? [],
    }));
  }

  /** Create a new option in a group with sort_order = max + 1 */
  async create(groupId: number): Promise<Option> {
    const now = Math.floor(Date.now() / 1000);

    const maxRow = await this.db
      .prepare('SELECT MAX(sort_order) as max_order FROM options WHERE option_group_id = ?')
      .bind(groupId)
      .first<{ max_order: number | null }>();

    const sortOrder = (maxRow?.max_order ?? -1) + 1;

    const result = await this.db
      .prepare(
        'INSERT INTO options (option_group_id, price_delta, sort_order, created_at, updated_at) VALUES (?, 0, ?, ?, ?)'
      )
      .bind(groupId, sortOrder, now, now)
      .run();

    const option = await this.db
      .prepare('SELECT * FROM options WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<Option>();

    return option!;
  }

  /** Update price_delta for an option */
  async update(id: number, data: { price_delta?: number }): Promise<Option> {
    const now = Math.floor(Date.now() / 1000);

    if (data.price_delta !== undefined) {
      await this.db
        .prepare('UPDATE options SET price_delta = ?, updated_at = ? WHERE id = ?')
        .bind(data.price_delta, now, id)
        .run();
    }

    const option = await this.db
      .prepare('SELECT * FROM options WHERE id = ?')
      .bind(id)
      .first<Option>();

    return option!;
  }

  /** Delete an option (FK CASCADE removes names) */
  async delete(id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM options WHERE id = ?')
      .bind(id)
      .run();
  }

  /** Batch update sort_order for multiple options */
  async reorder(items: { id: number; sort_order: number }[]): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.db.batch(
      items.map((item) =>
        this.db
          .prepare('UPDATE options SET sort_order = ?, updated_at = ? WHERE id = ?')
          .bind(item.sort_order, now, item.id)
      )
    );
  }

  /** Upsert a name for an option + language */
  async setName(
    optionId: number,
    langCode: string,
    name: string,
    description: string | null
  ): Promise<OptionName> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO option_names (option_id, language_code, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(option_id, language_code) DO UPDATE
           SET name = excluded.name, description = excluded.description, updated_at = excluded.updated_at`
      )
      .bind(optionId, langCode, name, description, now, now)
      .run();

    const row = await this.db
      .prepare('SELECT * FROM option_names WHERE option_id = ? AND language_code = ?')
      .bind(optionId, langCode)
      .first<OptionName>();

    return row!;
  }

  /** Delete a name for an option + language */
  async deleteName(optionId: number, langCode: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM option_names WHERE option_id = ? AND language_code = ?')
      .bind(optionId, langCode)
      .run();
  }
}
