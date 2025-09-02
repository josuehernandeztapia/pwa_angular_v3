// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Import Cypress plugins
import 'cypress-mochawesome-reporter/register';
import '@cypress/code-coverage/support';

// Global configuration
Cypress.config('defaultCommandTimeout', 10000);
Cypress.config('requestTimeout', 10000);
Cypress.config('responseTimeout', 10000);

// Global hooks
beforeEach(() => {
  // Reset application state before each test
  cy.window().then((win) => {
    win.localStorage.clear();
    win.sessionStorage.clear();
  });
  
  // Set up default intercepts for consistent testing
  cy.setupDefaultIntercepts();
  
  // Set viewport for consistent testing
  cy.viewport(1280, 720);
});

afterEach(() => {
  // Clean up after each test
  cy.clearCookies();
  cy.clearLocalStorage();
});

// Handle uncaught exceptions to prevent test failures from app errors
Cypress.on('uncaught:exception', (err, runnable) => {
  // Don't fail tests on uncaught exceptions from the application
  // This is especially useful for Angular applications that might throw
  // errors that don't affect the test scenario
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  
  // Log the error but don't fail the test for navigation errors
  if (err.message.includes('Navigation')) {
    console.warn('Navigation error caught:', err.message);
    return false;
  }
  
  // Return true to fail the test on other exceptions
  return true;
});

// Add global custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login with credentials
       */
      login(email?: string, password?: string): Chainable<void>;
      
      /**
       * Custom command to setup default API intercepts
       */
      setupDefaultIntercepts(): Chainable<void>;
      
      /**
       * Custom command to wait for Angular to be ready
       */
      waitForAngular(): Chainable<void>;
      
      /**
       * Custom command to seed test data
       */
      seedTestData(dataType: 'clients' | 'dashboard' | 'quotes'): Chainable<void>;
      
      /**
       * Custom command to verify accessibility
       */
      checkA11y(context?: string): Chainable<void>;
      
      /**
       * Custom command to simulate network conditions
       */
      simulateNetworkCondition(condition: 'online' | 'offline' | 'slow'): Chainable<void>;
    }
  }
}

export {};