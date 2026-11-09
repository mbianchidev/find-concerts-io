import { defineConfig, devices } from '@playwright/test';
import { availableParallelism } from 'node:os';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: Math.min(2, availableParallelism()),
  timeout: 45000,
  expect: { timeout: 10000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'npm run test:seed && npm run start -- --hostname 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100/api/v1/health/',
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      APP_ORIGIN: 'http://127.0.0.1:3100',
      DATABASE_PATH: resolve('.data/e2e.sqlite'),
      NEXT_TELEMETRY_DISABLED: '1',
      LOG_LEVEL: 'error',
    },
  },
});
