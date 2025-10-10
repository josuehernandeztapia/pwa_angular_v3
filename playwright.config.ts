/// <reference types="node" />
import { defineConfig, devices } from 'playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/*.spec.ts'],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/visual-results.json' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:4300',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot configuration */
    screenshot: 'only-on-failure',
    /* Video recording */
    video: 'on',
    /* Video size for demo quality */
    viewport: { width: 1280, height: 720 },
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    /* Wait for network idle */
    waitForLoadState: 'networkidle',
  },

  /* Configure projects for major browsers */
  projects: [
    // Desktop browsers
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

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },

    // High DPI displays
    {
      name: 'High DPI',
      use: {
        ...devices['Desktop Chrome HiDPI'],
        deviceScaleFactor: 2,
      },
    },
  ],

  /* Visual comparison settings */
  expect: {
    // Threshold for pixel difference (0-1, where 1 = 100% different)
    threshold: 0.1,
    // Animation handling
    toHaveScreenshot: {
      // Disable animations for consistent screenshots
      animations: 'disabled',
      // Threshold for individual test
      threshold: 0.1,
      // Maximum allowed pixel difference
      maxDiffPixels: 2500,
    },
    // Page screenshot options
    toMatchSnapshot: {
      threshold: 0.1,
      maxDiffPixels: 2500,
    },
  },

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run serve:testing',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* Global setup and teardown */
  // globalSetup: require.resolve('./tests/visual/setup/global-setup.ts'),
  // globalTeardown: require.resolve('./tests/visual/setup/global-teardown.ts'),

  /* Test timeout */
  timeout: 60 * 1000,

  /* Output directories */
  outputDir: './test-results/visual',
  
  /* Metadata */
  metadata: {
    project: 'Conductores PWA',
    description: 'Visual regression tests for UI components and pages',
  },
});
