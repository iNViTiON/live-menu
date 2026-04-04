import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Traits CRUD', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
    staffToken = tokens.staffToken;
  });

  it('GET /api/traits returns 401 without auth', async () => {
    const res = await SELF.fetch('http://localhost/api/traits');
    expect(res.status).toBe(401);
  });

  it('POST /api/traits creates a new trait', async () => {
    const res = await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(201);
    const trait = await res.json<{ id: number; sort_order: number }>();
    expect(trait.id).toBeDefined();
    expect(typeof trait.sort_order).toBe('number');
  });

  it('POST /api/traits works for staff', async () => {
    const res = await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(staffToken),
    });
    expect(res.status).toBe(201);
  });

  it('GET /api/traits lists traits with auth', async () => {
    // Create a trait to ensure non-empty
    await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(adminToken),
    });

    const res = await SELF.fetch('http://localhost/api/traits', {
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const traits = await res.json<Array<{ id: number }>>();
    expect(traits.length).toBeGreaterThanOrEqual(1);
  });

  it('DELETE /api/traits/:id deletes a trait', async () => {
    const createRes = await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const created = await createRes.json<{ id: number }>();

    const res = await SELF.fetch(`http://localhost/api/traits/${created.id}`, {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  it('DELETE /api/traits/:id cascade removes names', async () => {
    // Create trait and set a name
    const createRes = await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const created = await createRes.json<{ id: number }>();

    await SELF.fetch(`http://localhost/api/traits/${created.id}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Spicy' }),
    });

    // Delete the trait
    const delRes = await SELF.fetch(`http://localhost/api/traits/${created.id}`, {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(delRes.status).toBe(200);

    // Verify the trait no longer appears in the list
    const listRes = await SELF.fetch('http://localhost/api/traits', {
      headers: authHeader(adminToken),
    });
    const traits = await listRes.json<Array<{ id: number }>>();
    const found = traits.find((t) => t.id === created.id);
    expect(found).toBeUndefined();
  });

  it('PUT /api/traits/reorder reorders traits', async () => {
    const res1 = await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const trait1 = await res1.json<{ id: number }>();

    const res2 = await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const trait2 = await res2.json<{ id: number }>();

    const res = await SELF.fetch('http://localhost/api/traits/reorder', {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { id: trait1.id, sort_order: 1 },
          { id: trait2.id, sort_order: 0 },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  it('PUT /api/traits/reorder returns 400 for invalid body', async () => {
    const res = await SELF.fetch('http://localhost/api/traits/reorder', {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: 'not-an-array' }),
    });
    expect(res.status).toBe(400);
  });

  it('PUT /api/traits/:id/names/:lang upserts name and description', async () => {
    const createRes = await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const created = await createRes.json<{ id: number }>();

    const res = await SELF.fetch(`http://localhost/api/traits/${created.id}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Vegetarian', description: 'Contains no meat' }),
    });
    expect(res.status).toBe(200);
    const name = await res.json<{ name: string; description: string | null }>();
    expect(name.name).toBe('Vegetarian');
    expect(name.description).toBe('Contains no meat');
  });

  it('PUT /api/traits/:id/names/:lang upserts name without description', async () => {
    const createRes = await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const created = await createRes.json<{ id: number }>();

    const res = await SELF.fetch(`http://localhost/api/traits/${created.id}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Gluten Free' }),
    });
    expect(res.status).toBe(200);
    const name = await res.json<{ name: string }>();
    expect(name.name).toBe('Gluten Free');
  });

  it('PUT /api/traits/:id/names/:lang returns 400 for missing name', async () => {
    const createRes = await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const created = await createRes.json<{ id: number }>();

    const res = await SELF.fetch(`http://localhost/api/traits/${created.id}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/traits/:id/names/:lang removes a name', async () => {
    const createRes = await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const created = await createRes.json<{ id: number }>();

    // Set name
    await SELF.fetch(`http://localhost/api/traits/${created.id}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'To Delete' }),
    });

    // Delete name
    const delRes = await SELF.fetch(`http://localhost/api/traits/${created.id}/names/GB`, {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(delRes.status).toBe(200);
    const body = await delRes.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  it('DELETE /api/traits/:id returns 400 for invalid id', async () => {
    const res = await SELF.fetch('http://localhost/api/traits/not-a-number', {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(400);
  });

  // L11: Delete non-existent ID — documents behavior (200 no-op)
  it('DELETE /api/traits/99999 returns 200 (no-op for non-existent)', async () => {
    const res = await SELF.fetch('http://localhost/api/traits/99999', {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    // Route does not check existence before delete — SQL DELETE is a no-op
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });
});
