import type { Option, OptionGroup, OptionGroupName, OptionGroupWithDetails, OptionName } from '@live-menu/shared';

export class OptionGroupService {
  constructor(private db: D1Database) {}

  /** List all option groups with names and options (with option names) */
  async list(): Promise<OptionGroupWithDetails[]> {
    const [groupsResult, names, options, optionNames] = await this.db.batch([
      this.db.prepare('SELECT * FROM option_groups ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM option_group_names'),
      this.db.prepare('SELECT * FROM options ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM option_names'),
    ]) as [D1Result<OptionGroup>, D1Result<OptionGroupName>, D1Result<Option>, D1Result<OptionName>];

    if (groupsResult.results.length === 0) return [];

    const namesByGroup = Map.groupBy(names.results, (n: OptionGroupName) => n.option_group_id);
    const optionsByGroup = Map.groupBy(options.results, (o: Option) => o.option_group_id);
    const namesByOption = Map.groupBy(optionNames.results, (n: OptionName) => n.option_id);

    return groupsResult.results.map((group) => ({
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

    const [namesResult, optionsResult] = await this.db.batch([
      this.db.prepare('SELECT * FROM option_group_names WHERE option_group_id = ?').bind(id),
      this.db.prepare('SELECT * FROM options WHERE option_group_id = ? ORDER BY sort_order').bind(id),
    ]);

    const names = namesResult.results as OptionGroupName[];
    const options = optionsResult.results as Option[];
    const optionIds = options.map((o) => o.id);

    if (optionIds.length === 0) {
      return { ...group, names, options: [] };
    }

    const placeholders = optionIds.map(() => '?').join(',');
    const optionNames = await this.db
      .prepare(`SELECT * FROM option_names WHERE option_id IN (${placeholders})`)
      .bind(...optionIds)
      .all<OptionName>();

    const namesByOption = Map.groupBy(optionNames.results, (n: OptionName) => n.option_id);

    return {
      ...group,
      names,
      options: options.map((opt: Option) => ({
        ...opt,
        names: namesByOption.get(opt.id) ?? [],
      })),
    };
  }

  /** Create a new option group with sort_order = max + 1 */
  async create(): Promise<OptionGroup> {
    const now = Math.floor(Date.now() / 1000);
    const group = await this.db
      .prepare(
        `INSERT INTO option_groups (multi_select, required, sort_order, created_at, updated_at)
         VALUES (0, 0, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM option_groups), ?, ?)
         RETURNING *`
      )
      .bind(now, now)
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

    const group = await this.db
      .prepare(`UPDATE option_groups SET ${setClauses.join(', ')} WHERE id = ? RETURNING *`)
      .bind(...binds, id)
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

    const row = await this.db
      .prepare(
        `INSERT INTO option_group_names (option_group_id, language_code, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(option_group_id, language_code) DO UPDATE
           SET name = excluded.name, description = excluded.description, updated_at = excluded.updated_at
         RETURNING *`
      )
      .bind(groupId, langCode, name, description, now, now)
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
