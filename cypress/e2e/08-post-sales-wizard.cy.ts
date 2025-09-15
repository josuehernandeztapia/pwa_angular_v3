describe('Postventa – Wizard 4 fotos (stubbed)', () => {
  before(() => {
    cy.login();
  });

  function selectFirstFileWith(name: string) {
    const fileName = name;
    const mimeType = 'image/jpeg';
    
    // Use enhanced file upload with better reliability
    cy.getReliable([
      '.step-card input[type="file"]',
      '[data-testid="file-input"]',
      'input[type="file"]'
    ], 10000).then($inputs => {
      if ($inputs.length) {
        cy.wrap($inputs[0]).selectFile({
          contents: 'fake-binary-content',
          fileName,
          mimeType
        }, { force: true });
        
        // Wait for upload to process
        cy.waitForApiIdle(15000); // VIN processing takes longer
      }
    });
  }

  it('should guide through steps and show missing VIN with CTA', () => {
    cy.navigateAndWait('/postventa/wizard');

    // Start (creates case) with enhanced waiting
    cy.waitForElement('button:contains("Iniciar")').click();
    cy.waitForApiIdle();

    // Step 1: Placa (ok) with enhanced upload handling
    selectFirstFileWith('plate.jpg');
    cy.waitForElement(':contains("✅ Calidad suficiente")');

    // Next with enhanced waiting
    cy.waitForElement('button:contains("Siguiente")', 15000).click();
    cy.waitForApiIdle();

    // Step 2: VIN (simulate missing vin) with timeout handling
    cy.retryAction(() => {
      selectFirstFileWith('vin-novin.jpg');
      // Wait longer for VIN detection processing with potential timeout
      cy.waitForElement(':contains("⚠️ Falta calidad o datos clave")', 20000);
      cy.waitForElement(':contains("Falta: Vin")', { matchCase: false });
    }, 2);

    // Next with enhanced waiting
    cy.waitForElement('button:contains("Siguiente")', 15000).click();
    cy.waitForApiIdle();

    // Step 3: Odómetro (ok) with enhanced upload handling
    selectFirstFileWith('odometer.jpg');
    cy.waitForElement(':contains("✅ Calidad suficiente")');

    // Next with enhanced waiting
    cy.waitForElement('button:contains("Siguiente")', 15000).click();
    cy.waitForApiIdle();

    // Step 4: Evidencia (ok) with enhanced upload handling
    selectFirstFileWith('evidence.jpg');
    cy.waitForElement(':contains("✅ Calidad suficiente")');

    // Summary should warn and offer VIN CTA with enhanced waiting
    cy.waitForElement(':contains("Faltan elementos o calidad baja")');
    cy.waitForElement('button:contains("Tomar foto de VIN")').click();
    cy.waitForApiIdle();
    
    // Back on VIN step title with enhanced waiting
    cy.waitForElement(':contains("VIN plate")');
  });

  it('should complete with all three basics OK', () => {
    cy.navigateAndWait('/postventa/wizard');
    cy.waitForElement('button:contains("Iniciar")').click();
    cy.waitForApiIdle();

    // Plate ok with enhanced upload handling
    selectFirstFileWith('plate.jpg');
    cy.waitForElement(':contains("✅ Calidad suficiente")');
    cy.waitForElement('button:contains("Siguiente")').click();
    cy.waitForApiIdle();

    // VIN ok (no novin/low keywords) with retry for potential timeout
    cy.retryAction(() => {
      selectFirstFileWith('vin.jpg');
      cy.waitForElement(':contains("✅ Calidad suficiente")', 20000);
    }, 3);
    cy.waitForElement('button:contains("Siguiente")').click();
    cy.waitForApiIdle();

    // Odometer ok with enhanced upload handling
    selectFirstFileWith('odometer.jpg');
    cy.waitForElement(':contains("✅ Calidad suficiente")');
    cy.waitForElement('button:contains("Siguiente")').click();
    cy.waitForApiIdle();

    // Evidence ok with enhanced upload handling
    selectFirstFileWith('evidence.jpg');
    cy.waitForElement(':contains("✅ Calidad suficiente")');

    // Summary success with enhanced waiting
    cy.waitForElement(':contains("Caso listo: 3 básicos completos en el primer intento.")', 15000);
  });
});

