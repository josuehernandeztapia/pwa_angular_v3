describe('GNV T+1 — Panel salud por estación', () => {
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
  });

  it('muestra tabla con semáforos y descargas', () => {
    cy.visit('/ops/gnv-health');

    // Downloads visible
    cy.get('[data-cy="dl-template"]').should('exist');
    cy.get('[data-cy="dl-guide"]').should('exist');

    // Table loads and has at least one row
    cy.get('table.health-table tbody tr').its('length').should('be.greaterThan', 0);

    // Expect at least one green, one yellow, and one red status from stub CSV
    cy.get('[data-cy="status-green"]').should('exist');
    cy.get('[data-cy="status-yellow"]').should('exist');
    cy.get('[data-cy="status-red"]').should('exist');
  });
});

