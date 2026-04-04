import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Menu Item Scheduling', () => {
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

  // Helper: create an availability rule for a menu item
  async function createRule(
    itemId: number,
    rule: Record<string, unknown>
  ): Promise<{ id: number; [k: string]: unknown }> {
    const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/availability-rules`, {
      method: 'POST',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    return res.json();
  }

  // --- Schedule date window CRUD ---

  describe('schedule date window', () => {
    it('PATCH /api/menu-items/:id with schedule_start persists', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: '2026-06-01T09:00:00' }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ schedule_start: string | null }>();
      expect(updated.schedule_start).toBe('2026-06-01T09:00:00');
    });

    it('PATCH /api/menu-items/:id with schedule_end persists', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_end: '2026-12-31T23:59:00' }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ schedule_end: string | null }>();
      expect(updated.schedule_end).toBe('2026-12-31T23:59:00');
    });

    it('PATCH /api/menu-items/:id with schedule_start: null clears it', async () => {
      const itemId = await createMenuItem();

      // Set first
      await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: '2026-06-01T09:00:00' }),
      });

      // Clear
      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: null }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ schedule_start: string | null }>();
      expect(updated.schedule_start).toBeNull();
    });

    it('PATCH /api/menu-items/:id with both schedule_start AND schedule_end persists', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_start: '2026-06-01T09:00:00',
          schedule_end: '2026-06-30T23:59:00',
        }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ schedule_start: string | null; schedule_end: string | null }>();
      expect(updated.schedule_start).toBe('2026-06-01T09:00:00');
      expect(updated.schedule_end).toBe('2026-06-30T23:59:00');
    });

    it('PATCH schedule_start with invalid datetime returns 400', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: 'not-a-date' }),
      });
      expect(res.status).toBe(400);
    });
  });

  // --- Availability Rules CRUD ---

  describe('availability rules CRUD', () => {
    it('POST /api/menu-items/:id/availability-rules creates rule, returns rule with id', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/availability-rules`, {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: '09:00',
          end_time: '17:00',
          day_mon: 1,
          day_tue: 1,
          day_wed: 1,
          day_thu: 1,
          day_fri: 1,
          day_sat: 0,
          day_sun: 0,
        }),
      });
      expect(res.status).toBe(201);
      const rule = await res.json<{ id: number; start_time: string; end_time: string }>();
      expect(rule.id).toBeDefined();
      expect(rule.start_time).toBe('09:00');
      expect(rule.end_time).toBe('17:00');
    });

    it('GET /api/menu-items/:id/availability-rules lists rules for item', async () => {
      const itemId = await createMenuItem();

      // Create two rules
      await createRule(itemId, {
        start_time: '08:00',
        end_time: '12:00',
        day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
      });
      await createRule(itemId, {
        start_time: '14:00',
        end_time: '18:00',
        day_fri: 1, day_mon: 0, day_tue: 0, day_wed: 0, day_thu: 0, day_sat: 0, day_sun: 0,
      });

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/availability-rules`, {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const rules = await res.json<Array<{ id: number }>>();
      expect(rules.length).toBe(2);
    });

    it('PATCH /api/availability-rules/:id updates rule fields', async () => {
      const itemId = await createMenuItem();
      const rule = await createRule(itemId, {
        start_time: '09:00',
        end_time: '17:00',
        day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
      });

      const res = await SELF.fetch(`http://localhost/api/availability-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: '10:00',
          end_time: '16:00',
          day_tue: 1,
        }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ start_time: string; end_time: string; day_tue: number }>();
      expect(updated.start_time).toBe('10:00');
      expect(updated.end_time).toBe('16:00');
      expect(updated.day_tue).toBe(1);
    });

    it('DELETE /api/availability-rules/:id deletes a rule', async () => {
      const itemId = await createMenuItem();
      const rule = await createRule(itemId, {
        start_time: '09:00',
        end_time: '17:00',
        day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
      });

      const res = await SELF.fetch(`http://localhost/api/availability-rules/${rule.id}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);

      // Verify it's gone
      const listRes = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/availability-rules`, {
        headers: authHeader(adminToken),
      });
      const rules = await listRes.json<Array<{ id: number }>>();
      expect(rules.find((r) => r.id === rule.id)).toBeUndefined();
    });
  });

  // --- Validation ---

  describe('availability rule validation', () => {
    it('POST rule with end_time <= start_time returns 400', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/availability-rules`, {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: '17:00',
          end_time: '09:00',
          day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
        }),
      });
      expect(res.status).toBe(400);
    });

    it('POST rule with equal start_time and end_time returns 400', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/availability-rules`, {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: '12:00',
          end_time: '12:00',
          day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
        }),
      });
      expect(res.status).toBe(400);
    });

    it('POST rule with invalid time format returns 400', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/availability-rules`, {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: '9am',
          end_time: '5pm',
          day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
        }),
      });
      expect(res.status).toBe(400);
    });

    it('POST rule with day value > 1 returns 400', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/availability-rules`, {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: '09:00',
          end_time: '17:00',
          day_mon: 2,
          day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  // --- Auth ---

  describe('scheduling auth', () => {
    it('PATCH schedule fields requires auth (401)', async () => {
      const res = await SELF.fetch('http://localhost/api/menu-items/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
        body: JSON.stringify({ schedule_start: '2026-06-01T09:00:00' }),
      });
      expect(res.status).toBe(401);
    });

    it('POST availability rule requires auth (401)', async () => {
      const res = await SELF.fetch('http://localhost/api/menu-items/1/availability-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
        body: JSON.stringify({
          start_time: '09:00',
          end_time: '17:00',
          day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
        }),
      });
      expect(res.status).toBe(401);
    });

    it('GET availability rules requires auth (401)', async () => {
      const res = await SELF.fetch('http://localhost/api/menu-items/1/availability-rules', {
        headers: { Origin: 'http://localhost:5173' },
      });
      expect(res.status).toBe(401);
    });

    it('PATCH availability rule requires auth (401)', async () => {
      const res = await SELF.fetch('http://localhost/api/availability-rules/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
        body: JSON.stringify({ start_time: '10:00' }),
      });
      expect(res.status).toBe(401);
    });

    it('DELETE availability rule requires auth (401)', async () => {
      const res = await SELF.fetch('http://localhost/api/availability-rules/1', {
        method: 'DELETE',
        headers: { Origin: 'http://localhost:5173' },
      });
      expect(res.status).toBe(401);
    });

    it('staff can create availability rules', async () => {
      const itemId = await createMenuItem();

      const res = await SELF.fetch(`http://localhost/api/menu-items/${itemId}/availability-rules`, {
        method: 'POST',
        headers: { ...authHeader(staffToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: '09:00',
          end_time: '17:00',
          day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
        }),
      });
      expect(res.status).toBe(201);
    });
  });

  // --- Public API ---

  describe('public menu includes scheduling data', () => {
    it('GET /api/public/menu includes schedule_start, schedule_end, and availabilityRules on items', async () => {
      const itemId = await createMenuItem();

      // Make item visible
      await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: true }),
      });

      // Set name so it appears in public list
      await SELF.fetch(`http://localhost/api/menu-items/${itemId}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Scheduled Item' }),
      });

      // Set schedule window
      await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_start: '2026-01-01T00:00:00',
          schedule_end: '2026-12-31T23:59:00',
        }),
      });

      // Create an availability rule
      await createRule(itemId, {
        start_time: '08:00',
        end_time: '22:00',
        day_mon: 1, day_tue: 1, day_wed: 1, day_thu: 1, day_fri: 1, day_sat: 1, day_sun: 1,
      });

      // Fetch public menu
      const res = await SELF.fetch('http://localhost/api/public/menu');
      expect(res.status).toBe(200);
      const body = await res.json<{
        items: Array<{
          id: number;
          schedule_start: string | null;
          schedule_end: string | null;
          availabilityRules: Array<{
            id: number;
            start_time: string;
            end_time: string;
            day_mon: number;
          }>;
        }>;
      }>();

      const item = body.items.find((i) => i.id === itemId);
      expect(item).toBeDefined();
      expect(item!.schedule_start).toBe('2026-01-01T00:00:00');
      expect(item!.schedule_end).toBe('2026-12-31T23:59:00');
      expect(Array.isArray(item!.availabilityRules)).toBe(true);
      expect(item!.availabilityRules.length).toBe(1);
      expect(item!.availabilityRules[0].start_time).toBe('08:00');
    });
  });

  // --- Cascade delete ---

  describe('cascade delete', () => {
    it('deleting menu item cascades to availability rules', async () => {
      const itemId = await createMenuItem();

      // Create a rule
      const rule = await createRule(itemId, {
        start_time: '09:00',
        end_time: '17:00',
        day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
      });
      expect(rule.id).toBeDefined();

      // Delete the menu item
      const deleteRes = await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(deleteRes.status).toBe(200);

      // Verify the menu item is gone
      const getRes = await SELF.fetch(`http://localhost/api/menu-items/${itemId}`, {
        headers: authHeader(adminToken),
      });
      expect(getRes.status).toBe(404);

      // The availability rules should be gone too (FK CASCADE).
      // We can't GET rules for a deleted item, but we can try the rule endpoint.
      const ruleRes = await SELF.fetch(`http://localhost/api/availability-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_time: '10:00' }),
      });
      expect(ruleRes.status).toBe(404);
    });
  });
});
