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

  it('GET /api/public/menu includes media array on each item', async () => {
    // Create a visible menu item and attach a media variant
    const createRes = await SELF.fetch('http://localhost/api/menu-items', {
      method: 'POST',
      headers: authHeader(adminToken),
    });
    const item = await createRes.json<{ id: number }>();

    const formData = new FormData();
    const file = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
      'public-media.png',
      { type: 'image/png' }
    );
    formData.append('file', file);

    const uploadRes = await SELF.fetch(
      `http://localhost/api/menu-items/${item.id}/media/GB`,
      { method: 'POST', headers: authHeader(adminToken), body: formData }
    );
    expect(uploadRes.status).toBe(201);

    // Fetch public menu and assert media array is present on items
    const res = await SELF.fetch('http://localhost/api/public/menu');
    expect(res.status).toBe(200);
    const body = await res.json<{
      items: Array<{
        id: number;
        media: Array<{ language_code: string; r2_key: string; media_type: string }>;
      }>;
    }>();

    // Every visible item should carry a media field (array, possibly empty)
    for (const it of body.items) {
      expect(Array.isArray(it.media)).toBe(true);
    }

    // The specific item we just attached media to should contain the new variant
    const ourItem = body.items.find((i) => i.id === item.id);
    expect(ourItem).toBeDefined();
    expect(ourItem!.media.length).toBeGreaterThan(0);
    const gbMedia = ourItem!.media.find((m) => m.language_code === 'GB');
    expect(gbMedia).toBeDefined();
    expect(gbMedia!.media_type).toBe('image');
    expect(gbMedia!.r2_key).toContain('media/');
  });

  // -------------------------------------------------------------------------
  // Idle warning UI strings (migration 0010)
  //
  // These assertions verify that the seeded ui:idle_warning_* keys flow all
  // the way from the database through MenuService.listPublicMenu() and
  // (after Phase 4a) GalleryService.listPublicGallery() into the public
  // API responses consumed by the menu SPA.
  //
  // The menu endpoint already exposes `settings` today; the gallery endpoint
  // is gaining a `settings` field in Phase 4a, so the gallery-side tests
  // will only pass after Backend's Phase 4a merge.
  // -------------------------------------------------------------------------

  it('GET /api/public/menu exposes idle_warning_title in GB and EE', async () => {
    const res = await SELF.fetch('http://localhost/api/public/menu');
    expect(res.status).toBe(200);
    const body = await res.json<{ settings: Record<string, string> }>();

    expect(body.settings).toBeDefined();
    expect(typeof body.settings).toBe('object');
    expect(body.settings['ui:idle_warning_title:GB']).toBe('Are you still there?');
    expect(body.settings['ui:idle_warning_title:EE']).toBe('Oled sa endiselt siin?');
  });

  it('GET /api/public/menu exposes idle_warning_hint in GB and EE', async () => {
    const res = await SELF.fetch('http://localhost/api/public/menu');
    expect(res.status).toBe(200);
    const body = await res.json<{ settings: Record<string, string> }>();

    expect(body.settings['ui:idle_warning_hint:GB']).toBe('Tap anywhere to continue');
    expect(body.settings['ui:idle_warning_hint:EE']).toBe('Puuduta kuhugi, et jätkata');
  });

  it('GET /api/public/gallery response now includes a settings object', async () => {
    const res = await SELF.fetch('http://localhost/api/public/gallery');
    expect(res.status).toBe(200);
    const body = await res.json<{
      pages: unknown[];
      languages: unknown[];
      version: number;
      settings: Record<string, string>;
    }>();

    // New field required by Phase 4a so the gallery SPA can render idle warnings
    expect(body.settings).toBeDefined();
    expect(typeof body.settings).toBe('object');
    expect(Array.isArray(body.settings)).toBe(false);
  });

  it('GET /api/public/gallery exposes all 4 idle_warning settings keys', async () => {
    const res = await SELF.fetch('http://localhost/api/public/gallery');
    expect(res.status).toBe(200);
    const body = await res.json<{ settings: Record<string, string> }>();

    expect(body.settings['ui:idle_warning_title:GB']).toBe('Are you still there?');
    expect(body.settings['ui:idle_warning_title:EE']).toBe('Oled sa endiselt siin?');
    expect(body.settings['ui:idle_warning_hint:GB']).toBe('Tap anywhere to continue');
    expect(body.settings['ui:idle_warning_hint:EE']).toBe('Puuduta kuhugi, et jätkata');
  });
});
