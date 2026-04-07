import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig(async () => {
  const migrationsPath = path.join(__dirname, 'src/db/migrations');
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          persist: true,
          d1Databases: ['DB'],
          r2Buckets: ['MEDIA_BUCKET'],
          durableObjects: {
            BROADCAST_ROOM: 'BroadcastRoom',
          },
          bindings: {
            FRONTEND_URL: 'http://localhost:5173',
            ADMIN_URL: 'http://localhost:5174',
            WEBAUTHN_RP_ID: 'localhost',
            WEBAUTHN_RP_NAME: 'Live Menu Test',
            WEBAUTHN_ORIGIN: 'http://localhost:5173',
            TEST_MIGRATIONS: JSON.stringify(migrations),
          },
        },
      }),
    ],
    test: {
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'lcov'],
        include: ['src/**/*.ts'],
        exclude: ['src/__tests__/**'],
      },
    },
  };
});
