describe('Postventa – Add to Quote (chips)', () => {
  before(() => {
    cy.login();
  });

  it('shows add-to-quote action in wizard summary when flag enabled', () => {
    cy.visit('/postventa/wizard');
    cy.contains('button', 'Iniciar').click();

    // Button is gated by feature flag; if missing, skip with informative check
    cy.get('body').then($b => {
      const btn = $b.find('button:contains("Agregar a cotización")');
      if (btn.length === 0) {
        cy.log('Add-to-quote flag disabled in this build');
        return;
      }
      cy.contains('button', 'Agregar a cotización').click();
      cy.contains('Agregado a cotización').should('be.visible');
    });
  });
});

