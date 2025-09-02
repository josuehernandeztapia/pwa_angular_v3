import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/tests/visual',
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
    baseURL: 'http://localhost:4200',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot configuration */
    screenshot: 'only-on-failure',
    /* Video recording */
    video: 'retain-on-failure',
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
      // Wait for fonts to load
      fonts: 'ready',
      // Threshold for individual test
      threshold: 0.1,
      // Maximum allowed pixel difference
      maxDiffPixels: 100,
    },
    // Page screenshot options
    toMatchSnapshot: {
      threshold: 0.1,
      maxDiffPixels: 100,
    },
  },

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run serve:test',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Global setup and teardown */
  globalSetup: require.resolve('./src/tests/visual/setup/global-setup.ts'),
  globalTeardown: require.resolve('./src/tests/visual/setup/global-teardown.ts'),

  /* Test timeout */
  timeout: 30 * 1000,

  /* Output directories */
  outputDir: './test-results/visual',
  
  /* Metadata */
  metadata: {
    project: 'Conductores PWA',
    description: 'Visual regression tests for UI components and pages',
  },
});