import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

const FRONTEND_ORIGIN = 'http://localhost:5173';
const ADMIN_ORIGIN = 'http://localhost:5174';
const UNKNOWN_ORIGIN = 'http://evil.example.com';

describe('Multi-origin support', () => {
  let adminToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
  });

  // ── CORS ──────────────────────────────────────────────────

  describe('CORS headers', () => {
    it('returns Access-Control-Allow-Origin for FRONTEND_URL origin', async () => {
      const res = await SELF.fetch('http://localhost/api/health', {
        headers: { Origin: FRONTEND_ORIGIN },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(FRONTEND_ORIGIN);
    });

    it('returns Access-Control-Allow-Origin for ADMIN_URL origin', async () => {
      const res = await SELF.fetch('http://localhost/api/health', {
        headers: { Origin: ADMIN_ORIGIN },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ADMIN_ORIGIN);
    });

    it('does NOT return permissive CORS for unknown origin', async () => {
      const res = await SELF.fetch('http://localhost/api/health', {
        headers: { Origin: UNKNOWN_ORIGIN },
      });
      expect(res.status).toBe(200);
      const acao = res.headers.get('Access-Control-Allow-Origin');
      // Should be absent or not match the unknown origin (never '*' or the attacker origin)
      expect(acao).not.toBe(UNKNOWN_ORIGIN);
      expect(acao).not.toBe('*');
    });

    it('preflight OPTIONS for FRONTEND_URL returns correct CORS', async () => {
      const res = await SELF.fetch('http://localhost/api/health', {
        method: 'OPTIONS',
        headers: {
          Origin: FRONTEND_ORIGIN,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      });
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(FRONTEND_ORIGIN);
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });

    it('preflight OPTIONS for ADMIN_URL returns correct CORS', async () => {
      const res = await SELF.fetch('http://localhost/api/health', {
        method: 'OPTIONS',
        headers: {
          Origin: ADMIN_ORIGIN,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      });
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ADMIN_ORIGIN);
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
  });

  // ── CSRF ──────────────────────────────────────────────────

  describe('CSRF origin check', () => {
    it('POST with FRONTEND_URL origin succeeds', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/login/challenge', {
        method: 'POST',
        headers: { Origin: FRONTEND_ORIGIN },
      });
      // Should not be rejected by CSRF — 200 means it passed through
      expect(res.status).toBe(200);
    });

    it('POST with ADMIN_URL origin succeeds', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/login/challenge', {
        method: 'POST',
        headers: { Origin: ADMIN_ORIGIN },
      });
      expect(res.status).toBe(200);
    });

    it('POST with unknown origin is rejected by CSRF', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/login/challenge', {
        method: 'POST',
        headers: { Origin: UNKNOWN_ORIGIN },
      });
      expect(res.status).toBe(403);
    });

    it('authenticated POST from ADMIN_URL passes CSRF', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/registration-links', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          Origin: ADMIN_ORIGIN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preFilledName: 'CSRF Test User', role: 'staff' }),
      });
      expect(res.status).toBe(200);
    });

    it('form-encoded POST from unknown origin is rejected', async () => {
      // Hono CSRF only checks form-like content types (form-urlencoded, multipart, text/plain)
      // because application/json requires CORS preflight — browsers enforce that separately
      const res = await SELF.fetch('http://localhost/api/auth/login/challenge', {
        method: 'POST',
        headers: {
          Origin: UNKNOWN_ORIGIN,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'foo=bar',
      });
      expect(res.status).toBe(403);
    });
  });

  // ── Registration link URL ─────────────────────────────────

  describe('Registration link URL', () => {
    it('generated registration URL uses ADMIN_URL', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/registration-links', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          Origin: ADMIN_ORIGIN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preFilledName: 'URL Test User', role: 'staff' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ token: string; url: string; userId: number }>();
      expect(body.url).toContain(ADMIN_ORIGIN);
      expect(body.url).toMatch(new RegExp(`^${ADMIN_ORIGIN}/register/`));
    });
  });

  // ── Admin WebSocket origin check ──────────────────────────

  describe('Admin WebSocket origin check', () => {
    it('rejects WS upgrade with unknown origin', async () => {
      const res = await SELF.fetch('http://localhost/api/sync-ws', {
        headers: {
          Upgrade: 'websocket',
          Origin: UNKNOWN_ORIGIN,
        },
      });
      expect(res.status).toBe(403);
    });

    it('allows WS upgrade with ADMIN_URL origin', async () => {
      const res = await SELF.fetch('http://localhost/api/sync-ws', {
        headers: {
          Upgrade: 'websocket',
          Origin: ADMIN_ORIGIN,
        },
      });
      // Should not be 403 — it will either succeed (101) or fail for other reasons
      // but crucially it should NOT be rejected based on origin
      expect(res.status).not.toBe(403);
    });

    it('allows WS upgrade with FRONTEND_URL origin', async () => {
      const res = await SELF.fetch('http://localhost/api/sync-ws', {
        headers: {
          Upgrade: 'websocket',
          Origin: FRONTEND_ORIGIN,
        },
      });
      expect(res.status).not.toBe(403);
    });
  });
});
