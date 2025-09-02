describe('Quote Management', () => {
  beforeEach(() => {
    cy.setupDefaultIntercepts();
    cy.login();
    
    // Setup quote-specific intercepts
    cy.intercept('GET', '**/api/quotes', {
      fixture: 'quotes-list.json'
    }).as('getQuotes');
    
    cy.intercept('GET', '**/api/products', {
      fixture: 'products-catalog.json'
    }).as('getProducts');
  });

  describe('Quote Creation Flow', () => {
    it('should create new quote from scratch', () => {
      cy.visit('/cotizaciones/nueva');
      cy.waitForAngular();

      // Step 1: Client Selection
      cy.get('[data-cy="quote-form"]').should('be.visible');
      cy.contains('Nueva Cotización').should('be.visible');
      
      cy.get('[data-cy="client-selector"]').click();
      cy.get('[data-cy="client-option"]').first().click();
      
      cy.get('[data-cy="next-step"]').click();
      
      // Step 2: Product Configuration
      cy.get('[data-cy="product-selector"]').should('be.visible');
      cy.get('[data-cy="product-card"]').first().click();
      
      // Configure product details
      cy.get('[data-cy="product-variant"]').select('premium');
      cy.get('[data-cy="product-color"]').select('blanco');
      cy.get('[data-cy="additional-features"]').check(['GPS', 'seguro-extendido']);
      
      cy.get('[data-cy="next-step"]').click();
      
      // Step 3: Financing Options
      cy.get('[data-cy="financing-section"]').should('be.visible');
      cy.get('[data-cy="down-payment"]').clear().type('50000');
      cy.get('[data-cy="payment-terms"]').select('48');
      cy.get('[data-cy="interest-rate"]').should('contain', '12.5%');
      
      // Verify payment calculation
      cy.get('[data-cy="monthly-payment"]').should('contain', '$');
      cy.get('[data-cy="total-amount"]').should('contain', '$');
      
      cy.get('[data-cy="next-step"]').click();
      
      // Step 4: Review and Submit
      cy.get('[data-cy="quote-review"]').should('be.visible');
      cy.contains('Resumen de Cotización').should('be.visible');
      
      // Verify all information is correct
      cy.get('[data-cy="review-client"]').should('be.visible');
      cy.get('[data-cy="review-product"]').should('be.visible');
      cy.get('[data-cy="review-financing"]').should('be.visible');
      
      // Mock successful quote creation
      cy.intercept('POST', '**/api/quotes', {
        statusCode: 201,
        body: {
          id: 'quote-001',
          number: 'COT-2024-001',
          clientId: 'client-001',
          status: 'pending',
          totalAmount: 280000,
          createdAt: '2024-02-03T16:00:00Z'
        }
      }).as('createQuote');
      
      cy.get('[data-cy="submit-quote"]').click();
      
      cy.wait('@createQuote');
      cy.verifyToast('Cotización creada exitosamente', 'success');
      
      // Should redirect to quote details
      cy.url().should('include', '/cotizaciones/quote-001');
    });

    it('should create quote from client profile', () => {
      // Navigate from client details
      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      
      cy.get('[data-cy="create-quote-button"]').click();
      
      // Should pre-populate client information
      cy.url().should('include', '/cotizaciones/nueva');
      cy.url().should('include', 'clientId=client-001');
      
      cy.get('[data-cy="selected-client"]').should('contain', 'Juan Pérez García');
      cy.get('[data-cy="client-info"]').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.visit('/cotizaciones/nueva');
      cy.waitForAngular();

      // Try to proceed without selecting client
      cy.get('[data-cy="next-step"]').click();
      
      cy.contains('Debe seleccionar un cliente').should('be.visible');
      
      // Select client and proceed
      cy.get('[data-cy="client-selector"]').click();
      cy.get('[data-cy="client-option"]').first().click();
      cy.get('[data-cy="next-step"]').click();
      
      // Try to proceed without selecting product
      cy.get('[data-cy="next-step"]').click();
      
      cy.contains('Debe seleccionar un producto').should('be.visible');
    });

    it('should calculate payments correctly', () => {
      cy.visit('/cotizaciones/nueva');
      cy.waitForAngular();

      // Complete first two steps
      cy.get('[data-cy="client-selector"]').click();
      cy.get('[data-cy="client-option"]').first().click();
      cy.get('[data-cy="next-step"]').click();
      
      cy.get('[data-cy="product-card"]').first().click();
      cy.get('[data-cy="next-step"]').click();
      
      // Test payment calculations
      cy.get('[data-cy="down-payment"]').clear().type('100000');
      
      // Should update calculations immediately
      cy.get('[data-cy="financed-amount"]').should('contain', '$150,000');
      cy.get('[data-cy="monthly-payment"]').should('contain', '$');
      
      // Change payment terms
      cy.get('[data-cy="payment-terms"]').select('60');
      
      // Monthly payment should decrease
      cy.get('[data-cy="monthly-payment"]').then($payment => {
        const payment60 = parseFloat($payment.text().replace(/[$,]/g, ''));
        
        cy.get('[data-cy="payment-terms"]').select('36');
        
        cy.get('[data-cy="monthly-payment"]').should($newPayment => {
          const payment36 = parseFloat($newPayment.text().replace(/[$,]/g, ''));
          expect(payment36).to.be.greaterThan(payment60);
        });
      });
    });

    it('should handle product configuration', () => {
      cy.visit('/cotizaciones/nueva');
      cy.waitForAngular();

      // Navigate to product selection
      cy.get('[data-cy="client-selector"]').click();
      cy.get('[data-cy="client-option"]').first().click();
      cy.get('[data-cy="next-step"]').click();
      
      // Select product
      cy.get('[data-cy="product-card"]').first().click();
      
      // Verify product configuration options appear
      cy.get('[data-cy="product-config"]').should('be.visible');
      
      // Test different configurations affect price
      cy.get('[data-cy="base-price"]').then($basePrice => {
        const baseAmount = parseFloat($basePrice.text().replace(/[$,]/g, ''));
        
        // Add premium features
        cy.get('[data-cy="additional-features"]').check(['GPS', 'seguro-extendido']);
        
        cy.get('[data-cy="total-price"]').should($totalPrice => {
          const totalAmount = parseFloat($totalPrice.text().replace(/[$,]/g, ''));
          expect(totalAmount).to.be.greaterThan(baseAmount);
        });
      });
    });

    it('should save quote as draft', () => {
      cy.intercept('POST', '**/api/quotes/draft', {
        statusCode: 200,
        body: {
          id: 'draft-001',
          status: 'draft',
          savedAt: '2024-02-03T16:00:00Z'
        }
      }).as('saveDraft');

      cy.visit('/cotizaciones/nueva');
      cy.waitForAngular();

      // Start filling form
      cy.get('[data-cy="client-selector"]').click();
      cy.get('[data-cy="client-option"]').first().click();
      cy.get('[data-cy="next-step"]').click();
      
      cy.get('[data-cy="product-card"]').first().click();
      
      // Save as draft
      cy.get('[data-cy="save-draft"]').click();
      
      cy.wait('@saveDraft');
      cy.verifyToast('Borrador guardado', 'info');
    });
  });

  describe('Quote Management', () => {
    it('should display quotes list correctly', () => {
      cy.visit('/cotizaciones');
      cy.waitForAngular();
      cy.wait('@getQuotes');

      cy.get('[data-cy="quotes-page"]').should('be.visible');
      cy.contains('Gestión de Cotizaciones').should('be.visible');
      
      // Verify quote cards
      cy.get('[data-cy="quote-card"]').should('have.length.gte', 1);
      
      cy.get('[data-cy="quote-card"]').first().within(() => {
        cy.get('[data-cy="quote-number"]').should('be.visible');
        cy.get('[data-cy="client-name"]').should('be.visible');
        cy.get('[data-cy="quote-amount"]').should('be.visible');
        cy.get('[data-cy="quote-status"]').should('be.visible');
        cy.get('[data-cy="quote-date"]').should('be.visible');
      });
    });

    it('should filter quotes by status', () => {
      cy.visit('/cotizaciones');
      cy.waitForAngular();
      cy.wait('@getQuotes');

      // Filter by pending status
      cy.get('[data-cy="status-filter"]').select('pending');
      
      cy.get('[data-cy="quote-card"]').each($card => {
        cy.wrap($card).find('[data-cy="quote-status"]').should('contain', 'Pendiente');
      });
      
      // Filter by approved status
      cy.get('[data-cy="status-filter"]').select('approved');
      
      cy.get('[data-cy="quote-card"]').each($card => {
        cy.wrap($card).find('[data-cy="quote-status"]').should('contain', 'Aprobada');
      });
    });

    it('should search quotes by client name or quote number', () => {
      cy.visit('/cotizaciones');
      cy.waitForAngular();
      cy.wait('@getQuotes');

      // Search by client name
      cy.get('[data-cy="quote-search"]').type('Juan Pérez');
      
      cy.get('[data-cy="quote-card"]').should('have.length.gte', 1);
      cy.get('[data-cy="quote-card"]').first().should('contain', 'Juan Pérez');
      
      // Clear and search by quote number
      cy.get('[data-cy="quote-search"]').clear().type('COT-2024');
      
      cy.get('[data-cy="quote-card"]').should('have.length.gte', 1);
      cy.get('[data-cy="quote-card"]').each($card => {
        cy.wrap($card).find('[data-cy="quote-number"]').should('contain', 'COT-2024');
      });
    });

    it('should navigate to quote details', () => {
      cy.visit('/cotizaciones');
      cy.waitForAngular();
      cy.wait('@getQuotes');

      cy.get('[data-cy="quote-card"]').first().click();
      
      cy.url().should('include', '/cotizaciones/');
      cy.get('[data-cy="quote-details"]').should('be.visible');
    });
  });

  describe('Quote Details and Actions', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/quotes/quote-001', {
        fixture: 'quote-details.json'
      }).as('getQuoteDetails');
    });

    it('should display quote details correctly', () => {
      cy.visit('/cotizaciones/quote-001');
      cy.waitForAngular();
      cy.wait('@getQuoteDetails');

      // Verify quote header
      cy.get('[data-cy="quote-header"]').should('be.visible');
      cy.get('[data-cy="quote-number"]').should('contain', 'COT-2024-001');
      cy.get('[data-cy="quote-status"]').should('be.visible');
      cy.get('[data-cy="quote-date"]').should('be.visible');
      
      // Verify client information
      cy.get('[data-cy="client-info"]').should('be.visible');
      cy.get('[data-cy="client-name"]').should('contain', 'Juan Pérez García');
      
      // Verify product information
      cy.get('[data-cy="product-info"]').should('be.visible');
      cy.get('[data-cy="product-name"]').should('be.visible');
      cy.get('[data-cy="product-price"]').should('be.visible');
      
      // Verify financing details
      cy.get('[data-cy="financing-info"]').should('be.visible');
      cy.get('[data-cy="down-payment"]').should('be.visible');
      cy.get('[data-cy="monthly-payment"]').should('be.visible');
      cy.get('[data-cy="payment-terms"]').should('be.visible');
    });

    it('should approve quote successfully', () => {
      cy.intercept('PUT', '**/api/quotes/quote-001/approve', {
        statusCode: 200,
        body: { success: true, status: 'approved' }
      }).as('approveQuote');

      cy.visit('/cotizaciones/quote-001');
      cy.waitForAngular();
      cy.wait('@getQuoteDetails');

      cy.get('[data-cy="approve-quote"]').click();
      
      // Confirm approval
      cy.get('[data-cy="approval-modal"]').should('be.visible');
      cy.get('[data-cy="approval-notes"]').type('Cotización aprobada con condiciones estándar');
      cy.get('[data-cy="confirm-approval"]').click();
      
      cy.wait('@approveQuote');
      cy.verifyToast('Cotización aprobada exitosamente', 'success');
      
      // Status should update
      cy.get('[data-cy="quote-status"]').should('contain', 'Aprobada');
    });

    it('should reject quote with reason', () => {
      cy.intercept('PUT', '**/api/quotes/quote-001/reject', {
        statusCode: 200,
        body: { success: true, status: 'rejected' }
      }).as('rejectQuote');

      cy.visit('/cotizaciones/quote-001');
      cy.waitForAngular();
      cy.wait('@getQuoteDetails');

      cy.get('[data-cy="reject-quote"]').click();
      
      // Provide rejection reason
      cy.get('[data-cy="rejection-modal"]').should('be.visible');
      cy.get('[data-cy="rejection-reason"]').select('credit-issues');
      cy.get('[data-cy="rejection-notes"]').type('Documentos de crédito incompletos');
      cy.get('[data-cy="confirm-rejection"]').click();
      
      cy.wait('@rejectQuote');
      cy.verifyToast('Cotización rechazada', 'info');
      
      // Status should update
      cy.get('[data-cy="quote-status"]').should('contain', 'Rechazada');
    });

    it('should edit quote details', () => {
      cy.intercept('PUT', '**/api/quotes/quote-001', {
        statusCode: 200,
        body: { success: true }
      }).as('updateQuote');

      cy.visit('/cotizaciones/quote-001');
      cy.waitForAngular();
      cy.wait('@getQuoteDetails');

      cy.get('[data-cy="edit-quote"]').click();
      
      // Should navigate to edit mode
      cy.url().should('include', '/editar');
      
      // Modify financing terms
      cy.get('[data-cy="down-payment"]').clear().type('75000');
      cy.get('[data-cy="payment-terms"]').select('60');
      
      // Verify calculations update
      cy.get('[data-cy="monthly-payment"]').should('be.visible');
      
      cy.get('[data-cy="save-changes"]').click();
      
      cy.wait('@updateQuote');
      cy.verifyToast('Cotización actualizada', 'success');
    });

    it('should generate quote PDF', () => {
      cy.intercept('GET', '**/api/quotes/quote-001/pdf', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="COT-2024-001.pdf"'
        }
      }).as('generatePDF');

      cy.visit('/cotizaciones/quote-001');
      cy.waitForAngular();
      cy.wait('@getQuoteDetails');

      cy.get('[data-cy="download-pdf"]').click();
      
      cy.wait('@generatePDF');
      cy.verifyToast('PDF generado exitosamente', 'success');
    });

    it('should send quote via email', () => {
      cy.intercept('POST', '**/api/quotes/quote-001/send-email', {
        statusCode: 200,
        body: { success: true, sent: true }
      }).as('sendQuoteEmail');

      cy.visit('/cotizaciones/quote-001');
      cy.waitForAngular();
      cy.wait('@getQuoteDetails');

      cy.get('[data-cy="send-email"]').click();
      
      cy.get('[data-cy="email-modal"]').should('be.visible');
      cy.get('[data-cy="recipient-email"]').should('have.value', 'juan.perez@email.com');
      cy.get('[data-cy="email-subject"]').should('contain', 'Cotización COT-2024-001');
      cy.get('[data-cy="email-message"]').type('Estimado cliente, adjunto encuentra su cotización...');
      
      cy.get('[data-cy="send-email-confirm"]').click();
      
      cy.wait('@sendQuoteEmail');
      cy.verifyToast('Cotización enviada por correo', 'success');
    });

    it('should convert quote to contract', () => {
      cy.intercept('POST', '**/api/quotes/quote-001/convert-contract', {
        statusCode: 200,
        body: {
          success: true,
          contractId: 'contract-001',
          contractNumber: 'CONT-2024-001'
        }
      }).as('convertToContract');

      cy.visit('/cotizaciones/quote-001');
      cy.waitForAngular();
      cy.wait('@getQuoteDetails');

      // Quote must be approved first
      cy.get('[data-cy="quote-status"]').should('contain', 'Aprobada');
      
      cy.get('[data-cy="convert-contract"]').click();
      
      cy.get('[data-cy="contract-modal"]').should('be.visible');
      cy.get('[data-cy="contract-terms"]').check();
      cy.get('[data-cy="confirm-conversion"]').click();
      
      cy.wait('@convertToContract');
      cy.verifyToast('Contrato creado exitosamente', 'success');
      
      // Should redirect to contract details
      cy.url().should('include', '/contratos/contract-001');
    });
  });

  describe('Quote Comparison', () => {
    it('should compare multiple quotes', () => {
      cy.visit('/cotizaciones');
      cy.waitForAngular();
      cy.wait('@getQuotes');

      // Select quotes for comparison
      cy.get('[data-cy="quote-compare"]').first().check();
      cy.get('[data-cy="quote-compare"]').eq(1).check();
      
      cy.get('[data-cy="compare-quotes"]').click();
      
      // Verify comparison view
      cy.get('[data-cy="comparison-table"]').should('be.visible');
      cy.get('[data-cy="comparison-header"]').should('contain', '2 cotizaciones seleccionadas');
      
      // Verify comparison fields
      cy.get('[data-cy="compare-client"]').should('be.visible');
      cy.get('[data-cy="compare-product"]').should('be.visible');
      cy.get('[data-cy="compare-pricing"]').should('be.visible');
      cy.get('[data-cy="compare-financing"]').should('be.visible');
    });

    it('should export comparison report', () => {
      cy.intercept('POST', '**/api/quotes/comparison-report', {
        statusCode: 200,
        body: { downloadUrl: '/downloads/quote-comparison.pdf' }
      }).as('exportComparison');

      cy.visit('/cotizaciones/comparacion?ids=quote-001,quote-002');
      cy.waitForAngular();

      cy.get('[data-cy="export-comparison"]').click();
      
      cy.wait('@exportComparison');
      cy.verifyToast('Reporte de comparación generado', 'success');
    });
  });

  describe('Performance and Accessibility', () => {
    it('should load quote creation form efficiently', () => {
      const start = Date.now();
      
      cy.visit('/cotizaciones/nueva');
      cy.waitForAngular();
      cy.wait('@getProducts');
      
      cy.then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(3000);
      });
    });

    it('should be fully accessible', () => {
      cy.visit('/cotizaciones');
      cy.waitForAngular();
      cy.wait('@getQuotes');

      cy.checkA11y();
      
      // Test form accessibility
      cy.visit('/cotizaciones/nueva');
      cy.waitForAngular();
      
      cy.checkA11y('[data-cy="quote-form"]');
    });

    it('should handle form validation accessibly', () => {
      cy.visit('/cotizaciones/nueva');
      cy.waitForAngular();

      // Trigger validation
      cy.get('[data-cy="next-step"]').click();
      
      // Verify ARIA attributes
      cy.get('[data-cy="client-selector"]').should('have.attr', 'aria-invalid', 'true');
      cy.get('[data-cy="client-error"]').should('have.attr', 'role', 'alert');
    });

    it('should support keyboard navigation through quote form', () => {
      cy.visit('/cotizaciones/nueva');
      cy.waitForAngular();

      // Test tab navigation
      cy.get('body').tab();
      cy.focused().should('be.visible');
      
      // Navigate through form fields
      for (let i = 0; i < 10; i++) {
        cy.focused().tab();
        cy.focused().should('be.visible');
      }
      
      // Test Enter key on buttons
      cy.get('[data-cy="client-selector"]').focus().type('{enter}');
      cy.get('[data-cy="client-dropdown"]').should('be.visible');
    });
  });
});