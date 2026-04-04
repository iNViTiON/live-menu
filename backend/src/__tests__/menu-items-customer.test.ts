import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Menu Items — Customer Interaction', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
    staffToken = tokens.staffToken;
  });

  // Helper: create menu item
  async function createMenuItem(): Promise<number> {
    const res = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const item = await res.json<{ id: number }>();
    return item.id;
  }

  // Helper: create trait
  async function createTrait(): Promise<number> {
    const res = await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const trait = await res.json<{ id: number }>();
    return trait.id;
  }

  // Helper: create option group
  async function createOptionGroup(): Promise<number> {
    const res = await SELF.fetch('http://localhost/api/option-groups', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const group = await res.json<{ id: number }>();
    return group.id;
  }

  describe('base_price', () => {
    it('PATCH /api/menu-items/:id updates base_price', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_price: 12.99 }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ base_price: number }>();
      expect(updated.base_price).toBe(12.99);
    });

    it('PATCH /api/menu-items/:id base_price accepts 0', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_price: 0 }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ base_price: number }>();
      expect(updated.base_price).toBe(0);
    });

    it('PATCH /api/menu-items/:id rejects negative base_price', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_price: -5 }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('name with description', () => {
    it('PUT /api/menu-items/:id/names/:lang sets name and description', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Caesar Salad', description: 'Fresh romaine lettuce with dressing' }),
      });
      expect(res.status).toBe(200);
      const name = await res.json<{ name: string; description: string | null }>();
      expect(name.name).toBe('Caesar Salad');
      expect(name.description).toBe('Fresh romaine lettuce with dressing');
    });

    it('PUT /api/menu-items/:id/names/:lang sets name without description', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Pasta' }),
      });
      expect(res.status).toBe(200);
      const name = await res.json<{ name: string }>();
      expect(name.name).toBe('Pasta');
    });
  });

  describe('trait assignments', () => {
    it('PUT /api/menu-items/:id/traits/:traitId assigns trait to item', async () => {
      const itemId = await createMenuItem();
      const traitId = await createTrait();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/traits/${traitId}`, {
        method: 'PUT',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);
    });

    it('PUT /api/menu-items/:id/traits/:traitId returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/menu-items/1/traits/1', {
        method: 'PUT',
        headers: { Origin: 'http://localhost:5173' },
      });
      expect(res.status).toBe(401);
    });

    it('PUT /api/menu-items/:id/traits/:traitId returns 400 for invalid id', async () => {
      const res = await SELF.fetch('http://localhost/api/menu-items/abc/traits/1', {
        method: 'PUT',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(400);
    });

    it('DELETE /api/menu-items/:id/traits/:traitId removes trait from item', async () => {
      const itemId = await createMenuItem();
      const traitId = await createTrait();

      // Assign first
      await SELF.fetch(`http://localhost/api/menu-items/${itemId}/traits/${traitId}`, {
        method: 'PUT',
        headers: authHeader(adminToken),
      });

      // Remove
      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/traits/${traitId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);
    });

    it('PUT /api/menu-items/:id/traits/:traitId is idempotent', async () => {
      const itemId = await createMenuItem();
      const traitId = await createTrait();

      // Assign twice — should not error
      await SELF.fetch(`http://localhost/api/menu-items/${itemId}/traits/${traitId}`, {
        method: 'PUT',
        headers: authHeader(adminToken),
      });

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/traits/${traitId}`, {
        method: 'PUT',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
    });
  });

  describe('option group assignments', () => {
    it('PUT /api/menu-items/:id/option-groups/:groupId assigns option group', async () => {
      const itemId = await createMenuItem();
      const groupId = await createOptionGroup();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/option-groups/${groupId}`, {
        method: 'PUT',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);
    });

    it('PUT /api/menu-items/:id/option-groups/:groupId returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/menu-items/1/option-groups/1', {
        method: 'PUT',
        headers: { Origin: 'http://localhost:5173' },
      });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/menu-items/:id/option-groups/:groupId removes option group', async () => {
      const itemId = await createMenuItem();
      const groupId = await createOptionGroup();

      // Assign first
      await SELF.fetch(`http://localhost/api/menu-items/${itemId}/option-groups/${groupId}`, {
        method: 'PUT',
        headers: authHeader(adminToken),
      });

      // Remove
      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/option-groups/${groupId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);
    });

    it('PUT /api/menu-items/:id/option-groups/:groupId is idempotent', async () => {
      const itemId = await createMenuItem();
      const groupId = await createOptionGroup();

      // Assign twice
      await SELF.fetch(`http://localhost/api/menu-items/${itemId}/option-groups/${groupId}`, {
        method: 'PUT',
        headers: authHeader(adminToken),
      });

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/option-groups/${groupId}`, {
        method: 'PUT',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
    });
  });

  describe('public menu includes customer interaction data', () => {
    it('GET /api/public/menu includes traitGroups, optionGroups, settings', async () => {
      // Set up data: create item with trait and option group
      const itemId = await createMenuItem();
      const traitId = await createTrait();
      const groupId = await createOptionGroup();

      // Make item visible and set a price
      await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: true, base_price: 9.99 }),
      });

      // Set item name
      await SELF.fetch(`http://localhost/api/menu-items/${itemId}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Public Menu Test Item' }),
      });

      // Assign trait and option group
      await SELF.fetch(`http://localhost/api/menu-items/${itemId}/traits/${traitId}`, {
        method: 'PUT',
        headers: authHeader(adminToken),
      });
      await SELF.fetch(`http://localhost/api/menu-items/${itemId}/option-groups/${groupId}`, {
        method: 'PUT',
        headers: authHeader(adminToken),
      });

      // Set a setting
      await SELF.fetch('http://localhost/api/settings/currency', {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'EUR' }),
      });

      // Fetch public menu
      const res = await SELF.fetch('http://localhost/api/public/menu');
      expect(res.status).toBe(200);

      const body = await res.json<{
        items: Array<{
          id: number;
          base_price: number;
          traits: Array<{ id: number; names: Array<{ name: string }> }>;
          optionGroups: Array<{ id: number; names: Array<{ name: string }> }>;
        }>;
        languages: Array<{ code: string }>;
        traitGroups: Array<{ id: number }>;
        optionGroups: Array<{ id: number }>;
        settings: Record<string, string>;
        version: number;
      }>();

      // Verify new top-level fields exist
      expect(body.traitGroups).toBeDefined();
      expect(Array.isArray(body.traitGroups)).toBe(true);
      expect(body.optionGroups).toBeDefined();
      expect(Array.isArray(body.optionGroups)).toBe(true);
      expect(body.settings).toBeDefined();
      expect(typeof body.settings).toBe('object');

      // Verify item has customer interaction fields
      const item = body.items.find((i) => i.id === itemId);
      expect(item).toBeDefined();
      expect(item!.base_price).toBe(9.99);
      expect(Array.isArray(item!.traits)).toBe(true);
      expect(item!.traits.some((t) => t.id === traitId)).toBe(true);
      expect(Array.isArray(item!.optionGroups)).toBe(true);
      expect(item!.optionGroups.some((g) => g.id === groupId)).toBe(true);

      // Verify version
      expect(body.version).toBeGreaterThan(0);
    });
  });
});
