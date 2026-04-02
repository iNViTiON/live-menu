import type { MediaVariant, MediaType } from '@live-menu/shared';

export class MediaService {
  constructor(
    private db: D1Database,
    private bucket: R2Bucket
  ) {}

  /**
   * Upload a media file for a menu item + language.
   * Replaces any existing variant (DB row + R2 object).
   */
  async upload(
    menuItemId: number,
    languageCode: string,
    file: File
  ): Promise<MediaVariant> {
    const contentType = file.type;

    // Determine media type
    let mediaType: MediaType;
    if (contentType.startsWith('image/')) {
      mediaType = 'image';
    } else if (contentType.startsWith('video/')) {
      mediaType = 'video';
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Derive extension from content type
    const ext = contentType.split('/')[1]?.split(';')[0] ?? 'bin';
    const r2Key = `media/${menuItemId}/${languageCode}/${crypto.randomUUID()}.${ext}`;

    // Delete existing variant if any
    const existing = await this.db
      .prepare('SELECT r2_key FROM media_variants WHERE menu_item_id = ? AND language_code = ?')
      .bind(menuItemId, languageCode)
      .first<{ r2_key: string }>();

    if (existing) {
      await Promise.all([
        this.bucket.delete(existing.r2_key),
        this.db
          .prepare('DELETE FROM media_variants WHERE menu_item_id = ? AND language_code = ?')
          .bind(menuItemId, languageCode)
          .run(),
      ]);
    }

    // Upload to R2
    await this.bucket.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: { contentType },
    });

    const now = Math.floor(Date.now() / 1000);
    const result = await this.db
      .prepare(
        `INSERT INTO media_variants
           (menu_item_id, language_code, media_type, r2_key, original_filename, content_type, file_size, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        menuItemId,
        languageCode,
        mediaType,
        r2Key,
        file.name ?? null,
        contentType,
        file.size,
        now,
        now
      )
      .run();

    const variant = await this.db
      .prepare('SELECT * FROM media_variants WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<MediaVariant>();

    return variant!;
  }

  /** Delete a media variant (R2 + DB) */
  async delete(menuItemId: number, languageCode: string): Promise<void> {
    const variant = await this.db
      .prepare('SELECT r2_key FROM media_variants WHERE menu_item_id = ? AND language_code = ?')
      .bind(menuItemId, languageCode)
      .first<{ r2_key: string }>();

    if (!variant) return;

    await Promise.all([
      this.bucket.delete(variant.r2_key),
      this.db
        .prepare('DELETE FROM media_variants WHERE menu_item_id = ? AND language_code = ?')
        .bind(menuItemId, languageCode)
        .run(),
    ]);
  }

  /** Get an R2 object by key */
  async getByKey(r2Key: string): Promise<R2ObjectBody | null> {
    return this.bucket.get(r2Key);
  }
}
