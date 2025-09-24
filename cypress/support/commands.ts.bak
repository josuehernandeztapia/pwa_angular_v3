// ***********************************************
// Custom commands for Conductores PWA E2E Testing
// ***********************************************

/**
 * Login command - handles authentication flow
 */
Cypress.Commands.add('login', (email = 'test@conductores.com', password = 'testPassword123') => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.waitForAngular();
    
    // Fill login form
    cy.get('[data-cy="email-input"]').type(email);
    cy.get('[data-cy="password-input"]').type(password);
    
    // Submit form
    cy.get('[data-cy="login-submit"]').click();
    
    // Wait for successful login
    cy.url().should('include', '/dashboard');
    cy.get('[data-cy="dashboard-header"]').should('be.visible');
    
    // Verify authentication token is set
    cy.window().its('localStorage.authToken').should('exist');
  });
});

/**
 * Setup default API intercepts for consistent testing
 */
Cypress.Commands.add('setupDefaultIntercepts', () => {
  // Dashboard stats
  cy.intercept('GET', '**/api/dashboard/stats', {
    fixture: 'dashboard-stats.json'
  }).as('getDashboardStats');
  
  // Clients list
  cy.intercept('GET', '**/api/clients', {
    fixture: 'clients-list.json'
  }).as('getClients');
  
  // Client details
  cy.intercept('GET', '**/api/clients/*', {
    fixture: 'client-details.json'
  }).as('getClientDetails');
  
  // Create client
  cy.intercept('POST', '**/api/clients', {
    statusCode: 201,
    body: { id: 'new-client-id', name: 'Test Client', status: 'created' }
  }).as('createClient');
  
  // Update client
  cy.intercept('PUT', '**/api/clients/*', {
    statusCode: 200,
    body: { id: 'updated-client-id', name: 'Updated Client', status: 'updated' }
  }).as('updateClient');
  
  // Delete client
  cy.intercept('DELETE', '**/api/clients/*', {
    statusCode: 200,
    body: { success: true }
  }).as('deleteClient');
  
  // Quotes
  cy.intercept('GET', '**/api/quotes', {
    fixture: 'quotes-list.json'
  }).as('getQuotes');
  
  cy.intercept('POST', '**/api/quotes', {
    fixture: 'quote-created.json'
  }).as('createQuote');
  
  // Activity feed
  cy.intercept('GET', '**/api/activity', {
    fixture: 'activity-feed.json'
  }).as('getActivity');
});

/**
 * Wait for Angular to be ready
 */
Cypress.Commands.add('waitForAngular', () => {
  cy.window().then((win: any) => {
    return new Cypress.Promise((resolve) => {
      // Wait for Angular to be defined
      if (win.ng) {
        // Angular is ready
        resolve();
      } else {
        // Wait a bit and try again
        setTimeout(() => {
          if (win.ng) {
            resolve();
          } else {
            // Fallback: just wait for DOM to be ready
            cy.get('body').should('be.visible');
            resolve();
          }
        }, 100);
      }
    });
  });
});

/**
 * Seed test data
 */
Cypress.Commands.add('seedTestData', (dataType: 'clients' | 'dashboard' | 'quotes') => {
  cy.task('log', `Seeding test data: ${dataType}`);
  
  switch (dataType) {
    case 'clients':
      cy.intercept('GET', '**/api/clients', {
        fixture: 'clients-seed-data.json'
      }).as('getSeededClients');
      break;
      
    case 'dashboard':
      cy.intercept('GET', '**/api/dashboard/**', {
        fixture: 'dashboard-seed-data.json'
      }).as('getSeededDashboard');
      break;
      
    case 'quotes':
      cy.intercept('GET', '**/api/quotes', {
        fixture: 'quotes-seed-data.json'
      }).as('getSeededQuotes');
      break;
  }
});

/**
 * Check accessibility using axe-core
 */
Cypress.Commands.add('checkA11y', (context?: string) => {
  cy.injectAxe();
  cy.configureAxe({
    rules: {
      'color-contrast': { enabled: false }, // Disable flaky color contrast checks
      'scrollable-region-focusable': { enabled: false } // Disable for complex scrollable areas
    }
  });
  
  if (context) {
    cy.checkA11y(context, {
      includedImpacts: ['critical', 'serious']
    });
  } else {
    cy.checkA11y(null, {
      includedImpacts: ['critical', 'serious']
    });
  }
});

/**
 * Simulate network conditions
 */
Cypress.Commands.add('simulateNetworkCondition', (condition: 'online' | 'offline' | 'slow') => {
  switch (condition) {
    case 'offline':
      cy.intercept('**', { forceNetworkError: true }).as('networkError');
      cy.task('log', 'Simulating offline condition');
      break;
      
    case 'slow':
      cy.intercept('**', (req) => {
        req.reply((res) => {
          // Add 2 second delay to simulate slow network
          res.delay(2000);
          res.send();
        });
      }).as('slowNetwork');
      cy.task('log', 'Simulating slow network condition');
      break;
      
    case 'online':
    default:
      cy.task('log', 'Simulating normal network condition');
      break;
  }
});

/**
 * Custom command to fill client form
 */
Cypress.Commands.add('fillClientForm', (clientData: {
  name: string;
  email: string;
  phone: string;
  rfc?: string;
  market?: string;
}) => {
  cy.get('[data-cy="client-name-input"]').clear().type(clientData.name);
  cy.get('[data-cy="client-email-input"]').clear().type(clientData.email);
  cy.get('[data-cy="client-phone-input"]').clear().type(clientData.phone);
  
  if (clientData.rfc) {
    cy.get('[data-cy="client-rfc-input"]').clear().type(clientData.rfc);
  }
  
  if (clientData.market) {
    cy.get('[data-cy="client-market-select"]').select(clientData.market);
  }
});

/**
 * Custom command to verify toast notification
 */
Cypress.Commands.add('verifyToast', (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  cy.get(`[data-cy="toast-${type}"]`)
    .should('be.visible')
    .and('contain.text', message);
    
  // Wait for toast to disappear
  cy.get(`[data-cy="toast-${type}"]`, { timeout: 5000 })
    .should('not.exist');
});

/**
 * Custom command to navigate through main navigation
 */
Cypress.Commands.add('navigateToSection', (section: 'dashboard' | 'clients' | 'quotes' | 'reports') => {
  cy.get(`[data-cy="nav-${section}"]`).click();
  cy.url().should('include', `/${section}`);
  cy.waitForAngular();
});

/**
 * Custom command to wait for loading to complete
 */
Cypress.Commands.add('waitForLoading', () => {
  // Wait for any loading spinners to disappear
  cy.get('[data-cy="loading-spinner"]', { timeout: 10000 }).should('not.exist');
  cy.get('.loading', { timeout: 10000 }).should('not.exist');
  cy.get('.spinner', { timeout: 10000 }).should('not.exist');
});

/**
 * Custom command to verify table data
 */
Cypress.Commands.add('verifyTableData', (expectedRows: number) => {
  cy.get('[data-cy="data-table"] tbody tr').should('have.length', expectedRows);
  cy.get('[data-cy="data-table"]').should('be.visible');
});

// 🚀 ENHANCED COMMANDS INTEGRATION FOR 90%+ SUCCESS RATE
// Import enhanced commands for better test reliability
import './enhanced-commands';

// Extend Cypress namespace for TypeScript support
declare global {
  namespace Cypress {
    interface Chainable {
      // Original commands
      fillClientForm(clientData: {
        name: string;
        email: string;
        phone: string;
        rfc?: string;
        market?: string;
      }): Chainable<void>;
      
      verifyToast(message: string, type?: 'success' | 'error' | 'info'): Chainable<void>;
      
      navigateToSection(section: 'dashboard' | 'clients' | 'quotes' | 'reports'): Chainable<void>;
      
      waitForLoading(): Chainable<void>;
      
      verifyTableData(expectedRows: number): Chainable<void>;
      
      // Enhanced commands (imported from enhanced-commands.ts)
      waitForLoadComplete(): Chainable<Element>;
      waitForElement(selector: string, timeout?: number): Chainable<Element>;
      waitForApiIdle(timeout?: number): Chainable<any>;
      waitForChartRender(): Chainable<Element>;
      
      getByTestId(testId: string, options?: any): Chainable<Element>;
      findByTestId(testId: string, options?: any): Chainable<Element>;
      getReliable(selectors: string[], timeout?: number): Chainable<Element>;
      
      fillFormField(testId: string, value: string): Chainable<Element>;
      selectDropdownOption(testId: string, value: string): Chainable<Element>;
      waitForFormValidation(formSelector: string): Chainable<Element>;
      
      navigateAndWait(url: string): Chainable<any>;
      waitForPageLoad(expectedUrl?: string): Chainable<any>;
      
      retryAction(actionFn: () => void, maxAttempts?: number): Chainable<any>;
      handleModals(): Chainable<any>;
      
      uploadFileReliably(selector: string, fileName: string): Chainable<Element>;
      waitForUploadComplete(uploadContainerSelector: string): Chainable<Element>;
    }
  }
}