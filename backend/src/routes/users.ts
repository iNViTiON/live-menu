import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { userUpdateSchema } from '../validation/schemas';

const users = new Hono<HonoEnv>();

// GET / — list all users (admin only)
users.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403);

  const limit = Math.min(Math.max(Number(c.req.query('limit')) || 100, 1), 500);
  const offset = Math.max(Number(c.req.query('offset')) || 0, 0);

  const result = await c.env.DB.prepare(
    'SELECT id, name, role, is_active, has_passkey, created_at, updated_at FROM users ORDER BY name LIMIT ? OFFSET ?'
  )
    .bind(limit, offset)
    .all();

  return c.json(result.results);
});

// GET /:id — get single user (admin or self)
users.get('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const targetId = parseInt(c.req.param('id'), 10);
  if (isNaN(targetId)) return c.json({ error: 'Invalid id' }, 400);

  if (user.role !== 'admin' && user.id !== targetId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const result = await c.env.DB.prepare(
    'SELECT id, name, role, is_active, has_passkey, created_at, updated_at FROM users WHERE id = ?'
  )
    .bind(targetId)
    .first();

  if (!result) return c.json({ error: 'User not found' }, 404);

  return c.json(result);
});

// PATCH /:id — update user (admin can update all fields; staff can only update own name)
users.patch('/:id', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const targetId = parseInt(c.req.param('id'), 10);
  if (isNaN(targetId)) return c.json({ error: 'Invalid id' }, 400);

  if (user.role !== 'admin' && user.id !== targetId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Validation error' }, 400);
  }

  const { name, is_active, role } = parsed.data;
  const now = Math.floor(Date.now() / 1000);

  // Non-admins can only update their own name
  if (user.role !== 'admin') {
    if (is_active !== undefined || role !== undefined) {
      return c.json({ error: 'Staff can only update their name' }, 403);
    }
    await c.env.DB.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?')
      .bind(name, now, targetId)
      .run();
  } else {
    await c.env.DB.prepare(
      'UPDATE users SET name = COALESCE(?, name), is_active = COALESCE(?, is_active), role = COALESCE(?, role), updated_at = ? WHERE id = ?'
    )
      .bind(
        name ?? null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        role ?? null,
        now,
        targetId
      )
      .run();
  }

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['user']);

  const updated = await c.env.DB.prepare(
    'SELECT id, name, role, is_active, has_passkey, created_at, updated_at FROM users WHERE id = ?'
  )
    .bind(targetId)
    .first();

  return c.json(updated);
});

// GET /:id/passkeys — list user's passkeys (admin or self)
users.get('/:id/passkeys', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const targetId = parseInt(c.req.param('id'), 10);
  if (isNaN(targetId)) return c.json({ error: 'Invalid id' }, 400);

  if (user.role !== 'admin' && user.id !== targetId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const passkeys = await c.env.DB.prepare(
    'SELECT id, credential_id, device_name, created_at FROM passkey_credentials WHERE user_id = ?'
  )
    .bind(targetId)
    .all();

  return c.json(passkeys.results);
});

// DELETE /:id/passkeys/:credentialId — remove a passkey (admin or self)
users.delete('/:id/passkeys/:credentialId', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const targetId = parseInt(c.req.param('id'), 10);
  if (isNaN(targetId)) return c.json({ error: 'Invalid id' }, 400);

  if (user.role !== 'admin' && user.id !== targetId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  await c.env.DB.prepare(
    'DELETE FROM passkey_credentials WHERE user_id = ? AND credential_id = ?'
  )
    .bind(targetId, c.req.param('credentialId'))
    .run();

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['user']);

  return c.json({ success: true });
});

// DELETE /:id — hard-delete user (admin only)
users.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  const targetId = parseInt(c.req.param('id'), 10);
  if (isNaN(targetId)) return c.json({ error: 'Invalid id' }, 400);

  if (user.id === targetId) {
    return c.json({ error: 'Cannot delete your own account' }, 400);
  }

  const targetUser = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?')
    .bind(targetId)
    .first<{ id: number; role: string }>();

  if (!targetUser) return c.json({ error: 'User not found' }, 404);

  if (targetUser.role === 'admin') {
    const adminCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1'
    )
      .bind('admin')
      .first<{ count: number }>();

    if (adminCount && adminCount.count <= 1) {
      return c.json({ error: 'Cannot delete the last admin user' }, 400);
    }
  }

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM registration_tokens WHERE created_by = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM passkey_credentials WHERE user_id = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(targetId),
    c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId),
  ]);

  const versionVectorService = c.get('versionVectorService');
  await versionVectorService.notifyChange(['user']);

  return c.json({ success: true, message: 'User deleted successfully' });
});

export { users as userRoutes };
