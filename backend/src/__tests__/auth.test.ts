import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('Auth routes', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
    staffToken = tokens.staffToken;
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

  // C6: Login challenge test
  describe('POST /api/auth/login/challenge', () => {
    it('returns 200 with options containing challenge and challengeId', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/login/challenge', {
        method: 'POST',
        headers: { Origin: 'http://localhost:5173' },
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ options: { challenge: string }; challengeId: string }>();
      expect(body.options).toBeDefined();
      expect(body.options.challenge).toBeDefined();
      expect(typeof body.challengeId).toBe('string');
      expect(body.challengeId.length).toBeGreaterThan(0);
    });
  });

  // C5: Auth admin endpoint tests
  describe('GET /api/auth/registration-tokens', () => {
    it('admin gets token list', async () => {
      // Create a token to ensure non-empty list
      await SELF.fetch('http://localhost/api/auth/registration-links', {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ preFilledName: 'Token List User', role: 'staff' }),
      });

      const res = await SELF.fetch('http://localhost/api/auth/registration-tokens', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const tokens = await res.json<Array<{ token: string; user_name: string }>>();
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThanOrEqual(1);
    });

    it('staff gets 403', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/registration-tokens', {
        headers: authHeader(staffToken),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/auth/registration-tokens/:token', () => {
    it('revokes token and cleans up orphaned user', async () => {
      // Create a registration link (creates an orphaned user with has_passkey=0)
      const createRes = await SELF.fetch('http://localhost/api/auth/registration-links', {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ preFilledName: 'Orphan User', role: 'staff' }),
      });
      const { token, userId } = await createRes.json<{ token: string; userId: number }>();

      // Verify user exists
      const userBefore = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
      expect(userBefore).not.toBeNull();

      // Revoke the token
      const res = await SELF.fetch(`http://localhost/api/auth/registration-tokens/${token}`, {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);

      // Verify orphaned user (has_passkey=0) is deleted
      const userAfter = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
      expect(userAfter).toBeNull();
    });
  });

  describe('GET /api/auth/sessions/expired/count', () => {
    it('returns expired session count', async () => {
      // Insert an expired session
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR IGNORE INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
      ).bind('expired-sess-1', 1, now - 100, now - 200).run();

      const res = await SELF.fetch('http://localhost/api/auth/sessions/expired/count', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ count: number }>();
      expect(typeof body.count).toBe('number');
      expect(body.count).toBeGreaterThanOrEqual(1);
    });

    it('staff gets 403', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/sessions/expired/count', {
        headers: authHeader(staffToken),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/auth/sessions/expired', () => {
    it('deletes expired sessions and returns count', async () => {
      // Insert an expired session
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR IGNORE INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
      ).bind('expired-sess-del', 1, now - 100, now - 200).run();

      const res = await SELF.fetch('http://localhost/api/auth/sessions/expired', {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ deleted: number }>();
      expect(typeof body.deleted).toBe('number');
      expect(body.deleted).toBeGreaterThanOrEqual(1);

      // Verify expired session is gone
      const row = await env.DB.prepare("SELECT id FROM sessions WHERE id = 'expired-sess-del'").first();
      expect(row).toBeNull();
    });
  });

  describe('GET /api/auth/expired-challenges/count', () => {
    it('returns expired challenge count', async () => {
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR IGNORE INTO webauthn_challenges (id, challenge, user_id, type, expires_at, created_at) VALUES (?, ?, NULL, ?, ?, ?)'
      ).bind('expired-challenge-1', 'test-challenge', 'authentication', now - 100, now - 200).run();

      const res = await SELF.fetch('http://localhost/api/auth/expired-challenges/count', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ count: number }>();
      expect(typeof body.count).toBe('number');
      expect(body.count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DELETE /api/auth/expired-challenges', () => {
    it('deletes expired challenges', async () => {
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR IGNORE INTO webauthn_challenges (id, challenge, user_id, type, expires_at, created_at) VALUES (?, ?, NULL, ?, ?, ?)'
      ).bind('expired-challenge-del', 'test-challenge', 'authentication', now - 100, now - 200).run();

      const res = await SELF.fetch('http://localhost/api/auth/expired-challenges', {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ deleted: number }>();
      expect(typeof body.deleted).toBe('number');
      expect(body.deleted).toBeGreaterThanOrEqual(1);
    });
  });

  // M14: Staff 403 on registration-links
  describe('POST /api/auth/registration-links (staff)', () => {
    it('staff gets 403', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/registration-links', {
        method: 'POST',
        headers: { ...authHeader(staffToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ preFilledName: 'Blocked User', role: 'staff' }),
      });
      expect(res.status).toBe(403);
    });
  });
});
