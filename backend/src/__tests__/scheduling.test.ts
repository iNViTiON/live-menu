import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Gallery Page Scheduling', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
    staffToken = tokens.staffToken;
  });

  // Helper: create gallery page
  async function createGalleryPage(): Promise<number> {
    const res = await SELF.fetch('http://localhost/api/gallery', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const page = await res.json<{ id: number }>();
    return page.id;
  }

  // Helper: create an availability rule for a gallery page
  async function createRule(
    pageId: number,
    rule: Record<string, unknown>
  ): Promise<{ id: number; [k: string]: unknown }> {
    const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}/availability-rules`, {
      method: 'POST',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    return res.json();
  }

  // --- Schedule date window CRUD ---

  describe('schedule date window', () => {
    it('PATCH /api/gallery/:id with schedule_start persists', async () => {
      const pageId = await createGalleryPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: '2026-06-01T09:00:00' }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ schedule_start: string | null }>();
      expect(updated.schedule_start).toBe('2026-06-01T09:00:00');
    });

    it('PATCH /api/gallery/:id with schedule_end persists', async () => {
      const pageId = await createGalleryPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_end: '2026-12-31T23:59:00' }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ schedule_end: string | null }>();
      expect(updated.schedule_end).toBe('2026-12-31T23:59:00');
    });

    it('PATCH /api/gallery/:id with schedule_start: null clears it', async () => {
      const pageId = await createGalleryPage();

      // Set first
      await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: '2026-06-01T09:00:00' }),
      });

      // Clear
      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: null }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ schedule_start: string | null }>();
      expect(updated.schedule_start).toBeNull();
    });

    it('PATCH /api/gallery/:id with both schedule_start AND schedule_end persists', async () => {
      const pageId = await createGalleryPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
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
      const pageId = await createGalleryPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: 'not-a-date' }),
      });
      expect(res.status).toBe(400);
    });
  });

  // --- Availability Rules CRUD ---

  describe('availability rules CRUD', () => {
    it('POST /api/gallery/:id/availability-rules creates rule, returns rule with id', async () => {
      const pageId = await createGalleryPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}/availability-rules`, {
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

    it('GET /api/gallery/:id/availability-rules lists rules for page', async () => {
      const pageId = await createGalleryPage();

      // Create two rules
      await createRule(pageId, {
        start_time: '08:00',
        end_time: '12:00',
        day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
      });
      await createRule(pageId, {
        start_time: '14:00',
        end_time: '18:00',
        day_fri: 1, day_mon: 0, day_tue: 0, day_wed: 0, day_thu: 0, day_sat: 0, day_sun: 0,
      });

      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}/availability-rules`, {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const rules = await res.json<Array<{ id: number }>>();
      expect(rules.length).toBe(2);
    });

    it('PATCH /api/gallery/availability-rules/:id updates rule fields', async () => {
      const pageId = await createGalleryPage();
      const rule = await createRule(pageId, {
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

    it('DELETE /api/gallery/availability-rules/:id deletes a rule', async () => {
      const pageId = await createGalleryPage();
      const rule = await createRule(pageId, {
        start_time: '09:00',
        end_time: '17:00',
        day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
      });

      const res = await SELF.fetch(`http://localhost/api/gallery/availability-rules/${rule.id}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);

      // Verify it's gone
      const listRes = await SELF.fetch(`http://localhost/api/gallery/${pageId}/availability-rules`, {
        headers: authHeader(adminToken),
      });
      const rules = await listRes.json<Array<{ id: number }>>();
      expect(rules.find((r) => r.id === rule.id)).toBeUndefined();
    });
  });

  // --- Validation ---

  describe('availability rule validation', () => {
    it('POST rule with end_time <= start_time returns 400', async () => {
      const pageId = await createGalleryPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}/availability-rules`, {
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
      const pageId = await createGalleryPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}/availability-rules`, {
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
      const pageId = await createGalleryPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}/availability-rules`, {
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
      const pageId = await createGalleryPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}/availability-rules`, {
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
      const res = await SELF.fetch('http://localhost/api/gallery/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
        body: JSON.stringify({ schedule_start: '2026-06-01T09:00:00' }),
      });
      expect(res.status).toBe(401);
    });

    it('POST availability rule requires auth (401)', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/1/availability-rules', {
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
      const res = await SELF.fetch('http://localhost/api/gallery/1/availability-rules', {
        headers: { Origin: 'http://localhost:5173' },
      });
      expect(res.status).toBe(401);
    });

    it('PATCH availability rule requires auth (401)', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/availability-rules/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
        body: JSON.stringify({ start_time: '10:00' }),
      });
      expect(res.status).toBe(401);
    });

    it('DELETE availability rule requires auth (401)', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/availability-rules/1', {
        method: 'DELETE',
        headers: { Origin: 'http://localhost:5173' },
      });
      expect(res.status).toBe(401);
    });

    it('staff can create availability rules', async () => {
      const pageId = await createGalleryPage();

      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}/availability-rules`, {
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

  describe('public gallery includes scheduling data', () => {
    it('GET /api/public/gallery includes schedule_start, schedule_end, and availabilityRules on pages', async () => {
      const pageId = await createGalleryPage();

      // Make page visible (is_visible defaults to 1 on creation)

      // Set schedule window
      await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schedule_start: '2026-01-01T00:00:00',
          schedule_end: '2026-12-31T23:59:00',
        }),
      });

      // Create an availability rule
      await createRule(pageId, {
        start_time: '08:00',
        end_time: '22:00',
        day_mon: 1, day_tue: 1, day_wed: 1, day_thu: 1, day_fri: 1, day_sat: 1, day_sun: 1,
      });

      // Fetch public gallery
      const res = await SELF.fetch('http://localhost/api/public/gallery');
      expect(res.status).toBe(200);
      const body = await res.json<{
        pages: Array<{
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

      const page = body.pages.find((p) => p.id === pageId);
      expect(page).toBeDefined();
      expect(page!.schedule_start).toBe('2026-01-01T00:00:00');
      expect(page!.schedule_end).toBe('2026-12-31T23:59:00');
      expect(Array.isArray(page!.availabilityRules)).toBe(true);
      expect(page!.availabilityRules.length).toBe(1);
      expect(page!.availabilityRules[0].start_time).toBe('08:00');
    });
  });

  // --- Gallery page CRUD ---

  describe('gallery page CRUD', () => {
    it('POST /api/gallery creates a gallery page', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery', {
        method: 'POST',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(201);
      const page = await res.json<{ id: number; is_visible: number }>();
      expect(page.id).toBeDefined();
      expect(page.is_visible).toBe(1);
    });

    it('GET /api/gallery lists pages with auth', async () => {
      await createGalleryPage();
      const res = await SELF.fetch('http://localhost/api/gallery', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const pages = await res.json<Array<{ id: number }>>();
      expect(pages.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/gallery/:id returns page with details', async () => {
      const pageId = await createGalleryPage();
      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const page = await res.json<{ id: number; names: unknown[]; media: unknown[]; availabilityRules: unknown[] }>();
      expect(page.id).toBe(pageId);
      expect(Array.isArray(page.names)).toBe(true);
      expect(Array.isArray(page.media)).toBe(true);
      expect(Array.isArray(page.availabilityRules)).toBe(true);
    });

    it('PATCH /api/gallery/:id updates is_visible', async () => {
      const pageId = await createGalleryPage();
      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: false }),
      });
      expect(res.status).toBe(200);
      const page = await res.json<{ is_visible: number }>();
      expect(page.is_visible).toBe(0);
    });

    it('DELETE /api/gallery/:id deletes a page', async () => {
      const pageId = await createGalleryPage();
      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);

      const getRes = await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
        headers: authHeader(adminToken),
      });
      expect(getRes.status).toBe(404);
    });

    it('PUT /api/gallery/:id/names/:lang sets a name', async () => {
      const pageId = await createGalleryPage();
      const res = await SELF.fetch(`http://localhost/api/gallery/${pageId}/names/GB`, {
        method: 'PUT',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Summer Gallery' }),
      });
      expect(res.status).toBe(200);
      const name = await res.json<{ name: string; language_code: string }>();
      expect(name.name).toBe('Summer Gallery');
      expect(name.language_code).toBe('GB');
    });

    it('GET /api/gallery returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery');
      expect(res.status).toBe(401);
    });

    it('GET /api/gallery/99999 returns 404 for non-existent page', async () => {
      const res = await SELF.fetch('http://localhost/api/gallery/99999', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(404);
    });
  });

  // --- Cascade delete ---

  describe('cascade delete', () => {
    it('deleting gallery page cascades to availability rules', async () => {
      const pageId = await createGalleryPage();

      const rule = await createRule(pageId, {
        start_time: '09:00',
        end_time: '17:00',
        day_mon: 1, day_tue: 0, day_wed: 0, day_thu: 0, day_fri: 0, day_sat: 0, day_sun: 0,
      });
      expect(rule.id).toBeDefined();

      // Delete the gallery page
      const deleteRes = await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(deleteRes.status).toBe(200);

      // Verify the page is gone
      const getRes = await SELF.fetch(`http://localhost/api/gallery/${pageId}`, {
        headers: authHeader(adminToken),
      });
      expect(getRes.status).toBe(404);

      // The rule should be gone — try to PATCH it
      const ruleRes = await SELF.fetch(`http://localhost/api/gallery/availability-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_time: '10:00' }),
      });
      expect(ruleRes.status).toBe(404);
    });
  });

  // --- menu items no longer have schedule fields ---

  describe('menu items have no schedule fields', () => {
    it('PATCH /api/menu-items/:id does not accept schedule_start', async () => {
      const res = await SELF.fetch('http://localhost/api/menu-items', {
        method: 'POST',
        headers: authHeader(adminToken),
      });
      const item = await res.json<{ id: number }>();

      const patchRes = await SELF.fetch(`http://localhost/api/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_start: '2026-06-01T09:00:00' }),
      });
      // Unknown fields are stripped by Zod, so it returns 200 with the unchanged item
      expect(patchRes.status).toBe(200);
      const updated = await patchRes.json<Record<string, unknown>>();
      expect('schedule_start' in updated).toBe(false);
    });

    it('public menu items do not have availabilityRules', async () => {
      const createRes = await SELF.fetch('http://localhost/api/menu-items', {
        method: 'POST',
        headers: authHeader(adminToken),
      });
      const item = await createRes.json<{ id: number }>();

      await SELF.fetch(`http://localhost/api/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: true }),
      });

      const res = await SELF.fetch('http://localhost/api/public/menu');
      expect(res.status).toBe(200);
      const body = await res.json<{ items: Array<Record<string, unknown>> }>();
      const found = body.items.find((i) => i.id === item.id);
      // If item has no name it may not appear; either way no availabilityRules key
      if (found) {
        expect('availabilityRules' in found).toBe(false);
        expect('schedule_start' in found).toBe(false);
      }
    });
  });
});
