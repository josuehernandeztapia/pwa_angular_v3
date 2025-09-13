describe('AVI_LAB – Toggles and Basic Flow (smoke)', () => {
  const lab = Cypress.env('LAB_URL') || 'http://localhost:8080';

  it('shows Questions tab, lexicon toggles and Basic Info Flow', () => {
    cy.visit(`${lab}/index.html`);

    // Go to Questions tab
    cy.contains('button', 'Questions').click({ force: true });

    // Check toggles
    cy.get('#lexicons-enabled-toggle').should('exist');
    cy.get('#lexicon-plaza-select').should('exist');

    // Basic Info Flow button present
    cy.contains('button', 'Basic Info Flow').should('be.visible');
  });
});

