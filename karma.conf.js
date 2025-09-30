// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

// Ensure Chrome binary is available in CI/containerized environments
try {
  // Prefer Puppeteer if available (may fail on ESM-only versions when using require)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  process.env.CHROME_BIN = require('puppeteer').executablePath();
} catch (e) {
  try {
    // Fallback to Playwright Chromium executable path (CommonJS-friendly)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { chromium } = require('playwright');
    if (chromium && typeof chromium.executablePath === 'function') {
      process.env.CHROME_BIN = chromium.executablePath();
    }
  } catch (e2) {
    // Final fallback: rely on system Chrome if available
  }
}

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution order
        random: false,
        stopSpecOnExpectationFailure: false
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/conductores-pwa'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcov' },
        { type: 'json-summary' }
      ],
      check: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      }
    },
    reporters: ['progress', 'kjhtml', 'coverage'],
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox', 
          '--disable-web-security', 
          '--disable-gpu', 
          '--remote-debugging-port=9222',
          // Memory leak prevention flags
          '--max-old-space-size=4096',
          '--gc-interval=100'
        ]
      }
    },
    // Memory leak prevention - import test setup
    files: [
      { pattern: 'src/test-setup.ts', watched: false }
    ],
    // Allow running in restricted environments where the default 9876 port is unavailable
    port: process.env.KARMA_PORT ? Number(process.env.KARMA_PORT) : 0,
    restartOnFileChange: true,
    singleRun: false,
    logLevel: config.LOG_INFO
  });
};
