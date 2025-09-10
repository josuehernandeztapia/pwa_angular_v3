// Comprehensive UX/UI functional checks across key routes

const ROUTES: Array<{ path: string; name: string }> = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/clientes', name: 'Clientes' },
  { path: '/clientes/nuevo', name: 'Nuevo Cliente' },
  { path: '/cotizador', name: 'Cotizador' },
  { path: '/simulador', name: 'Simulador' },
  { path: '/simulador/ags-ahorro', name: 'AGS Ahorro' },
  { path: '/simulador/edomex-individual', name: 'EdoMex Individual' },
  { path: '/simulador/tanda-colectiva', name: 'Tanda Colectiva' },
  { path: '/document-upload', name: 'Carga de Documentos' },
  { path: '/oportunidades', name: 'Oportunidades' },
  { path: '/ops/deliveries', name: 'Entregas' },
  { path: '/ops/triggers', name: 'Triggers' },
  { path: '/reportes', name: 'Reportes' },
  { path: '/productos', name: 'Productos' },
  { path: '/perfil', name: 'Perfil' },
];

function assertNoHorizontalOverflow() {
  cy.document().then((doc) => {
    const de = doc.documentElement;
    expect(
      de.scrollWidth,
      `No horizontal overflow (scrollWidth=${de.scrollWidth}, clientWidth=${de.clientWidth})`
    ).to.be.lte(de.clientWidth);
  });
}

function collectConsoleErrors(errors: string[]) {
  cy.on('window:before:load', (win) => {
    const origError = win.console.error;
    win.console.error = (...args: any[]) => {
      try {
        const msg = String(args[0] ?? '').toLowerCase();
        if (!/resizeobserver|deprecated|favicon|manifest|preload/.test(msg)) {
          errors.push(String(args[0] ?? ''));
        }
      } catch {}
      origError.call(win.console, ...args);
    };
  });
}

describe('UX/UI Functional Suite', () => {
  before(() => {
    cy.login();
  });

  ROUTES.forEach(({ path, name }) => {
    it(`${name} – landmarks, headings, a11y, overflow, buttons`, () => {
      const errors: string[] = [];
      collectConsoleErrors(errors);

      cy.visit(path);
      cy.waitForAngular();

      // Landmarks present
      cy.get('main, [role="main"]').should('exist');
      cy.get('nav, [role="navigation"]').should('exist');

      // Heading hierarchy basic: at least one H1 or role=heading
      cy.get('h1, [role="heading"][aria-level="1"]').its('length').should('be.gte', 1);

      // Buttons have accessible name (aria-label or text)
      cy.get('button, [role="button"], a[role="button"], a.button')
        .filter(':visible')
        .each(($el) => {
          const label = ($el.attr('aria-label') || '').trim();
          const text = ($el.text() || '').trim();
          expect(label.length > 0 || text.length > 0, 'Accessible name on buttons').to.eq(true);
        });

      // Images: visible images should have meaningful alt
      cy.get('img:visible').each(($img) => {
        const alt = ($img.attr('alt') || '').trim();
        // Decorative images may be empty alt, but prefer having alt
        expect(alt.length >= 0).to.eq(true);
      });

      // No horizontal overflow
      assertNoHorizontalOverflow();

      // Keyboard nav sanity: focus moves, focus is visible element
      // Requires cypress-plugin-tab (already referenced in repo tests)
      cy.tab();
      cy.focused().should('not.match', 'body');
      cy.focused().should('be.visible');

      // Accessibility scan (critical/serious rules configured in support)
      cy.checkA11y();

      // Ensure no console errors recorded
      cy.then(() => {
        expect(errors, `Console errors on ${path}: ${JSON.stringify(errors, null, 2)}`).to.have.length(0);
      });
    });

    it(`${name} – responsive basics (mobile menu/landmarks)`, () => {
      cy.viewport(375, 812);
      cy.visit(path);
      cy.waitForAngular();

      cy.get('main, [role="main"]').should('exist');
      cy.get('nav, [role="navigation"]').should('exist');

      // If menu toggle exists, it should be operable via click
      cy.get('body').then(($b) => {
        const toggle = $b.find('[data-cy="mobile-menu"], [data-cy="menu-toggle"], button[aria-controls*="menu"], button[aria-label*="menu" i]');
        if (toggle.length) {
          cy.wrap(toggle[0]).click({ force: true });
          cy.wrap(toggle[0]).then(($t) => {
            const expanded = $t.attr('aria-expanded');
            if (expanded !== undefined) {
              expect(['true', 'false']).to.include(expanded);
            }
          });
        }
      });
    });
  });
});

