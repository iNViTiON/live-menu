import { env } from 'cloudflare:test';
import { applyD1Migrations } from 'cloudflare:test';
import type { D1Migration } from 'cloudflare:test';

let initialized = false;

/**
 * Apply D1 migrations and seed test data once (idempotent).
 * Returns session tokens for authenticated requests.
 */
export async function setupTestEnv(): Promise<{ adminToken: string; staffToken: string }> {
  const adminToken = 'test-admin-session-token';
  const staffToken = 'test-staff-session-token';

  if (initialized) {
    return { adminToken, staffToken };
  }

  // Apply migrations (tracks applied via d1_migrations table)
  const raw = (env as Record<string, unknown>).TEST_MIGRATIONS as string;
  const migrations: D1Migration[] = JSON.parse(raw);
  await applyD1Migrations(env.DB, migrations);

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 86400;

  // Seed users (INSERT OR IGNORE for idempotency)
  await env.DB.prepare(
    'INSERT OR IGNORE INTO users (id, name, role, is_active, has_passkey, created_at, updated_at) VALUES (?, ?, ?, 1, 1, ?, ?)'
  ).bind(1, 'Test Admin', 'admin', now, now).run();

  await env.DB.prepare(
    'INSERT OR IGNORE INTO users (id, name, role, is_active, has_passkey, created_at, updated_at) VALUES (?, ?, ?, 1, 1, ?, ?)'
  ).bind(2, 'Test Staff', 'staff', now, now).run();

  // Seed sessions
  await env.DB.prepare(
    'INSERT OR IGNORE INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(adminToken, 1, expiresAt, now).run();

  await env.DB.prepare(
    'INSERT OR IGNORE INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(staffToken, 2, expiresAt, now).run();

  initialized = true;
  return { adminToken, staffToken };
}

/** Auth header helper */
export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
