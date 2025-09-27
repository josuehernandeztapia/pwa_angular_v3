describe('Functional Parity Smoke (NO-UX)', () => {
  it('loads /perfil when authenticated', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('asesor@conductores.com');
    cy.get('input[type="password"]').type('demo123');
    cy.contains('Iniciar Sesión').click();
    cy.url({ timeout: 20000 }).should('include', '/dashboard');
    cy.visit('/perfil');
    cy.contains('Mi Perfil');
  });

  it('loads /flow-builder when flag enabled', () => {
    cy.visit('/flow-builder');
    cy.contains('Flow Builder');
  });

  it('LAB routes honor RoleGuard (admin)', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').clear().type('admin@conductores.com');
    cy.get('input[type="password"]').clear().type('admin123');
    cy.contains('Iniciar Sesión').click();
    cy.url({ timeout: 20000 }).should('include', '/dashboard');
    cy.visit('/lab/tanda-enhanced');
    cy.location('pathname', { timeout: 10000 }).should('include', '/lab/tanda-enhanced');
  });

  it('postventa wizard route loads when flag enabled', () => {
    cy.visit('/postventa/wizard');
    cy.contains('Postventa');
  });
});

