import { describe, it, expect, beforeAll } from 'vitest';
import { env, SELF } from 'cloudflare:test';
import { setupTestEnv } from './setup';

describe('GET /api/public/check-app-update', () => {
  beforeAll(async () => {
    await setupTestEnv();

    // Clean up any previous app:build_version so tests start fresh
    await env.DB.prepare(
      "DELETE FROM settings WHERE key = 'app:build_version'"
    ).run();
  });

  it('returns 200 with a version string', async () => {
    const res = await SELF.fetch('http://localhost/api/public/check-app-update');
    expect(res.status).toBe(200);

    const body = await res.json<{ version: string }>();
    expect(body).toHaveProperty('version');
    expect(typeof body.version).toBe('string');
    expect(body.version.length).toBeGreaterThan(0);
  });

  it('stores the version in D1 settings on first call', async () => {
    // The first test already called the endpoint; verify D1 was updated
    const row = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'app:build_version'"
    ).first<{ value: string }>();

    expect(row).toBeDefined();
    expect(typeof row!.value).toBe('string');
    expect(row!.value.length).toBeGreaterThan(0);
  });

  it('stored version matches the returned version', async () => {
    const res = await SELF.fetch('http://localhost/api/public/check-app-update');
    const body = await res.json<{ version: string }>();

    const row = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'app:build_version'"
    ).first<{ value: string }>();

    expect(row!.value).toBe(body.version);
  });

  it('returns the same version on repeated calls', async () => {
    const res1 = await SELF.fetch('http://localhost/api/public/check-app-update');
    const body1 = await res1.json<{ version: string }>();

    const res2 = await SELF.fetch('http://localhost/api/public/check-app-update');
    const body2 = await res2.json<{ version: string }>();

    expect(res2.status).toBe(200);
    expect(body2.version).toBe(body1.version);
  });

  it('version matches _app/version.json from ASSETS', async () => {
    // Read the expected version directly from ASSETS
    const assetsRes = await env.ASSETS.fetch(
      new Request('http://localhost/_app/version.json')
    );
    expect(assetsRes.ok).toBe(true);
    const expected = (await assetsRes.json()) as { version: string };

    const res = await SELF.fetch('http://localhost/api/public/check-app-update');
    const body = await res.json<{ version: string }>();

    expect(body.version).toBe(expected.version);
  });
});
