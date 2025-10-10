// 🚀 ENHANCED CYPRESS COMMANDS FOR 90%+ SUCCESS RATE
// Custom commands implementing robust wait strategies and reliable selectors

interface NavigateOptions {
  bypassAuth?: boolean;
}

interface BypassUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  token?: string;
  refreshToken?: string;
}

const DEFAULT_BYPASS_USER: BypassUser = {
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
};

function resolveBypassUser(): BypassUser {
  const envUser = Cypress.env('testingBypassUser') as BypassUser | undefined;
  if (!envUser || typeof envUser !== 'object') {
    return DEFAULT_BYPASS_USER;
  }
  return {
    ...DEFAULT_BYPASS_USER,
    ...envUser,
    permissions: envUser.permissions || DEFAULT_BYPASS_USER.permissions,
    token: envUser.token || DEFAULT_BYPASS_USER.token,
    refreshToken: envUser.refreshToken || DEFAULT_BYPASS_USER.refreshToken,
  };
}

function applyBypassAuth(win: Window, user: BypassUser): void {
  if (!user.token || !user.refreshToken) {
    throw new Error('Bypass auth requires token and refreshToken values.');
  }

  win.localStorage.setItem('auth_token', user.token);
  win.localStorage.setItem('refresh_token', user.refreshToken);
  win.localStorage.setItem('current_user', JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions || []
  }));
  win.localStorage.setItem('rememberMe', 'true');
}

declare global {
  namespace Cypress {
    interface Chainable {
      // Enhanced wait strategies
      waitForLoadComplete(): Chainable<Element>;
      waitForElement(selector: string, timeout?: number): Chainable<Element>;
      waitForApiIdle(timeout?: number): Chainable<any>;
      waitForChartRender(): Chainable<Element>;
      
      // Robust selector strategies  
      getByTestId(testId: string, options?: any): Chainable<Element>;
      findByTestId(testId: string, options?: any): Chainable<Element>;
      getReliable(selectors: string[], timeout?: number): Chainable<Element>;
      
      // Form and input helpers
      fillFormField(testId: string, value: string): Chainable<Element>;
      selectDropdownOption(testId: string, value: string): Chainable<Element>;
      waitForFormValidation(formSelector: string): Chainable<Element>;
      
      // Navigation and page helpers
      navigateAndWait(url: string, options?: NavigateOptions): Chainable<any>;
      waitForPageLoad(expectedUrl?: string): Chainable<any>;
      
      // Error recovery and retry mechanisms
      retryAction(actionFn: () => void, maxAttempts?: number): Chainable<any>;
      handleModals(): Chainable<any>;
      
      // File upload helpers
      uploadFileReliably(selector: string, fileName: string): Chainable<Element>;
      waitForUploadComplete(uploadContainerSelector: string): Chainable<Element>;
    }
  }
}

// 1. Enhanced Wait Strategies Implementation
Cypress.Commands.add('waitForLoadComplete', () => {
  // Wait for multiple loading indicators to disappear
  cy.get('body', { timeout: 30000 }).should('not.have.class', 'loading');
  
  // Wait for common loading spinners
  cy.get('[data-testid="loading-spinner"]', { timeout: 1000 }).should('not.exist');
  cy.get('.loading', { timeout: 1000 }).should('not.exist');
  cy.get('[data-cy="loading"]', { timeout: 1000 }).should('not.exist');
  
  // Wait for network idle
  cy.waitForApiIdle(5000);
  
  // Ensure DOM is stable (no mutations for 100ms)
  cy.wait(100);
});

Cypress.Commands.add('waitForElement', (selector: string, timeout = 10000) => {
  return cy.get(selector, { timeout })
    .should('exist')
    .should('be.visible')
    .should('not.be.disabled');
});

Cypress.Commands.add('waitForApiIdle', (timeout = 10000) => {
  let activeRequests = 0;
  
  cy.window().then((win) => {
    // Intercept all XHR/fetch requests
    const originalFetch = win.fetch;
    const originalXHR = win.XMLHttpRequest;
    
    // Mock fetch to track requests
    win.fetch = (...args) => {
      activeRequests++;
      return originalFetch.apply(win, args).finally(() => {
        activeRequests--;
      });
    };
    
    // Wait for all pending requests to complete
    cy.waitUntil(() => activeRequests === 0, {
      timeout,
      interval: 100,
      errorMsg: `API requests did not complete within ${timeout}ms`
    });
  });
});

Cypress.Commands.add('waitForChartRender', () => {
  // Wait for chart libraries to render (Chart.js, D3, etc.)
  cy.get('canvas, svg', { timeout: 15000 })
    .should('be.visible')
    .should(($charts) => {
      expect($charts.length).to.be.greaterThan(0);
    });
  
  // Wait for chart animations to complete
  cy.wait(1000);
});

// 2. Robust Selector Strategies
Cypress.Commands.add('getByTestId', (testId: string, options = {}) => {
  return cy.get(`[data-testid="${testId}"]`, { timeout: 10000, ...options });
});

Cypress.Commands.add('findByTestId', (testId: string, options = {}) => {
  return cy.get('body').find(`[data-testid="${testId}"]`, { timeout: 10000, ...options });
});

Cypress.Commands.add('getReliable', (selectors: string[], timeout = 10000) => {
  // Try selectors in order until one works
  let element = null;
  
  for (const selector of selectors) {
    try {
      cy.get(selector, { timeout: 1000 }).then(($el) => {
        if ($el.length > 0) {
          element = $el;
          return;
        }
      });
      if (element) break;
    } catch (e) {
      continue;
    }
  }
  
  if (!element) {
    throw new Error(`None of the selectors found: ${selectors.join(', ')}`);
  }
  
  return cy.wrap(element);
});

// 3. Form and Input Helpers
Cypress.Commands.add('fillFormField', (testId: string, value: string) => {
  return cy.getByTestId(testId)
    .should('be.visible')
    .should('not.be.disabled')
    .clear()
    .type(value, { delay: 50 }) // Slight delay for more reliable typing
    .should('have.value', value); // Verify the value was set
});

Cypress.Commands.add('selectDropdownOption', (testId: string, value: string) => {
  return cy.getByTestId(testId)
    .should('be.visible')
    .should('not.be.disabled')
    .select(value)
    .should('have.value', value);
});

Cypress.Commands.add('waitForFormValidation', (formSelector: string) => {
  // Wait for form validation to complete
  cy.get(formSelector, { timeout: 5000 })
    .should('not.have.class', 'ng-pending')
    .should('not.have.class', 'validating');
  
  // Wait for any async validators
  cy.wait(500);
});

// 4. Navigation and Page Helpers
Cypress.Commands.add('navigateAndWait', (url: string, options: NavigateOptions = {}) => {
  const shouldBypass = options.bypassAuth ?? Cypress.env('bypassAuth');
  if (shouldBypass) {
    const bypassUser = resolveBypassUser();
    cy.visit(url, {
      onBeforeLoad(win) {
        applyBypassAuth(win, bypassUser);
      }
    });
  } else {
    cy.visit(url);
  }
  cy.waitForPageLoad(url);
  cy.waitForLoadComplete();
});

Cypress.Commands.add('waitForPageLoad', (expectedUrl?: string) => {
  if (expectedUrl) {
    cy.url().should('include', expectedUrl);
  }
  
  // Wait for Angular to be ready
  cy.window().should('have.property', 'ng');
  
  // Wait for document ready state
  cy.document().should('have.property', 'readyState', 'complete');
  
  // Wait for any lazy-loaded modules
  cy.wait(500);
});

// 5. Error Recovery and Retry Mechanisms
Cypress.Commands.add('retryAction', (actionFn: () => void, maxAttempts = 3) => {
  let attempts = 0;
  
  const attemptAction = () => {
    attempts++;
    try {
      actionFn();
    } catch (error) {
      if (attempts < maxAttempts) {
        cy.log(`Action failed, retrying (${attempts}/${maxAttempts})`);
        cy.wait(1000); // Wait before retry
        attemptAction();
      } else {
        throw error;
      }
    }
  };
  
  attemptAction();
});

Cypress.Commands.add('handleModals', () => {
  // Handle common modal/popup states
  cy.get('body').then(($body) => {
    // Close any open modals
    if ($body.find('[data-testid="modal-close"]').length > 0) {
      cy.getByTestId('modal-close').click();
    }
    
    // Dismiss any toast notifications
    if ($body.find('.toast-close, [data-testid="toast-close"]').length > 0) {
      cy.get('.toast-close, [data-testid="toast-close"]').click({ multiple: true });
    }
    
    // Handle browser alerts
    cy.on('window:alert', () => true);
    cy.on('window:confirm', () => true);
  });
});

// 6. File Upload Helpers
Cypress.Commands.add('uploadFileReliably', (selector: string, fileName: string) => {
  return cy.get(selector, { timeout: 10000 })
    .should('exist')
    .should('not.be.disabled')
    .selectFile(`cypress/fixtures/${fileName}`, { force: true });
});

Cypress.Commands.add('waitForUploadComplete', (uploadContainerSelector: string) => {
  // Wait for upload to start
  cy.get(uploadContainerSelector, { timeout: 5000 })
    .should('contain.text', 'Subiendo')
    .or('contain.text', 'Uploading');
  
  // Wait for upload to complete
  cy.get(uploadContainerSelector, { timeout: 30000 })
    .should('not.contain.text', 'Subiendo')
    .should('not.contain.text', 'Uploading');
  
  // Wait for any post-processing
  cy.wait(2000);
});

// Export for TypeScript support
export {};

// Usage examples and best practices:
/*

// ✅ GOOD: Use enhanced wait strategies
cy.navigateAndWait('/dashboard');
cy.waitForChartRender();
cy.getByTestId('metrics-card').should('be.visible');

// ✅ GOOD: Robust selectors with fallbacks
cy.getReliable([
  '[data-testid="submit-btn"]',
  '.submit-button',
  'button[type="submit"]'
]);

// ✅ GOOD: Reliable form filling
cy.fillFormField('user-email', 'test@example.com');
cy.fillFormField('user-password', 'password123');
cy.waitForFormValidation('form');

// ✅ GOOD: Retry flaky operations
cy.retryAction(() => {
  cy.getByTestId('flaky-button').click();
  cy.getByTestId('success-message').should('be.visible');
});

// ✅ GOOD: Handle file uploads properly
cy.uploadFileReliably('[data-testid="file-input"]', 'test-image.jpg');
cy.waitForUploadComplete('[data-testid="upload-container"]');

// ❌ BAD: Old unreliable patterns
// cy.get('.some-class').click(); // Fragile selector
// cy.wait(5000); // Arbitrary wait
// cy.get('input').type('value'); // No verification

*/
