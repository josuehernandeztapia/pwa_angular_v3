describe('Protección - Tooltips y escenarios', () => {
  const demoUser = {
    id: '1', name: 'Asesor Demo', email: 'demo@conductores.com', role: 'asesor', permissions: []
  };

  beforeEach(() => {
    window.localStorage.setItem('auth_token', 'e2e_demo_token');
    window.localStorage.setItem('refresh_token', 'e2e_demo_refresh');
    window.localStorage.setItem('current_user', JSON.stringify(demoUser));
  });

  it('calcula escenarios y muestra tooltips', () => {
    cy.visit('/proteccion');
    // Click calcular escenarios (form usa defaults válidos)
    cy.contains('Calcular Escenarios').click();

    // Espera que aparezca al menos un escenario
    cy.get('.scenario-card').should('exist');
    // Tooltips presentes
    cy.get('[data-cy="tip-pmt"]').should('exist');
    cy.get('[data-cy="tip-term"]').should('exist');
    cy.get('[data-cy="tip-irr"]').should('exist');
  });
});

