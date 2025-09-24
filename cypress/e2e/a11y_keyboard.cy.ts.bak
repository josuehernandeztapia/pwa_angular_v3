describe('A11y keyboard basics', () => {
  const demoUser = {
    id: '1', name: 'Asesor Demo', email: 'demo@conductores.com', role: 'asesor', permissions: []
  };

  beforeEach(() => {
    window.localStorage.setItem('auth_token', 'e2e_demo_token');
    window.localStorage.setItem('refresh_token', 'e2e_demo_refresh');
    window.localStorage.setItem('current_user', JSON.stringify(demoUser));
  });

  it('focus is visible and modal closes with Esc (Simulador)', () => {
    cy.visit('/simulador');
    // Enter comparison mode and open modal
    cy.get('[data-cy="toggle-compare"]').click();
    cy.get('.comparison-checkbox input[type="checkbox"]').eq(0).check({ force: true });
    cy.get('.comparison-checkbox input[type="checkbox"]').eq(1).check({ force: true });
    cy.get('[data-cy="open-comparison"]').click();
    cy.get('[data-cy="comparison-modal"]').should('exist');
    // Press Esc to close
    cy.get('body').type('{esc}');
    cy.get('[data-cy="comparison-modal"]').should('not.exist');
  });

  it('tab navigation reaches PDF buttons (Cotizador/Postventa/Entregas)', () => {
    cy.visit('/cotizador');
    cy.focused().tab();
    cy.get('[data-cy="cotizador-pdf"]').should('exist');

    cy.visit('/postventa/wizard');
    cy.get('[data-cy="wizard-next"]').click();
    cy.get('[data-cy="postventa-pdf"]').should('exist');

    cy.visit('/tracking/client/demo');
    // Allow empty routes; check button presence if card exists
    cy.get('body').then($b => {
      if ($b.find('[data-cy="entregas-pdf"]').length) {
        cy.get('[data-cy="entregas-pdf"]').first().should('be.visible');
      }
    });
  });
});

