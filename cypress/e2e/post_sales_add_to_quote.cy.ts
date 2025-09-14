describe('Postventa - Chips Agregar a Cotización (dev-only)', () => {
  const demoUser = {
    id: '1',
    name: 'Asesor Demo',
    email: 'demo@conductores.com',
    role: 'asesor',
    permissions: ['read:clients', 'write:quotes', 'read:reports']
  };

  beforeEach(() => {
    // Seed auth to bypass AuthGuard
    window.localStorage.setItem('auth_token', 'e2e_demo_token');
    window.localStorage.setItem('refresh_token', 'e2e_demo_refresh');
    window.localStorage.setItem('current_user', JSON.stringify(demoUser));
  });

  it('muestra chips y agrega artículos a la cotización provisional', () => {
    cy.visit('/postventa/wizard');

    // Iniciar caso para que aparezca el summary
    cy.get('[data-cy="wizard-next"]').click();

    // Chips visibles
    cy.get('[data-cy="parts-suggested"]').should('exist');

    // Leer conteo inicial
    cy.get('[data-cy="quote-draft-summary"]').invoke('text').then((text1) => {
      const match1 = text1.match(/(\d+)/);
      const initial = match1 ? parseInt(match1[1], 10) : 0;

      // Agregar primer chip
      cy.get('[data-cy^="add-"]').first().click();

      // Verificar incremento
      cy.get('[data-cy="quote-draft-summary"]').invoke('text').then((text2) => {
        const match2 = text2.match(/(\d+)/);
        const after = match2 ? parseInt(match2[1], 10) : 0;
        expect(after).to.eq(initial + 1);
      });
    });
  });
});

