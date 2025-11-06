import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Go Make Your Picks E2E tests
 * 
 * Run tests:
 *   npm run test:e2e          - Run all tests headless
 *   npm run test:e2e:ui       - Run tests in UI mode
 *   npm run test:e2e:headed   - Run tests with browser visible
 *   npm run test:e2e:debug    - Run tests in debug mode
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Disable parallel execution to ensure setup test runs first
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests sequentially to ensure setup test completes first
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : [])
  ],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run your local dev server before starting the tests
  // Note: In CI, Docker Compose is started by GitHub Actions workflow
  webServer: process.env.CI ? undefined : {
    command: 'docker-compose up -d',
    url: 'http://localhost:3003/api/healthz',
    reuseExistingServer: true,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

