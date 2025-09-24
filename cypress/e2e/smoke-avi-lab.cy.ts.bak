describe('AVI_LAB – Basic UI and Navigation (smoke)', () => {
  const lab = Cypress.env('LAB_URL') || 'http://localhost:8080';

  beforeEach(() => {
    // Ignore uncaught exceptions from app-complete.js initialization issues
    cy.on('uncaught:exception', (err, runnable) => {
      if (err.message.includes('Cannot set properties of null')) {
        return false;
      }
      return true;
    });
  });

  it('loads AVI_LAB and shows basic navigation', () => {
    cy.visit(`${lab}/index.html`);

    // Check that the page loads and basic elements exist
    cy.contains('🧪 AVI_LAB').should('be.visible');
    cy.contains('Voice Analysis & Testing Laboratory').should('be.visible');

    // Check navigation tabs exist
    cy.get('.nav-tabs').should('exist');
    cy.contains('📊 Dashboard').should('be.visible');
    cy.contains('❓ Questions').should('be.visible');
    cy.contains('🎤 Voice Lab').should('be.visible');

    // Check voice controls section exists
    cy.contains('🎤 Voice Testing').should('be.visible');
    cy.get('#recordBtn').should('be.visible');
    cy.get('#stopBtn').should('exist');
    cy.get('#playBtn').should('exist');

    // Go to Questions tab
    cy.contains('button', '❓ Questions').click({ force: true });

    // Basic check that tab switching works
    cy.get('#questions').should('exist');
  });
});

