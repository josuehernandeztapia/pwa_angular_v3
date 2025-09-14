describe('Simulador - Guardados + Comparador', () => {
  const demoUser = {
    id: '1',
    name: 'Asesor Demo',
    email: 'demo@conductores.com',
    role: 'asesor',
    permissions: ['read:clients', 'write:quotes', 'read:reports']
  };

  beforeEach(() => {
    // Seed auth
    window.localStorage.setItem('auth_token', 'e2e_demo_token');
    window.localStorage.setItem('refresh_token', 'e2e_demo_refresh');
    window.localStorage.setItem('current_user', JSON.stringify(demoUser));

    // Seed two saved simulations in localStorage
    const now = Date.now();
    const draft1 = {
      clientName: 'Caso A',
      market: 'aguascalientes',
      clientType: 'Individual',
      timestamp: now - 1000,
      scenario: { targetAmount: 799000, monthlyContribution: 6500, monthsToTarget: 10 }
    };
    const draft2 = {
      clientName: 'Caso B',
      market: 'edomex',
      clientType: 'Individual',
      timestamp: now,
      targetDownPayment: 150000,
      scenario: { targetAmount: 150000, monthlyContribution: 4500, monthsToTarget: 18 }
    };
    window.localStorage.setItem(`agsScenario-${now - 1000}-draft`, JSON.stringify(draft1));
    window.localStorage.setItem(`edomex-individual-${now}-draft`, JSON.stringify(draft2));
  });

  it('permite abrir modo comparación y ver el modal con 2 escenarios', () => {
    cy.visit('/simulador');

    // Open comparison controls
    cy.get('[data-cy="comparison-controls"]').should('exist');
    cy.get('[data-cy="toggle-compare"]').click();

    // Select first two simulation cards' checkboxes
    cy.get('.comparison-checkbox input[type="checkbox"]').eq(0).check({ force: true });
    cy.get('.comparison-checkbox input[type="checkbox"]').eq(1).check({ force: true });

    // Open comparison modal
    cy.get('[data-cy="open-comparison"]').click();
    cy.get('[data-cy="comparison-modal"]').should('exist');
  });
});

