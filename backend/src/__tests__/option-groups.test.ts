import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Option Groups & Options CRUD', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
    staffToken = tokens.staffToken;
  });

  // Helper: create option group and return its id
  async function createGroup(): Promise<number> {
    const res = await SELF.fetch('http://localhost/api/option-groups', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const group = await res.json<{ id: number }>();
    return group.id;
  }

  // Helper: create option in a group and return its id
  async function createOption(groupId: number): Promise<number> {
    const res = await SELF.fetch('http://localhost/api/options', {
      method: 'POST',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ option_group_id: groupId }),
    });
    const option = await res.json<{ id: number }>();
    return option.id;
  }

  // --- Option Groups ---

  describe('Option Groups', () => {
    it('GET /api/option-groups returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/option-groups');
      expect(res.status).toBe(401);
    });

    it('POST /api/option-groups creates a new group', async () => {
      const res = await SELF.fetch('http://localhost/api/option-groups', {
        method: 'POST',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(201);
      const group = await res.json<{ id: number; sort_order: number; multi_select: number; required: number }>();
      expect(group.id).toBeDefined();
      expect(typeof group.sort_order).toBe('number');
    });

    it('GET /api/option-groups lists groups with auth', async () => {
      await createGroup();

      const res = await SELF.fetch('http://localhost/api/option-groups', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const groups = await res.json<Array<{ id: number }>>();
      expect(groups.length).toBeGreaterThanOrEqual(1);
    });

    it('PATCH /api/option-groups/:id updates multi_select flag', async () => {
      const groupId = await createGroup();

      const res = await SELF.fetch(`http://localhost/api/option-groups/${groupId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ multi_select: 1 }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ multi_select: number }>();
      expect(updated.multi_select).toBe(1);
    });

    it('PATCH /api/option-groups/:id updates required flag', async () => {
      const groupId = await createGroup();

      const res = await SELF.fetch(`http://localhost/api/option-groups/${groupId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ required: 1 }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ required: number }>();
      expect(updated.required).toBe(1);
    });

    it('PATCH /api/option-groups/:id returns 400 for invalid id', async () => {
      const res = await SELF.fetch('http://localhost/api/option-groups/abc', {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ multi_select: 1 }),
      });
      expect(res.status).toBe(400);
    });

    it('DELETE /api/option-groups/:id deletes a group', async () => {
      const groupId = await createGroup();

      const res = await SELF.fetch(`http://localhost/api/option-groups/${groupId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);
    });

    it('DELETE /api/option-groups/:id cascade removes options', async () => {
      const groupId = await createGroup();
      await createOption(groupId);

      // Delete group — options should be cascade deleted
      const res = await SELF.fetch(`http://localhost/api/option-groups/${groupId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
    });

    it('PUT /api/option-groups/reorder reorders groups', async () => {
      const g1 = await createGroup();
      const g2 = await createGroup();

      const res = await SELF.fetch('http://localhost/api/option-groups/reorder', {
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

    it('PUT /api/option-groups/:id/names/:lang upserts name', async () => {
      const groupId = await createGroup();

      const res = await SELF.fetch(`http://localhost/api/option-groups/${groupId}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Size', description: 'Choose a size' }),
      });
      expect(res.status).toBe(200);
      const name = await res.json<{ name: string; description: string | null }>();
      expect(name.name).toBe('Size');
      expect(name.description).toBe('Choose a size');
    });

    it('DELETE /api/option-groups/:id/names/:lang removes name', async () => {
      const groupId = await createGroup();

      await SELF.fetch(`http://localhost/api/option-groups/${groupId}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Temp Name' }),
      });

      const res = await SELF.fetch(`http://localhost/api/option-groups/${groupId}/names/GB`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);
    });

    it('GET /api/option-groups returns nested options and names', async () => {
      const groupId = await createGroup();
      const optionId = await createOption(groupId);

      // Name the group
      await SELF.fetch(`http://localhost/api/option-groups/${groupId}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Extras' }),
      });

      // Name the option
      await SELF.fetch(`http://localhost/api/options/${optionId}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Extra Cheese' }),
      });

      const res = await SELF.fetch('http://localhost/api/option-groups', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const groups = await res.json<Array<{
        id: number;
        names: Array<{ name: string }>;
        options: Array<{ id: number; names: Array<{ name: string }> }>;
      }>>();

      const group = groups.find((g) => g.id === groupId);
      expect(group).toBeDefined();
      expect(group!.names.length).toBeGreaterThanOrEqual(1);
      expect(group!.options.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Options ---

  describe('Options', () => {
    it('POST /api/options returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_group_id: 1 }),
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/options creates an option in a group', async () => {
      const groupId = await createGroup();

      const res = await SELF.fetch('http://localhost/api/options', {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_group_id: groupId }),
      });
      expect(res.status).toBe(201);
      const option = await res.json<{ id: number; option_group_id: number; sort_order: number }>();
      expect(option.id).toBeDefined();
      expect(option.option_group_id).toBe(groupId);
    });

    it('POST /api/options returns 400 without option_group_id', async () => {
      const res = await SELF.fetch('http://localhost/api/options', {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('PATCH /api/options/:id updates price_delta', async () => {
      const groupId = await createGroup();
      const optionId = await createOption(groupId);

      const res = await SELF.fetch(`http://localhost/api/options/${optionId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_delta: 2.50 }),
      });
      expect(res.status).toBe(200);
      const option = await res.json<{ price_delta: number }>();
      expect(option.price_delta).toBe(2.50);
    });

    it('DELETE /api/options/:id deletes an option', async () => {
      const groupId = await createGroup();
      const optionId = await createOption(groupId);

      const res = await SELF.fetch(`http://localhost/api/options/${optionId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);
    });

    it('PUT /api/options/:id/names/:lang upserts option name', async () => {
      const groupId = await createGroup();
      const optionId = await createOption(groupId);

      const res = await SELF.fetch(`http://localhost/api/options/${optionId}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Large' }),
      });
      expect(res.status).toBe(200);
      const name = await res.json<{ name: string }>();
      expect(name.name).toBe('Large');
    });

    it('DELETE /api/options/:id/names/:lang removes option name', async () => {
      const groupId = await createGroup();
      const optionId = await createOption(groupId);

      await SELF.fetch(`http://localhost/api/options/${optionId}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Temp' }),
      });

      const res = await SELF.fetch(`http://localhost/api/options/${optionId}/names/GB`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);
    });

    it('PUT /api/options/reorder reorders options', async () => {
      const groupId = await createGroup();
      const o1 = await createOption(groupId);
      const o2 = await createOption(groupId);

      const res = await SELF.fetch('http://localhost/api/options/reorder', {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { id: o1, sort_order: 1 },
            { id: o2, sort_order: 0 },
          ],
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);
    });
  });
});
