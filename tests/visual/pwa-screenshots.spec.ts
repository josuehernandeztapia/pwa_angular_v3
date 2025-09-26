// @ts-nocheck
import { Page, test } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';
const SCREEN_DIR = 'tests/visual/screenshots';

async function tryLoginIfPossible(page: Page): Promise<void> {
  // Try to detect common login fields/buttons without failing the test if missing
  const emailLocator = page.locator([
    'input[name="email"]',
    'input[type="email"]',
    'input[autocomplete="username"]',
    '[data-testid="email"]',
    '[data-testid="usuario"]',
    'input[name="usuario"]',
    'input[name="user"]',
    'input[name="username"]',
  ].join(', '));

  const passwordLocator = page.locator([
    'input[type="password"]',
    'input[name="password"]',
    '[data-testid="password"]',
    '[data-testid="contraseña"]',
  ].join(', '));

  const loginButton = page.getByRole('button', { name: /iniciar sesión|acceder|entrar|login|ingresar/i });

  const emailFieldExists = await emailLocator.first().count().then((count: number) => count > 0).catch(() => false);
  const passwordFieldExists = await passwordLocator.first().count().then((count: number) => count > 0).catch(() => false);

  if (!emailFieldExists || !passwordFieldExists) {
    return; // Can't detect a login form; skip silently
  }

  const username = process.env.PWA_USER || process.env.PLAYWRIGHT_USER || 'test@example.com';
  const password = process.env.PWA_PASS || process.env.PLAYWRIGHT_PASS || 'password';

  try {
    await emailLocator.first().fill(username, { timeout: 2000 });
    await passwordLocator.first().fill(password, { timeout: 2000 });
    if (await loginButton.count().then((count: number) => count > 0)) {
      await loginButton.first().click({ timeout: 2000 });
    } else {
      // Fallback: submit the form by pressing Enter in password field
      await passwordLocator.first().press('Enter');
    }
    // Give the app a moment to navigate/render after login
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  } catch {
    // Best-effort login only
  }
}

test.beforeAll(async () => {
  if (!fs.existsSync(SCREEN_DIR)) {
    fs.mkdirSync(SCREEN_DIR, { recursive: true });
  }
});

// Run serially to avoid state overlap (e.g., offline toggling)
test.describe.configure({ mode: 'serial' });

test('login.png → pantalla de Login', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: `${SCREEN_DIR}/login.png`, fullPage: true });
});

test('dashboard.png → Dashboard tras login', async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await tryLoginIfPossible(page);
  // Prefer a dashboard URL if the app navigates there
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SCREEN_DIR}/dashboard.png`, fullPage: true });
});

test('cotizador.png → Pantalla de Cotizador', async ({ page }) => {
  await page.goto(`${BASE_URL}/cotizador`, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: `${SCREEN_DIR}/cotizador.png`, fullPage: true });
});

test('onboarding.png → Paso de Onboarding', async ({ page }) => {
  await page.goto(`${BASE_URL}/onboarding`, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: `${SCREEN_DIR}/onboarding.png`, fullPage: true });
});

test('perfil.png → Pantalla de Perfil del usuario', async ({ page }) => {
  await page.goto(`${BASE_URL}/perfil`, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.screenshot({ path: `${SCREEN_DIR}/perfil.png`, fullPage: true });
});

test('offline.png → Estado Offline', async ({ page, context }) => {
  await page.goto(BASE_URL, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

  await context.setOffline(true);
  // Wait until the browser reports offline; optional UI indicator may appear afterwards
  await page.waitForFunction(() => !navigator.onLine, { timeout: 5000 }).catch(() => {});
  // Try to wait for a visible offline hint if the app provides one, but don't fail if not
  await page.waitForFunction(() => {
    const text = document.body?.innerText || '';
    return /offline|sin conexión|desconectado/i.test(text);
  }, { timeout: 2000 }).catch(() => {});

  await page.screenshot({ path: `${SCREEN_DIR}/offline.png`, fullPage: true });

  await context.setOffline(false);
  await page.waitForFunction(() => navigator.onLine, { timeout: 5000 }).catch(() => {});
});

