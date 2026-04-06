import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { env, SELF, fetchMock } from 'cloudflare:test';
import { setupTestEnv } from './setup';

const MOCK_VERSION = 'test-build-version-abc123';

describe('GET /api/public/check-app-update', () => {
  beforeAll(async () => {
    await setupTestEnv();

    // Clean up any previous app:build_version so tests start fresh
    await env.DB.prepare(
      "DELETE FROM settings WHERE key = 'app:build_version'"
    ).run();

    // Mock CF Pages version.json endpoint
    fetchMock.activate();
    fetchMock.disableNetConnect();
  });

  afterEach(() => {
    fetchMock.resetHandlers();
  });

  function mockVersion(version: string = MOCK_VERSION) {
    fetchMock
      .get('http://localhost:5173')
      .intercept({ path: '/_app/version.json' })
      .reply(200, JSON.stringify({ version }), {
        headers: { 'content-type': 'application/json' },
      });
  }

  it('returns 200 with a version string', async () => {
    mockVersion();
    const res = await SELF.fetch('http://localhost/api/public/check-app-update');
    expect(res.status).toBe(200);

    const body = await res.json<{ version: string }>();
    expect(body).toHaveProperty('version');
    expect(typeof body.version).toBe('string');
    expect(body.version.length).toBeGreaterThan(0);
  });

  it('stores the version in D1 settings on first call', async () => {
    mockVersion();
    await SELF.fetch('http://localhost/api/public/check-app-update');

    const row = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'app:build_version'"
    ).first<{ value: string }>();

    expect(row).toBeDefined();
    expect(row!.value).toBe(MOCK_VERSION);
  });

  it('stored version matches the returned version', async () => {
    mockVersion();
    const res = await SELF.fetch('http://localhost/api/public/check-app-update');
    const body = await res.json<{ version: string }>();

    const row = await env.DB.prepare(
      "SELECT value FROM settings WHERE key = 'app:build_version'"
    ).first<{ value: string }>();

    expect(row!.value).toBe(body.version);
  });

  it('returns the same version on repeated calls', async () => {
    mockVersion();
    const res1 = await SELF.fetch('http://localhost/api/public/check-app-update');
    const body1 = await res1.json<{ version: string }>();

    mockVersion();
    const res2 = await SELF.fetch('http://localhost/api/public/check-app-update');
    const body2 = await res2.json<{ version: string }>();

    expect(res2.status).toBe(200);
    expect(body2.version).toBe(body1.version);
  });

  it('returns null version when CF Pages is unreachable', async () => {
    // No mock registered — fetchMock will reject the request
    const res = await SELF.fetch('http://localhost/api/public/check-app-update');
    expect(res.status).toBe(200);
    const body = await res.json<{ version: string | null }>();
    expect(body.version).toBeNull();
  });
});
