describe('Dashboard Functionality', () => {
  beforeEach(() => {
    cy.setupDefaultIntercepts();
    cy.login();
  });

  describe('Dashboard Overview', () => {
    it('should load and display dashboard correctly', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      cy.waitForLoading();
      
      // Verify main dashboard elements
      cy.get('[data-cy="dashboard-header"]').should('be.visible');
      cy.contains('Centro de Comando').should('be.visible');
      cy.contains('Tu plan de acción para hoy').should('be.visible');
      
      // Verify KPI cards are displayed
      cy.get('[data-cy="kpi-opportunities"]').should('be.visible');
      cy.get('[data-cy="kpi-contracts"]').should('be.visible');
      cy.get('[data-cy="kpi-revenue"]').should('be.visible');
      
      // Wait for API calls to complete
      cy.wait('@getDashboardStats');
      cy.wait('@getActivity');
    });

    it('should display correct KPI values from API', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      cy.wait('@getDashboardStats');
      
      // Verify KPI values match fixture data
      cy.get('[data-cy="kpi-opportunities"]').within(() => {
        cy.contains('25').should('be.visible'); // 12 + 8 + 5 from fixture
      });
      
      cy.get('[data-cy="kpi-contracts"]').within(() => {
        cy.contains('24').should('be.visible');
      });
      
      cy.get('[data-cy="kpi-revenue"]').within(() => {
        cy.contains('$125,000').should('be.visible');
        cy.contains('$180,000').should('be.visible'); // projected
      });
    });

    it('should display activity feed', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      cy.wait('@getActivity');
      
      cy.get('[data-cy="activity-feed"]').should('be.visible');
      
      // Verify activity items from fixture
      cy.get('[data-cy="activity-item"]').should('have.length.gte', 3);
      cy.contains('Nuevo cliente registrado: Carlos Rodríguez').should('be.visible');
      cy.contains('Pago recibido por $8,500 MXN').should('be.visible');
      cy.contains('Documento INE aprobado').should('be.visible');
    });

    it('should update market selection', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      
      // Change market selection
      cy.get('[data-cy="market-selector"]').select('edomex');
      
      // Should trigger new data request
      cy.wait('@getDashboardStats');
      
      // Verify market selection persists
      cy.get('[data-cy="market-selector"]').should('have.value', 'edomex');
    });

    it('should handle client mode toggle', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      
      // Toggle to client mode
      cy.get('[data-cy="client-mode-toggle"]').click();
      
      // Verify UI changes for client view
      cy.get('[data-cy="client-mode-indicator"]').should('contain', 'Cliente');
      
      // Toggle back to advisor mode
      cy.get('[data-cy="client-mode-toggle"]').click();
      cy.get('[data-cy="client-mode-indicator"]').should('contain', 'Asesor');
    });
  });

  describe('Navigation', () => {
    it('should navigate to clients section', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      
      cy.get('[data-cy="nav-clients"]').click();
      
      cy.url().should('include', '/clientes');
      cy.get('[data-cy="clients-page"]').should('be.visible');
    });

    it('should navigate to opportunities pipeline', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      
      cy.get('[data-cy="opportunities-link"]').click();
      
      cy.url().should('include', '/opportunities');
    });

    it('should navigate to specific client from activity feed', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      cy.wait('@getActivity');
      
      // Click on first client activity item
      cy.get('[data-cy="activity-item"]').first().click();
      
      // Should navigate to client detail
      cy.url().should('include', '/clientes/');
    });

    it('should open next best action', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      
      cy.get('[data-cy="next-action-button"]').click();
      
      // Should either navigate to action or open modal
      cy.get('[data-cy="action-modal"]').should('be.visible')
        .or(cy.url().should('not.equal', '/dashboard'));
    });
  });

  describe('Data States', () => {
    it('should handle empty dashboard state', () => {
      // Mock empty dashboard data
      cy.intercept('GET', '**/api/dashboard/stats', {
        opportunitiesInPipeline: { nuevas: 0, expediente: 0, aprobado: 0 },
        pendingActions: { clientsWithMissingDocs: 0, clientsWithGoalsReached: 0 },
        activeContracts: 0,
        monthlyRevenue: { collected: 0, projected: 0 }
      }).as('getEmptyStats');

      cy.intercept('GET', '**/api/activity', []).as('getEmptyActivity');

      cy.visit('/dashboard');
      cy.waitForAngular();
      cy.wait('@getEmptyStats');
      cy.wait('@getEmptyActivity');

      // Verify empty state messaging
      cy.get('[data-cy="empty-state"]').should('be.visible');
      cy.contains('No hay datos disponibles').should('be.visible');
      
      // Verify KPIs show zero values
      cy.get('[data-cy="kpi-opportunities"]').should('contain', '0');
      cy.get('[data-cy="kpi-contracts"]').should('contain', '0');
    });

    it('should handle API error gracefully', () => {
      // Mock API error
      cy.intercept('GET', '**/api/dashboard/stats', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('getErrorStats');

      cy.visit('/dashboard');
      cy.waitForAngular();
      cy.wait('@getErrorStats');

      // Verify error state is displayed
      cy.get('[data-cy="error-state"]').should('be.visible');
      cy.contains('Error al cargar los datos').should('be.visible');
      
      // Verify retry button is available
      cy.get('[data-cy="retry-button"]').should('be.visible');
    });

    it('should retry failed requests', () => {
      // Mock initial error then success
      cy.intercept('GET', '**/api/dashboard/stats', {
        statusCode: 500,
        body: { error: 'Server error' }
      }).as('getErrorStats');

      cy.visit('/dashboard');
      cy.waitForAngular();
      cy.wait('@getErrorStats');

      // Mock successful retry
      cy.intercept('GET', '**/api/dashboard/stats', {
        fixture: 'dashboard-stats.json'
      }).as('getRetryStats');

      // Click retry button
      cy.get('[data-cy="retry-button"]').click();
      cy.wait('@getRetryStats');

      // Verify dashboard loads correctly
      cy.get('[data-cy="dashboard-header"]').should('be.visible');
      cy.get('[data-cy="error-state"]').should('not.exist');
    });

    it('should show loading state during data fetch', () => {
      // Mock delayed response
      cy.intercept('GET', '**/api/dashboard/stats', (req) => {
        req.reply((res) => {
          res.delay(2000);
          res.send({ fixture: 'dashboard-stats.json' });
        });
      }).as('getSlowStats');

      cy.visit('/dashboard');
      cy.waitForAngular();

      // Verify loading indicators
      cy.get('[data-cy="dashboard-loading"]').should('be.visible');
      cy.get('[data-cy="kpi-skeleton"]').should('be.visible');

      cy.wait('@getSlowStats');

      // Verify loading state disappears
      cy.get('[data-cy="dashboard-loading"]').should('not.exist');
      cy.get('[data-cy="dashboard-header"]').should('be.visible');
    });
  });

  describe('Real-time Updates', () => {
    it('should update data when notifications arrive', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      cy.wait('@getDashboardStats');

      // Simulate real-time notification
      cy.window().trigger('notification', {
        type: 'new_client',
        data: { clientId: 'new-client-123' }
      });

      // Should trigger data refresh
      cy.wait('@getDashboardStats');
    });

    it('should show toast notifications for important events', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();

      // Simulate important event notification
      cy.window().trigger('notification', {
        type: 'payment_received',
        message: 'Nuevo pago recibido: $15,000'
      });

      // Verify toast notification appears
      cy.verifyToast('Nuevo pago recibido: $15,000', 'info');
    });
  });

  describe('Performance', () => {
    it('should load within acceptable time limits', () => {
      const start = Date.now();
      
      cy.visit('/dashboard');
      cy.waitForAngular();
      cy.wait('@getDashboardStats');
      
      cy.then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(3000); // Should load within 3 seconds
      });
    });

    it('should handle multiple concurrent requests', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();

      // Wait for all initial requests to complete
      cy.wait('@getDashboardStats');
      cy.wait('@getActivity');

      // Verify all data is displayed correctly
      cy.get('[data-cy="kpi-opportunities"]').should('be.visible');
      cy.get('[data-cy="activity-feed"]').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('should be fully accessible', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      cy.waitForLoading();

      // Check overall accessibility
      cy.checkA11y();
    });

    it('should support keyboard navigation', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      cy.waitForLoading();

      // Test keyboard navigation through interactive elements
      cy.get('body').tab();
      cy.focused().should('be.visible');
      
      // Continue tabbing through focusable elements
      for (let i = 0; i < 10; i++) {
        cy.focused().tab();
        cy.focused().should('be.visible');
      }
    });

    it('should have proper ARIA labels and roles', () => {
      cy.visit('/dashboard');
      cy.waitForAngular();
      cy.waitForLoading();

      // Verify main landmarks
      cy.get('[role="main"]').should('exist');
      cy.get('[role="navigation"]').should('exist');
      
      // Verify KPI cards have appropriate labels
      cy.get('[data-cy="kpi-opportunities"]').should('have.attr', 'aria-label');
      cy.get('[data-cy="kpi-contracts"]').should('have.attr', 'aria-label');
      
      // Verify activity feed is properly labeled
      cy.get('[data-cy="activity-feed"]').should('have.attr', 'aria-label');
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
        cy.visit('/dashboard');
        cy.waitForAngular();
        cy.waitForLoading();

        // Verify essential elements are visible
        cy.get('[data-cy="dashboard-header"]').should('be.visible');
        cy.get('[data-cy="kpi-opportunities"]').should('be.visible');
        cy.get('[data-cy="activity-feed"]').should('be.visible');

        if (name === 'mobile') {
          // Mobile-specific checks
          cy.get('[data-cy="mobile-menu"]').should('be.visible');
        } else {
          // Desktop/tablet checks  
          cy.get('[data-cy="sidebar-nav"]').should('be.visible');
        }
      });
    });
  });
});