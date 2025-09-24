describe('Dashboard Functionality', () => {
  beforeEach(() => {
    cy.setupDefaultIntercepts();
    cy.login();
  });

  describe('Dashboard Overview', () => {
    it('should load and display dashboard correctly', () => {
      cy.navigateAndWait('/dashboard');
      
      // Verify main dashboard elements with enhanced waits
      cy.waitForElement('[data-cy="dashboard-header"]');
      cy.contains('Centro de Comando').should('be.visible');
      cy.contains('Tu plan de acción para hoy').should('be.visible');
      
      // Verify KPI cards are displayed with enhanced waits
      cy.waitForElement('[data-cy="kpi-opportunities"]');
      cy.waitForElement('[data-cy="kpi-contracts"]');
      cy.waitForElement('[data-cy="kpi-revenue"]');
      
      // Wait for API calls to complete and ensure idle
      cy.wait('@getDashboardStats');
      cy.wait('@getActivity');
      cy.waitForApiIdle();
    });

    it('should display correct KPI values from API', () => {
      cy.navigateAndWait('/dashboard');
      cy.wait('@getDashboardStats');
      cy.waitForApiIdle();
      
      // Verify KPI values match fixture data with enhanced waits
      cy.waitForElement('[data-cy="kpi-opportunities"]').within(() => {
        cy.contains('25').should('be.visible'); // 12 + 8 + 5 from fixture
      });
      
      cy.waitForElement('[data-cy="kpi-contracts"]').within(() => {
        cy.contains('24').should('be.visible');
      });
      
      cy.waitForElement('[data-cy="kpi-revenue"]').within(() => {
        cy.contains('$125,000').should('be.visible');
        cy.contains('$180,000').should('be.visible'); // projected
      });
    });

    it('should display activity feed', () => {
      cy.navigateAndWait('/dashboard');
      cy.wait('@getActivity');
      cy.waitForApiIdle();
      
      // Wait for activity feed to load completely
      cy.waitForElement('[data-cy="activity-feed"]');
      
      // Verify activity items from fixture
      cy.get('[data-cy="activity-item"]').should('have.length.gte', 3);
      cy.contains('Nuevo cliente registrado: Carlos Rodríguez').should('be.visible');
      cy.contains('Pago recibido por $8,500 MXN').should('be.visible');
      cy.contains('Documento INE aprobado').should('be.visible');
    });

    it('should update market selection', () => {
      cy.navigateAndWait('/dashboard');
      
      // Change market selection with enhanced dropdown handling
      cy.selectDropdownOption('market-selector', 'edomex');
      
      // Should trigger new data request
      cy.wait('@getDashboardStats');
      cy.waitForApiIdle();
      
      // Verify market selection persists
      cy.waitForElement('[data-cy="market-selector"]').should('have.value', 'edomex');
    });

    it('should handle client mode toggle', () => {
      cy.navigateAndWait('/dashboard');
      
      // Toggle to client mode with enhanced element waiting
      cy.waitForElement('[data-cy="client-mode-toggle"]').click();
      
      // Verify UI changes for client view
      cy.waitForElement('[data-cy="client-mode-indicator"]').should('contain', 'Cliente');
      
      // Toggle back to advisor mode
      cy.waitForElement('[data-cy="client-mode-toggle"]').click();
      cy.waitForElement('[data-cy="client-mode-indicator"]').should('contain', 'Asesor');
    });
  });

  describe('Navigation', () => {
    it('should navigate to clients section', () => {
      cy.navigateAndWait('/dashboard');
      
      // Navigate using enhanced commands
      cy.waitForElement('[data-cy="nav-clients"]').click();
      
      // Wait for navigation to complete
      cy.waitForPageLoad('/clientes');
      cy.waitForElement('[data-cy="clients-page"]');
    });

    it('should navigate to opportunities pipeline', () => {
      cy.navigateAndWait('/dashboard');
      
      // Navigate with enhanced waiting
      cy.waitForElement('[data-cy="opportunities-link"]').click();
      
      // Wait for navigation to complete
      cy.waitForPageLoad('/opportunities');
    });

    it('should navigate to specific client from activity feed', () => {
      cy.navigateAndWait('/dashboard');
      cy.wait('@getActivity');
      cy.waitForApiIdle();
      
      // Click on first client activity item with enhanced waiting
      cy.waitForElement('[data-cy="activity-item"]').first().click();
      
      // Should navigate to client detail
      cy.url().should('include', '/clientes/');
    });

    it('should open next best action', () => {
      cy.navigateAndWait('/dashboard');
      
      // Click next action with enhanced waiting
      cy.waitForElement('[data-cy="next-action-button"]').click();
      
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

      cy.navigateAndWait('/dashboard');
      cy.wait('@getEmptyStats');
      cy.wait('@getEmptyActivity');
      cy.waitForApiIdle();

      // Verify empty state messaging with enhanced waiting
      cy.waitForElement('[data-cy="empty-state"]');
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

      cy.navigateAndWait('/dashboard');
      cy.wait('@getErrorStats');
      cy.waitForApiIdle();

      // Verify error state is displayed with enhanced waiting
      cy.waitForElement('[data-cy="error-state"]');
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

      cy.navigateAndWait('/dashboard');
      cy.wait('@getErrorStats');
      cy.waitForApiIdle();

      // Mock successful retry
      cy.intercept('GET', '**/api/dashboard/stats', {
        fixture: 'dashboard-stats.json'
      }).as('getRetryStats');

      // Click retry button with enhanced waiting
      cy.waitForElement('[data-cy="retry-button"]').click();
      cy.wait('@getRetryStats');

      // Verify dashboard loads correctly with enhanced waiting
      cy.waitForElement('[data-cy="dashboard-header"]');
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

      cy.navigateAndWait('/dashboard');

      // Verify loading indicators with enhanced waiting
      cy.waitForElement('[data-cy="dashboard-loading"]');
      cy.waitForElement('[data-cy="kpi-skeleton"]');

      cy.wait('@getSlowStats');

      // Verify loading state disappears
      cy.get('[data-cy="dashboard-loading"]').should('not.exist');
      cy.get('[data-cy="dashboard-header"]').should('be.visible');
    });
  });

  describe('Real-time Updates', () => {
    it('should update data when notifications arrive', () => {
      cy.navigateAndWait('/dashboard');
      cy.wait('@getDashboardStats');
      cy.waitForApiIdle();

      // Simulate real-time notification
      cy.window().trigger('notification', {
        type: 'new_client',
        data: { clientId: 'new-client-123' }
      });

      // Should trigger data refresh
      cy.wait('@getDashboardStats');
    });

    it('should show toast notifications for important events', () => {
      cy.navigateAndWait('/dashboard');

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
      
      cy.navigateAndWait('/dashboard');
      cy.wait('@getDashboardStats');
      cy.waitForApiIdle();
      
      cy.then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(3000); // Should load within 3 seconds
      });
    });

    it('should handle multiple concurrent requests', () => {
      cy.navigateAndWait('/dashboard');

      // Wait for all initial requests to complete
      cy.wait('@getDashboardStats');
      cy.wait('@getActivity');
      cy.waitForApiIdle();

      // Verify all data is displayed correctly with enhanced waits
      cy.waitForElement('[data-cy="kpi-opportunities"]');
      cy.waitForElement('[data-cy="activity-feed"]');
    });
  });

  describe('Accessibility', () => {
    it('should be fully accessible', () => {
      cy.navigateAndWait('/dashboard');
      cy.waitForLoadComplete();

      // Check overall accessibility with enhanced waiting
      cy.checkA11y();
    });

    it('should support keyboard navigation', () => {
      cy.navigateAndWait('/dashboard');
      cy.waitForLoadComplete();

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
      cy.navigateAndWait('/dashboard');
      cy.waitForLoadComplete();

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
        cy.navigateAndWait('/dashboard');

        // Verify essential elements are visible with enhanced waits
        cy.waitForElement('[data-cy="dashboard-header"]');
        cy.waitForElement('[data-cy="kpi-opportunities"]');
        cy.waitForElement('[data-cy="activity-feed"]');

        if (name === 'mobile') {
          // Mobile-specific checks with enhanced waiting
          cy.waitForElement('[data-cy="mobile-menu"]');
        } else {
          // Desktop/tablet checks with enhanced waiting
          cy.waitForElement('[data-cy="sidebar-nav"]');
        }
      });
    });
  });
});