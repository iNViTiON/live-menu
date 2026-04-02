import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Auth routes', () => {
  let adminToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
  });

  describe('GET /api/auth/me', () => {
    it('returns user when authenticated', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/me', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const user = await res.json<{ id: number; name: string; role: string }>();
      expect(user.id).toBe(1);
      expect(user.name).toBe('Test Admin');
      expect(user.role).toBe('admin');
    });

    it('returns 401 when not authenticated', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('deletes session and returns success', async () => {
      // Create a disposable session
      const now = Math.floor(Date.now() / 1000);
      const tempToken = 'temp-logout-token';
      await env.DB.prepare(
        'INSERT OR IGNORE INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
      ).bind(tempToken, 1, now + 86400, now).run();

      const res = await SELF.fetch('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: authHeader(tempToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);

      // Verify session is gone
      const meRes = await SELF.fetch('http://localhost/api/auth/me', {
        headers: authHeader(tempToken),
      });
      expect(meRes.status).toBe(401);
    });
  });

  describe('POST /api/auth/registration-links', () => {
    it('admin can create a registration link', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/registration-links', {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ preFilledName: 'New User', role: 'staff' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ token: string; url: string; userId: number }>();
      expect(body.token).toBeDefined();
      expect(body.url).toContain('/register/');
      expect(body.userId).toBeDefined();
    });

    it('returns 401 without auth', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/registration-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preFilledName: 'New User', role: 'staff' }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/registration/:token', () => {
    it('validates a valid registration token', async () => {
      const createRes = await SELF.fetch('http://localhost/api/auth/registration-links', {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ preFilledName: 'Validate User', role: 'admin' }),
      });
      const { token } = await createRes.json<{ token: string }>();

      const res = await SELF.fetch(`http://localhost/api/auth/registration/${token}`);
      expect(res.status).toBe(200);
      const body = await res.json<{ valid: boolean; preFilledName: string; role: string }>();
      expect(body.valid).toBe(true);
      expect(body.preFilledName).toBe('Validate User');
      expect(body.role).toBe('admin');
    });

    it('returns 400 for invalid token', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/registration/nonexistent-token');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/register/challenge', () => {
    it('returns challenge for valid registration token', async () => {
      const linkRes = await SELF.fetch('http://localhost/api/auth/registration-links', {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ preFilledName: 'Challenge User', role: 'staff' }),
      });
      const { token } = await linkRes.json<{ token: string }>();

      const res = await SELF.fetch('http://localhost/api/auth/register/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ options: { challenge: string }; challengeId: string }>();
      expect(body.options.challenge).toBeDefined();
      expect(body.challengeId).toBeDefined();
    });

    it('returns 400 for invalid token', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/register/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token' }),
      });
      expect(res.status).toBe(400);
    });
  });
});
