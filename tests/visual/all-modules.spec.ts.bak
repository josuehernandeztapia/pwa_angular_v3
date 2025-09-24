import { expect, Page, test } from 'playwright/test';

async function applyAntiFlakyStyles(page: Page) {
  await page.addStyleTag({
    content: `
      html, body, * { scroll-behavior: auto !important; }
      *::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
      * { scrollbar-width: none !important; -ms-overflow-style: none !important; caret-color: transparent !important; }
      input, textarea, [contenteditable="true"] { caret-color: transparent !important; }
      [data-dynamic], time, .counter, .loading, canvas, video { visibility: hidden !important; }
    `,
  });
}

function dynamicMasks(scope: Page | ReturnType<Page['locator']>) {
  // Return locators for elements that frequently change visually
  const s: any = (scope as any);
  return [
    s.locator('[data-dynamic]'),
    s.locator('time'),
    s.locator('.counter'),
    s.locator('.loading'),
    s.locator('canvas'),
    s.locator('video'),
  ];
}

async function mockAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'demo_jwt_token_' + Date.now());
    localStorage.setItem('refresh_token', 'demo_refresh_token_' + Date.now());
    localStorage.setItem('current_user', JSON.stringify({ id: '1', name: 'Asesor Demo', email: 'demo@conductores.com', role: 'asesor', permissions: [] }));
  });
}

async function freezeTime(page: Page, isoTimestamp = '2025-01-15T12:00:00.000Z') {
  const fixedNow = new Date(isoTimestamp).valueOf();
  await page.addInitScript((now: number) => {
    const OriginalDate = Date as unknown as typeof Date;
    class MockDate extends (OriginalDate as any) {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(now);
        } else {
          super(...args);
        }
      }
      static now() { return now; }
    }
    // @ts-ignore
    window.Date = MockDate;
    const originalPerfNow = performance.now.bind(performance);
    const start = now;
    // Freeze performance.now within a small jitterless window
    performance.now = () => originalPerfNow() - originalPerfNow() + 0;
  }, fixedNow);
}

async function freezeRandom(page: Page) {
  await page.addInitScript(() => {
    let seed = 42;
    function mulberry32(a: number) {
      return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }
    }
    const rand = mulberry32(seed);
    Math.random = () => rand();
    // Stabilize requestAnimationFrame
    // @ts-ignore
    window.requestAnimationFrame = (cb: Function) => setTimeout(() => cb(0), 16);
  });
}

const routes = [
  { path: '/dashboard', tag: '@dashboard', heading: '📊' },
  { path: '/nueva-oportunidad', tag: '@nueva-oportunidad', heading: '➕ Nueva Oportunidad' },
  { path: '/clientes', tag: '@clientes-list', heading: '👥 Gestión de Clientes' },
  { path: '/clientes/nuevo', tag: '@cliente-form', heading: '🧾' },
  { path: '/cotizador', tag: '@cotizador-main', heading: '🧮 Simulador de Soluciones' },
  { path: '/cotizador/ags-individual', tag: '@ags-individual', heading: 'AGS' },
  { path: '/cotizador/edomex-colectivo', tag: '@edomex-colectivo', heading: 'EdoMex' },
  { path: '/simulador', tag: '@simulador-main', heading: 'Simulador' },
  { path: '/simulador/ags-ahorro', tag: '@ags-ahorro', heading: 'Ahorro' },
  { path: '/simulador/edomex-individual', tag: '@edomex-individual', heading: 'Edomex' },
  { path: '/simulador/tanda-colectiva', tag: '@tanda-colectiva', heading: 'Tanda' },
  { path: '/onboarding', tag: '@onboarding', heading: 'Configuración Inicial' },
  { path: '/document-upload', tag: '@document-upload', heading: 'Carga de Documentos' },
  { path: '/oportunidades', tag: '@opportunities', heading: 'Pipeline' },
  { path: '/expedientes', tag: '@expedientes', heading: '📂 Expedientes' },
  { path: '/ops/deliveries', tag: '@ops-deliveries', heading: 'Entregas' },
  { path: '/ops/triggers', tag: '@triggers', heading: '🎯 Monitor de Triggers Automáticos' },
  { path: '/reportes', tag: '@reportes', heading: 'Reportes' },
  { path: '/productos', tag: '@productos', heading: 'Productos' },
  { path: '/proteccion', tag: '@proteccion', heading: '🛡️ Sistema de Protección' },
  { path: '/perfil', tag: '@perfil', heading: 'Perfil' },
];

test.describe('Premium visual across modules', () => {
  for (const r of routes) {
    test(`${r.tag} should render premium container and take snapshot`, async ({ page }: { page: Page }) => {
      await mockAuth(page);
      await freezeTime(page);
      await freezeRandom(page);
      await page.goto(r.path, { waitUntil: 'networkidle' });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle');
      // Extra wait for heavy lazy modules
      if (r.tag === '@triggers') {
        await page.waitForSelector('h1', { timeout: 15000 });
      }
      // Check that a container exists and has background applied
      const container = page.locator('div[class*="container"], .premium-container');
      await expect(container.first()).toBeVisible({ timeout: 15000 });
      await applyAntiFlakyStyles(page);
      // Basic header presence if known
      if (r.heading) {
        const heading = page.locator('h1, h2, [role="heading"][aria-level="1"], [role="heading"][aria-level="2"]');
        await expect(heading.first()).toBeVisible({ timeout: 5000 });
      }
      const stableContainer = container.first();
      await expect(stableContainer).toHaveScreenshot({
        animations: 'disabled',
        caret: 'hide',
      });
    });
  }
});

