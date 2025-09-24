import { test, expect, Page } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

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
    performance.now = () => originalPerfNow() - originalPerfNow() + 0;
  }, fixedNow);
}

async function freezeRandom(page: Page) {
  await page.addInitScript(() => {
    let seed = 12345;
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

async function applyAntiFlakyStyles(page: Page) {
  await page.addStyleTag({
    content: `
      html, body, * { scroll-behavior: auto !important; }
      *::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none !important; }
      * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      input, textarea, [contenteditable="true"] { caret-color: transparent !important; }
      [data-dynamic], time, .counter, .loading, canvas, video { visibility: hidden !important; }
    `,
  });
}

async function detectHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const de = document.documentElement;
    return { sw: de.scrollWidth, cw: de.clientWidth };
  });
  expect(overflow.sw <= overflow.cw, `Horizontal overflow (scrollWidth=${overflow.sw}, clientWidth=${overflow.cw})`).toBeTruthy();
}

async function discoverRoutes(page: Page, startPaths: string[], max = 20): Promise<string[]> {
  const discovered = new Set<string>(startPaths);
  for (const path of [...discovered]) {
    await page.goto(path, { waitUntil: 'networkidle' });
    const hrefs = await page.$$eval('a[href^="/"]', as => as.map(a => (a as HTMLAnchorElement).getAttribute('href') || '').filter(Boolean));
    for (const href of hrefs) {
      if (href.startsWith('/') && !href.includes('#') && !href.includes('..')) {
        discovered.add(href);
      }
    }
    if (discovered.size >= max) break;
  }
  return Array.from(discovered).slice(0, max);
}

test.describe('UX Sweep (visual + a11y + layout)', () => {
  test('crawl core routes, check a11y and take snapshots', async ({ page }, testInfo) => {
    // Seed routes to ensure coverage even if there are few links on /
    const seedRoutes = [
      '/',
      '/dashboard',
      '/clientes',
      '/clientes/nuevo',
      '/cotizador',
      '/simulador',
      '/simulador/ags-ahorro',
      '/simulador/edomex-individual',
      '/simulador/tanda-colectiva',
      '/document-upload',
      '/oportunidades',
      '/ops/deliveries',
      '/ops/triggers',
      '/reportes',
      '/productos',
      '/perfil',
    ];

    // Auth + stability hooks
    await mockAuth(page);
    await freezeTime(page);
    await freezeRandom(page);

    // Discover more from '/'
    const routes = await discoverRoutes(page, seedRoutes, 20);

    // Collect console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const t = msg.text().toLowerCase();
        if (!/resizeobserver|favicon|manifest|preload/.test(t)) errors.push(msg.text());
      }
    });

    for (const path of routes) {
      await test.step(`Route ${path}`, async () => {
        await page.goto(path, { waitUntil: 'networkidle' });
        await page.waitForLoadState('domcontentloaded');
        await applyAntiFlakyStyles(page);

        // Basic presence
        await expect(page.locator('main, [role="main"], .premium-container').first()).toBeVisible({ timeout: 15000 });

        // Accessibility (critical/serious)
        await injectAxe(page);
        await checkA11y(page, undefined, {
          includedImpacts: ['critical', 'serious'],
        });

        // Layout sanity
        await detectHorizontalOverflow(page);

        // Snapshot
        const name = `ux-sweep${path.replace(/\//g, '_') || '_root'}`;
        await expect(page).toHaveScreenshot(`${name}.png`, {
          animations: 'disabled',
          caret: 'hide',
          fullPage: true,
        });
      });
    }

    // Assert no console errors across the sweep
    expect(errors, `Console errors: ${JSON.stringify(errors, null, 2)}`).toHaveLength(0);
  });
});

