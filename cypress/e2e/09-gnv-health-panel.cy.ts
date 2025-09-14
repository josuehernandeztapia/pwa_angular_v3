describe('GNV Health Panel (T+1)', () => {
  before(() => {
    cy.login();
  });

  it('loads the panel and shows controls', () => {
    cy.visit('/ops/gnv-health');
    cy.contains('GNV').should('be.visible');
    cy.get('input[type="date"]').should('exist');
    cy.get('a').filter('[href*="template.csv"], [href*="guide.pdf"]').should('have.length.gte', 1);
  });

  it('renders stations when enabled or shows disabled message', () => {
    cy.visit('/ops/gnv-health');
    cy.get('body').then($b => {
      const hasCards = $b.find('.station-card').length > 0;
      if (hasCards) {
        cy.get('.station-card').should('have.length.gte', 1);
        cy.get('.station-card .status .dot').first().should('be.visible');
      } else {
        cy.contains('Integración GNV desactivada').should('be.visible');
      }
    });
  });
});

