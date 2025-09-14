describe('Tanda Colectiva - Tooltips y métricas', () => {
  const demoUser = {
    id: '1', name: 'Asesor Demo', email: 'demo@conductores.com', role: 'asesor', permissions: []
  };

  beforeEach(() => {
    window.localStorage.setItem('auth_token', 'e2e_demo_token');
    window.localStorage.setItem('refresh_token', 'e2e_demo_refresh');
    window.localStorage.setItem('current_user', JSON.stringify(demoUser));
  });

  it('simula tanda y muestra tooltips en resultados', () => {
    cy.visit('/simulador/tanda-colectiva');

    cy.contains('Simular Tanda Colectiva').click();
    // Simulación tarda ~2s (setTimeout); espera hasta 5s
    cy.contains('Finanzas', { timeout: 8000 }).should('exist');

    // Te toca en mes con título
    cy.contains('Te toca en mes').invoke('attr', 'title').should('contain', 'T1');
    // Cobertura de deuda con título
    cy.contains('Cobertura de Deuda (PMT) con Inflow')
      .invoke('attr', 'title')
      .should('contain', 'Porcentaje del inflow');
  });
});

