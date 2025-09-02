describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.setupDefaultIntercepts();
  });

  describe('Login Process', () => {
    it('should display login form correctly', () => {
      cy.visit('/login');
      cy.waitForAngular();
      
      // Verify login form elements are present
      cy.get('[data-cy="login-form"]').should('be.visible');
      cy.get('[data-cy="email-input"]').should('be.visible');
      cy.get('[data-cy="password-input"]').should('be.visible');
      cy.get('[data-cy="login-submit"]').should('be.visible');
      
      // Verify branding elements
      cy.contains('Centro de Comando').should('be.visible');
      cy.contains('El Copiloto Estratégico para el Asesor Moderno').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/login');
      cy.waitForAngular();
      
      // Try to submit empty form
      cy.get('[data-cy="login-submit"]').click();
      
      // Verify validation messages appear
      cy.contains('El correo es requerido').should('be.visible');
      cy.contains('La contraseña es requerida').should('be.visible');
      
      // Verify form is not submitted
      cy.url().should('include', '/login');
    });

    it('should show validation error for invalid email format', () => {
      cy.visit('/login');
      cy.waitForAngular();
      
      cy.get('[data-cy="email-input"]').type('invalid-email');
      cy.get('[data-cy="password-input"]').type('somepassword');
      cy.get('[data-cy="login-submit"]').click();
      
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

      cy.visit('/login');
      cy.waitForAngular();
      
      cy.get('[data-cy="email-input"]').type('ricardo.montoya@cmu.com');
      cy.get('[data-cy="password-input"]').type('testPassword123');
      cy.get('[data-cy="login-submit"]').click();
      
      // Wait for login API call
      cy.wait('@loginRequest');
      
      // Verify redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy="dashboard-header"]').should('be.visible');
      
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

      cy.visit('/login');
      cy.waitForAngular();
      
      cy.get('[data-cy="email-input"]').type('wrong@email.com');
      cy.get('[data-cy="password-input"]').type('wrongpassword');
      cy.get('[data-cy="login-submit"]').click();
      
      cy.wait('@failedLogin');
      
      // Verify error message is displayed
      cy.get('[data-cy="login-error"]').should('be.visible');
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

      cy.visit('/login');
      cy.waitForAngular();
      
      cy.get('[data-cy="email-input"]').type('test@email.com');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="login-submit"]').click();
      
      // Verify loading state
      cy.get('[data-cy="login-submit"]').should('be.disabled');
      cy.get('[data-cy="login-loading"]').should('be.visible');
      
      cy.wait('@slowLogin');
    });

    it('should toggle password visibility', () => {
      cy.visit('/login');
      cy.waitForAngular();
      
      cy.get('[data-cy="password-input"]').type('secretPassword123');
      
      // Initially password should be hidden
      cy.get('[data-cy="password-input"]').should('have.attr', 'type', 'password');
      
      // Click toggle button
      cy.get('[data-cy="password-toggle"]').click();
      
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
      cy.visit('/dashboard');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });

    it('should maintain session after page refresh', () => {
      // Login first
      cy.login();
      cy.visit('/dashboard');
      
      // Refresh page
      cy.reload();
      
      // Should remain authenticated
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy="dashboard-header"]').should('be.visible');
    });

    it('should logout successfully', () => {
      cy.login();
      cy.visit('/dashboard');
      
      // Click logout button
      cy.get('[data-cy="user-menu"]').click();
      cy.get('[data-cy="logout-button"]').click();
      
      // Should redirect to login
      cy.url().should('include', '/login');
      
      // Authentication token should be cleared
      cy.window().its('localStorage.authToken').should('not.exist');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      cy.visit('/login');
      cy.waitForAngular();
      
      // Check accessibility
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
      cy.visit('/login');
      cy.waitForAngular();
      
      // Submit empty form
      cy.get('[data-cy="login-submit"]').click();
      
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
        cy.visit('/login');
        cy.waitForAngular();
        
        // Verify login form is visible and functional
        cy.get('[data-cy="login-form"]').should('be.visible');
        cy.get('[data-cy="email-input"]').should('be.visible');
        cy.get('[data-cy="password-input"]').should('be.visible');
        cy.get('[data-cy="login-submit"]').should('be.visible');
        
        // Verify form is usable
        cy.get('[data-cy="email-input"]').type('test@email.com');
        cy.get('[data-cy="password-input"]').type('password123');
        
        // Verify inputs contain the typed values
        cy.get('[data-cy="email-input"]').should('have.value', 'test@email.com');
        cy.get('[data-cy="password-input"]').should('have.value', 'password123');
      });
    });
  });

  describe('Network Conditions', () => {
    it('should handle offline condition gracefully', () => {
      cy.visit('/login');
      cy.waitForAngular();
      
      // Simulate offline condition
      cy.simulateNetworkCondition('offline');
      
      cy.get('[data-cy="email-input"]').type('test@email.com');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="login-submit"]').click();
      
      // Should show network error
      cy.get('[data-cy="network-error"]').should('be.visible');
      cy.contains('Error de conexión').should('be.visible');
    });

    it('should handle slow network condition', () => {
      cy.visit('/login');
      cy.waitForAngular();
      
      // Simulate slow network
      cy.simulateNetworkCondition('slow');
      
      cy.get('[data-cy="email-input"]').type('test@email.com');
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="login-submit"]').click();
      
      // Should show loading state for extended period
      cy.get('[data-cy="login-loading"]').should('be.visible');
      cy.get('[data-cy="login-submit"]').should('be.disabled');
    });
  });
});