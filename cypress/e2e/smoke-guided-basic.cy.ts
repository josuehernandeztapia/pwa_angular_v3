describe('MAIN – Guided Basic Info (smoke)', () => {
  const base = Cypress.env('APP_URL') || 'http://localhost:4200';

  it('shows Guided Básicas (6) and starts flow', () => {
    cy.visit(base);

    // Find and click the guided button
    cy.contains('button', 'Guided Básicas').should('be.visible').click();

    // Progress header should show "Pregunta X de 6"
    cy.contains('Pregunta').should('be.visible');
    cy.contains('de 6').should('exist');

    // Audio indicator present
    cy.get('.audio-indicator').should('exist');
  });
});

