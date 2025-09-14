describe('Cotizador - Summary and Insurance', () => {
  const demoUser = {
    id: '1',
    name: 'Asesor Demo',
    email: 'demo@conductores.com',
    role: 'asesor',
    permissions: ['read:clients', 'write:quotes', 'read:reports']
  };

  beforeEach(() => {
    window.localStorage.setItem('auth_token', 'e2e_demo_token');
    window.localStorage.setItem('refresh_token', 'e2e_demo_refresh');
    window.localStorage.setItem('current_user', JSON.stringify(demoUser));
  });

  it('configures context, shows summary, toggles insurance', () => {
    cy.visit('/cotizador');

    // Select market and client type
    cy.get('#market').select('Aguascalientes');
    cy.get('#clientType').select('Individual');

    // Wait for summary to appear
    cy.get('[data-cy="cotizador-summary"]').should('exist');
    cy.get('[data-cy="sum-precio"]').should('exist');
    cy.get('[data-cy="sum-enganche"]').should('exist');
    cy.get('[data-cy="sum-financiar"]').should('exist');
    cy.get('[data-cy="sum-pmt"]').should('exist');

    // Toggle insurance financed and validate amount to finance increases
    cy.get('[data-cy="sum-financiar"]').invoke('text').then((baseText) => {
      const base = Number(baseText.replace(/[^0-9.]/g, ''));
      cy.get('[data-cy="toggle-insurance"]').check({ force: true });
      cy.get('[data-cy="insurance-amount"]').clear().type('10000');
      cy.get('[data-cy="ins-financiado"]').check({ force: true });
      cy.get('[data-cy="sum-financiar"]').invoke('text').then((afterText) => {
        const after = Number(afterText.replace(/[^0-9.]/g, ''));
        expect(after).to.be.greaterThan(base);
      });
    });

    // Calculate amortization
    cy.get('[data-cy="calc-amort"]').click();
    cy.contains('Tabla de amortización').should('exist');
  });
});

