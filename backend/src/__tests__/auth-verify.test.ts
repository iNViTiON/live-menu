import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { setupTestEnv } from './setup';

describe('Auth verify endpoints', () => {
  beforeAll(async () => {
    await setupTestEnv();
  });

  // Use unique IPs per test to avoid sharing the in-memory rate-limit bucket
  // (isolatedStorage: false means the rate-limiter store persists across all test files)
  describe('POST /api/auth/register/verify', () => {
    it('returns 400 for invalid JSON body', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.1.1' },
        body: 'not-json',
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBeDefined();
    });

    it('returns 400 when userId is missing', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.1.2' },
        body: JSON.stringify({
          response: { id: 'x', rawId: 'x', response: { clientDataJSON: 'x' } },
          challengeId: 'some-id',
          token: 'some-token',
        }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when response field is missing', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.1.3' },
        body: JSON.stringify({
          userId: 1,
          challengeId: 'some-id',
          token: 'some-token',
        }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for nonexistent challengeId', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.1.4' },
        body: JSON.stringify({
          userId: 1,
          response: { id: 'x', rawId: 'x', response: { clientDataJSON: 'x' } },
          challengeId: 'nonexistent-challenge-id',
          token: 'some-token',
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe('Invalid or expired challenge');
    });

    it('returns 400 for expired challenge', async () => {
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT INTO webauthn_challenges (id, challenge, user_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind('expired-reg-challenge', 'some-challenge-value', 1, 'registration', now - 1, now - 600).run();

      const res = await SELF.fetch('http://localhost/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.1.5' },
        body: JSON.stringify({
          userId: 1,
          response: { id: 'x', rawId: 'x', response: { clientDataJSON: 'x' } },
          challengeId: 'expired-reg-challenge',
          token: 'some-token',
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe('Invalid or expired challenge');
    });

    it('returns 400 for userId mismatch with valid challenge', async () => {
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT INTO webauthn_challenges (id, challenge, user_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind('reg-challenge-user1', 'some-challenge-value', 1, 'registration', now + 300, now).run();

      const res = await SELF.fetch('http://localhost/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.1.6' },
        body: JSON.stringify({
          userId: 999,
          response: { id: 'x', rawId: 'x', response: { clientDataJSON: 'x' } },
          challengeId: 'reg-challenge-user1',
          token: 'some-token',
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe('User ID mismatch');
    });

    it('returns 400 when WebAuthn verification fails with valid challenge', async () => {
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT INTO webauthn_challenges (id, challenge, user_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind('reg-challenge-verify', 'some-challenge-value', 1, 'registration', now + 300, now).run();

      const res = await SELF.fetch('http://localhost/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.1.7' },
        body: JSON.stringify({
          userId: 1,
          response: {
            id: 'fake-id',
            rawId: 'fake-raw-id',
            response: { clientDataJSON: 'fake-data', attestationObject: 'fake-attestation' },
          },
          challengeId: 'reg-challenge-verify',
          token: 'some-token',
        }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login/verify', () => {
    it('returns 400 for invalid JSON body', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.2.1' },
        body: 'not-json',
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBeDefined();
    });

    it('returns 400 when challengeId is missing', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.2.2' },
        body: JSON.stringify({
          response: { id: 'x', rawId: 'x', response: { clientDataJSON: 'x' } },
        }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when response field is missing', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.2.3' },
        body: JSON.stringify({
          challengeId: 'some-id',
        }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for nonexistent challengeId', async () => {
      const res = await SELF.fetch('http://localhost/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.2.4' },
        body: JSON.stringify({
          response: { id: 'x', rawId: 'x', response: { clientDataJSON: 'x' } },
          challengeId: 'nonexistent-login-challenge-id',
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe('Invalid or expired challenge');
    });

    it('returns 400 for expired challenge', async () => {
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT INTO webauthn_challenges (id, challenge, user_id, type, expires_at, created_at) VALUES (?, ?, NULL, ?, ?, ?)'
      ).bind('expired-login-challenge', 'some-challenge-value', 'authentication', now - 1, now - 600).run();

      const res = await SELF.fetch('http://localhost/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.2.5' },
        body: JSON.stringify({
          response: { id: 'x', rawId: 'x', response: { clientDataJSON: 'x' } },
          challengeId: 'expired-login-challenge',
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toBe('Invalid or expired challenge');
    });

    it('returns 400 when WebAuthn verification fails with valid challenge', async () => {
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT INTO webauthn_challenges (id, challenge, user_id, type, expires_at, created_at) VALUES (?, ?, NULL, ?, ?, ?)'
      ).bind('login-challenge-verify', 'some-challenge-value', 'authentication', now + 300, now).run();

      const res = await SELF.fetch('http://localhost/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.0.2.6' },
        body: JSON.stringify({
          response: {
            id: 'fake-id',
            rawId: 'fake-raw-id',
            response: { clientDataJSON: 'fake-data', authenticatorData: 'fake-auth-data', signature: 'fake-sig' },
          },
          challengeId: 'login-challenge-verify',
        }),
      });
      expect(res.status).toBe(400);
    });
  });
});
