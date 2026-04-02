import { execSync, spawn } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const BACKEND = resolve(ROOT, 'backend');
const TEST_DATA_FILE = resolve(__dirname, '.test-data.json');

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} not ready after ${timeoutMs}ms`);
}

function d1(sql: string): void {
  execSync(
    `bunx wrangler d1 execute live_menu --local --command "${sql}"`,
    { cwd: BACKEND, stdio: 'pipe' },
  );
}

async function globalSetup(): Promise<void> {
  // Kill anything already on port 8787
  try {
    execSync('kill $(lsof -ti :8787) 2>/dev/null', {
      stdio: 'pipe',
      shell: true,
    });
    await new Promise((r) => setTimeout(r, 500));
  } catch {}

  console.log('[e2e] Building app...');
  execSync('bun run build:all', { cwd: ROOT, stdio: 'inherit' });

  console.log('[e2e] Resetting local D1...');
  rmSync(resolve(BACKEND, '.wrangler', 'state'), { recursive: true, force: true });

  console.log('[e2e] Applying migrations...');
  execSync('bunx wrangler d1 migrations apply live_menu --local', {
    cwd: BACKEND,
    stdio: 'inherit',
  });

  console.log('[e2e] Seeding test data...');
  const now = Math.floor(Date.now() / 1000);
  const expires = now + 86400;
  const adminToken = 'e2e-' + randomBytes(16).toString('hex');
  const regToken = 'e2e-reg-' + randomBytes(16).toString('hex');

  d1(
    `INSERT INTO users (id, name, role, is_active, has_passkey, created_at, updated_at) VALUES (1, 'Test Admin', 'admin', 1, 1, ${now}, ${now})`,
  );
  d1(
    `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES ('${adminToken}', 1, ${expires}, ${now})`,
  );
  d1(
    `INSERT INTO users (id, name, role, is_active, has_passkey, created_at, updated_at) VALUES (2, 'New Staff', 'staff', 1, 0, ${now}, ${now})`,
  );
  d1(
    `INSERT INTO registration_tokens (token, user_id, pre_filled_name, role, expires_at, created_by, created_at) VALUES ('${regToken}', 2, 'New Staff', 'staff', ${expires}, 1, ${now})`,
  );

  console.log('[e2e] Starting wrangler dev...');
  const server = spawn(
    'bunx',
    [
      'wrangler', 'dev', '--port', '8787',
      '--var', 'WEBAUTHN_RP_ID:localhost',
      '--var', 'WEBAUTHN_RP_NAME:Live Menu Test',
      '--var', 'WEBAUTHN_ORIGIN:http://localhost:8787',
      '--var', 'FRONTEND_URL:http://localhost:8787/admin',
    ],
    { cwd: BACKEND, stdio: 'pipe', detached: true },
  );
  server.unref();

  server.stdout?.on('data', (d: Buffer) => {
    const line = d.toString().trim();
    if (line) console.log(`[wrangler] ${line}`);
  });
  server.stderr?.on('data', (d: Buffer) => {
    const line = d.toString().trim();
    if (line) console.log(`[wrangler] ${line}`);
  });

  console.log('[e2e] Waiting for server...');
  await waitForServer('http://localhost:8787/api/health', 30_000);
  console.log('[e2e] Server ready!');

  writeFileSync(
    TEST_DATA_FILE,
    JSON.stringify({
      adminToken,
      adminUserId: 1,
      registrationToken: regToken,
      registrationUserName: 'New Staff',
      serverPid: server.pid,
    }),
  );
}

export default globalSetup;
