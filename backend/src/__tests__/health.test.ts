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

  // M11: Security headers present on API responses
  describe('Security headers', () => {
    it('GET /api/health includes security headers', async () => {
      const res = await SELF.fetch('http://localhost/api/health');
      expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'");
      expect(res.headers.get('X-Frame-Options')).toBe('DENY');
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });
  });
});
