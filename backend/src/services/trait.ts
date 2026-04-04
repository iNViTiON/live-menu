import type { Trait, TraitName, TraitWithDetails } from '@live-menu/shared';

export class TraitService {
  constructor(private db: D1Database) {}

  /** List all traits with names, ordered by sort_order */
  async list(): Promise<TraitWithDetails[]> {
    const [traits, names] = await this.db.batch([
      this.db.prepare('SELECT * FROM traits ORDER BY sort_order'),
      this.db.prepare('SELECT * FROM trait_names'),
    ]) as [D1Result<Trait>, D1Result<TraitName>];

    if (traits.results.length === 0) return [];

    const namesByTrait = Map.groupBy(names.results, (n: TraitName) => n.trait_id);
    return traits.results.map((t) => ({
      ...t,
      names: namesByTrait.get(t.id) ?? [],
    }));
  }

  /** Get a single trait with names */
  async getById(id: number): Promise<TraitWithDetails | null> {
    const trait = await this.db
      .prepare('SELECT * FROM traits WHERE id = ?')
      .bind(id)
      .first<Trait>();

    if (!trait) return null;

    const names = await this.db
      .prepare('SELECT * FROM trait_names WHERE trait_id = ?')
      .bind(id)
      .all<TraitName>();

    return { ...trait, names: names.results };
  }

  /** Create a new trait with sort_order = max + 1 */
  async create(): Promise<Trait> {
    const now = Math.floor(Date.now() / 1000);

    const maxRow = await this.db
      .prepare('SELECT MAX(sort_order) as max_order FROM traits')
      .first<{ max_order: number | null }>();

    const sortOrder = (maxRow?.max_order ?? -1) + 1;

    const result = await this.db
      .prepare('INSERT INTO traits (sort_order, created_at, updated_at) VALUES (?, ?, ?)')
      .bind(sortOrder, now, now)
      .run();

    const trait = await this.db
      .prepare('SELECT * FROM traits WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<Trait>();

    return trait!;
  }

  /** Delete a trait (FK CASCADE removes names and junction rows) */
  async delete(id: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM traits WHERE id = ?')
      .bind(id)
      .run();
  }

  /** Batch update sort_order for multiple traits */
  async reorder(items: { id: number; sort_order: number }[]): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.db.batch(
      items.map((item) =>
        this.db
          .prepare('UPDATE traits SET sort_order = ?, updated_at = ? WHERE id = ?')
          .bind(item.sort_order, now, item.id)
      )
    );
  }

  /** Upsert a name for a trait + language */
  async setName(
    traitId: number,
    langCode: string,
    name: string,
    description: string | null
  ): Promise<TraitName> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO trait_names (trait_id, language_code, name, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(trait_id, language_code) DO UPDATE
           SET name = excluded.name, description = excluded.description, updated_at = excluded.updated_at`
      )
      .bind(traitId, langCode, name, description, now, now)
      .run();

    const row = await this.db
      .prepare('SELECT * FROM trait_names WHERE trait_id = ? AND language_code = ?')
      .bind(traitId, langCode)
      .first<TraitName>();

    return row!;
  }

  /** Delete a name for a trait + language */
  async deleteName(traitId: number, langCode: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM trait_names WHERE trait_id = ? AND language_code = ?')
      .bind(traitId, langCode)
      .run();
  }
}
