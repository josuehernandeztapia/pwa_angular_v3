import { test, expect, Page } from '@playwright/test';

const DEMO_USER = {
  email: 'demo@conductores.com',
  password: 'demo123'
};

async function login(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('input[type="email"]').fill(DEMO_USER.email);
  await page.locator('input[type="password"]').fill(DEMO_USER.password);
  await page.locator('button:has-text("Acceder al Cockpit")').click();
  await page.waitForLoadState('networkidle');
}

function installOnlineControls(page: Page) {
  return page.addInitScript(() => {
    const w = window as any;
    w.__forceOnlineState = true;
    w.__setOnlineState = (value: boolean) => {
      w.__forceOnlineState = value;
      window.dispatchEvent(new Event(value ? 'online' : 'offline'));
    };

    try {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get() {
          return w.__forceOnlineState;
        }
      });
    } catch {
      // ignore if property is not configurable
    }
  });
}

test.describe('Offline queue banner', () => {
  test.beforeEach(async ({ page }) => {
    await installOnlineControls(page);
  });

  test('displays pending banner and clears after flush', async ({ page }) => {
    await login(page);
    await page.goto('/cotizador');
    await page.waitForLoadState('networkidle');

    await page.waitForFunction(() => typeof window !== 'undefined' && !!(window as any).__offlineService);

    // Ensure clean state
    await page.evaluate(() => {
      const offline = (window as any).__offlineService;
      offline.clearPendingRequests('test-setup');
    });

    let flushCalls = 0;
    await page.route('**/cotizador/offline-demo', route => {
      flushCalls++;
      route.fulfill({ status: 200, body: '{}', contentType: 'application/json' });
    });

    await page.evaluate(() => {
      const offline = (window as any).__offlineService;
      offline.storeOfflineRequest('/cotizador/offline-demo', 'POST', { demo: true });
    });

    const banner = page.locator('.offline-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('pendientes de sincronizar');

    await page.evaluate(() => (window as any).__setOnlineState?.(true));
    await page.evaluate(() => (window as any).__offlineService.flushQueueNow());

    await expect.poll(() => flushCalls).toBeGreaterThan(0);
    await expect(banner.locator('.offline-banner__message--success')).toHaveText(/Sincronizamos la cola/);
  });
});
