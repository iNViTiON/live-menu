import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Gallery Pages CRUD', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
    staffToken = tokens.staffToken;
  });

  // Helper: create gallery page
  async function createPage(): Promise<{ id: number; sort_order: number; is_visible: number }> {
    const res = await SELF.fetch('http://localhost/api/gallery', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(201);
    return res.json();
  }

  // Helper: create availability rule for a gallery page
  async function createRule(
    pageId: number,
    rule: Record<string, unknown>
  ): Promise<{ id: number; [k: string]: unknown }> {
    const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}/availability-rules`, {
      method: 'POST',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    expect(res.status).toBe(201);
    return res.json();
  }

  // --- Auth ---

  describe('auth', () => {
    it('GET /api/gallery returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery');
      expect(res.status).toBe(401);
    });

    it('POST /api/gallery returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery', {
        method: 'POST',
        headers: { Origin: 'http://localhost:5173' },
      });
      expect(res.status).toBe(401);
    });

    it('PATCH /api/gallery/1 returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
        body: JSON.stringify({ is_visible: false }),
      });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/gallery/1 returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/1', {
        method: 'DELETE',
        headers: { Origin: 'http://localhost:5173' },
      });
      expect(res.status).toBe(401);
    });

    it('PUT /api/gallery/1/names/GB returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/1/names/GB', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
        body: JSON.stringify({ name: 'Test' }),
      });
      expect(res.status).toBe(401);
    });

    it('POST /api/gallery/1/availability-rules returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/1/availability-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
        body: JSON.stringify({
          start_time: '09:00', end_time: '17:00',
          day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
        }),
      });
      expect(res.status).toBe(401);
    });

    it('PATCH /api/gallery/availability-rules/1 returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/availability-rules/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
        body: JSON.stringify({ start_time: '10:00' }),
      });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/gallery/availability-rules/1 returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/availability-rules/1', {
        method: 'DELETE',
        headers: { Origin: 'http://localhost:5173' },
      });
      expect(res.status).toBe(401);
    });

    it('staff can create gallery pages', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery', {
        method: 'POST',
        headers: authHeader(staffToken),
      });
      expect(res.status).toBe(201);
    });
  });

  // --- CRUD ---

  describe('CRUD', () => {
    it('POST /api/gallery creates a page', async () => {
      const page = await createPage();
      expect(page.id).toBeDefined();
      expect(page.is_visible).toBe(1);
    });

    it('GET /api/gallery lists all pages with names, media, rules', async () => {
      const page = await createPage();

      // Set a name
      await SELF.fetch(`http://localhost/api/gallery/${page.id}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Gallery List Test' }),
      });

      const res = await SELF.fetch('http://localhost/api/gallery', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const pages = await res.json<Array<{ id: number; names: unknown[]; media: unknown[]; availabilityRules: unknown[] }>>();
      expect(pages.length).toBeGreaterThanOrEqual(1);

      const found = pages.find((p) => p.id === page.id);
      expect(found).toBeDefined();
      expect(Array.isArray(found!.names)).toBe(true);
      expect(Array.isArray(found!.media)).toBe(true);
      expect(Array.isArray(found!.availabilityRules)).toBe(true);
    });

    it('GET /api/gallery/:id returns single page', async () => {
      const page = await createPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ id: number; names: unknown[]; media: unknown[]; availabilityRules: unknown[] }>();
      expect(body.id).toBe(page.id);
      expect(Array.isArray(body.names)).toBe(true);
      expect(Array.isArray(body.media)).toBe(true);
      expect(Array.isArray(body.availabilityRules)).toBe(true);
    });

    it('GET /api/gallery/99999 returns 404', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/99999', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(404);
    });

    it('GET /api/gallery/abc returns 400 for invalid id', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/abc', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(400);
    });

    it('PATCH /api/gallery/:id updates is_visible', async () => {
      const page = await createPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: false }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ is_visible: number }>();
      expect(updated.is_visible).toBe(0);
    });

    it('PATCH /api/gallery/:id updates schedule_start', async () => {
      const page = await createPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: '2026-06-01T09:00:00' }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ schedule_start: string | null }>();
      expect(updated.schedule_start).toBe('2026-06-01T09:00:00');
    });

    it('PATCH /api/gallery/:id updates schedule_end', async () => {
      const page = await createPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_end: '2026-12-31T23:59:00' }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ schedule_end: string | null }>();
      expect(updated.schedule_end).toBe('2026-12-31T23:59:00');
    });

    it('PATCH /api/gallery/:id with schedule_start: null clears it', async () => {
      const page = await createPage();

      // Set first
      await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: '2026-06-01T09:00:00' }),
      });

      // Clear
      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: null }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ schedule_start: string | null }>();
      expect(updated.schedule_start).toBeNull();
    });

    it('PATCH /api/gallery/:id with both schedule fields persists', async () => {
      const page = await createPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
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
      const page = await createPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: 'not-a-date' }),
      });
      expect(res.status).toBe(400);
    });

    it('DELETE /api/gallery/:id deletes a page', async () => {
      const page = await createPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);

      // Verify it's gone
      const getRes = await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        headers: authHeader(adminToken),
      });
      expect(getRes.status).toBe(404);
    });

    it('PUT /api/gallery/reorder reorders pages', async () => {
      const page1 = await createPage();
      const page2 = await createPage();

      const res = await SELF.fetch('http://localhost/api/gallery/reorder', {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { id: page1.id, sort_order: 1 },
            { id: page2.id, sort_order: 0 },
          ],
        }),
      });
      expect(res.status).toBe(200);

      // Verify reorder persisted
      const listRes = await SELF.fetch('http://localhost/api/gallery', {
        headers: authHeader(adminToken),
      });
      const pages = await listRes.json<Array<{ id: number; sort_order: number }>>();
      const reordered1 = pages.find((p) => p.id === page1.id);
      const reordered2 = pages.find((p) => p.id === page2.id);
      expect(reordered1?.sort_order).toBe(1);
      expect(reordered2?.sort_order).toBe(0);
    });

    it('PUT /api/gallery/reorder with empty body returns 400', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/reorder', {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  // --- Names ---

  describe('names', () => {
    it('PUT /api/gallery/:id/names/:lang upserts name', async () => {
      const page = await createPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Summer Menu' }),
      });
      expect(res.status).toBe(200);
      const name = await res.json<{ name: string; language_code: string }>();
      expect(name.name).toBe('Summer Menu');
      expect(name.language_code).toBe('GB');
    });

    it('PUT /api/gallery/:id/names/:lang updates existing name', async () => {
      const page = await createPage();

      // Set initial
      await SELF.fetch(`http://localhost/api/gallery/${page.id}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Original Name' }),
      });

      // Update
      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      expect(res.status).toBe(200);
      const name = await res.json<{ name: string }>();
      expect(name.name).toBe('Updated Name');
    });

    it('DELETE /api/gallery/:id/names/:lang removes name', async () => {
      const page = await createPage();

      // Set name
      await SELF.fetch(`http://localhost/api/gallery/${page.id}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'To Be Deleted' }),
      });

      // Delete
      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}/names/GB`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);

      // Verify name is gone
      const getRes = await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        headers: authHeader(adminToken),
      });
      const body = await getRes.json<{ names: Array<{ language_code: string }> }>();
      const gbName = body.names?.find((n) => n.language_code === 'GB');
      expect(gbName).toBeUndefined();
    });
  });

  // --- Availability Rules ---

  describe('availability rules CRUD', () => {
    it('POST /api/gallery/:id/availability-rules creates rule', async () => {
      const page = await createPage();

      const rule = await createRule(page.id, {
        start_time: '09:00',
        end_time: '17:00',
        day_mon: 1, day_tue: 1, day_wed: 1, day_thu: 1, day_fri: 1, day_sat: 0, day_sun: 0,
      });
      expect(rule.id).toBeDefined();
      expect(rule.start_time).toBe('09:00');
      expect(rule.end_time).toBe('17:00');
    });

    it('PATCH /api/gallery/availability-rules/:id updates rule', async () => {
      const page = await createPage();
      const rule = await createRule(page.id, {
        start_time: '09:00',
        end_time: '17:00',
        day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
      });

      const res = await SELF.fetch(`http://localhost/api/gallery/availability-rules/${rule.id}`, {
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

    it('DELETE /api/gallery/availability-rules/:id deletes rule', async () => {
      const page = await createPage();
      const rule = await createRule(page.id, {
        start_time: '09:00',
        end_time: '17:00',
        day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
      });

      const res = await SELF.fetch(`http://localhost/api/gallery/availability-rules/${rule.id}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);

      // Verify it's gone — PATCH should 404
      const patchRes = await SELF.fetch(`http://localhost/api/gallery/availability-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_time: '10:00' }),
      });
      expect(patchRes.status).toBe(404);
    });
  });

  // --- Availability Rule Validation ---

  describe('availability rule validation', () => {
    it('POST rule with end_time <= start_time returns 400', async () => {
      const page = await createPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}/availability-rules`, {
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
      const page = await createPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}/availability-rules`, {
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
      const page = await createPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}/availability-rules`, {
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
      const page = await createPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${page.id}/availability-rules`, {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: '09:00',
          end_time: '17:00',
          day_mon: 2, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  // --- Cascade Delete ---

  describe('cascade delete', () => {
    it('deleting gallery page cascades to names', async () => {
      const page = await createPage();

      // Set a name
      await SELF.fetch(`http://localhost/api/gallery/${page.id}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Cascade Test' }),
      });

      // Delete the page
      const deleteRes = await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(deleteRes.status).toBe(200);

      // Page should be gone
      const getRes = await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        headers: authHeader(adminToken),
      });
      expect(getRes.status).toBe(404);
    });

    it('deleting gallery page cascades to availability rules', async () => {
      const page = await createPage();

      const rule = await createRule(page.id, {
        start_time: '09:00',
        end_time: '17:00',
        day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
      });

      // Delete the page
      await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });

      // Rule should be gone
      const ruleRes = await SELF.fetch(`http://localhost/api/gallery/availability-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_time: '10:00' }),
      });
      expect(ruleRes.status).toBe(404);
    });
  });

  // --- Public API ---

  describe('public gallery API', () => {
    it('GET /api/public/gallery returns pages with names, media, rules', async () => {
      const page = await createPage();

      // Make visible and set name
      await SELF.fetch(`http://localhost/api/gallery/${page.id}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Public Gallery Test' }),
      });

      // Set schedule window
      await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_start: '2026-01-01T00:00:00',
          schedule_end: '2026-12-31T23:59:00',
        }),
      });

      // Create an availability rule
      await createRule(page.id, {
        start_time: '08:00',
        end_time: '22:00',
        day_mon: 1, day_tue: 1, day_wed: 1, day_thu: 1, day_fri: 1, day_sat: 1, day_sun: 1,
      });

      const res = await SELF.fetch('http://localhost/api/public/gallery');
      expect(res.status).toBe(200);
      const body = await res.json<{
        pages: Array<{
          id: number;
          schedule_start: string | null;
          schedule_end: string | null;
          names: Array<{ name: string; language_code: string }>;
          media: unknown[];
          availabilityRules: Array<{
            id: number;
            start_time: string;
            end_time: string;
          }>;
        }>;
        version: number;
      }>();

      expect(Array.isArray(body.pages)).toBe(true);
      const found = body.pages.find((p) => p.id === page.id);
      expect(found).toBeDefined();
      expect(found!.schedule_start).toBe('2026-01-01T00:00:00');
      expect(found!.schedule_end).toBe('2026-12-31T23:59:00');
      expect(Array.isArray(found!.names)).toBe(true);
      expect(Array.isArray(found!.media)).toBe(true);
      expect(Array.isArray(found!.availabilityRules)).toBe(true);
      expect(found!.availabilityRules.length).toBe(1);
      expect(found!.availabilityRules[0].start_time).toBe('08:00');
    });

    it('GET /api/public/gallery only returns visible pages', async () => {
      const page = await createPage();

      // Hide the page
      await SELF.fetch(`http://localhost/api/gallery/${page.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: false }),
      });

      const res = await SELF.fetch('http://localhost/api/public/gallery');
      expect(res.status).toBe(200);
      const body = await res.json<{ pages: Array<{ id: number }> }>();
      const found = body.pages.find((p) => p.id === page.id);
      expect(found).toBeUndefined();
    });

    it('GET /api/public/menu does not include schedule fields on items', async () => {
      const res = await SELF.fetch('http://localhost/api/public/menu');
      expect(res.status).toBe(200);
      const body = await res.json<{
        items: Array<{
          id: number;
          schedule_start?: unknown;
          schedule_end?: unknown;
          availabilityRules?: unknown;
        }>;
      }>();

      // No item should have schedule fields
      for (const item of body.items) {
        expect(item).not.toHaveProperty('schedule_start');
        expect(item).not.toHaveProperty('schedule_end');
        expect(item).not.toHaveProperty('availabilityRules');
      }
    });
  });
});
