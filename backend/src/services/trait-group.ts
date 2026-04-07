import type { Trait, TraitGroup, TraitGroupName, TraitGroupWithDetails, TraitName } from '@live-menu/shared';

export class TraitGroupService {
  constructor(private db: D1Database) {}

  /** List all groups with names and trait memberships (with trait names) */
  async list(): Promise<TraitGroupWithDetails[]> {
    const [groupsResult, names, allTraits, allTraitNames, junctions] = await this.db.batch([
      this.db.prepare('SELECT * FROM trait_groups ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM trait_group_names'),
      this.db.prepare('SELECT * FROM traits ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM trait_names'),
      this.db.prepare('SELECT * FROM trait_group_traits ORDER BY sort_order'),
    ]) as [
      D1Result<TraitGroup>,
      D1Result<TraitGroupName>,
      D1Result<Trait>,
      D1Result<TraitName>,
      D1Result<{ trait_group_id: number; trait_id: number; sort_order: number }>,
    ];

    if (groupsResult.results.length === 0) return [];

    const namesByGroup = Map.groupBy(names.results, (n: TraitGroupName) => n.trait_group_id);
    const traitsById = new Map(allTraits.results.map((t) => [t.id, t]));
    const traitNamesByTrait = Map.groupBy(allTraitNames.results, (n: TraitName) => n.trait_id);
    const junctionsByGroup = Map.groupBy(junctions.results, (j: { trait_group_id: number; trait_id: number; sort_order: number }) => j.trait_group_id);

    return groupsResult.results.map((group) => ({
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

    const [namesResult, junctionsResult] = await this.db.batch([
      this.db.prepare('SELECT * FROM trait_group_names WHERE trait_group_id = ?').bind(id),
      this.db.prepare('SELECT * FROM trait_group_traits WHERE trait_group_id = ? ORDER BY sort_order').bind(id),
    ]);

    const names = namesResult.results as TraitGroupName[];
    const junctions = junctionsResult.results as { trait_group_id: number; trait_id: number; sort_order: number }[];
    const traitIds = junctions.map((j) => j.trait_id);

    if (traitIds.length === 0) {
      return { ...group, names, traits: [] };
    }

    const placeholders = traitIds.map(() => '?').join(',');
    const [allTraitsResult, allTraitNamesResult] = await this.db.batch([
      this.db.prepare(`SELECT * FROM traits WHERE id IN (${placeholders})`).bind(...traitIds),
      this.db.prepare(`SELECT * FROM trait_names WHERE trait_id IN (${placeholders})`).bind(...traitIds),
    ]);

    const allTraits = allTraitsResult.results as Trait[];
    const allTraitNames = allTraitNamesResult.results as TraitName[];
    const traitsById = new Map(allTraits.map((t) => [t.id, t]));
    const traitNamesByTrait = Map.groupBy(allTraitNames, (n: TraitName) => n.trait_id);

    return {
      ...group,
      names,
      traits: junctions.flatMap((j) => {
        const trait = traitsById.get(j.trait_id);
        if (!trait) return [];
        return [{ ...trait, names: traitNamesByTrait.get(j.trait_id) ?? [] }];
      }),
    };
  }

  /** Create a new trait group with sort_order = max + 1 */
  async create(): Promise<TraitGroup> {
    const now = Math.floor(Date.now() / 1000);
    const group = await this.db
      .prepare(
        `INSERT INTO trait_groups (sort_order, created_at, updated_at)
         VALUES ((SELECT COALESCE(MAX(sort_order), -1) + 1 FROM trait_groups), ?, ?)
         RETURNING *`
      )
      .bind(now, now)
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

    const row = await this.db
      .prepare(
        `INSERT INTO trait_group_names (trait_group_id, language_code, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(trait_group_id, language_code) DO UPDATE
           SET name = excluded.name, description = excluded.description, updated_at = excluded.updated_at
         RETURNING *`
      )
      .bind(groupId, langCode, name, description, now, now)
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
    await this.db
      .prepare(
        'INSERT OR IGNORE INTO trait_group_traits (trait_group_id, trait_id, sort_order) VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM trait_group_traits WHERE trait_group_id = ?))'
      )
      .bind(groupId, traitId, groupId)
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
