describe('Document Workflow', () => {
  beforeEach(() => {
    cy.setupDefaultIntercepts();
    cy.login();
    
    // Setup document-specific intercepts
    cy.intercept('GET', '**/api/clients/client-001/documents', {
      fixture: 'client-documents.json'
    }).as('getClientDocuments');
    
    cy.intercept('GET', '**/api/document-requirements', {
      fixture: 'document-requirements.json'
    }).as('getDocumentRequirements');
  });

  describe('Document Requirements', () => {
    it('should display document requirements for client', () => {
      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');
      cy.wait('@getDocumentRequirements');

      cy.get('[data-cy="documents-page"]').should('be.visible');
      cy.contains('Documentos Requeridos').should('be.visible');
      
      // Verify required documents list
      cy.get('[data-cy="required-doc"]').should('have.length.gte', 3);
      
      // Verify document statuses
      cy.get('[data-cy="doc-ine"]').within(() => {
        cy.get('[data-cy="doc-status"]').should('contain', 'Aprobado');
        cy.get('[data-cy="doc-icon"]').should('have.class', 'approved');
      });
      
      cy.get('[data-cy="doc-domicilio"]').within(() => {
        cy.get('[data-cy="doc-status"]').should('contain', 'Pendiente');
        cy.get('[data-cy="upload-button"]').should('be.visible');
      });
    });

    it('should show document tooltips and help', () => {
      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      // Hover over help icon
      cy.get('[data-cy="doc-domicilio"]').find('[data-cy="help-icon"]').trigger('mouseover');
      
      // Verify tooltip appears
      cy.get('[data-cy="doc-tooltip"]').should('be.visible');
      cy.contains('Recibo de luz, agua o teléfono no mayor a 3 meses').should('be.visible');
    });

    it('should filter documents by status', () => {
      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      // Filter by pending documents
      cy.get('[data-cy="status-filter"]').select('pendiente');
      
      cy.get('[data-cy="required-doc"]').each($doc => {
        cy.wrap($doc).find('[data-cy="doc-status"]').should('contain', 'Pendiente');
      });
      
      // Filter by approved documents
      cy.get('[data-cy="status-filter"]').select('aprobado');
      
      cy.get('[data-cy="required-doc"]').each($doc => {
        cy.wrap($doc).find('[data-cy="doc-status"]').should('contain', 'Aprobado');
      });
    });
  });

  describe('Document Upload', () => {
    it('should upload document successfully', () => {
      cy.intercept('POST', '**/api/clients/client-001/documents/upload', {
        statusCode: 200,
        body: {
          id: 'doc-004',
          name: 'Comprobante de domicilio',
          status: 'En Revisión',
          uploadedAt: '2024-02-03T16:30:00Z',
          fileName: 'comprobante-domicilio.pdf',
          fileSize: 1024768
        }
      }).as('uploadDocument');

      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      // Click upload button for pending document
      cy.get('[data-cy="doc-domicilio"]').find('[data-cy="upload-button"]').click();
      
      cy.get('[data-cy="upload-modal"]').should('be.visible');
      
      // Select document type
      cy.get('[data-cy="document-type"]').select('comprobante-domicilio');
      
      // Upload file
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

      // Verify file is selected
      cy.get('[data-cy="selected-file"]').should('contain', fileName);
      cy.get('[data-cy="file-size"]').should('be.visible');
      
      // Add optional notes
      cy.get('[data-cy="upload-notes"]').type('Recibo de CFE del mes actual');
      
      cy.get('[data-cy="upload-submit"]').click();
      
      cy.wait('@uploadDocument');
      cy.verifyToast('Documento subido exitosamente', 'success');
      
      // Modal should close and document status should update
      cy.get('[data-cy="upload-modal"]').should('not.exist');
      cy.get('[data-cy="doc-domicilio"]').find('[data-cy="doc-status"]').should('contain', 'En Revisión');
    });

    it('should validate file type and size', () => {
      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      cy.get('[data-cy="doc-domicilio"]').find('[data-cy="upload-button"]').click();
      
      // Try uploading invalid file type
      cy.fixture('invalid-document.txt', 'binary')
        .then(Cypress.Blob.binaryStringToBlob)
        .then(fileContent => {
          cy.get('[data-cy="file-input"]').selectFile({
            contents: fileContent,
            fileName: 'invalid-document.txt',
            mimeType: 'text/plain'
          });
        });

      cy.get('[data-cy="file-error"]').should('contain', 'Tipo de archivo no válido');
      cy.get('[data-cy="upload-submit"]').should('be.disabled');
    });

    it('should handle upload errors gracefully', () => {
      cy.intercept('POST', '**/api/clients/client-001/documents/upload', {
        statusCode: 400,
        body: { error: 'El archivo es demasiado grande' }
      }).as('uploadError');

      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      cy.get('[data-cy="doc-domicilio"]').find('[data-cy="upload-button"]').click();
      
      const fileName = 'large-document.pdf';
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
      
      cy.wait('@uploadError');
      cy.get('[data-cy="upload-error"]').should('contain', 'El archivo es demasiado grande');
    });

    it('should show upload progress', () => {
      // Mock delayed upload with progress
      cy.intercept('POST', '**/api/clients/client-001/documents/upload', (req) => {
        req.reply((res) => {
          res.delay(2000);
          res.send({
            statusCode: 200,
            body: { success: true }
          });
        });
      }).as('slowUpload');

      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      cy.get('[data-cy="doc-domicilio"]').find('[data-cy="upload-button"]').click();
      
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
      
      // Verify progress indicators
      cy.get('[data-cy="upload-progress"]').should('be.visible');
      cy.get('[data-cy="upload-spinner"]').should('be.visible');
      cy.get('[data-cy="upload-submit"]').should('be.disabled');
      
      cy.wait('@slowUpload');
    });

    it('should support drag and drop upload', () => {
      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      cy.get('[data-cy="doc-domicilio"]').find('[data-cy="upload-button"]').click();
      
      // Test drag and drop zone
      cy.get('[data-cy="drop-zone"]').should('be.visible');
      cy.contains('Arrastra el archivo aquí o haz clic para seleccionar').should('be.visible');
      
      // Simulate drag enter
      cy.get('[data-cy="drop-zone"]').trigger('dragenter');
      cy.get('[data-cy="drop-zone"]').should('have.class', 'drag-over');
      
      // Simulate drag leave
      cy.get('[data-cy="drop-zone"]').trigger('dragleave');
      cy.get('[data-cy="drop-zone"]').should('not.have.class', 'drag-over');
    });
  });

  describe('Document Review and Approval', () => {
    beforeEach(() => {
      // Login as admin/reviewer user
      cy.login('admin@conductores.com', 'adminPassword');
    });

    it('should display documents pending review', () => {
      cy.visit('/documentos/revision');
      cy.waitForAngular();
      
      cy.intercept('GET', '**/api/documents/pending-review', {
        fixture: 'documents-pending-review.json'
      }).as('getPendingDocuments');
      
      cy.wait('@getPendingDocuments');

      cy.get('[data-cy="review-queue"]').should('be.visible');
      cy.contains('Documentos Pendientes de Revisión').should('be.visible');
      
      // Verify document cards
      cy.get('[data-cy="review-doc"]').should('have.length.gte', 1);
      
      cy.get('[data-cy="review-doc"]').first().within(() => {
        cy.get('[data-cy="client-name"]').should('be.visible');
        cy.get('[data-cy="document-type"]').should('be.visible');
        cy.get('[data-cy="upload-date"]').should('be.visible');
        cy.get('[data-cy="review-buttons"]').should('be.visible');
      });
    });

    it('should approve document successfully', () => {
      cy.intercept('PUT', '**/api/documents/doc-004/approve', {
        statusCode: 200,
        body: { success: true, status: 'approved' }
      }).as('approveDocument');

      cy.visit('/documentos/revision');
      cy.waitForAngular();
      
      cy.get('[data-cy="review-doc"]').first().find('[data-cy="approve-button"]').click();
      
      cy.get('[data-cy="approval-modal"]').should('be.visible');
      cy.get('[data-cy="approval-notes"]').type('Documento válido y legible');
      cy.get('[data-cy="confirm-approval"]').click();
      
      cy.wait('@approveDocument');
      cy.verifyToast('Documento aprobado', 'success');
      
      // Document should be removed from review queue
      cy.get('[data-cy="review-doc"]').should('have.length.lessThan', 3);
    });

    it('should reject document with reason', () => {
      cy.intercept('PUT', '**/api/documents/doc-004/reject', {
        statusCode: 200,
        body: { success: true, status: 'rejected' }
      }).as('rejectDocument');

      cy.visit('/documentos/revision');
      cy.waitForAngular();
      
      cy.get('[data-cy="review-doc"]').first().find('[data-cy="reject-button"]').click();
      
      cy.get('[data-cy="rejection-modal"]').should('be.visible');
      cy.get('[data-cy="rejection-reason"]').select('illegible');
      cy.get('[data-cy="rejection-notes"]').type('La imagen está borrosa y no se puede leer');
      cy.get('[data-cy="confirm-rejection"]').click();
      
      cy.wait('@rejectDocument');
      cy.verifyToast('Documento rechazado', 'info');
    });

    it('should request additional information', () => {
      cy.intercept('PUT', '**/api/documents/doc-004/request-info', {
        statusCode: 200,
        body: { success: true, status: 'info_requested' }
      }).as('requestInfo');

      cy.visit('/documentos/revision');
      cy.waitForAngular();
      
      cy.get('[data-cy="review-doc"]').first().find('[data-cy="request-info-button"]').click();
      
      cy.get('[data-cy="info-request-modal"]').should('be.visible');
      cy.get('[data-cy="info-request-message"]').type('Por favor suba una imagen más clara del INE');
      cy.get('[data-cy="confirm-request"]').click();
      
      cy.wait('@requestInfo');
      cy.verifyToast('Información solicitada', 'info');
    });

    it('should view document details and preview', () => {
      cy.visit('/documentos/revision');
      cy.waitForAngular();
      
      cy.get('[data-cy="review-doc"]').first().find('[data-cy="view-document"]').click();
      
      cy.get('[data-cy="document-viewer"]').should('be.visible');
      cy.get('[data-cy="document-image"]').should('be.visible');
      
      // Test zoom functionality
      cy.get('[data-cy="zoom-in"]').click();
      cy.get('[data-cy="document-image"]').should('have.css', 'transform').and('contain', 'scale');
      
      cy.get('[data-cy="zoom-out"]').click();
      
      // Test rotation
      cy.get('[data-cy="rotate-document"]').click();
      cy.get('[data-cy="document-image"]').should('have.css', 'transform').and('contain', 'rotate');
    });

    it('should bulk approve multiple documents', () => {
      cy.intercept('PUT', '**/api/documents/bulk-approve', {
        statusCode: 200,
        body: { success: true, approved: 3 }
      }).as('bulkApprove');

      cy.visit('/documentos/revision');
      cy.waitForAngular();
      
      // Select multiple documents
      cy.get('[data-cy="doc-checkbox"]').first().check();
      cy.get('[data-cy="doc-checkbox"]').eq(1).check();
      cy.get('[data-cy="doc-checkbox"]').eq(2).check();
      
      cy.get('[data-cy="bulk-actions"]').should('be.visible');
      cy.get('[data-cy="bulk-approve"]').click();
      
      cy.get('[data-cy="bulk-approval-modal"]').should('be.visible');
      cy.get('[data-cy="bulk-notes"]').type('Documentos aprobados en lote');
      cy.get('[data-cy="confirm-bulk-approval"]').click();
      
      cy.wait('@bulkApprove');
      cy.verifyToast('3 documentos aprobados', 'success');
    });
  });

  describe('Document History and Tracking', () => {
    it('should display document history', () => {
      cy.visit('/clientes/client-001/documentos/doc-001/historial');
      cy.waitForAngular();
      
      cy.intercept('GET', '**/api/documents/doc-001/history', {
        fixture: 'document-history.json'
      }).as('getDocumentHistory');
      
      cy.wait('@getDocumentHistory');

      cy.get('[data-cy="document-history"]').should('be.visible');
      cy.contains('Historial del Documento').should('be.visible');
      
      // Verify timeline events
      cy.get('[data-cy="history-event"]').should('have.length.gte', 3);
      
      cy.get('[data-cy="history-event"]').first().within(() => {
        cy.get('[data-cy="event-date"]').should('be.visible');
        cy.get('[data-cy="event-actor"]').should('be.visible');
        cy.get('[data-cy="event-description"]').should('be.visible');
      });
    });

    it('should track document versions', () => {
      cy.visit('/clientes/client-001/documentos/doc-001');
      cy.waitForAngular();
      
      cy.intercept('GET', '**/api/documents/doc-001/versions', {
        fixture: 'document-versions.json'
      }).as('getDocumentVersions');
      
      cy.wait('@getDocumentVersions');

      cy.get('[data-cy="document-versions"]').should('be.visible');
      
      // Verify version list
      cy.get('[data-cy="version-item"]').should('have.length.gte', 2);
      
      // Should show current version
      cy.get('[data-cy="current-version"]').should('contain', 'Versión Actual');
      
      // Test version comparison
      cy.get('[data-cy="compare-versions"]').click();
      cy.get('[data-cy="version-comparison"]').should('be.visible');
    });

    it('should download document', () => {
      cy.intercept('GET', '**/api/documents/doc-001/download', {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="INE_Juan_Perez.pdf"'
        }
      }).as('downloadDocument');

      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      cy.get('[data-cy="doc-ine"]').find('[data-cy="download-button"]').click();
      
      cy.wait('@downloadDocument');
      cy.verifyToast('Descarga iniciada', 'info');
    });
  });

  describe('Document Notifications', () => {
    it('should send notification when document is approved', () => {
      cy.intercept('POST', '**/api/notifications/document-approved', {
        statusCode: 200,
        body: { success: true }
      }).as('sendNotification');

      // Approve a document
      cy.visit('/documentos/revision');
      cy.waitForAngular();
      
      cy.get('[data-cy="review-doc"]').first().find('[data-cy="approve-button"]').click();
      cy.get('[data-cy="approval-notes"]').type('Documento aprobado');
      cy.get('[data-cy="confirm-approval"]').click();
      
      // Should trigger notification
      cy.wait('@sendNotification');
    });

    it('should notify client of missing documents', () => {
      cy.intercept('POST', '**/api/clients/client-001/notify-missing-docs', {
        statusCode: 200,
        body: { success: true, notificationsSent: 2 }
      }).as('notifyMissingDocs');

      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      cy.get('[data-cy="notify-missing"]').click();
      
      cy.get('[data-cy="notification-modal"]').should('be.visible');
      cy.get('[data-cy="notification-method"]').check(['email', 'sms']);
      cy.get('[data-cy="custom-message"]').type('Recordatorio: Faltan documentos por subir');
      
      cy.get('[data-cy="send-notification"]').click();
      
      cy.wait('@notifyMissingDocs');
      cy.verifyToast('Notificaciones enviadas', 'success');
    });
  });

  describe('OCR and Document Processing', () => {
    it('should extract data from uploaded document using OCR', () => {
      cy.intercept('POST', '**/api/documents/ocr-extract', {
        statusCode: 200,
        body: {
          success: true,
          extractedData: {
            name: 'JUAN PEREZ GARCIA',
            curp: 'PEGJ850315HDFRZN03',
            address: 'AV INSURGENTES 123, COL CENTRO',
            expirationDate: '2029-03-15'
          }
        }
      }).as('ocrExtract');

      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      cy.get('[data-cy="doc-ine"]').find('[data-cy="extract-data"]').click();
      
      cy.wait('@ocrExtract');
      
      // Verify extracted data modal
      cy.get('[data-cy="ocr-results"]').should('be.visible');
      cy.get('[data-cy="extracted-name"]').should('contain', 'JUAN PEREZ GARCIA');
      cy.get('[data-cy="extracted-curp"]').should('contain', 'PEGJ850315HDFRZN03');
      
      // Confirm extracted data
      cy.get('[data-cy="confirm-extraction"]').click();
      cy.verifyToast('Datos extraídos exitosamente', 'success');
    });

    it('should handle OCR processing errors', () => {
      cy.intercept('POST', '**/api/documents/ocr-extract', {
        statusCode: 422,
        body: {
          error: 'No se pudo procesar la imagen. La calidad es muy baja.'
        }
      }).as('ocrError');

      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      cy.get('[data-cy="doc-ine"]').find('[data-cy="extract-data"]').click();
      
      cy.wait('@ocrError');
      
      cy.get('[data-cy="ocr-error"]').should('be.visible');
      cy.contains('No se pudo procesar la imagen').should('be.visible');
    });
  });

  describe('Performance and Accessibility', () => {
    it('should load documents page within acceptable time', () => {
      const start = Date.now();
      
      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');
      
      cy.then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(2000);
      });
    });

    it('should be fully accessible', () => {
      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      cy.checkA11y();
      
      // Test upload modal accessibility
      cy.get('[data-cy="doc-domicilio"]').find('[data-cy="upload-button"]').click();
      cy.checkA11y('[data-cy="upload-modal"]');
    });

    it('should support keyboard navigation', () => {
      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      // Test tab navigation
      cy.get('body').tab();
      cy.focused().should('be.visible');
      
      // Navigate through document cards
      for (let i = 0; i < 5; i++) {
        cy.focused().tab();
        cy.focused().should('be.visible');
      }
      
      // Test Enter key on upload button
      cy.get('[data-cy="upload-button"]').first().focus().type('{enter}');
      cy.get('[data-cy="upload-modal"]').should('be.visible');
      
      // Test Escape key to close modal
      cy.get('body').type('{esc}');
      cy.get('[data-cy="upload-modal"]').should('not.exist');
    });

    it('should handle large file uploads efficiently', () => {
      // Mock large file upload with progress tracking
      cy.intercept('POST', '**/api/clients/client-001/documents/upload', (req) => {
        // Simulate processing time based on file size
        const delay = req.body.size > 5000000 ? 5000 : 1000;
        
        req.reply((res) => {
          res.delay(delay);
          res.send({
            statusCode: 200,
            body: { success: true }
          });
        });
      }).as('uploadLargeFile');

      cy.visit('/clientes/client-001/documentos');
      cy.waitForAngular();
      cy.wait('@getClientDocuments');

      cy.get('[data-cy="doc-domicilio"]').find('[data-cy="upload-button"]').click();
      
      // Upload large file
      const largeFileName = 'large-document.pdf';
      cy.fixture(largeFileName, 'binary')
        .then(Cypress.Blob.binaryStringToBlob)
        .then(fileContent => {
          cy.get('[data-cy="file-input"]').selectFile({
            contents: fileContent,
            fileName: largeFileName,
            mimeType: 'application/pdf'
          });
        });

      cy.get('[data-cy="upload-submit"]').click();
      
      // Should show progress indicators for large files
      cy.get('[data-cy="upload-progress"]').should('be.visible');
      cy.get('[data-cy="progress-bar"]').should('be.visible');
      
      cy.wait('@uploadLargeFile', { timeout: 10000 });
    });
  });
});