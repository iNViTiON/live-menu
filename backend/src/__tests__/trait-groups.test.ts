import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Trait Groups CRUD', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
    staffToken = tokens.staffToken;
  });

  // Helper: create a trait and return its id
  async function createTrait(): Promise<number> {
    const res = await SELF.fetch('http://localhost/api/traits', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const trait = await res.json<{ id: number }>();
    return trait.id;
  }

  // Helper: create a trait group and return its id
  async function createGroup(): Promise<number> {
    const res = await SELF.fetch('http://localhost/api/trait-groups', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const group = await res.json<{ id: number }>();
    return group.id;
  }

  it('GET /api/trait-groups returns 401 without auth', async () => {
    const res = await SELF.fetch('http://localhost/api/trait-groups');
    expect(res.status).toBe(401);
  });

  it('POST /api/trait-groups creates a new group', async () => {
    const res = await SELF.fetch('http://localhost/api/trait-groups', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(201);
    const group = await res.json<{ id: number; sort_order: number }>();
    expect(group.id).toBeDefined();
    expect(typeof group.sort_order).toBe('number');
  });

  it('GET /api/trait-groups lists groups with auth', async () => {
    await createGroup();

    const res = await SELF.fetch('http://localhost/api/trait-groups', {
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const groups = await res.json<Array<{ id: number }>>();
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });

  it('DELETE /api/trait-groups/:id deletes a group', async () => {
    const groupId = await createGroup();

    const res = await SELF.fetch(`http://localhost/api/trait-groups/${groupId}`, {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  it('PUT /api/trait-groups/reorder reorders groups', async () => {
    const g1 = await createGroup();
    const g2 = await createGroup();

    const res = await SELF.fetch('http://localhost/api/trait-groups/reorder', {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { id: g1, sort_order: 1 },
          { id: g2, sort_order: 0 },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  it('PUT /api/trait-groups/reorder returns 400 for invalid body', async () => {
    const res = await SELF.fetch('http://localhost/api/trait-groups/reorder', {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('PUT /api/trait-groups/:id/names/:lang upserts name', async () => {
    const groupId = await createGroup();

    const res = await SELF.fetch(`http://localhost/api/trait-groups/${groupId}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dietary', description: 'Dietary preferences' }),
    });
    expect(res.status).toBe(200);
    const name = await res.json<{ name: string; description: string | null }>();
    expect(name.name).toBe('Dietary');
    expect(name.description).toBe('Dietary preferences');
  });

  it('PUT /api/trait-groups/:id/names/:lang returns 400 for missing name', async () => {
    const groupId = await createGroup();

    const res = await SELF.fetch(`http://localhost/api/trait-groups/${groupId}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/trait-groups/:id/names/:lang removes a name', async () => {
    const groupId = await createGroup();

    // Set name first
    await SELF.fetch(`http://localhost/api/trait-groups/${groupId}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'To Delete' }),
    });

    // Delete name
    const delRes = await SELF.fetch(`http://localhost/api/trait-groups/${groupId}/names/GB`, {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(delRes.status).toBe(200);
    const body = await delRes.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  it('PUT /api/trait-groups/:id/traits/:traitId adds trait to group', async () => {
    const groupId = await createGroup();
    const traitId = await createTrait();

    const res = await SELF.fetch(`http://localhost/api/trait-groups/${groupId}/traits/${traitId}`, {
      method: 'PUT',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  it('DELETE /api/trait-groups/:id/traits/:traitId removes trait from group', async () => {
    const groupId = await createGroup();
    const traitId = await createTrait();

    // Add trait to group first
    await SELF.fetch(`http://localhost/api/trait-groups/${groupId}/traits/${traitId}`, {
      method: 'PUT',
      headers: authHeader(adminToken),
    });

    // Remove trait from group
    const res = await SELF.fetch(`http://localhost/api/trait-groups/${groupId}/traits/${traitId}`, {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  it('PUT /api/trait-groups/:id/traits/reorder reorders traits in group', async () => {
    const groupId = await createGroup();
    const t1 = await createTrait();
    const t2 = await createTrait();

    // Add both traits to the group
    await SELF.fetch(`http://localhost/api/trait-groups/${groupId}/traits/${t1}`, {
      method: 'PUT',
      headers: authHeader(adminToken),
    });
    await SELF.fetch(`http://localhost/api/trait-groups/${groupId}/traits/${t2}`, {
      method: 'PUT',
      headers: authHeader(adminToken),
    });

    // Reorder
    const res = await SELF.fetch(`http://localhost/api/trait-groups/${groupId}/traits/reorder`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { id: t1, sort_order: 1 },
          { id: t2, sort_order: 0 },
        ],
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  it('GET /api/trait-groups returns nested traits and names', async () => {
    const groupId = await createGroup();
    const traitId = await createTrait();

    // Name the group
    await SELF.fetch(`http://localhost/api/trait-groups/${groupId}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Allergens' }),
    });

    // Name the trait
    await SELF.fetch(`http://localhost/api/traits/${traitId}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nuts' }),
    });

    // Add trait to group
    await SELF.fetch(`http://localhost/api/trait-groups/${groupId}/traits/${traitId}`, {
      method: 'PUT',
      headers: authHeader(adminToken),
    });

    // List groups
    const res = await SELF.fetch('http://localhost/api/trait-groups', {
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const groups = await res.json<Array<{
      id: number;
      names: Array<{ name: string; language_code: string }>;
      traits: Array<{ id: number; names: Array<{ name: string }> }>;
    }>>();

    const group = groups.find((g) => g.id === groupId);
    expect(group).toBeDefined();
    expect(group!.names.length).toBeGreaterThanOrEqual(1);
    expect(group!.traits.length).toBeGreaterThanOrEqual(1);
  });

  it('DELETE /api/trait-groups/:id returns 400 for invalid id', async () => {
    const res = await SELF.fetch('http://localhost/api/trait-groups/abc', {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(400);
  });
});
