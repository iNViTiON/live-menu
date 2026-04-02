import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DATA_FILE = resolve(__dirname, '.test-data.json');

async function globalTeardown(): Promise<void> {
  if (existsSync(TEST_DATA_FILE)) {
    try {
      const data = JSON.parse(readFileSync(TEST_DATA_FILE, 'utf-8'));
      if (data.serverPid) {
        try {
          process.kill(-data.serverPid, 'SIGTERM');
        } catch {
          try {
            process.kill(data.serverPid, 'SIGTERM');
          } catch {}
        }
      }
    } catch {}

    try {
      unlinkSync(TEST_DATA_FILE);
    } catch {}
  }

  // Fallback: kill anything on port 8787
  try {
    execSync('kill $(lsof -ti :8787) 2>/dev/null', {
      stdio: 'pipe',
      shell: true,
    });
  } catch {}
}

export default globalTeardown;
