import { expect, Page, test } from '@playwright/test';

async function mockAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'demo_jwt_token_' + Date.now());
    localStorage.setItem('refresh_token', 'demo_refresh_token_' + Date.now());
    localStorage.setItem('current_user', JSON.stringify({ id: '1', name: 'Asesor Demo', email: 'demo@conductores.com', role: 'asesor', permissions: [] }));
  });
}

async function freezeTime(page: Page, isoTimestamp = '2025-01-15T12:00:00.000Z') {
  const fixedNow = new Date(isoTimestamp).valueOf();
  await page.addInitScript((now) => {
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
    // @ts-ignore
    window.requestAnimationFrame = (cb: Function) => setTimeout(() => cb(0), 16);
  });
}

test.describe('@productos Catálogo de Productos visual states', () => {
  test('loading state snapshot (placeholder, sin CLS)', async ({ page }) => {
    await mockAuth(page);
    await freezeTime(page);
    await freezeRandom(page);
    await page.goto('/productos');
    await page.getByRole('heading', { level: 1 }).first().waitFor();
    // Espera breve menor al delay de 600ms del servicio para capturar loading
    await page.waitForTimeout(100);
    const loading = page.getByRole('status', { name: /Cargando catálogo/i });
    await expect(loading).toBeVisible();
    await expect(page).toHaveScreenshot();
  });

  test('data state snapshot (con resultados)', async ({ page }) => {
    await mockAuth(page);
    await freezeTime(page);
    await freezeRandom(page);
    await page.goto('/productos', { waitUntil: 'domcontentloaded' });
    // Esperar a que cargue el grid
    await page.locator('.productos-grid .producto-card').first().waitFor();
    await expect(page).toHaveScreenshot();
  });

  test('empty state snapshot (sin resultados) y limpiar filtros', async ({ page }) => {
    await mockAuth(page);
    await freezeTime(page);
    await freezeRandom(page);
    await page.goto('/productos');
    await page.locator('.productos-grid').waitFor();
    // Combinar filtros que no existan: AGS + Colectivo
    await page.getByRole('button', { name: /Aguascalientes/i }).click();
    await page.getByRole('button', { name: /Crédito Colectivo/i }).click();
    await expect(page.getByRole('heading', { name: /Sin resultados/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Limpiar filtros/i })).toBeVisible();
    await expect(page).toHaveScreenshot();
  });
});

