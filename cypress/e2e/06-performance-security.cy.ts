describe('Performance and Security Testing', () => {
  beforeEach(() => {
    cy.setupDefaultIntercepts();
  });

  describe('Performance Testing', () => {
    it('should load initial page within acceptable time limits', () => {
      const start = performance.now();
      
      cy.visit('/');
      cy.waitForAngular();
      
      cy.then(() => {
        const loadTime = performance.now() - start;
        expect(loadTime).to.be.lessThan(3000); // 3 seconds max
      });

      // Verify core web vitals
      cy.window().then((win) => {
        return new Promise((resolve) => {
          new win.PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
              if (entry.entryType === 'navigation') {
                expect(entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart).to.be.lessThan(1000);
              }
            });
            resolve(entries);
          }).observe({ entryTypes: ['navigation'] });
        });
      });
    });

    it('should handle large datasets efficiently', () => {
      // Mock large client dataset
      cy.intercept('GET', '**/api/clients', {
        body: Array.from({ length: 500 }, (_, i) => ({
          id: `client-${i + 1}`,
          name: `Cliente ${i + 1}`,
          email: `cliente${i + 1}@test.com`,
          status: i % 3 === 0 ? 'Activo' : i % 3 === 1 ? 'Pendiente' : 'Inactivo'
        }))
      }).as('getLargeClientList');

      const start = performance.now();
      
      cy.login();
      cy.visit('/clientes');
      cy.waitForAngular();
      cy.wait('@getLargeClientList');
      
      // Should implement virtual scrolling or pagination
      cy.get('[data-cy="clients-list"]').should('be.visible');
      
      cy.then(() => {
        const renderTime = performance.now() - start;
        expect(renderTime).to.be.lessThan(5000); // 5 seconds for large datasets
      });
      
      // Test scrolling performance
      cy.get('[data-cy="clients-list"]').scrollTo('bottom', { duration: 1000 });
      cy.get('[data-cy="loading-indicator"]').should('not.exist');
    });

    it('should optimize API request patterns', () => {
      let requestCount = 0;
      
      cy.intercept('GET', '**/api/**', (req) => {
        requestCount++;
        req.continue();
      }).as('apiRequests');

      cy.login();
      cy.visit('/dashboard');
      cy.waitForAngular();
      
      // Should not make excessive API calls
      cy.then(() => {
        expect(requestCount).to.be.lessThan(10); // Reasonable limit for dashboard
      });
      
      // Test request deduplication
      cy.get('[data-cy="refresh-data"]').click().click().click(); // Triple click
      
      cy.then(() => {
        // Should not triple the requests due to deduplication
        expect(requestCount).to.be.lessThan(15);
      });
    });

    it('should measure First Contentful Paint (FCP)', () => {
      cy.visit('/', {
        onBeforeLoad: (win) => {
          win.performance.mark('start-loading');
        }
      });
      
      cy.get('[data-cy="main-content"]').should('be.visible').then(() => {
        cy.window().then((win) => {
          const fcpEntry = win.performance.getEntriesByType('paint')
            .find(entry => entry.name === 'first-contentful-paint');
          
          if (fcpEntry) {
            expect(fcpEntry.startTime).to.be.lessThan(2500); // 2.5 seconds
          }
        });
      });
    });

    it('should optimize image loading', () => {
      cy.login();
      cy.visit('/clientes');
      cy.waitForAngular();
      
      // Check that images use lazy loading
      cy.get('img').should('have.attr', 'loading', 'lazy');
      
      // Verify responsive images
      cy.get('img').should('have.attr', 'srcset');
      
      // Test image optimization
      cy.get('img').each($img => {
        const src = $img.attr('src');
        if (src && !src.includes('data:')) {
          // Images should be optimized (webp or compressed)
          expect(src).to.match(/\.(webp|jpg|png)\?.*w=\d+|\.webp$|\.jpg\?quality=\d+/);
        }
      });
    });

    it('should handle memory usage efficiently', () => {
      cy.login();
      cy.visit('/dashboard');
      cy.waitForAngular();
      
      // Measure initial memory
      let initialMemory;
      cy.window().then((win) => {
        if (win.performance.memory) {
          initialMemory = win.performance.memory.usedJSHeapSize;
        }
      });
      
      // Navigate through multiple pages
      cy.visit('/clientes');
      cy.waitForAngular();
      cy.visit('/cotizaciones');
      cy.waitForAngular();
      cy.visit('/dashboard');
      cy.waitForAngular();
      
      // Check memory usage hasn't grown excessively
      cy.window().then((win) => {
        if (win.performance.memory && initialMemory) {
          const currentMemory = win.performance.memory.usedJSHeapSize;
          const memoryGrowth = currentMemory - initialMemory;
          
          // Memory growth should be reasonable (less than 50MB)
          expect(memoryGrowth).to.be.lessThan(50 * 1024 * 1024);
        }
      });
    });
  });

  describe('Security Testing', () => {
    it('should handle authentication securely', () => {
      // Test that unauthenticated users cannot access protected routes
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
      
      // Test that tokens are stored securely
      cy.login();
      cy.window().then((win) => {
        const token = win.localStorage.getItem('authToken');
        
        // Token should exist and be JWT format
        expect(token).to.exist;
        expect(token).to.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
        
        // Verify token is not in sessionStorage or cookies for security
        expect(win.sessionStorage.getItem('authToken')).to.be.null;
        expect(document.cookie).to.not.include('authToken');
      });
      
      // Test logout clears authentication
      cy.get('[data-cy="user-menu"]').click();
      cy.get('[data-cy="logout-button"]').click();
      
      cy.window().then((win) => {
        expect(win.localStorage.getItem('authToken')).to.be.null;
      });
    });

    it('should prevent XSS attacks', () => {
      cy.login();
      cy.visit('/clientes');
      cy.waitForAngular();
      
      // Test input sanitization
      const xssPayload = '<script>alert("XSS")</script>';
      
      cy.get('[data-cy="new-client-button"]').click();
      cy.get('[data-cy="client-name"]').type(xssPayload);
      cy.get('[data-cy="client-email"]').type('test@email.com');
      cy.get('[data-cy="submit-client"]').click();
      
      // XSS payload should be sanitized
      cy.get('[data-cy="client-name"]').should('not.contain', '<script>');
      cy.get('script').should('not.contain', 'alert("XSS")');
    });

    it('should implement proper HTTPS and security headers', () => {
      cy.request({
        url: Cypress.config().baseUrl,
        failOnStatusCode: false
      }).then((response) => {
        // Verify security headers
        expect(response.headers).to.have.property('x-content-type-options', 'nosniff');
        expect(response.headers).to.have.property('x-frame-options');
        expect(response.headers).to.have.property('x-xss-protection');
        
        // Check for HTTPS redirect
        if (response.status === 301 || response.status === 302) {
          expect(response.headers.location).to.include('https://');
        }
      });
    });

    it('should handle sensitive data securely', () => {
      cy.login();
      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      
      // Verify sensitive data is not exposed in DOM attributes
      cy.get('[data-client-rfc]').should('not.exist');
      cy.get('[data-client-curp]').should('not.exist');
      
      // Check that sensitive data is masked in forms
      cy.get('[data-cy="edit-client-button"]').click();
      cy.get('[data-cy="client-rfc-input"]').should('have.attr', 'type', 'password')
        .or('have.value').and('match', /\*+/);
    });

    it('should implement rate limiting on API endpoints', () => {
      // Test login rate limiting
      const attempts = Array.from({ length: 6 }, (_, i) => i);
      
      cy.visit('/login');
      cy.waitForAngular();
      
      attempts.forEach(() => {
        cy.get('[data-cy="email-input"]').clear().type('test@email.com');
        cy.get('[data-cy="password-input"]').clear().type('wrongpassword');
        cy.get('[data-cy="login-submit"]').click();
      });
      
      // After multiple failed attempts, should show rate limiting
      cy.get('[data-cy="rate-limit-error"]').should('be.visible');
      cy.contains('Demasiados intentos').should('be.visible');
    });

    it('should validate file uploads securely', () => {
      cy.login();
      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      
      cy.get('[data-cy="doc-domicilio"]').find('[data-cy="upload-button"]').click();
      
      // Test malicious file upload
      const maliciousContent = '<?php system($_GET["cmd"]); ?>';
      cy.fixture('malicious.php', 'utf8').then(() => {
        // Should reject PHP files
        cy.get('[data-cy="file-input"]').selectFile({
          contents: maliciousContent,
          fileName: 'malicious.php',
          mimeType: 'application/x-php'
        });
        
        cy.get('[data-cy="file-error"]').should('contain', 'Tipo de archivo no permitido');
      });
      
      // Test file size limits
      const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
      cy.get('[data-cy="file-input"]').selectFile({
        contents: largeContent,
        fileName: 'large-file.pdf',
        mimeType: 'application/pdf'
      });
      
      cy.get('[data-cy="file-error"]').should('contain', 'Archivo demasiado grande');
    });

    it('should protect against CSRF attacks', () => {
      cy.login();
      
      // Verify CSRF token is present in forms
      cy.visit('/clientes');
      cy.get('[data-cy="new-client-button"]').click();
      
      cy.get('[data-cy="client-form"]').within(() => {
        // CSRF token should be present as hidden input
        cy.get('input[name="_token"]').should('exist');
        cy.get('input[name="_token"]').should('have.attr', 'type', 'hidden');
      });
      
      // Test that requests without CSRF token fail
      cy.request({
        method: 'POST',
        url: '/api/clients',
        body: { name: 'Test Client' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.equal(403); // Forbidden without CSRF token
      });
    });

    it('should implement secure session management', () => {
      cy.login();
      
      // Test session timeout
      cy.window().then((win) => {
        // Simulate expired token
        win.localStorage.setItem('authToken', 'expired.token.here');
      });
      
      cy.visit('/dashboard');
      
      // Should redirect to login on expired token
      cy.url().should('include', '/login');
      cy.get('[data-cy="session-expired-message"]').should('be.visible');
    });
  });

  describe('Accessibility Security', () => {
    it('should prevent accessibility-based attacks', () => {
      cy.login();
      cy.visit('/dashboard');
      cy.waitForAngular();
      
      // Verify no sensitive information is exposed through aria-labels
      cy.get('[aria-label*="password"]').should('not.exist');
      cy.get('[aria-label*="token"]').should('not.exist');
      cy.get('[aria-label*="key"]').should('not.exist');
      
      // Check that screen reader text doesn't reveal sensitive data
      cy.get('.sr-only, .visually-hidden').each($element => {
        const text = $element.text().toLowerCase();
        expect(text).to.not.include('password');
        expect(text).to.not.include('token');
        expect(text).to.not.include('secret');
      });
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in error messages', () => {
      // Test API error responses
      cy.intercept('GET', '**/api/clients', {
        statusCode: 500,
        body: { 
          error: 'Internal server error',
          // Should not include: stack traces, file paths, DB details
        }
      }).as('serverError');
      
      cy.login();
      cy.visit('/clientes');
      cy.wait('@serverError');
      
      // Error message should be generic
      cy.get('[data-cy="error-message"]').should('not.contain', 'database');
      cy.get('[data-cy="error-message"]').should('not.contain', '/var/www');
      cy.get('[data-cy="error-message"]').should('not.contain', 'Exception');
    });

    it('should handle malformed API responses securely', () => {
      cy.intercept('GET', '**/api/dashboard/stats', {
        statusCode: 200,
        body: '{"malformed": json}'
      }).as('malformedResponse');
      
      cy.login();
      cy.visit('/dashboard');
      cy.wait('@malformedResponse');
      
      // Should handle malformed JSON gracefully without exposing internals
      cy.get('[data-cy="error-state"]').should('be.visible');
      cy.get('[data-cy="error-message"]').should('not.contain', 'JSON');
      cy.get('[data-cy="error-message"]').should('not.contain', 'parse');
    });
  });

  describe('Data Privacy', () => {
    it('should implement proper data masking', () => {
      cy.login();
      cy.visit('/clientes');
      cy.waitForAngular();
      
      // Verify sensitive data is masked in lists
      cy.get('[data-cy="client-card"]').within(() => {
        // RFC should be partially masked
        cy.get('[data-cy="client-rfc"]').should('match', /[A-Z]{3}\*{6}[A-Z0-9]{3}/);
        
        // Phone numbers should be masked
        cy.get('[data-cy="client-phone"]').should('match', /\*{3}-\*{3}-\d{4}/);
      });
    });

    it('should respect data retention policies', () => {
      cy.login();
      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      
      // Check for data retention warnings
      cy.get('[data-cy="data-retention-notice"]').should('be.visible');
      cy.contains('Los datos se conservarán según la política de retención').should('be.visible');
    });
  });
});