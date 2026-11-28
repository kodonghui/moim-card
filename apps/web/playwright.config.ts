import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './e2e', use: { baseURL: 'http://127.0.0.1:4173' }, webServer: [
  { command: 'pnpm dev --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
  { command: 'pnpm dlx @stoplight/prism-cli@5.16.0 mock ../../api/openapi.yaml', url: 'http://127.0.0.1:4010/v1/me/rooms', reuseExistingServer: !process.env.CI, timeout: 120000 },
] });
