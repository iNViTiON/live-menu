import type { MenuItem, MenuItemName, MediaVariant, MenuItemWithDetails } from '@live-menu/shared';

export class MenuService {
  constructor(private db: D1Database) {}

  /** List all menu items with names and media, ordered by sort_order */
  async list(): Promise<MenuItemWithDetails[]> {
    const items = await this.db
      .prepare('SELECT * FROM menu_items ORDER BY sort_order')
      .all<MenuItem>();

    if (items.results.length === 0) return [];

    const [names, media] = await Promise.all([
      this.db.prepare('SELECT * FROM menu_item_names').all<MenuItemName>(),
      this.db.prepare('SELECT * FROM media_variants').all<MediaVariant>(),
    ]);

    return items.results.map((item) => ({
      ...item,
      names: names.results.filter((n) => n.menu_item_id === item.id),
      media: media.results.filter((m) => m.menu_item_id === item.id),
    }));
  }

  /** List only visible menu items with names and media, ordered by sort_order */
  async listVisible(): Promise<MenuItemWithDetails[]> {
    const items = await this.db
      .prepare('SELECT * FROM menu_items WHERE is_visible = 1 ORDER BY sort_order')
      .all<MenuItem>();

    if (items.results.length === 0) return [];

    const ids = items.results.map((item) => item.id);
    const placeholders = ids.map(() => '?').join(',');

    const [names, media] = await Promise.all([
      this.db
        .prepare(`SELECT * FROM menu_item_names WHERE menu_item_id IN (${placeholders})`)
        .bind(...ids)
        .all<MenuItemName>(),
      this.db
        .prepare(`SELECT * FROM media_variants WHERE menu_item_id IN (${placeholders})`)
        .bind(...ids)
        .all<MediaVariant>(),
    ]);

    return items.results.map((item) => ({
      ...item,
      names: names.results.filter((n) => n.menu_item_id === item.id),
      media: media.results.filter((m) => m.menu_item_id === item.id),
    }));
  }

  /** Get a single item with names and media */
  async getById(id: number): Promise<MenuItemWithDetails | null> {
    const item = await this.db
      .prepare('SELECT * FROM menu_items WHERE id = ?')
      .bind(id)
      .first<MenuItem>();

    if (!item) return null;

    const [names, media] = await Promise.all([
      this.db
        .prepare('SELECT * FROM menu_item_names WHERE menu_item_id = ?')
        .bind(id)
        .all<MenuItemName>(),
      this.db
        .prepare('SELECT * FROM media_variants WHERE menu_item_id = ?')
        .bind(id)
        .all<MediaVariant>(),
    ]);

    return { ...item, names: names.results, media: media.results };
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
        'INSERT INTO menu_items (sort_order, is_visible, created_at, updated_at) VALUES (?, 1, ?, ?)'
      )
      .bind(sortOrder, now, now)
      .run();

    const item = await this.db
      .prepare('SELECT * FROM menu_items WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<MenuItem>();

    return item!;
  }

  /** Update is_visible on a menu item */
  async update(id: number, data: { is_visible?: boolean }): Promise<MenuItem> {
    const now = Math.floor(Date.now() / 1000);

    if (data.is_visible !== undefined) {
      await this.db
        .prepare('UPDATE menu_items SET is_visible = ?, updated_at = ? WHERE id = ?')
        .bind(data.is_visible ? 1 : 0, now, id)
        .run();
    }

    const item = await this.db
      .prepare('SELECT * FROM menu_items WHERE id = ?')
      .bind(id)
      .first<MenuItem>();

    return item!;
  }

  /**
   * Delete a menu item.
   * Returns R2 keys of media variants (caller handles R2 cleanup).
   * FK CASCADE handles menu_item_names + media_variants rows.
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
  async setName(menuItemId: number, languageCode: string, name: string): Promise<MenuItemName> {
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO menu_item_names (menu_item_id, language_code, name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(menu_item_id, language_code) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`
      )
      .bind(menuItemId, languageCode, name, now, now)
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
}
