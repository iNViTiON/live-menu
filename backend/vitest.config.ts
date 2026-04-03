import {
  defineWorkersConfig,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers/config';
import path from 'node:path';

export default defineWorkersConfig(async () => {
  const migrationsPath = path.join(__dirname, 'src/db/migrations');
  const migrations = await readD1Migrations(migrationsPath);

  return {
    test: {
      poolOptions: {
        workers: {
          isolatedStorage: false,
          wrangler: { configPath: './wrangler.toml' },
          miniflare: {
            d1Databases: ['DB'],
            r2Buckets: ['MEDIA_BUCKET'],
            durableObjects: {
              BROADCAST_ROOM: 'BroadcastRoom',
            },
            bindings: {
              FRONTEND_URL: 'http://localhost:5173',
              WEBAUTHN_RP_ID: 'localhost',
              WEBAUTHN_RP_NAME: 'Live Menu Test',
              WEBAUTHN_ORIGIN: 'http://localhost:5173',
              TEST_MIGRATIONS: JSON.stringify(migrations),
            },
          },
        },
      },
      coverage: {
        provider: 'istanbul',
        reporter: ['text', 'lcov'],
        include: ['src/**/*.ts'],
        exclude: ['src/__tests__/**'],
      },
    },
  };
});
