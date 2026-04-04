import { describe, it, expect, beforeAll } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { setupTestEnv, authHeader } from './setup';

describe('User routes', () => {
  let adminToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const tokens = await setupTestEnv();
    adminToken = tokens.adminToken;
    staffToken = tokens.staffToken;
  });

  describe('GET /api/users', () => {
    it('admin gets user list', async () => {
      const res = await SELF.fetch('http://localhost/api/users', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const users = await res.json<Array<{ id: number; name: string; role: string }>>();
      expect(users.length).toBeGreaterThanOrEqual(2);
      const admin = users.find((u) => u.id === 1);
      expect(admin?.role).toBe('admin');
    });

    it('staff gets 403', async () => {
      const res = await SELF.fetch('http://localhost/api/users', {
        headers: authHeader(staffToken),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/users/:id', () => {
    it('admin can access any user', async () => {
      const res = await SELF.fetch('http://localhost/api/users/2', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const user = await res.json<{ id: number; name: string }>();
      expect(user.id).toBe(2);
    });

    it('staff can access self', async () => {
      const res = await SELF.fetch('http://localhost/api/users/2', {
        headers: authHeader(staffToken),
      });
      expect(res.status).toBe(200);
      const user = await res.json<{ id: number }>();
      expect(user.id).toBe(2);
    });

    it('staff cannot access other user', async () => {
      const res = await SELF.fetch('http://localhost/api/users/1', {
        headers: authHeader(staffToken),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('admin updates all fields', async () => {
      // Create a user to update
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR IGNORE INTO users (id, name, role, is_active, has_passkey, created_at, updated_at) VALUES (?, ?, ?, 1, 0, ?, ?)'
      ).bind(10, 'Patch Target', 'staff', now, now).run();

      const res = await SELF.fetch('http://localhost/api/users/10', {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name', role: 'admin', is_active: false }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ name: string; role: string; is_active: number }>();
      expect(updated.name).toBe('Updated Name');
      expect(updated.role).toBe('admin');
      expect(updated.is_active).toBe(0);
    });

    it('staff can only update own name', async () => {
      const res = await SELF.fetch('http://localhost/api/users/2', {
        method: 'PATCH',
        headers: { ...authHeader(staffToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Staff Name' }),
      });
      expect(res.status).toBe(200);
      const updated = await res.json<{ name: string }>();
      expect(updated.name).toBe('New Staff Name');
    });

    it('staff cannot update role', async () => {
      const res = await SELF.fetch('http://localhost/api/users/2', {
        method: 'PATCH',
        headers: { ...authHeader(staffToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'X', role: 'admin' }),
      });
      expect(res.status).toBe(403);
    });
  });

  // H6: Passkey management tests
  describe('GET /api/users/:id/passkeys', () => {
    it('admin can list any user passkeys', async () => {
      // Seed a passkey credential for user 2
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR IGNORE INTO passkey_credentials (id, user_id, credential_id, public_key, counter, device_name, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)'
      ).bind(100, 2, 'cred-staff-100', 'pk-data', 'Test Device', now).run();

      const res = await SELF.fetch('http://localhost/api/users/2/passkeys', {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const passkeys = await res.json<Array<{ credential_id: string; device_name: string }>>();
      expect(Array.isArray(passkeys)).toBe(true);
      expect(passkeys.length).toBeGreaterThanOrEqual(1);
    });

    it('staff can list own passkeys', async () => {
      const res = await SELF.fetch('http://localhost/api/users/2/passkeys', {
        headers: authHeader(staffToken),
      });
      expect(res.status).toBe(200);
      const passkeys = await res.json<Array<{ credential_id: string }>>();
      expect(Array.isArray(passkeys)).toBe(true);
    });

    it('staff cannot list other user passkeys', async () => {
      const res = await SELF.fetch('http://localhost/api/users/1/passkeys', {
        headers: authHeader(staffToken),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/users/:id/passkeys/:credentialId', () => {
    it('admin can delete a passkey', async () => {
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR IGNORE INTO passkey_credentials (id, user_id, credential_id, public_key, counter, device_name, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)'
      ).bind(101, 2, 'cred-del-admin', 'pk-data', 'Delete Me', now).run();

      const res = await SELF.fetch('http://localhost/api/users/2/passkeys/cred-del-admin', {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);

      // Verify passkey is gone
      const row = await env.DB.prepare(
        "SELECT id FROM passkey_credentials WHERE credential_id = 'cred-del-admin'"
      ).first();
      expect(row).toBeNull();
    });

    it('staff can delete own passkey', async () => {
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR IGNORE INTO passkey_credentials (id, user_id, credential_id, public_key, counter, device_name, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)'
      ).bind(102, 2, 'cred-del-self', 'pk-data', 'My Device', now).run();

      const res = await SELF.fetch('http://localhost/api/users/2/passkeys/cred-del-self', {
        method: 'DELETE',
        headers: authHeader(staffToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);
    });

    it('staff cannot delete other user passkey', async () => {
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR IGNORE INTO passkey_credentials (id, user_id, credential_id, public_key, counter, device_name, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)'
      ).bind(103, 1, 'cred-admin-only', 'pk-data', 'Admin Device', now).run();

      const res = await SELF.fetch('http://localhost/api/users/1/passkeys/cred-admin-only', {
        method: 'DELETE',
        headers: authHeader(staffToken),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('cannot self-delete', async () => {
      const res = await SELF.fetch('http://localhost/api/users/1', {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toContain('own account');
    });

    it('cannot delete last admin', async () => {
      // Deactivate the user we promoted to admin in the PATCH test so only user 1 is an active admin
      await env.DB.prepare('UPDATE users SET role = ?, is_active = 1 WHERE id = ?')
        .bind('staff', 10)
        .run();

      // Ensure user 1 is the only active admin
      const count = await env.DB.prepare(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1"
      ).first<{ count: number }>();

      if (count && count.count > 1) {
        // Demote any other admins besides user 1 for this test
        await env.DB.prepare(
          "UPDATE users SET role = 'staff' WHERE role = 'admin' AND id != 1"
        ).run();
      }

      // Create a second admin user that we'll try to delete — but first check there's only 1
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR IGNORE INTO users (id, name, role, is_active, has_passkey, created_at, updated_at) VALUES (?, ?, ?, 1, 0, ?, ?)'
      ).bind(11, 'Solo Admin Target', 'admin', now, now).run();

      // Now there are 2 active admins (1 and 11). Try to delete 11 — should succeed
      // For the "last admin" test, we need exactly 1 active admin
      // Deactivate user 11 first, then make them the target but only admin
      // Actually: let's just make user 11 the only admin and try to delete via user 1
      // But user 1 needs to remain admin to make the request. So with both active admins,
      // deleting user 11 should work. We need a scenario where deleting would leave 0 admins.

      // Reset: make only user 1 an active admin
      await env.DB.prepare("UPDATE users SET role = 'staff' WHERE id = 11").run();
      await env.DB.prepare("UPDATE users SET role = 'staff' WHERE role = 'admin' AND id != 1").run();

      // Now user 1 is the only active admin. Create user 12 as another admin,
      // then demote user 1... but user 1 must stay admin to make requests.
      // The check is: if target is admin and there's only 1 admin, block.
      // So promote user 12 to admin and make them the only other admin:
      await env.DB.prepare(
        'INSERT OR IGNORE INTO users (id, name, role, is_active, has_passkey, created_at, updated_at) VALUES (?, ?, ?, 1, 0, ?, ?)'
      ).bind(12, 'Last Admin Test', 'admin', now, now).run();

      // Demote user 1 temporarily so user 12 is the ONLY active admin
      // Wait — we can't demote user 1 because we need them for auth.
      // The logic checks: if target.role === 'admin' && count of active admins <= 1.
      // Currently admins: user 1 and user 12. Count = 2, so deleting 12 would succeed.
      // To test "cannot delete last admin", we need count = 1 with the target being admin.
      // That means user 12 must be the only active admin... but then user 1 (staff) gets 403.
      // The delete route requires admin. So we need 2 admins where deleting one leaves 1.
      // If count <= 1 after delete → blocked. count starts at 2, deleting leaves 1 → allowed.
      // If count starts at 1 (only user 1) and we try to delete user 1 → blocked by self-delete first.
      // The only way: user 1 tries to delete user 12 when user 12 is the ONLY other admin
      // and user 1 is NOT admin... doesn't work.

      // Actually: the code checks count of admins BEFORE delete. If count <= 1, blocked.
      // So if there's only 1 admin total (the target), it's blocked.
      // But the requesting user must be admin too. So minimum 2 admins means count >= 2.
      // Unless... user 1 is admin but inactive? No, they have an active session.
      // The count query is: role = 'admin' AND is_active = 1
      // If user 1 is admin+active and user 12 is admin+active, count = 2 → delete allowed.
      // To get count = 1: user 1 is admin+active, target user 12 is admin but is_active = 0.
      // Then count of active admins = 1 (only user 1). But target role is admin, so the check
      // fires: count <= 1 → blocked!

      // Make user 12 admin but inactive
      await env.DB.prepare('UPDATE users SET role = ?, is_active = 0 WHERE id = 12').bind('admin').run();

      const res = await SELF.fetch('http://localhost/api/users/12', {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(400);
      const body = await res.json<{ error: string }>();
      expect(body.error).toContain('last admin');
    });

    it('successful cascade delete', async () => {
      const now = Math.floor(Date.now() / 1000);
      await env.DB.prepare(
        'INSERT OR IGNORE INTO users (id, name, role, is_active, has_passkey, created_at, updated_at) VALUES (?, ?, ?, 1, 0, ?, ?)'
      ).bind(20, 'Delete Me', 'staff', now, now).run();

      // Add a session for this user to verify cascade
      await env.DB.prepare(
        'INSERT OR IGNORE INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
      ).bind('delete-me-session', 20, now + 86400, now).run();

      const res = await SELF.fetch('http://localhost/api/users/20', {
        method: 'DELETE',
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const body = await res.json<{ success: boolean }>();
      expect(body.success).toBe(true);

      // Verify user is gone
      const userRow = await env.DB.prepare('SELECT id FROM users WHERE id = 20').first();
      expect(userRow).toBeNull();

      // Verify session is cleaned up
      const sessionRow = await env.DB.prepare(
        "SELECT id FROM sessions WHERE id = 'delete-me-session'"
      ).first();
      expect(sessionRow).toBeNull();
    });
  });
});
