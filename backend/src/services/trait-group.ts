import type { Trait, TraitGroup, TraitGroupName, TraitGroupWithDetails, TraitName } from '@live-menu/shared';

export class TraitGroupService {
  constructor(private db: D1Database) {}

  /** List all groups with names and trait memberships (with trait names) */
  async list(): Promise<TraitGroupWithDetails[]> {
    const groups = await this.db
      .prepare('SELECT * FROM trait_groups ORDER BY sort_order')
      .all<TraitGroup>();

    if (groups.results.length === 0) return [];

    const [names, allTraits, allTraitNames, junctions] = await Promise.all([
      this.db.prepare('SELECT * FROM trait_group_names').all<TraitGroupName>(),
      this.db.prepare('SELECT * FROM traits ORDER BY sort_order').all<Trait>(),
      this.db.prepare('SELECT * FROM trait_names').all<TraitName>(),
      this.db
        .prepare('SELECT * FROM trait_group_traits ORDER BY sort_order')
        .all<{ trait_group_id: number; trait_id: number; sort_order: number }>(),
    ]);

    const namesByGroup = Map.groupBy(names.results, (n: TraitGroupName) => n.trait_group_id);
    const traitsById = new Map(allTraits.results.map((t) => [t.id, t]));
    const traitNamesByTrait = Map.groupBy(allTraitNames.results, (n: TraitName) => n.trait_id);
    const junctionsByGroup = Map.groupBy(junctions.results, (j: { trait_group_id: number; trait_id: number; sort_order: number }) => j.trait_group_id);

    return groups.results.map((group) => ({
      ...group,
      names: namesByGroup.get(group.id) ?? [],
      traits: (junctionsByGroup.get(group.id) ?? []).flatMap((j: { trait_group_id: number; trait_id: number; sort_order: number }) => {
        const trait = traitsById.get(j.trait_id);
        if (!trait) return [];
        return [{ ...trait, names: traitNamesByTrait.get(j.trait_id) ?? [] }];
      }),
    }));
  }

  /** Get a single group with names and trait memberships */
  async getById(id: number): Promise<TraitGroupWithDetails | null> {
    const group = await this.db
      .prepare('SELECT * FROM trait_groups WHERE id = ?')
      .bind(id)
      .first<TraitGroup>();

    if (!group) return null;

    const [names, junctions] = await Promise.all([
      this.db
        .prepare('SELECT * FROM trait_group_names WHERE trait_group_id = ?')
        .bind(id)
        .all<TraitGroupName>(),
      this.db
        .prepare(
          'SELECT * FROM trait_group_traits WHERE trait_group_id = ? ORDER BY sort_order'
        )
        .bind(id)
        .all<{ trait_group_id: number; trait_id: number; sort_order: number }>(),
    ]);

    const traitIds = junctions.results.map((j) => j.trait_id);

    if (traitIds.length === 0) {
      return { ...group, names: names.results, traits: [] };
    }

    const placeholders = traitIds.map(() => '?').join(',');
    const [allTraits, allTraitNames] = await Promise.all([
      this.db
        .prepare(`SELECT * FROM traits WHERE id IN (${placeholders})`)
        .bind(...traitIds)
        .all<Trait>(),
      this.db
        .prepare(`SELECT * FROM trait_names WHERE trait_id IN (${placeholders})`)
        .bind(...traitIds)
        .all<TraitName>(),
    ]);

    const traitsById = new Map(allTraits.results.map((t) => [t.id, t]));
    const traitNamesByTrait = Map.groupBy(allTraitNames.results, (n: TraitName) => n.trait_id);

    return {
      ...group,
      names: names.results,
      traits: junctions.results.flatMap((j) => {
        const trait = traitsById.get(j.trait_id);
        if (!trait) return [];
        return [{ ...trait, names: traitNamesByTrait.get(j.trait_id) ?? [] }];
      }),
    };
  }

  /** Create a new trait group with sort_order = max + 1 */
  async create(): Promise<TraitGroup> {
    const now = Math.floor(Date.now() / 1000);

    const maxRow = await this.db
      .prepare('SELECT MAX(sort_order) as max_order FROM trait_groups')
      .first<{ max_order: number | null }>();

    const sortOrder = (maxRow?.max_order ?? -1) + 1;

    const result = await this.db
      .prepare('INSERT INTO trait_groups (sort_order, created_at, updated_at) VALUES (?, ?, ?)')
      .bind(sortOrder, now, now)
      .run();

    const group = await this.db
      .prepare('SELECT * FROM trait_groups WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<TraitGroup>();

    return group!;
  }

  /** Delete a trait group (FK CASCADE removes names and junction rows) */
  async delete(id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM trait_groups WHERE id = ?')
      .bind(id)
      .run();
  }

  /** Batch update sort_order for multiple trait groups */
  async reorder(items: { id: number; sort_order: number }[]): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.db.batch(
      items.map((item) =>
        this.db
          .prepare('UPDATE trait_groups SET sort_order = ?, updated_at = ? WHERE id = ?')
          .bind(item.sort_order, now, item.id)
      )
    );
  }

  /** Upsert a name for a trait group + language */
  async setName(
    groupId: number,
    langCode: string,
    name: string,
    description: string | null
  ): Promise<TraitGroupName> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(trait_group_id, language_code) DO UPDATE
           SET name = excluded.name, description = excluded.description, updated_at = excluded.updated_at`
      )
      .bind(groupId, langCode, name, description, now, now)
      .run();

    const row = await this.db
      .prepare('SELECT * FROM trait_group_names WHERE trait_group_id = ? AND language_code = ?')
      .bind(groupId, langCode)
      .first<TraitGroupName>();

    return row!;
  }

  /** Delete a name for a trait group + language */
  async deleteName(groupId: number, langCode: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM trait_group_names WHERE trait_group_id = ? AND language_code = ?')
      .bind(groupId, langCode)
      .run();
  }

  /** Add a trait to a group (idempotent) */
  async addTrait(groupId: number, traitId: number): Promise<void> {
    const maxRow = await this.db
      .prepare(
        'SELECT MAX(sort_order) as max_order FROM trait_group_traits WHERE trait_group_id = ?'
      )
      .bind(groupId)
      .first<{ max_order: number | null }>();

    const sortOrder = (maxRow?.max_order ?? -1) + 1;

    await this.db
      .prepare(
        'INSERT OR IGNORE INTO trait_group_traits (trait_group_id, trait_id, sort_order) VALUES (?, ?, ?)'
      )
      .bind(groupId, traitId, sortOrder)
      .run();
  }

  /** Remove a trait from a group */
  async removeTrait(groupId: number, traitId: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM trait_group_traits WHERE trait_group_id = ? AND trait_id = ?')
      .bind(groupId, traitId)
      .run();
  }

  /** Batch reorder traits within a group (items.id = traitId) */
  async reorderTraits(groupId: number, items: { id: number; sort_order: number }[]): Promise<void> {
    await this.db.batch(
      items.map((item) =>
        this.db
          .prepare(
            'UPDATE trait_group_traits SET sort_order = ? WHERE trait_group_id = ? AND trait_id = ?'
          )
          .bind(item.sort_order, groupId, item.id)
      )
    );
  }
}
