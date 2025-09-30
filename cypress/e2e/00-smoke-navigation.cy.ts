// High-level smoke navigation to validate pages render and CTAs are interactive

const routes: Array<{ path: string; label: string }> = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/nueva-oportunidad', label: 'Nueva Oportunidad' },
  { path: '/clientes', label: 'Clientes' },
  { path: '/clientes/nuevo', label: 'Nuevo Cliente' },
  { path: '/cotizador', label: 'Cotizador' },
  { path: '/simulador', label: 'Simulador' },
  { path: '/simulador/ags-ahorro', label: 'Simulador AGS Ahorro' },
  { path: '/simulador/edomex-individual', label: 'Simulador EdoMex Individual' },
  { path: '/simulador/tanda-colectiva', label: 'Tanda Colectiva' },
  { path: '/document-upload', label: 'Carga de Documentos' },
  { path: '/oportunidades', label: 'Oportunidades' },
  { path: '/ops/deliveries', label: 'Entregas' },
  { path: '/ops/triggers', label: 'Triggers' },
  { path: '/reportes', label: 'Reportes' },
  { path: '/productos', label: 'Productos' },
  { path: '/perfil', label: 'Perfil' },
];

describe('Smoke Navigation (visual + functional)', () => {
  before(() => {
    // Authenticate via UI helper
    cy.login();
  });

  it('navigates core routes and interacts with primary CTAs', () => {
    // Track console errors per route
    const errors: Array<{ route: string; message: string }> = [];
    cy.on('window:before:load', (win) => {
      const origError = win.console.error;
      win.console.error = (...args: any[]) => {
        try { errors.push({ route: win.location.pathname, message: String(args[0]) }); } catch {}
        origError.call(win.console, ...args);
      };
    });

    routes.forEach(({ path, label }) => {
      cy.log(`Visiting ${label} (${path})`);
      cy.visit(path);
      cy.waitForAngular();
      cy.wait(200); // allow lazy components to attach

      // Page renders
      cy.get('body').should('be.visible');
      // Container exists (Minimal Dark)
      cy.get('main, [role="main"], .card').should('exist');

      // Try safe interactions: click non-destructive CTAs if present
      // Prefer data-cy primary actions
      const safeButtonSelector = [
        '[data-cy^="action-"]',
        '[data-cy*="btn"]',
        'button[type="button"]',
        'a.button, button.button',
      ].join(',');

      // Avoid destructive actions by text
      const destructive = /(eliminar|borrar|remover|delete|remove)/i;

      cy.get('body').then($body => {
        const $btns = $body.find(safeButtonSelector).filter((_, el) => {
          const txt = (el.textContent || '').trim();
          return txt.length > 0 && !destructive.test(txt);
        });

        if ($btns.length > 0) {
          cy.wrap($btns[0]).click({ force: true });
          // UI remains responsive
          cy.get('body').should('be.visible');
        }
      });

      // Scroll to bottom and back as a basic UX check
      cy.scrollTo('bottom', { ensureScrollable: false });
      cy.wait(50);
      cy.scrollTo('top', { ensureScrollable: false });
    });

    // Ensure no console errors were recorded during navigation
    cy.then(() => {
      const critical = errors.filter(e => !/ResizeObserver|deprecated/i.test(e.message));
      expect(critical, `Console errors: ${JSON.stringify(critical, null, 2)}`).to.have.length(0);
    });
  });
});

