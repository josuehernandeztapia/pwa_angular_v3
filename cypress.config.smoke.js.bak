const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // No coverage setup for smoke tests
    },
    supportFile: false,
    specPattern: 'cypress/e2e/smoke-*.cy.ts',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    taskTimeout: 60000
  }
})