import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Languages CRUD', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
    staffToken = tokens.staffToken;
  });

  it('GET /api/languages returns languages including GB base', async () => {
    const res = await SELF.fetch('http://localhost/api/languages');
    expect(res.status).toBe(200);
    const langs = await res.json<Array<{ code: string; is_base: number }>>();
    expect(langs.length).toBeGreaterThanOrEqual(1);
    const gb = langs.find((l) => l.code === 'GB');
    expect(gb).toBeDefined();
    expect(gb!.is_base).toBe(1);
  });

  it('POST /api/languages adds a new language (admin only)', async () => {
    // Use a unique code to avoid conflicts across runs
    const code = 'FR';
    // Clean up first if exists
    await SELF.fetch(`http://localhost/api/languages/${code}`, {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });

    const res = await SELF.fetch('http://localhost/api/languages', {
      method: 'POST',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, displayName: 'French' }),
    });
    expect(res.status).toBe(201);
    const lang = await res.json<{ code: string; display_name: string }>();
    expect(lang.code).toBe('FR');
    expect(lang.display_name).toBe('French');
  });

  it('POST /api/languages returns 403 for staff', async () => {
    const res = await SELF.fetch('http://localhost/api/languages', {
      method: 'POST',
      headers: { ...authHeader(staffToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'DE', displayName: 'German' }),
    });
    expect(res.status).toBe(403);
  });

  it('DELETE /api/languages/:code deletes a non-base language', async () => {
    // Add a language to delete
    const code = 'ES';
    await SELF.fetch(`http://localhost/api/languages/${code}`, {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    await SELF.fetch('http://localhost/api/languages', {
      method: 'POST',
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, displayName: 'Spanish' }),
    });

    const res = await SELF.fetch(`http://localhost/api/languages/${code}`, {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ success: boolean }>();
    expect(body.success).toBe(true);
  });

  it('DELETE /api/languages/GB fails because it is the base language', async () => {
    const res = await SELF.fetch('http://localhost/api/languages/GB', {
      method: 'DELETE',
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(400);
    const body = await res.json<{ error: string }>();
    expect(body.error).toBeTruthy(); // generic error (base language deletion blocked)
  });
});
