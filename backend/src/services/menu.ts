import type {
  MenuItem,
  MenuItemName,
  MediaVariant,
  MenuItemWithDetails,
  Trait,
  TraitName,
  TraitGroup,
  TraitGroupName,
  TraitGroupWithDetails,
  OptionGroup,
  OptionGroupName,
  OptionGroupWithDetails,
  Option,
  OptionName,
  Language,
  Setting,
} from '@live-menu/shared';

export class MenuService {
  constructor(private db: D1Database) {}

  /** List all menu items with names, media, traits, and option groups */
  async list(): Promise<MenuItemWithDetails[]> {
    const items = await this.db
      .prepare('SELECT * FROM menu_items ORDER BY sort_order')
      .all<MenuItem>();

    if (items.results.length === 0) return [];

    return this._hydrate(items.results);
  }

  /** List only visible menu items with names, media, traits, and option groups */
  async listVisible(): Promise<MenuItemWithDetails[]> {
    const items = await this.db
      .prepare('SELECT * FROM menu_items WHERE is_visible = 1 ORDER BY sort_order')
      .all<MenuItem>();

    if (items.results.length === 0) return [];

    const ids = items.results.map((item) => item.id);
    const placeholders = ids.map(() => '?').join(',');

    const batchResults = await this.db.batch([
      this.db.prepare(`SELECT * FROM menu_item_names WHERE menu_item_id IN (${placeholders})`).bind(...ids),
      this.db.prepare(`SELECT * FROM media_variants WHERE menu_item_id IN (${placeholders})`).bind(...ids),
      this.db.prepare(`SELECT * FROM menu_item_traits WHERE menu_item_id IN (${placeholders})`).bind(...ids),
      this.db.prepare(`SELECT * FROM menu_item_option_groups WHERE menu_item_id IN (${placeholders})`).bind(...ids),
      this.db.prepare('SELECT * FROM traits ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM trait_names'),
      this.db.prepare('SELECT * FROM option_groups ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM option_group_names'),
      this.db.prepare('SELECT * FROM options ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM option_names'),
    ]);

    return this._assemble(
      items.results,
      batchResults[0].results as MenuItemName[],
      batchResults[1].results as MediaVariant[],
      batchResults[2].results as { menu_item_id: number; trait_id: number }[],
      batchResults[3].results as { menu_item_id: number; option_group_id: number }[],
      batchResults[4].results as Trait[],
      batchResults[5].results as TraitName[],
      batchResults[6].results as OptionGroup[],
      batchResults[7].results as OptionGroupName[],
      batchResults[8].results as Option[],
      batchResults[9].results as OptionName[]
    );
  }

  /**
   * Fetch all data needed for the public menu endpoint in 2 round-trips.
   * Returns items, traitGroups, optionGroups, languages, and settings —
   * eliminating the separate language and settings queries from the route.
   */
  async listPublicMenu(): Promise<{
    items: MenuItemWithDetails[];
    traitGroups: TraitGroupWithDetails[];
    optionGroups: OptionGroupWithDetails[];
    languages: Language[];
    settings: Record<string, string>;
  }> {
    const visibleResult = await this.db
      .prepare('SELECT * FROM menu_items WHERE is_visible = 1 ORDER BY sort_order')
      .all<MenuItem>();

    if (visibleResult.results.length === 0) {
      const [langResult, settingResult] = await this.db.batch([
        this.db.prepare('SELECT * FROM languages ORDER BY sort_order'),
        this.db.prepare('SELECT * FROM settings'),
      ]);
      const languages = langResult.results as Language[];
      const settings = Object.fromEntries(
        (settingResult.results as Setting[]).map((r) => [r.key, r.value])
      );
      return { items: [], traitGroups: [], optionGroups: [], languages, settings };
    }

    const ids = visibleResult.results.map((item) => item.id);
    const placeholders = ids.map(() => '?').join(',');

    const batchResults = await this.db.batch([
      this.db.prepare(`SELECT * FROM menu_item_names WHERE menu_item_id IN (${placeholders})`).bind(...ids),
      this.db.prepare(`SELECT * FROM media_variants WHERE menu_item_id IN (${placeholders})`).bind(...ids),
      this.db.prepare(`SELECT * FROM menu_item_traits WHERE menu_item_id IN (${placeholders})`).bind(...ids),
      this.db.prepare(`SELECT * FROM menu_item_option_groups WHERE menu_item_id IN (${placeholders})`).bind(...ids),
      this.db.prepare('SELECT * FROM traits ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM trait_names'),
      this.db.prepare('SELECT * FROM trait_groups ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM trait_group_names'),
      this.db.prepare('SELECT * FROM trait_group_traits ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM option_groups ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM option_group_names'),
      this.db.prepare('SELECT * FROM options ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM option_names'),
      this.db.prepare('SELECT * FROM languages ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM settings'),
    ]);

    const allTraits = batchResults[4].results as Trait[];
    const allTraitNames = batchResults[5].results as TraitName[];
    const allOptionGroups = batchResults[9].results as OptionGroup[];
    const allOptionGroupNames = batchResults[10].results as OptionGroupName[];
    const allOptions = batchResults[11].results as Option[];
    const allOptionNames = batchResults[12].results as OptionName[];
    const languages = batchResults[13].results as Language[];
    const settings = Object.fromEntries(
      (batchResults[14].results as Setting[]).map((r) => [r.key, r.value])
    );

    const items = this._assemble(
      visibleResult.results,
      batchResults[0].results as MenuItemName[],
      batchResults[1].results as MediaVariant[],
      batchResults[2].results as { menu_item_id: number; trait_id: number }[],
      batchResults[3].results as { menu_item_id: number; option_group_id: number }[],
      allTraits,
      allTraitNames,
      allOptionGroups,
      allOptionGroupNames,
      allOptions,
      allOptionNames
    );

    const allTraitGroups = batchResults[6].results as TraitGroup[];
    const allTraitGroupNames = batchResults[7].results as TraitGroupName[];
    const allTraitGroupJunctions = batchResults[8].results as { trait_group_id: number; trait_id: number; sort_order: number }[];

    const tgNamesByGroup = Map.groupBy(allTraitGroupNames, (n: TraitGroupName) => n.trait_group_id);
    const traitsById = new Map(allTraits.map((t) => [t.id, t]));
    const traitNamesByTrait = Map.groupBy(allTraitNames, (n: TraitName) => n.trait_id);
    const junctionsByGroup = Map.groupBy(allTraitGroupJunctions, (j: { trait_group_id: number; trait_id: number; sort_order: number }) => j.trait_group_id);

    const traitGroups: TraitGroupWithDetails[] = allTraitGroups.map((group) => ({
      ...group,
      names: tgNamesByGroup.get(group.id) ?? [],
      traits: (junctionsByGroup.get(group.id) ?? []).flatMap((j) => {
        const trait = traitsById.get(j.trait_id);
        if (!trait) return [];
        return [{ ...trait, names: traitNamesByTrait.get(j.trait_id) ?? [] }];
      }),
    }));

    const ogNamesByGroup = Map.groupBy(allOptionGroupNames, (n: OptionGroupName) => n.option_group_id);
    const optionsByGroup = Map.groupBy(allOptions, (o: Option) => o.option_group_id);
    const optNamesByOption = Map.groupBy(allOptionNames, (n: OptionName) => n.option_id);

    const optionGroups: OptionGroupWithDetails[] = allOptionGroups.map((group) => ({
      ...group,
      names: ogNamesByGroup.get(group.id) ?? [],
      options: (optionsByGroup.get(group.id) ?? []).map((opt) => ({
        ...opt,
        names: optNamesByOption.get(opt.id) ?? [],
      })),
    }));

    return { items, traitGroups, optionGroups, languages, settings };
  }

  /** Get a single item with names, media, traits, and option groups */
  async getById(id: number): Promise<MenuItemWithDetails | null> {
    const item = await this.db
      .prepare('SELECT * FROM menu_items WHERE id = ?')
      .bind(id)
      .first<MenuItem>();

    if (!item) return null;

    const [names, media, traitJunctions, ogJunctions] = await Promise.all([
      this.db
        .prepare('SELECT * FROM menu_item_names WHERE menu_item_id = ?')
        .bind(id)
        .all<MenuItemName>(),
      this.db
        .prepare('SELECT * FROM media_variants WHERE menu_item_id = ?')
        .bind(id)
        .all<MediaVariant>(),
      this.db
        .prepare('SELECT * FROM menu_item_traits WHERE menu_item_id = ?')
        .bind(id)
        .all<{ menu_item_id: number; trait_id: number }>(),
      this.db
        .prepare('SELECT * FROM menu_item_option_groups WHERE menu_item_id = ?')
        .bind(id)
        .all<{ menu_item_id: number; option_group_id: number }>(),
    ]);

    const traitIds = traitJunctions.results.map((j) => j.trait_id);
    const ogIds = ogJunctions.results.map((j) => j.option_group_id);

    const [traits, traitNames, optionGroups, ogNames, options, optionNames] = await Promise.all([
      traitIds.length > 0
        ? this.db
            .prepare(`SELECT * FROM traits WHERE id IN (${traitIds.map(() => '?').join(',')})`)
            .bind(...traitIds)
            .all<Trait>()
        : Promise.resolve({ results: [] }),
      traitIds.length > 0
        ? this.db
            .prepare(`SELECT * FROM trait_names WHERE trait_id IN (${traitIds.map(() => '?').join(',')})`)
            .bind(...traitIds)
            .all<TraitName>()
        : Promise.resolve({ results: [] }),
      ogIds.length > 0
        ? this.db
            .prepare(`SELECT * FROM option_groups WHERE id IN (${ogIds.map(() => '?').join(',')})`)
            .bind(...ogIds)
            .all<OptionGroup>()
        : Promise.resolve({ results: [] }),
      ogIds.length > 0
        ? this.db
            .prepare(`SELECT * FROM option_group_names WHERE option_group_id IN (${ogIds.map(() => '?').join(',')})`)
            .bind(...ogIds)
            .all<OptionGroupName>()
        : Promise.resolve({ results: [] }),
      ogIds.length > 0
        ? this.db
            .prepare(`SELECT * FROM options WHERE option_group_id IN (${ogIds.map(() => '?').join(',')}) ORDER BY sort_order`)
            .bind(...ogIds)
            .all<Option>()
        : Promise.resolve({ results: [] }),
      ogIds.length > 0
        ? this.db
            .prepare('SELECT * FROM option_names')
            .all<OptionName>()
        : Promise.resolve({ results: [] }),
    ]);

    const traitNamesByTrait = Map.groupBy(traitNames.results, (n: TraitName) => n.trait_id);
    const ogNamesById = Map.groupBy(ogNames.results, (n: OptionGroupName) => n.option_group_id);
    const optsByGroup = Map.groupBy(options.results, (o: Option) => o.option_group_id);
    const optNamesByOpt = Map.groupBy(optionNames.results, (n: OptionName) => n.option_id);
    const traitsById = new Map(traits.results.map((t) => [t.id, t]));
    const ogById = new Map(optionGroups.results.map((g) => [g.id, g]));

    return {
      ...item,
      names: names.results,
      media: media.results,
      traits: traitJunctions.results.flatMap((j) => {
        const trait = traitsById.get(j.trait_id);
        if (!trait) return [];
        return [{ ...trait, names: traitNamesByTrait.get(j.trait_id) ?? [] }];
      }),
      optionGroups: ogJunctions.results.flatMap((j) => {
        const group = ogById.get(j.option_group_id);
        if (!group) return [];
        return [{
          ...group,
          names: ogNamesById.get(j.option_group_id) ?? [],
          options: (optsByGroup.get(j.option_group_id) ?? []).map((opt: Option) => ({
            ...opt,
            names: optNamesByOpt.get(opt.id) ?? [],
          })),
        }];
      }),
    };
  }

  /** Create a new menu item with sort_order = max + 1 */
  async create(): Promise<MenuItem> {
    const now = Math.floor(Date.now() / 1000);

    const maxRow = await this.db
      .prepare('SELECT MAX(sort_order) as max_order FROM menu_items')
      .first<{ max_order: number | null }>();

    const sortOrder = (maxRow?.max_order ?? -1) + 1;

    const result = await this.db
      .prepare(
        'INSERT INTO menu_items (sort_order, is_visible, base_price, created_at, updated_at) VALUES (?, 1, 0, ?, ?)'
      )
      .bind(sortOrder, now, now)
      .run();

    const item = await this.db
      .prepare('SELECT * FROM menu_items WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<MenuItem>();

    return item!;
  }

  /** Update is_visible and/or base_price on a menu item */
  async update(id: number, data: { is_visible?: boolean; base_price?: number }): Promise<MenuItem> {
    const now = Math.floor(Date.now() / 1000);
    const setClauses: string[] = [];
    const binds: (number)[] = [];

    if (data.is_visible !== undefined) {
      setClauses.push('is_visible = ?');
      binds.push(data.is_visible ? 1 : 0);
    }
    if (data.base_price !== undefined) {
      setClauses.push('base_price = ?');
      binds.push(data.base_price);
    }
    setClauses.push('updated_at = ?');
    binds.push(now);

    await this.db
      .prepare(`UPDATE menu_items SET ${setClauses.join(', ')} WHERE id = ?`)
      .bind(...binds, id)
      .run();

    const item = await this.db
      .prepare('SELECT * FROM menu_items WHERE id = ?')
      .bind(id)
      .first<MenuItem>();

    return item!;
  }

  /**
   * Delete a menu item.
   * Returns R2 keys of media variants (caller handles R2 cleanup).
   * FK CASCADE handles names, media_variants, and junction rows.
   */
  async delete(id: number): Promise<string[]> {
    const mediaRows = await this.db
      .prepare('SELECT r2_key FROM media_variants WHERE menu_item_id = ?')
      .bind(id)
      .all<{ r2_key: string }>();

    const r2Keys = mediaRows.results.map((r) => r.r2_key);

    await this.db
      .prepare('DELETE FROM menu_items WHERE id = ?')
      .bind(id)
      .run();

    return r2Keys;
  }

  /** Batch update sort_order for multiple items */
  async reorder(items: { id: number; sort_order: number }[]): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.db.batch(
      items.map((item) =>
        this.db
          .prepare('UPDATE menu_items SET sort_order = ?, updated_at = ? WHERE id = ?')
          .bind(item.sort_order, now, item.id)
      )
    );
  }

  /** Upsert a name for a menu item + language */
  async setName(
    menuItemId: number,
    languageCode: string,
    name: string,
    description: string | null
  ): Promise<MenuItemName> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO menu_item_names (menu_item_id, language_code, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(menu_item_id, language_code) DO UPDATE
           SET name = excluded.name, description = excluded.description, updated_at = excluded.updated_at`
      )
      .bind(menuItemId, languageCode, name, description, now, now)
      .run();

    const row = await this.db
      .prepare('SELECT * FROM menu_item_names WHERE menu_item_id = ? AND language_code = ?')
      .bind(menuItemId, languageCode)
      .first<MenuItemName>();

    return row!;
  }

  /** Delete a name for a menu item + language */
  async deleteName(menuItemId: number, languageCode: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM menu_item_names WHERE menu_item_id = ? AND language_code = ?')
      .bind(menuItemId, languageCode)
      .run();
  }

  /** Assign a trait to a menu item (idempotent) */
  async addTrait(itemId: number, traitId: number): Promise<void> {
    await this.db
      .prepare('INSERT OR IGNORE INTO menu_item_traits (menu_item_id, trait_id) VALUES (?, ?)')
      .bind(itemId, traitId)
      .run();
  }

  /** Remove a trait from a menu item */
  async removeTrait(itemId: number, traitId: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM menu_item_traits WHERE menu_item_id = ? AND trait_id = ?')
      .bind(itemId, traitId)
      .run();
  }

  /** Assign an option group to a menu item (idempotent) */
  async addOptionGroup(itemId: number, groupId: number): Promise<void> {
    await this.db
      .prepare(
        'INSERT OR IGNORE INTO menu_item_option_groups (menu_item_id, option_group_id) VALUES (?, ?)'
      )
      .bind(itemId, groupId)
      .run();
  }

  /** Remove an option group from a menu item */
  async removeOptionGroup(itemId: number, groupId: number): Promise<void> {
    await this.db
      .prepare(
        'DELETE FROM menu_item_option_groups WHERE menu_item_id = ? AND option_group_id = ?'
      )
      .bind(itemId, groupId)
      .run();
  }

  // ── private helpers ──────────────────────────────────────────────────────────

  private async _hydrate(items: MenuItem[]): Promise<MenuItemWithDetails[]> {
    const ids = items.map((i) => i.id);
    const placeholders = ids.map(() => '?').join(',');

    const batchResults = await this.db.batch([
      this.db.prepare('SELECT * FROM menu_item_names'),
      this.db.prepare('SELECT * FROM media_variants'),
      this.db.prepare(`SELECT * FROM menu_item_traits WHERE menu_item_id IN (${placeholders})`).bind(...ids),
      this.db.prepare(`SELECT * FROM menu_item_option_groups WHERE menu_item_id IN (${placeholders})`).bind(...ids),
      this.db.prepare('SELECT * FROM traits ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM trait_names'),
      this.db.prepare('SELECT * FROM option_groups ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM option_group_names'),
      this.db.prepare('SELECT * FROM options ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM option_names'),
    ]);

    return this._assemble(
      items,
      batchResults[0].results as MenuItemName[],
      batchResults[1].results as MediaVariant[],
      batchResults[2].results as { menu_item_id: number; trait_id: number }[],
      batchResults[3].results as { menu_item_id: number; option_group_id: number }[],
      batchResults[4].results as Trait[],
      batchResults[5].results as TraitName[],
      batchResults[6].results as OptionGroup[],
      batchResults[7].results as OptionGroupName[],
      batchResults[8].results as Option[],
      batchResults[9].results as OptionName[]
    );
  }

  private _assemble(
    items: MenuItem[],
    names: MenuItemName[],
    media: MediaVariant[],
    traitJunctions: { menu_item_id: number; trait_id: number }[],
    ogJunctions: { menu_item_id: number; option_group_id: number }[],
    allTraits: Trait[],
    allTraitNames: TraitName[],
    allOptionGroups: OptionGroup[],
    allOptionGroupNames: OptionGroupName[],
    allOptions: Option[],
    allOptionNames: OptionName[]
  ): MenuItemWithDetails[] {
    const namesByItem = Map.groupBy(names, (n: MenuItemName) => n.menu_item_id);
    const mediaByItem = Map.groupBy(media, (m: MediaVariant) => m.menu_item_id);
    const traitsByItem = Map.groupBy(traitJunctions, (j: { menu_item_id: number; trait_id: number }) => j.menu_item_id);
    const ogByItem = Map.groupBy(ogJunctions, (j: { menu_item_id: number; option_group_id: number }) => j.menu_item_id);

    const traitsById = new Map(allTraits.map((t) => [t.id, t]));
    const traitNamesByTrait = Map.groupBy(allTraitNames, (n: TraitName) => n.trait_id);
    const ogById = new Map(allOptionGroups.map((g) => [g.id, g]));
    const ogNamesByGroup = Map.groupBy(allOptionGroupNames, (n: OptionGroupName) => n.option_group_id);
    const optsByGroup = Map.groupBy(allOptions, (o: Option) => o.option_group_id);
    const optNamesByOpt = Map.groupBy(allOptionNames, (n: OptionName) => n.option_id);

    return items.map((item) => ({
      ...item,
      names: namesByItem.get(item.id) ?? [],
      media: mediaByItem.get(item.id) ?? [],
      traits: (traitsByItem.get(item.id) ?? []).flatMap((j: { menu_item_id: number; trait_id: number }) => {
        const trait = traitsById.get(j.trait_id);
        if (!trait) return [];
        return [{ ...trait, names: traitNamesByTrait.get(j.trait_id) ?? [] }];
      }),
      optionGroups: (ogByItem.get(item.id) ?? []).flatMap((j: { menu_item_id: number; option_group_id: number }) => {
        const group = ogById.get(j.option_group_id);
        if (!group) return [];
        return [{
          ...group,
          names: ogNamesByGroup.get(j.option_group_id) ?? [],
          options: (optsByGroup.get(j.option_group_id) ?? []).map((opt: Option) => ({
            ...opt,
            names: optNamesByOpt.get(opt.id) ?? [],
          })),
        }];
      }),
    }));
  }
}
