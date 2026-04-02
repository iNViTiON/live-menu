import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Media routes', () => {
  let adminToken: string;
  let menuItemId: number;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;

    // Create a menu item to attach media to
    const res = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const item = await res.json<{ id: number }>();
    menuItemId = item.id;
  });

  describe('POST /api/menu-items/:id/media/:lang', () => {
    it('uploads a valid image file', async () => {
      const formData = new FormData();
      const file = new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
        'test.png',
        { type: 'image/png' }
      );
      formData.append('file', file);

      const res = await SELF.fetch(
        `http://localhost/api/menu-items/${menuItemId}/media/GB`,
        {
          method: 'POST',
          headers: authHeader(adminToken),
          body: formData,
        }
      );
      expect(res.status).toBe(201);
      const variant = await res.json<{
        id: number;
        menu_item_id: number;
        language_code: string;
        media_type: string;
        r2_key: string;
      }>();
      expect(variant.menu_item_id).toBe(menuItemId);
      expect(variant.language_code).toBe('GB');
      expect(variant.media_type).toBe('image');
      expect(variant.r2_key).toContain('media/');
    });

    it('rejects unsupported content type', async () => {
      const formData = new FormData();
      const file = new File([new Uint8Array([0x00])], 'test.txt', {
        type: 'text/plain',
      });
      formData.append('file', file);

      const res = await SELF.fetch(
        `http://localhost/api/menu-items/${menuItemId}/media/GB`,
        {
          method: 'POST',
          headers: authHeader(adminToken),
          body: formData,
        }
      );
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toContain('Unsupported content type');
    });

    it('rejects SVG uploads', async () => {
      const formData = new FormData();
      const file = new File(
        [new TextEncoder().encode('<svg></svg>')],
        'test.svg',
        { type: 'image/svg+xml' }
      );
      formData.append('file', file);

      const res = await SELF.fetch(
        `http://localhost/api/menu-items/${menuItemId}/media/GB`,
        {
          method: 'POST',
          headers: authHeader(adminToken),
          body: formData,
        }
      );
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toContain('SVG');
    });
  });

  describe('DELETE /api/menu-items/:id/media/:lang', () => {
    it('deletes an existing media variant', async () => {
      // Upload first
      const formData = new FormData();
      const file = new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
        'delete-me.png',
        { type: 'image/png' }
      );
      formData.append('file', file);

      await SELF.fetch(
        `http://localhost/api/menu-items/${menuItemId}/media/DE`,
        {
          method: 'POST',
          headers: authHeader(adminToken),
          body: formData,
        }
      );

      const res = await SELF.fetch(
        `http://localhost/api/menu-items/${menuItemId}/media/DE`,
        {
          method: 'DELETE',
          headers: authHeader(adminToken),
        }
      );
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);
    });
  });

  describe('GET /media/:key — R2 proxy', () => {
    it('returns uploaded media object', async () => {
      // Upload an image
      const formData = new FormData();
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      const file = new File([pngBytes], 'proxy-test.png', {
        type: 'image/png',
      });
      formData.append('file', file);

      const uploadRes = await SELF.fetch(
        `http://localhost/api/menu-items/${menuItemId}/media/FR`,
        {
          method: 'POST',
          headers: authHeader(adminToken),
          body: formData,
        }
      );
      const variant = await uploadRes.json<{ r2_key: string }>();

      // Fetch via media proxy — /media/ prefix + r2_key (which itself starts with media/)
      const res = await SELF.fetch(`http://localhost/media/${variant.r2_key}`);
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toContain('immutable');
    });

    it('returns 404 for missing key', async () => {
      const res = await SELF.fetch('http://localhost/media/nonexistent-key');
      expect(res.status).toBe(404);
    });

    it('returns 403 for path traversal', async () => {
      // URL constructor normalizes ../ so use a literal .. segment
      const res = await SELF.fetch('http://localhost/media/..secret');
      expect(res.status).toBe(403);
    });
  });
});
