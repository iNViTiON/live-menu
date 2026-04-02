import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { setupTestEnv } from './setup';

describe('Health check', () => {
  beforeAll(async () => {
    await setupTestEnv();
  });

  it('GET /api/health returns 200 with status ok', async () => {
    const res = await SELF.fetch('http://localhost/api/health');
    expect(res.status).toBe(200);
    const body = await res.json<{ status: string }>();
    expect(body.status).toBe('ok');
  });
});
