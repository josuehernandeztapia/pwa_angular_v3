import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4300',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    fixturesFolder: 'cypress/fixtures',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    
    // Viewport configuration
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Test execution settings
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    
    // Video and screenshot settings
    video: true,
    screenshotOnRunFailure: true,
    
    // Retry configuration
    retries: {
      runMode: 2,
      openMode: 0
    },
    
    // Environment variables
    env: {
      apiUrl: 'http://localhost:3000/api',
      coverage: true,
      bypassAuth: true,
      testingBypassUser: {
        id: 'testing-bypass-user',
        name: 'QA Automation User',
        email: 'qa.automation@conductores.com',
        role: 'asesor',
        permissions: [
          'dashboard:view',
          'clients:view',
          'quotes:create',
          'documents:upload',
          'postventa:manage'
        ],
        token: 'testing-bypass-token',
        refreshToken: 'testing-bypass-refresh'
      }
    },
    
    // Setup and teardown
    setupNodeEvents(on, config) {
      // Coverage collection
      require('@cypress/code-coverage/task')(on, config);
      
      // Custom tasks
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        
        // Database seeding task
        seedDatabase() {
          // Mock database seeding for consistent test data
          return null;
        },
        
        // Clean test data
        cleanTestData() {
          // Clean up after tests
          return null;
        }
      });
      
      return config;
    },
    
    // Experimental features
    experimentalStudio: true,
    experimentalRunAllSpecs: true,
  },
  
  component: {
    devServer: {
      framework: 'angular',
      bundler: 'webpack',
    },
    specPattern: 'src/**/*.cy.ts',
    supportFile: 'cypress/support/component.ts',
  },
  
  // Global configuration
  chromeWebSecurity: false,
  modifyObstructiveCode: false,
  
  // Reporter configuration
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'cypress-mochawesome-reporter, mocha-junit-reporter',
    mochaJunitReporterReporterOptions: {
      mochaFile: 'cypress/reports/junit/results-[hash].xml',
    },
    cypressMochawesomeReporterReporterOptions: {
      charts: true,
      reportPageTitle: 'Conductores PWA E2E Tests',
      embeddedScreenshots: true,
      inlineAssets: true,
      saveAllAttempts: false,
      reportDir: 'cypress/reports/html',
    },
  },
});
