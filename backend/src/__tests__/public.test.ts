import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Public routes', () => {
  let adminToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;

    // Create a visible menu item
    const res1 = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const item1 = await res1.json<{ id: number }>();
    await SELF.fetch(`http://localhost/api/menu-items/${item1.id}/names/GB`, {
      method: 'PUT',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Visible Item' }),
    });

    // Create a hidden menu item
    const res2 = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const item2 = await res2.json<{ id: number }>();
    await SELF.fetch(`http://localhost/api/menu-items/${item2.id}`, {
      method: 'PATCH',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: false }),
    });
  });

  it('GET /api/public/menu returns only visible items + languages', async () => {
    const res = await SELF.fetch('http://localhost/api/public/menu');
    expect(res.status).toBe(200);

    const body = await res.json<{
      items: Array<{ is_visible: number }>;
      languages: Array<{ code: string }>;
      version: number;
    }>();

    // Must have at least one visible item
    expect(body.items.length).toBeGreaterThan(0);

    // All returned items should be visible
    for (const item of body.items) {
      expect(item.is_visible).toBe(1);
    }

    // Languages should include GB
    const gb = body.languages.find((l) => l.code === 'GB');
    expect(gb).toBeDefined();

    // Hidden item must not appear
    const hiddenItem = body.items.find(
      (item: { is_visible: number }) => item.is_visible === 0
    );
    expect(hiddenItem).toBeUndefined();

    // Version should be a recent timestamp
    expect(body.version).toBeGreaterThan(0);
  });
});
