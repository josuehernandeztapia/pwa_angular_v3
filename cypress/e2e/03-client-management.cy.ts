describe('Client Management', () => {
  beforeEach(() => {
    cy.setupDefaultIntercepts();
    cy.login();
  });

  describe('Client List', () => {
    it('should display clients list correctly', () => {
      cy.visit('/clientes');
      cy.waitForAngular();
      cy.wait('@getClients');

      // Verify clients page loads
      cy.get('[data-cy="clients-page"]').should('be.visible');
      cy.contains('Gestión de Clientes').should('be.visible');

      // Verify client cards are displayed
      cy.get('[data-cy="client-card"]').should('have.length', 3);
      
      // Verify first client data
      cy.get('[data-cy="client-card"]').first().within(() => {
        cy.contains('Juan Pérez García').should('be.visible');
        cy.contains('juan.perez@email.com').should('be.visible');
        cy.contains('Venta a Plazo').should('be.visible');
        cy.contains('Activo').should('be.visible');
      });
    });

    it('should filter clients by status', () => {
      cy.visit('/clientes');
      cy.waitForAngular();
      cy.wait('@getClients');

      // Filter by active status
      cy.get('[data-cy="status-filter"]').select('Activo');
      
      // Should show only active clients
      cy.get('[data-cy="client-card"]').should('have.length', 2);
      cy.get('[data-cy="client-card"]').each($card => {
        cy.wrap($card).should('contain', 'Activo');
      });
    });

    it('should search clients by name', () => {
      cy.visit('/clientes');
      cy.waitForAngular();
      cy.wait('@getClients');

      cy.get('[data-cy="client-search"]').type('Juan');
      
      cy.get('[data-cy="client-card"]').should('have.length', 1);
      cy.get('[data-cy="client-card"]').first().should('contain', 'Juan Pérez García');
    });

    it('should sort clients by different criteria', () => {
      cy.visit('/clientes');
      cy.waitForAngular();
      cy.wait('@getClients');

      // Sort by name ascending
      cy.get('[data-cy="sort-selector"]').select('name-asc');
      
      cy.get('[data-cy="client-card"]').first().should('contain', 'Carlos Rodríguez');
      
      // Sort by date descending
      cy.get('[data-cy="sort-selector"]').select('date-desc');
      
      cy.get('[data-cy="client-card"]').first().should('contain', 'Carlos Rodríguez');
    });

    it('should navigate to client details', () => {
      cy.visit('/clientes');
      cy.waitForAngular();
      cy.wait('@getClients');

      cy.get('[data-cy="client-card"]').first().click();
      
      cy.url().should('include', '/clientes/client-001');
      cy.get('[data-cy="client-details"]').should('be.visible');
    });
  });

  describe('Create New Client', () => {
    it('should open new client modal', () => {
      cy.visit('/clientes');
      cy.waitForAngular();

      cy.get('[data-cy="new-client-button"]').click();
      
      cy.get('[data-cy="new-client-modal"]').should('be.visible');
      cy.contains('Nuevo Cliente').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.visit('/clientes');
      cy.waitForAngular();

      cy.get('[data-cy="new-client-button"]').click();
      cy.get('[data-cy="submit-client"]').click();

      // Verify validation errors
      cy.contains('El nombre es requerido').should('be.visible');
      cy.contains('El correo es requerido').should('be.visible');
      cy.contains('El teléfono es requerido').should('be.visible');
      cy.contains('El RFC es requerido').should('be.visible');
    });

    it('should validate email format', () => {
      cy.visit('/clientes');
      cy.waitForAngular();

      cy.get('[data-cy="new-client-button"]').click();
      
      cy.get('[data-cy="client-email"]').type('invalid-email');
      cy.get('[data-cy="submit-client"]').click();

      cy.contains('Formato de correo inválido').should('be.visible');
    });

    it('should validate RFC format', () => {
      cy.visit('/clientes');
      cy.waitForAngular();

      cy.get('[data-cy="new-client-button"]').click();
      
      cy.get('[data-cy="client-rfc"]').type('INVALID');
      cy.get('[data-cy="submit-client"]').click();

      cy.contains('Formato de RFC inválido').should('be.visible');
    });

    it('should create new client successfully', () => {
      // Mock successful creation
      cy.intercept('POST', '**/api/clients', {
        statusCode: 201,
        body: {
          id: 'client-004',
          name: 'Nuevo Cliente Test',
          email: 'nuevo@test.com',
          phone: '5551111111',
          rfc: 'TETC800101ABC',
          market: 'aguascalientes',
          flow: 'Venta a Plazo',
          status: 'Activo',
          createdAt: '2024-02-03T15:30:00Z'
        }
      }).as('createClient');

      cy.visit('/clientes');
      cy.waitForAngular();

      cy.get('[data-cy="new-client-button"]').click();
      
      // Fill form
      cy.get('[data-cy="client-name"]').type('Nuevo Cliente Test');
      cy.get('[data-cy="client-email"]').type('nuevo@test.com');
      cy.get('[data-cy="client-phone"]').type('5551111111');
      cy.get('[data-cy="client-rfc"]').type('TETC800101ABC');
      cy.get('[data-cy="client-market"]').select('aguascalientes');
      cy.get('[data-cy="client-flow"]').select('Venta a Plazo');
      
      cy.get('[data-cy="submit-client"]').click();
      
      cy.wait('@createClient');
      
      // Verify success
      cy.verifyToast('Cliente creado exitosamente', 'success');
      cy.get('[data-cy="new-client-modal"]').should('not.exist');
      
      // Should refresh client list
      cy.wait('@getClients');
    });

    it('should handle creation errors', () => {
      cy.intercept('POST', '**/api/clients', {
        statusCode: 400,
        body: { error: 'El RFC ya existe en el sistema' }
      }).as('createClientError');

      cy.visit('/clientes');
      cy.waitForAngular();

      cy.get('[data-cy="new-client-button"]').click();
      
      // Fill form with duplicate RFC
      cy.get('[data-cy="client-name"]').type('Cliente Duplicado');
      cy.get('[data-cy="client-email"]').type('duplicado@test.com');
      cy.get('[data-cy="client-phone"]').type('5552222222');
      cy.get('[data-cy="client-rfc"]').type('PEGJ850315ABC'); // Existing RFC
      cy.get('[data-cy="client-market"]').select('aguascalientes');
      
      cy.get('[data-cy="submit-client"]').click();
      
      cy.wait('@createClientError');
      
      cy.get('[data-cy="form-error"]').should('contain', 'El RFC ya existe en el sistema');
    });
  });

  describe('Client Details', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/clients/client-001', {
        fixture: 'client-details.json'
      }).as('getClientDetails');
    });

    it('should display client information correctly', () => {
      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      cy.wait('@getClientDetails');

      // Verify client header
      cy.get('[data-cy="client-name"]').should('contain', 'Juan Pérez García');
      cy.get('[data-cy="client-email"]').should('contain', 'juan.perez@email.com');
      cy.get('[data-cy="client-phone"]').should('contain', '5551234567');
      cy.get('[data-cy="client-rfc"]').should('contain', 'PEGJ850315ABC');
      
      // Verify status and flow
      cy.get('[data-cy="client-status"]').should('contain', 'Activo');
      cy.get('[data-cy="client-flow"]').should('contain', 'Venta a Plazo');
      
      // Verify health score
      cy.get('[data-cy="health-score"]').should('contain', '85');
    });

    it('should display savings plan information', () => {
      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      cy.wait('@getClientDetails');

      cy.get('[data-cy="savings-plan"]').should('be.visible');
      cy.get('[data-cy="savings-progress"]').should('contain', '$75,000');
      cy.get('[data-cy="savings-goal"]').should('contain', '$200,000');
      
      // Verify progress bar
      cy.get('[data-cy="progress-bar"]').should('have.attr', 'aria-valuenow', '37.5');
    });

    it('should display documents section', () => {
      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      cy.wait('@getClientDetails');

      cy.get('[data-cy="documents-section"]').should('be.visible');
      
      // Verify document statuses
      cy.get('[data-cy="doc-INE"]').should('contain', 'Aprobado');
      cy.get('[data-cy="doc-domicilio"]').should('contain', 'Pendiente');
      cy.get('[data-cy="doc-rfc"]').should('contain', 'En Revisión');
    });

    it('should display import status correctly', () => {
      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      cy.wait('@getClientDetails');

      cy.get('[data-cy="import-status"]').should('be.visible');
      
      // Verify completed steps
      cy.get('[data-cy="step-pedido"]').should('have.class', 'completed');
      cy.get('[data-cy="step-fabricada"]').should('have.class', 'completed');
      
      // Verify in-progress step
      cy.get('[data-cy="step-transito"]').should('have.class', 'in-progress');
      
      // Verify pending steps
      cy.get('[data-cy="step-aduana"]').should('have.class', 'pending');
      cy.get('[data-cy="step-liberada"]').should('have.class', 'pending');
    });

    it('should display activity timeline', () => {
      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      cy.wait('@getClientDetails');

      cy.get('[data-cy="activity-timeline"]').should('be.visible');
      
      // Verify timeline events
      cy.get('[data-cy="timeline-event"]').should('have.length.gte', 2);
      cy.contains('Documento INE aprobado por el sistema').should('be.visible');
      cy.contains('Cliente contactado para seguimiento').should('be.visible');
    });

    it('should allow editing client information', () => {
      cy.intercept('PUT', '**/api/clients/client-001', {
        statusCode: 200,
        body: { success: true }
      }).as('updateClient');

      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      cy.wait('@getClientDetails');

      cy.get('[data-cy="edit-client-button"]').click();
      
      // Verify edit mode
      cy.get('[data-cy="client-name-input"]').should('be.visible');
      cy.get('[data-cy="client-email-input"]').should('be.visible');
      
      // Make changes
      cy.get('[data-cy="client-name-input"]').clear().type('Juan Pérez García Actualizado');
      cy.get('[data-cy="client-phone-input"]').clear().type('5551234568');
      
      cy.get('[data-cy="save-changes"]').click();
      
      cy.wait('@updateClient');
      cy.verifyToast('Cliente actualizado exitosamente', 'success');
    });

    it('should handle document upload', () => {
      cy.intercept('POST', '**/api/clients/client-001/documents', {
        statusCode: 200,
        body: {
          id: 'doc-004',
          name: 'Comprobante de domicilio',
          status: 'En Revisión',
          uploadedAt: '2024-02-03T16:00:00Z'
        }
      }).as('uploadDocument');

      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      cy.wait('@getClientDetails');

      // Upload document for pending requirement
      cy.get('[data-cy="upload-domicilio"]').click();
      
      const fileName = 'comprobante-domicilio.pdf';
      cy.fixture(fileName, 'binary')
        .then(Cypress.Blob.binaryStringToBlob)
        .then(fileContent => {
          cy.get('[data-cy="file-input"]').selectFile({
            contents: fileContent,
            fileName,
            mimeType: 'application/pdf'
          });
        });

      cy.get('[data-cy="upload-submit"]').click();
      
      cy.wait('@uploadDocument');
      cy.verifyToast('Documento subido exitosamente', 'success');
      
      // Verify document status updated
      cy.get('[data-cy="doc-domicilio"]').should('contain', 'En Revisión');
    });
  });

  describe('Client Actions', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/clients/client-001', {
        fixture: 'client-details.json'
      }).as('getClientDetails');
    });

    it('should create new quote for client', () => {
      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      cy.wait('@getClientDetails');

      cy.get('[data-cy="create-quote-button"]').click();
      
      cy.url().should('include', '/cotizaciones/nueva');
      cy.url().should('include', 'clientId=client-001');
    });

    it('should send client communication', () => {
      cy.intercept('POST', '**/api/clients/client-001/communications', {
        statusCode: 200,
        body: { success: true }
      }).as('sendCommunication');

      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      cy.wait('@getClientDetails');

      cy.get('[data-cy="send-communication"]').click();
      
      cy.get('[data-cy="communication-modal"]').should('be.visible');
      cy.get('[data-cy="communication-type"]').select('email');
      cy.get('[data-cy="communication-template"]').select('seguimiento');
      cy.get('[data-cy="communication-message"]').type('Mensaje de seguimiento personalizado');
      
      cy.get('[data-cy="send-message"]').click();
      
      cy.wait('@sendCommunication');
      cy.verifyToast('Comunicación enviada exitosamente', 'success');
    });

    it('should schedule follow-up reminder', () => {
      cy.intercept('POST', '**/api/clients/client-001/reminders', {
        statusCode: 200,
        body: { success: true, reminderId: 'reminder-001' }
      }).as('createReminder');

      cy.visit('/clientes/client-001');
      cy.waitForAngular();
      cy.wait('@getClientDetails');

      cy.get('[data-cy="schedule-reminder"]').click();
      
      cy.get('[data-cy="reminder-modal"]').should('be.visible');
      cy.get('[data-cy="reminder-date"]').type('2024-02-10');
      cy.get('[data-cy="reminder-time"]').type('10:00');
      cy.get('[data-cy="reminder-note"]').type('Seguimiento de documentos pendientes');
      
      cy.get('[data-cy="create-reminder"]').click();
      
      cy.wait('@createReminder');
      cy.verifyToast('Recordatorio programado', 'success');
    });
  });

  describe('Bulk Operations', () => {
    it('should select multiple clients', () => {
      cy.visit('/clientes');
      cy.waitForAngular();
      cy.wait('@getClients');

      // Select multiple clients
      cy.get('[data-cy="client-checkbox"]').first().check();
      cy.get('[data-cy="client-checkbox"]').eq(1).check();
      
      // Verify bulk actions appear
      cy.get('[data-cy="bulk-actions"]').should('be.visible');
      cy.get('[data-cy="selected-count"]').should('contain', '2 clientes seleccionados');
    });

    it('should export selected clients', () => {
      cy.intercept('POST', '**/api/clients/export', {
        statusCode: 200,
        body: { downloadUrl: '/downloads/clients-export.xlsx' }
      }).as('exportClients');

      cy.visit('/clientes');
      cy.waitForAngular();
      cy.wait('@getClients');

      cy.get('[data-cy="client-checkbox"]').first().check();
      cy.get('[data-cy="client-checkbox"]').eq(1).check();
      
      cy.get('[data-cy="export-selected"]').click();
      
      cy.wait('@exportClients');
      cy.verifyToast('Exportación completada', 'success');
    });

    it('should send bulk communication', () => {
      cy.intercept('POST', '**/api/clients/bulk-communication', {
        statusCode: 200,
        body: { success: true, sent: 2 }
      }).as('bulkCommunication');

      cy.visit('/clientes');
      cy.waitForAngular();
      cy.wait('@getClients');

      cy.get('[data-cy="client-checkbox"]').first().check();
      cy.get('[data-cy="client-checkbox"]').eq(1).check();
      
      cy.get('[data-cy="bulk-communication"]').click();
      
      cy.get('[data-cy="bulk-comm-modal"]').should('be.visible');
      cy.get('[data-cy="bulk-comm-type"]').select('email');
      cy.get('[data-cy="bulk-comm-template"]').select('promocional');
      
      cy.get('[data-cy="send-bulk-comm"]').click();
      
      cy.wait('@bulkCommunication');
      cy.verifyToast('Comunicaciones enviadas a 2 clientes', 'success');
    });
  });

  describe('Performance and Accessibility', () => {
    it('should load client list within acceptable time', () => {
      const start = Date.now();
      
      cy.visit('/clientes');
      cy.waitForAngular();
      cy.wait('@getClients');
      
      cy.then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(2000);
      });
    });

    it('should be fully accessible', () => {
      cy.visit('/clientes');
      cy.waitForAngular();
      cy.wait('@getClients');

      cy.checkA11y();
      
      // Test keyboard navigation
      cy.get('body').tab();
      cy.focused().should('be.visible');
      
      // Navigate through client cards
      for (let i = 0; i < 5; i++) {
        cy.focused().tab();
        cy.focused().should('be.visible');
      }
    });

    it('should handle large client datasets', () => {
      // Mock large dataset
      cy.intercept('GET', '**/api/clients', {
        body: Array.from({ length: 100 }, (_, i) => ({
          id: `client-${i + 1}`,
          name: `Cliente ${i + 1}`,
          email: `cliente${i + 1}@test.com`,
          status: i % 2 === 0 ? 'Activo' : 'Pendiente'
        }))
      }).as('getLargeClientList');

      cy.visit('/clientes');
      cy.waitForAngular();
      cy.wait('@getLargeClientList');

      // Should implement pagination or virtual scrolling
      cy.get('[data-cy="pagination"]').should('be.visible');
      cy.get('[data-cy="items-per-page"]').should('be.visible');
    });
  });
});