import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Menu Items CRUD', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
    staffToken = tokens.staffToken;
  });

  it('GET /api/menu-items returns 401 without auth', async () => {
    const res = await SELF.fetch('http://localhost/api/menu-items');
    expect(res.status).toBe(401);
  });

  it('POST /api/menu-items creates a new item', async () => {
    const res = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(201);
    const item = await res.json<{ id: number; sort_order: number; is_visible: number }>();
    expect(item.id).toBeDefined();
    expect(item.is_visible).toBe(1);
  });

  it('GET /api/menu-items lists items with auth', async () => {
    // Create an item to ensure the list is non-empty
    await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });

    const res = await SELF.fetch('http://localhost/api/menu-items', {
      headers: authHeader(staffToken),
    });
    expect(res.status).toBe(200);
    const items = await res.json<Array<{ id: number }>>();
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('PATCH /api/menu-items/:id updates visibility', async () => {
    const createRes = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const created = await createRes.json<{ id: number }>();

    const res = await SELF.fetch(`http://localhost/api/menu-items/${created.id}`, {
      method: 'PATCH',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: false }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json<{ is_visible: number }>();
    expect(updated.is_visible).toBe(0);
  });

  it('DELETE /api/menu-items/:id deletes an item', async () => {
    const createRes = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const created = await createRes.json<{ id: number }>();

    const res = await SELF.fetch(`http://localhost/api/menu-items/${created.id}`, {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);

    // Verify it's gone
    const getRes = await SELF.fetch(`http://localhost/api/menu-items/${created.id}`, {
      headers: authHeader(adminToken),
    });
    expect(getRes.status).toBe(404);
  });

  it('PUT /api/menu-items/:id/names/:lang sets a name', async () => {
    const createRes = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const created = await createRes.json<{ id: number }>();

    const res = await SELF.fetch(`http://localhost/api/menu-items/${created.id}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Fish and Chips' }),
    });
    expect(res.status).toBe(200);
    const name = await res.json<{ name: string; language_code: string }>();
    expect(name.name).toBe('Fish and Chips');
    expect(name.language_code).toBe('GB');
  });

  it('PUT /api/menu-items/reorder reorders items', async () => {
    // Create two items for reorder
    const res1 = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const item1 = await res1.json<{ id: number }>();

    const res2 = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const item2 = await res2.json<{ id: number }>();

    const res = await SELF.fetch('http://localhost/api/menu-items/reorder', {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { id: item1.id, sort_order: 1 },
          { id: item2.id, sort_order: 0 },
        ],
      }),
    });
    expect(res.status).toBe(200);

    // Verify reorder persisted
    const listRes = await SELF.fetch('http://localhost/api/menu-items', {
      headers: authHeader(adminToken),
    });
    const items = await listRes.json<Array<{ id: number; sort_order: number }>>();
    const reorderedItem1 = items.find((i) => i.id === item1.id);
    const reorderedItem2 = items.find((i) => i.id === item2.id);
    expect(reorderedItem1?.sort_order).toBe(1);
    expect(reorderedItem2?.sort_order).toBe(0);
  });

  // M15: Reorder with invalid body
  it('PUT /api/menu-items/reorder with empty body returns 400', async () => {
    const res = await SELF.fetch('http://localhost/api/menu-items/reorder', {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('PUT /api/menu-items/reorder with missing items returns 400', async () => {
    const res = await SELF.fetch('http://localhost/api/menu-items/reorder', {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: 'not-an-array' }),
    });
    expect(res.status).toBe(400);
  });

  // M16: Invalid ID params
  it('PATCH /api/menu-items/abc returns 400 for invalid id', async () => {
    const res = await SELF.fetch('http://localhost/api/menu-items/abc', {
      method: 'PATCH',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: true }),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/menu-items/abc returns 400 for invalid id', async () => {
    const res = await SELF.fetch('http://localhost/api/menu-items/abc', {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(400);
  });

  it('GET /api/menu-items/99999 returns 404 for non-existent item', async () => {
    const res = await SELF.fetch('http://localhost/api/menu-items/99999', {
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /api/menu-items/:id cascades to media_variants and cleans R2', async () => {
    // Create a menu item
    const createRes = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const created = await createRes.json<{ id: number }>();

    // Upload a media variant
    const formData = new FormData();
    const file = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
      'cascade-test.png',
      { type: 'image/png' }
    );
    formData.append('file', file);

    const uploadRes = await SELF.fetch(
      `http://localhost/api/menu-items/${created.id}/media/GB`,
      { method: 'POST', headers: authHeader(adminToken), body: formData }
    );
    expect(uploadRes.status).toBe(201);
    const variant = await uploadRes.json<{ id: number; r2_key: string }>();

    // Sanity: the row exists in media_variants and the object exists in R2
    const rowBefore = await env.DB
      .prepare('SELECT id FROM media_variants WHERE menu_item_id = ?')
      .bind(created.id)
      .first<{ id: number }>();
    expect(rowBefore).not.toBeNull();

    const r2Before = await env.MEDIA_BUCKET.get(variant.r2_key);
    expect(r2Before).not.toBeNull();

    // Delete the menu item
    const delRes = await SELF.fetch(`http://localhost/api/menu-items/${created.id}`, {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(delRes.status).toBe(200);

    // media_variants row should be cascade-deleted
    const rowAfter = await env.DB
      .prepare('SELECT id FROM media_variants WHERE menu_item_id = ?')
      .bind(created.id)
      .first<{ id: number }>();
    expect(rowAfter).toBeNull();

    // R2 object should also have been cleaned up
    const r2After = await env.MEDIA_BUCKET.get(variant.r2_key);
    expect(r2After).toBeNull();
  });

  it('DELETE /:id/names/:lang removes the name', async () => {
    // Create item
    const createRes = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const created = await createRes.json<{ id: number }>();

    // Set name
    await SELF.fetch(`http://localhost/api/menu-items/${created.id}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'To Be Deleted' }),
    });

    // Delete name
    const delRes = await SELF.fetch(`http://localhost/api/menu-items/${created.id}/names/GB`, {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(delRes.status).toBe(200);

    // Verify name is gone — get the item and check names
    const getRes = await SELF.fetch(`http://localhost/api/menu-items/${created.id}`, {
      headers: authHeader(adminToken),
    });
    const item = await getRes.json<{ names: Array<{ language_code: string }> }>();
    const gbName = item.names?.find((n) => n.language_code === 'GB');
    expect(gbName).toBeUndefined();
  });

  describe('is_unavailable', () => {
    it('new menu item defaults to is_unavailable = 0', async () => {
      const res = await SELF.fetch('http://localhost/api/menu-items', {
        method: 'POST',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(201);
      const item = await res.json<{ id: number; is_unavailable: number }>();
      expect(item.is_unavailable).toBe(0);
    });

    it('PATCH /:id with is_unavailable: true sets it to 1', async () => {
      const createRes = await SELF.fetch('http://localhost/api/menu-items', {
        method: 'POST',
        headers: authHeader(adminToken),
      });
      const created = await createRes.json<{ id: number }>();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_unavailable: true }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ is_unavailable: number }>();
      expect(updated.is_unavailable).toBe(1);
    });

    it('PATCH /:id with is_unavailable: false sets it back to 0', async () => {
      const createRes = await SELF.fetch('http://localhost/api/menu-items', {
        method: 'POST',
        headers: authHeader(adminToken),
      });
      const created = await createRes.json<{ id: number }>();

      // Set to unavailable first
      await SELF.fetch(`http://localhost/api/menu-items/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_unavailable: true }),
      });

      // Toggle back
      const res = await SELF.fetch(`http://localhost/api/menu-items/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_unavailable: false }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ is_unavailable: number }>();
      expect(updated.is_unavailable).toBe(0);
    });

    it('is_unavailable and is_visible are independent', async () => {
      const createRes = await SELF.fetch('http://localhost/api/menu-items', {
        method: 'POST',
        headers: authHeader(adminToken),
      });
      const created = await createRes.json<{ id: number; is_visible: number; is_unavailable: number }>();
      expect(created.is_visible).toBe(1);
      expect(created.is_unavailable).toBe(0);

      // Set unavailable — should not affect visibility
      const res1 = await SELF.fetch(`http://localhost/api/menu-items/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_unavailable: true }),
      });
      const after1 = await res1.json<{ is_visible: number; is_unavailable: number }>();
      expect(after1.is_unavailable).toBe(1);
      expect(after1.is_visible).toBe(1);

      // Set invisible — should not affect unavailable
      const res2 = await SELF.fetch(`http://localhost/api/menu-items/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: false }),
      });
      const after2 = await res2.json<{ is_visible: number; is_unavailable: number }>();
      expect(after2.is_visible).toBe(0);
      expect(after2.is_unavailable).toBe(1);
    });

    it('GET /api/public/menu includes unavailable items with is_unavailable flag', async () => {
      // Create a visible + unavailable item with a name
      const createRes = await SELF.fetch('http://localhost/api/menu-items', {
        method: 'POST',
        headers: authHeader(adminToken),
      });
      const created = await createRes.json<{ id: number }>();

      await SELF.fetch(`http://localhost/api/menu-items/${created.id}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unavailable Public Item' }),
      });

      await SELF.fetch(`http://localhost/api/menu-items/${created.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_unavailable: true }),
      });

      const res = await SELF.fetch('http://localhost/api/public/menu');
      expect(res.status).toBe(200);
      const body = await res.json<{ items: Array<{ id: number; is_unavailable: number }> }>();

      // The unavailable item should still appear (it's visible)
      const found = body.items.find((i) => i.id === created.id);
      expect(found).toBeDefined();
      expect(found!.is_unavailable).toBe(1);
    });

    it('GET /api/menu-items returns is_unavailable field on each item', async () => {
      const res = await SELF.fetch('http://localhost/api/menu-items', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const items = await res.json<Array<{ id: number; is_unavailable: number }>>();
      expect(items.length).toBeGreaterThan(0);

      // Every item should have the is_unavailable field defined
      for (const item of items) {
        expect(typeof item.is_unavailable).toBe('number');
        expect([0, 1]).toContain(item.is_unavailable);
      }
    });
  });
});
