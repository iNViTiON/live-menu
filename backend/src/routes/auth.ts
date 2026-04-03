import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import {
  registrationLinkSchema,
  registerChallengeSchema,
  registerVerifySchema,
  loginVerifySchema,
} from '../validation/schemas';

const auth = new Hono<HonoEnv>();

// POST /register/challenge — start passkey registration
auth.post('/register/challenge', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const parsed = registerChallengeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);
  }

  const { token } = parsed.data;
  const authService = c.get('authService');

  const tokenData = await authService.validateRegistrationToken(token);
  if (!tokenData) {
    return c.json({ error: 'Invalid or expired token' }, 400);
  }

  const user = await authService.getUserById(tokenData.user_id!);
  if (!user) {
    return c.json({ error: 'User not found' }, 400);
  }

  const options = await authService.generateRegistrationOptions(user.id, user.name);

  const challengeId = crypto.randomUUID();
  const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;
  await c.env.DB.prepare(
    'INSERT INTO webauthn_challenges (id, challenge, user_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(challengeId, options.challenge, user.id, 'registration', expiresAt, Math.floor(Date.now() / 1000))
    .run();

  return c.json({ options, userId: user.id, challengeId });
});

// POST /register/verify — complete passkey registration
auth.post('/register/verify', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const parsed = registerVerifySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);
  }

  const { userId, response, challengeId, token, deviceName } = parsed.data;
  const authService = c.get('authService');
  const versionVectorService = c.get('versionVectorService');

  const now = Math.floor(Date.now() / 1000);
  const challengeRow = await c.env.DB.prepare(
    'SELECT challenge, user_id FROM webauthn_challenges WHERE id = ? AND type = ? AND expires_at > ?'
  )
    .bind(challengeId, 'registration', now)
    .first<{ challenge: string; user_id: number }>();

  if (!challengeRow) {
    return c.json({ error: 'Invalid or expired challenge' }, 400);
  }

  if (challengeRow.user_id !== userId) {
    return c.json({ error: 'User ID mismatch' }, 400);
  }

  await c.env.DB.prepare('DELETE FROM webauthn_challenges WHERE id = ?')
    .bind(challengeId)
    .run();

  let verification;
  try {
    verification = await authService.verifyRegistrationResponse(
      userId,
      response,
      challengeRow.challenge
    );
  } catch (error: any) {
    console.error('Registration verification error:', error);
    return c.json({ error: error.message || 'Verification failed' }, 400);
  }

  if (!verification.verified) {
    return c.json({ error: 'Verification failed' }, 400);
  }

  await authService.saveCredential(
    userId,
    verification.registrationInfo.credential.id,
    verification.registrationInfo.credential.publicKey,
    verification.registrationInfo.credential.counter,
    deviceName
  );

  await authService.markUserAsRegistered(userId);
  await authService.markTokenAsUsed(token);
  await versionVectorService.notifyChange(['user']);

  const sessionToken = await authService.createSession(userId);
  const user = await authService.getUserById(userId);

  return c.json({ user, token: sessionToken });
});

// POST /login/challenge — start passkey login
auth.post('/login/challenge', async (c) => {
  try {
    const authService = c.get('authService');
    const options = await authService.generateAuthenticationOptions();

    const challengeId = crypto.randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60;
    await c.env.DB.prepare(
      'INSERT INTO webauthn_challenges (id, challenge, user_id, type, expires_at, created_at) VALUES (?, ?, NULL, ?, ?, ?)'
    )
      .bind(challengeId, options.challenge, 'authentication', expiresAt, Math.floor(Date.now() / 1000))
      .run();

    return c.json({ options, challengeId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('Login challenge error:', error);
    return c.json({ error: message }, 500);
  }
});

// POST /login/verify — complete passkey login
auth.post('/login/verify', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const parsed = loginVerifySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);
  }

  const { response, challengeId } = parsed.data;
  const authService = c.get('authService');

  const now = Math.floor(Date.now() / 1000);
  const challengeRow = await c.env.DB.prepare(
    'SELECT challenge FROM webauthn_challenges WHERE id = ? AND type = ? AND expires_at > ?'
  )
    .bind(challengeId, 'authentication', now)
    .first<{ challenge: string }>();

  if (!challengeRow) {
    return c.json({ error: 'Invalid or expired challenge' }, 400);
  }

  await c.env.DB.prepare('DELETE FROM webauthn_challenges WHERE id = ?')
    .bind(challengeId)
    .run();

  let loginResult;
  try {
    loginResult = await authService.verifyAuthenticationResponse(
      response,
      challengeRow.challenge
    );
  } catch (error: any) {
    console.error('Login verification error:', error);
    return c.json({ error: error.message || 'Verification failed' }, 400);
  }

  const { userId: loginUserId, verified } = loginResult;

  if (!verified) {
    return c.json({ error: 'Verification failed' }, 400);
  }

  const sessionToken = await authService.createSession(loginUserId);
  const user = await authService.getUserById(loginUserId);

  return c.json({ user, token: sessionToken });
});

// POST /logout
auth.post('/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const authService = c.get('authService');
    await authService.deleteSession(token);
  }
  return c.json({ success: true });
});

// GET /me
auth.get('/me', (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return c.json(user);
});

// POST /registration-links — admin creates a registration invite
auth.post('/registration-links', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const parsed = registrationLinkSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);
  }

  const { preFilledName, role } = parsed.data;
  if (!preFilledName.trim()) {
    return c.json({ error: 'Pre-filled name is required' }, 400);
  }

  const authService = c.get('authService');
  const versionVectorService = c.get('versionVectorService');

  try {
    const { token, userId } = await authService.createRegistrationToken(
      user.id,
      role,
      preFilledName.trim()
    );

    const url = `${c.env.FRONTEND_URL}/register/${token}`;
    await versionVectorService.notifyChange(['user']);

    return c.json({
      token,
      url,
      userId,
      expiresAt: Math.floor(Date.now() / 1000) + 6 * 60 * 60,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    return c.json({ error: message }, 400);
  }
});

// GET /registration/:token — validate token (public, used by registration page)
auth.get('/registration/:token', async (c) => {
  const authService = c.get('authService');
  const tokenData = await authService.validateRegistrationToken(c.req.param('token'));

  if (!tokenData) {
    return c.json({ error: 'Invalid or expired token' }, 400);
  }

  return c.json({
    valid: true,
    preFilledName: tokenData.pre_filled_name,
    role: tokenData.role,
  });
});

// GET /registration-tokens — list active tokens (admin only)
auth.get('/registration-tokens', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const now = Math.floor(Date.now() / 1000);
  const limit = Math.min(Math.max(Number(c.req.query('limit')) || 100, 1), 500);
  const offset = Math.max(Number(c.req.query('offset')) || 0, 0);

  const tokens = await c.env.DB.prepare(
    `SELECT rt.*, u.name as user_name
     FROM registration_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.used_at IS NULL AND rt.expires_at > ?
     ORDER BY rt.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(now, limit, offset)
    .all();

  return c.json(tokens.results);
});

// DELETE /registration-tokens/:token — revoke token (admin only)
auth.delete('/registration-tokens/:token', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const token = c.req.param('token');
  const versionVectorService = c.get('versionVectorService');

  const tokenData = await c.env.DB.prepare(
    'SELECT user_id FROM registration_tokens WHERE token = ?'
  )
    .bind(token)
    .first<{ user_id: number | null }>();

  await c.env.DB.prepare('DELETE FROM registration_tokens WHERE token = ?')
    .bind(token)
    .run();

  // Clean up orphaned user if they never completed registration
  if (tokenData?.user_id) {
    await c.env.DB.prepare('DELETE FROM users WHERE id = ? AND has_passkey = 0')
      .bind(tokenData.user_id)
      .run();
  }

  await versionVectorService.notifyChange(['user']);

  return c.json({ success: true });
});

// GET /expired-challenges/count — admin only
auth.get('/expired-challenges/count', async (c) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const now = Math.floor(Date.now() / 1000);
  const result = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM webauthn_challenges WHERE expires_at <= ?'
  ).bind(now).first<{ count: number }>();
  return c.json({ count: result?.count ?? 0 });
});

// DELETE /expired-challenges — admin only
auth.delete('/expired-challenges', async (c) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const now = Math.floor(Date.now() / 1000);
  const result = await c.env.DB.prepare(
    'DELETE FROM webauthn_challenges WHERE expires_at <= ?'
  ).bind(now).run();
  return c.json({ deleted: result.meta.changes ?? 0 });
});

export { auth as authRoutes };
