import type { Option, OptionGroup, OptionGroupName, OptionGroupWithDetails, OptionName } from '@live-menu/shared';

export class OptionGroupService {
  constructor(private db: D1Database) {}

  /** List all option groups with names and options (with option names) */
  async list(): Promise<OptionGroupWithDetails[]> {
    const groups = await this.db
      .prepare('SELECT * FROM option_groups ORDER BY sort_order')
      .all<OptionGroup>();

    if (groups.results.length === 0) return [];

    const [names, options, optionNames] = await Promise.all([
      this.db.prepare('SELECT * FROM option_group_names').all<OptionGroupName>(),
      this.db.prepare('SELECT * FROM options ORDER BY sort_order').all<Option>(),
      this.db.prepare('SELECT * FROM option_names').all<OptionName>(),
    ]);

    const namesByGroup = Map.groupBy(names.results, (n: OptionGroupName) => n.option_group_id);
    const optionsByGroup = Map.groupBy(options.results, (o: Option) => o.option_group_id);
    const namesByOption = Map.groupBy(optionNames.results, (n: OptionName) => n.option_id);

    return groups.results.map((group) => ({
      ...group,
      names: namesByGroup.get(group.id) ?? [],
      options: (optionsByGroup.get(group.id) ?? []).map((opt: Option) => ({
        ...opt,
        names: namesByOption.get(opt.id) ?? [],
      })),
    }));
  }

  /** Get a single option group with names and options */
  async getById(id: number): Promise<OptionGroupWithDetails | null> {
    const group = await this.db
      .prepare('SELECT * FROM option_groups WHERE id = ?')
      .bind(id)
      .first<OptionGroup>();

    if (!group) return null;

    const [names, options] = await Promise.all([
      this.db
        .prepare('SELECT * FROM option_group_names WHERE option_group_id = ?')
        .bind(id)
        .all<OptionGroupName>(),
      this.db
        .prepare('SELECT * FROM options WHERE option_group_id = ? ORDER BY sort_order')
        .bind(id)
        .all<Option>(),
    ]);

    const optionIds = options.results.map((o) => o.id);

    if (optionIds.length === 0) {
      return { ...group, names: names.results, options: [] };
    }

    const placeholders = optionIds.map(() => '?').join(',');
    const optionNames = await this.db
      .prepare(`SELECT * FROM option_names WHERE option_id IN (${placeholders})`)
      .bind(...optionIds)
      .all<OptionName>();

    const namesByOption = Map.groupBy(optionNames.results, (n: OptionName) => n.option_id);

    return {
      ...group,
      names: names.results,
      options: options.results.map((opt: Option) => ({
        ...opt,
        names: namesByOption.get(opt.id) ?? [],
      })),
    };
  }

  /** Create a new option group with sort_order = max + 1 */
  async create(): Promise<OptionGroup> {
    const now = Math.floor(Date.now() / 1000);

    const maxRow = await this.db
      .prepare('SELECT MAX(sort_order) as max_order FROM option_groups')
      .first<{ max_order: number | null }>();

    const sortOrder = (maxRow?.max_order ?? -1) + 1;

    const result = await this.db
      .prepare(
        'INSERT INTO option_groups (multi_select, required, sort_order, created_at, updated_at) VALUES (0, 0, ?, ?, ?)'
      )
      .bind(sortOrder, now, now)
      .run();

    const group = await this.db
      .prepare('SELECT * FROM option_groups WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<OptionGroup>();

    return group!;
  }

  /** Update multi_select and/or required flags */
  async update(id: number, data: { multi_select?: number; required?: number }): Promise<OptionGroup> {
    const now = Math.floor(Date.now() / 1000);
    const setClauses: string[] = [];
    const binds: number[] = [];

    if (data.multi_select !== undefined) {
      setClauses.push('multi_select = ?');
      binds.push(data.multi_select);
    }
    if (data.required !== undefined) {
      setClauses.push('required = ?');
      binds.push(data.required);
    }
    setClauses.push('updated_at = ?');
    binds.push(now);

    await this.db
      .prepare(`UPDATE option_groups SET ${setClauses.join(', ')} WHERE id = ?`)
      .bind(...binds, id)
      .run();

    const group = await this.db
      .prepare('SELECT * FROM option_groups WHERE id = ?')
      .bind(id)
      .first<OptionGroup>();

    return group!;
  }

  /** Delete an option group (FK CASCADE removes names and options) */
  async delete(id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM option_groups WHERE id = ?')
      .bind(id)
      .run();
  }

  /** Batch update sort_order for multiple option groups */
  async reorder(items: { id: number; sort_order: number }[]): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.db.batch(
      items.map((item) =>
        this.db
          .prepare('UPDATE option_groups SET sort_order = ?, updated_at = ? WHERE id = ?')
          .bind(item.sort_order, now, item.id)
      )
    );
  }

  /** Upsert a name for an option group + language */
  async setName(
    groupId: number,
    langCode: string,
    name: string,
    description: string | null
  ): Promise<OptionGroupName> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(option_group_id, language_code) DO UPDATE
           SET name = excluded.name, description = excluded.description, updated_at = excluded.updated_at`
      )
      .bind(groupId, langCode, name, description, now, now)
      .run();

    const row = await this.db
      .prepare('SELECT * FROM option_group_names WHERE option_group_id = ? AND language_code = ?')
      .bind(groupId, langCode)
      .first<OptionGroupName>();

    return row!;
  }

  /** Delete a name for an option group + language */
  async deleteName(groupId: number, langCode: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM option_group_names WHERE option_group_id = ? AND language_code = ?')
      .bind(groupId, langCode)
      .run();
  }
}
