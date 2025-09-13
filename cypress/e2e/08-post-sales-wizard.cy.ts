describe('Postventa – Wizard 4 fotos (stubbed)', () => {
  before(() => {
    cy.login();
  });

  function selectFirstFileWith(name: string) {
    const fileName = name;
    const mimeType = 'image/jpeg';
    cy.get('.step-card').eq(0).find('input[type="file"]').then($inputs => {
      if ($inputs.length) {
        cy.wrap($inputs[0]).selectFile({
          contents: 'fake-binary-content',
          fileName,
          mimeType
        }, { force: true });
      }
    });
  }

  it('should guide through steps and show missing VIN with CTA', () => {
    cy.visit('/postventa/wizard');
    cy.waitForAngular();

    // Start (creates case)
    cy.contains('button', 'Iniciar').click();

    // Step 1: Placa (ok)
    selectFirstFileWith('plate.jpg');
    cy.contains('✅ Calidad suficiente').should('be.visible');

    // Next
    cy.contains('button', 'Siguiente').click();

    // Step 2: VIN (simulate missing vin)
    selectFirstFileWith('vin-novin.jpg');
    cy.contains('⚠️ Falta calidad o datos clave').should('be.visible');
    cy.contains('Falta: Vin', { matchCase: false }).should('be.visible');

    // Next
    cy.contains('button', 'Siguiente').click();

    // Step 3: Odómetro (ok)
    selectFirstFileWith('odometer.jpg');
    cy.contains('✅ Calidad suficiente').should('be.visible');

    // Next
    cy.contains('button', 'Siguiente').click();

    // Step 4: Evidencia (ok)
    selectFirstFileWith('evidence.jpg');
    cy.contains('✅ Calidad suficiente').should('be.visible');

    // Summary should warn and offer VIN CTA
    cy.contains('Faltan elementos o calidad baja').should('be.visible');
    cy.contains('button', 'Tomar foto de VIN').click();
    // Back on VIN step title
    cy.contains('VIN plate').should('be.visible');
  });

  it('should complete with all three basics OK', () => {
    cy.visit('/postventa/wizard');
    cy.waitForAngular();
    cy.contains('button', 'Iniciar').click();

    // Plate ok
    selectFirstFileWith('plate.jpg');
    cy.contains('✅ Calidad suficiente').should('be.visible');
    cy.contains('button', 'Siguiente').click();

    // VIN ok (no novin/low keywords)
    selectFirstFileWith('vin.jpg');
    cy.contains('✅ Calidad suficiente').should('be.visible');
    cy.contains('button', 'Siguiente').click();

    // Odometer ok
    selectFirstFileWith('odometer.jpg');
    cy.contains('✅ Calidad suficiente').should('be.visible');
    cy.contains('button', 'Siguiente').click();

    // Evidence ok
    selectFirstFileWith('evidence.jpg');
    cy.contains('✅ Calidad suficiente').should('be.visible');

    // Summary success
    cy.contains('Caso listo: 3 básicos completos en el primer intento.').should('be.visible');
  });
});

