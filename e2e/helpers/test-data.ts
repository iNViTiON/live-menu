import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DATA_FILE = resolve(__dirname, '..', '.test-data.json');

export interface TestData {
  adminToken: string;
  adminUserId: number;
  registrationToken: string;
  registrationUserName: string;
  serverPid: number;
}

export function getTestData(): TestData {
  return JSON.parse(readFileSync(TEST_DATA_FILE, 'utf-8'));
}
