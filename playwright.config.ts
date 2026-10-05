import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

/**
 * End-to-end tests run against a production build, the same thing that gets deployed.
 *
 *   npx playwright install chromium     (once)
 *   npm run test:e2e
 *
 * RESERVATION_DRY_RUN lets the booking form succeed without a real email key.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/de`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { RESERVATION_DRY_RUN: 'true' },
  },
});
