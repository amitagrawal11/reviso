/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Reviso Notes E2E tests.
 *
 * Tests run against a production build served via `vite preview`.
 * The demo tree (/demo) is used for all tests — it runs on mockRepo
 * (localStorage) with no auth required, making tests fast and hermetic.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report/html' }], ['list']],
  outputDir: 'playwright-report/test-results',

  use: {
    // Base URL for the demo tree — no auth required.
    baseURL: 'http://localhost:4174',
    // Capture trace on first retry so CI failures are debuggable.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testDir: './e2e/desktop',
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      testDir: './e2e/mobile',
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
      testDir: './e2e/mobile',
    },
  ],

  // Build once, then start the preview server before all tests.
  webServer: {
    command: 'npm run build && npm run preview -- --port 4174',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
