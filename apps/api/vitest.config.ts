import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';
import { fileURLToPath } from 'node:url';

export default defineWorkersConfig(async () => ({
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: true,
        miniflare: {
          compatibilityDate: '2025-04-01',
          d1Databases: ['DB'],
          bindings: { TEST_MIGRATIONS: await readD1Migrations(fileURLToPath(new URL('../../db/migrations', import.meta.url))) },
        },
      },
    },
    setupFiles: ['./test/setup.ts'],
  },
}));
