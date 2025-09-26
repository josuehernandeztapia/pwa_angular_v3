describe('Authentication Flow (Minimal Dark)', () => {
  beforeEach(() => {
    cy.setupDefaultIntercepts();
  });

  describe('Login Process', () => {
    it('should display login form correctly (Minimal Dark)', () => {
      cy.navigateAndWait('/login');
      // Container exists (Minimal Dark)
      cy.get('main, [role="main"], .ui-card').should('exist');
      
      // Verify login form elements are present using enhanced commands
      cy.waitForElement('[data-cy="login-form"]');
      cy.waitForElement('[data-cy="email-input"]');
      cy.waitForElement('[data-cy="password-input"]');
      cy.waitForElement('[data-cy="login-submit"]');
      
      // Verify branding elements
      cy.contains('Centro de Comando').should('be.visible');
      cy.contains('El Copiloto Estratégico para el Asesor Moderno').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.navigateAndWait('/login');
      
      // Try to submit empty form
      cy.waitForElement('[data-cy="login-submit"]').click();
      
      // Wait for form validation and verify messages
      cy.waitForFormValidation('[data-cy="login-form"]');
      cy.contains('El correo es requerido').should('be.visible');
      cy.contains('La contraseña es requerida').should('be.visible');
      
      // Verify form is not submitted
      cy.url().should('include', '/login');
    });

    it('should show validation error for invalid email format', () => {
      cy.navigateAndWait('/login');
      
      // Use enhanced form filling with validation
      cy.fillFormField('email-input', 'invalid-email');
      cy.fillFormField('password-input', 'somepassword');
      cy.waitForElement('[data-cy="login-submit"]').click();
      cy.waitForFormValidation('[data-cy="login-form"]');
      
      cy.contains('Formato de correo inválido').should('be.visible');
    });

    it('should successfully login with valid credentials', () => {
      // Mock successful login response
      cy.intercept('POST', '**/auth/login', {
        statusCode: 200,
        body: {
          success: true,
          token: 'fake-jwt-token',
          user: {
            id: 'user-001',
            name: 'Ricardo Montoya',
            email: 'ricardo.montoya@cmu.com'
          }
        }
      }).as('loginRequest');

      cy.navigateAndWait('/login');
      
      // Use enhanced form filling
      cy.fillFormField('email-input', 'ricardo.montoya@cmu.com');
      cy.fillFormField('password-input', 'testPassword123');
      cy.waitForElement('[data-cy="login-submit"]').click();
      
      // Wait for login API call and page transition
      cy.wait('@loginRequest');
      cy.waitForApiIdle();
      
      // Verify redirect to dashboard with enhanced wait
      cy.waitForPageLoad('/dashboard');
      cy.waitForElement('[data-cy="dashboard-header"]');
      
      // Verify authentication state
      cy.window().its('localStorage.authToken').should('exist');
    });

    it('should handle login failure gracefully', () => {
      // Mock failed login response
      cy.intercept('POST', '**/auth/login', {
        statusCode: 401,
        body: {
          success: false,
          error: 'Credenciales inválidas'
        }
      }).as('failedLogin');

      cy.navigateAndWait('/login');
      
      // Use enhanced form filling
      cy.fillFormField('email-input', 'wrong@email.com');
      cy.fillFormField('password-input', 'wrongpassword');
      cy.waitForElement('[data-cy="login-submit"]').click();
      
      cy.wait('@failedLogin');
      cy.waitForApiIdle();
      
      // Verify error message is displayed with enhanced waiting
      cy.waitForElement('[data-cy="login-error"]');
      cy.contains('Credenciales inválidas').should('be.visible');
      
      // Verify user stays on login page
      cy.url().should('include', '/login');
    });

    it('should show loading state during login', () => {
      // Mock delayed login response
      cy.intercept('POST', '**/auth/login', (req) => {
        req.reply((res) => {
          res.delay(2000);
          res.send({
            statusCode: 200,
            body: { success: true, token: 'fake-token' }
          });
        });
      }).as('slowLogin');

      cy.navigateAndWait('/login');
      
      // Use enhanced form filling
      cy.fillFormField('email-input', 'test@email.com');
      cy.fillFormField('password-input', 'password123');
      cy.waitForElement('[data-cy="login-submit"]').click();
      
      // Verify loading state with enhanced waiting
      cy.waitForElement('[data-cy="login-submit"]').should('be.disabled');
      cy.waitForElement('[data-cy="login-loading"]');
      
      cy.wait('@slowLogin');
    });

    it('should toggle password visibility', () => {
      cy.navigateAndWait('/login');
      
      // Use enhanced form filling
      cy.fillFormField('password-input', 'secretPassword123');
      
      // Initially password should be hidden
      cy.get('[data-cy="password-input"]').should('have.attr', 'type', 'password');
      
      // Click toggle button with enhanced element waiting
      cy.waitForElement('[data-cy="password-toggle"]').click();
      
      // Password should now be visible
      cy.get('[data-cy="password-input"]').should('have.attr', 'type', 'text');
      
      // Click toggle again
      cy.get('[data-cy="password-toggle"]').click();
      
      // Password should be hidden again
      cy.get('[data-cy="password-input"]').should('have.attr', 'type', 'password');
    });
  });

  describe('Authentication State', () => {
    it('should redirect unauthenticated users to login', () => {
      // Try to access protected route without authentication
      cy.navigateAndWait('/dashboard');
      
      // Should redirect to login with enhanced wait
      cy.waitForPageLoad('/login');
    });

    it('should maintain session after page refresh', () => {
      // Login first
      cy.login();
      cy.navigateAndWait('/dashboard');
      
      // Refresh page and wait for complete reload
      cy.reload();
      cy.waitForLoadComplete();
      
      // Should remain authenticated
      cy.waitForPageLoad('/dashboard');
      cy.waitForElement('[data-cy="dashboard-header"]');
    });

    it('should logout successfully', () => {
      cy.login();
      cy.navigateAndWait('/dashboard');
      
      // Click logout button with enhanced waiting
      cy.waitForElement('[data-cy="user-menu"]').click();
      cy.waitForElement('[data-cy="logout-button"]').click();
      cy.waitForApiIdle();
      
      // Should redirect to login
      cy.waitForPageLoad('/login');
      
      // Authentication token should be cleared
      cy.window().its('localStorage.authToken').should('not.exist');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      cy.navigateAndWait('/login');
      
      // Check accessibility with enhanced waiting
      cy.waitForLoadComplete();
      cy.checkA11y();
      
      // Verify keyboard navigation
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-cy', 'email-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'password-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'login-submit');
    });

    it('should announce form validation errors to screen readers', () => {
      cy.navigateAndWait('/login');
      
      // Submit empty form with enhanced waiting
      cy.waitForElement('[data-cy="login-submit"]').click();
      cy.waitForFormValidation('[data-cy="login-form"]');
      
      // Verify ARIA attributes for errors
      cy.get('[data-cy="email-input"]').should('have.attr', 'aria-invalid', 'true');
      cy.get('[data-cy="password-input"]').should('have.attr', 'aria-invalid', 'true');
      
      // Verify error messages are associated with inputs
      cy.get('[data-cy="email-error"]').should('have.id');
      cy.get('[data-cy="email-input"]').should('have.attr', 'aria-describedby').and('include', 'email-error');
    });
  });

  describe('Responsive Design', () => {
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1200, height: 800, name: 'desktop' }
    ];

    viewports.forEach(({ width, height, name }) => {
      it(`should display correctly on ${name}`, () => {
        cy.viewport(width, height);
        cy.navigateAndWait('/login');
        
        // Verify login form is visible and functional with enhanced waits
        cy.waitForElement('[data-cy="login-form"]');
        cy.waitForElement('[data-cy="email-input"]');
        cy.waitForElement('[data-cy="password-input"]');
        cy.waitForElement('[data-cy="login-submit"]');
        
        // Verify form is usable with enhanced form filling
        cy.fillFormField('email-input', 'test@email.com');
        cy.fillFormField('password-input', 'password123');
        
        // Verify inputs contain the typed values
        cy.get('[data-cy="email-input"]').should('have.value', 'test@email.com');
        cy.get('[data-cy="password-input"]').should('have.value', 'password123');
      });
    });
  });

  describe('Network Conditions', () => {
    it('should handle offline condition gracefully', () => {
      cy.navigateAndWait('/login');
      
      // Simulate offline condition
      cy.simulateNetworkCondition('offline');
      
      // Use enhanced form filling
      cy.fillFormField('email-input', 'test@email.com');
      cy.fillFormField('password-input', 'password123');
      cy.waitForElement('[data-cy="login-submit"]').click();
      
      // Should show network error
      cy.get('[data-cy="network-error"]').should('be.visible');
      cy.contains('Error de conexión').should('be.visible');
    });

    it('should handle slow network condition', () => {
      cy.navigateAndWait('/login');
      
      // Simulate slow network
      cy.simulateNetworkCondition('slow');
      
      // Use enhanced form filling
      cy.fillFormField('email-input', 'test@email.com');
      cy.fillFormField('password-input', 'password123');
      cy.waitForElement('[data-cy="login-submit"]').click();
      
      // Should show loading state for extended period
      cy.get('[data-cy="login-loading"]').should('be.visible');
      cy.get('[data-cy="login-submit"]').should('be.disabled');
    });
  });
});