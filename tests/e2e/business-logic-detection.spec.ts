import { expect, test, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join('test-results', 'business-logic');
const ADMIN_USER = { email: 'admin@conductores.com', password: 'admin123' } as const;
const AUTH_BYPASS = {
  token: 'testing-bypass-token',
  refreshToken: 'testing-bypass-refresh',
  user: {
    id: 'testing-bypass-user',
    name: 'QA Automation User',
    email: 'qa.automation@conductores.com',
    role: 'asesor',
    permissions: [
      'dashboard:view',
      'clients:view',
      'quotes:create',
      'documents:upload',
      'postventa:manage'
    ]
  }
} as const;
const AGS_ANNUAL_RATE = 0.255;
const EDOMEX_ANNUAL_RATE = 0.299;

async function ensureArtifactsDir(): Promise<void> {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
}

async function applyAuthBypass(page: Page, emailOverride?: string): Promise<void> {
  await page.evaluate(({ auth, email }) => {
    const user = { ...auth.user, email };
    localStorage.setItem('auth_token', auth.token);
    localStorage.setItem('refresh_token', auth.refreshToken);
    localStorage.setItem('current_user', JSON.stringify(user));
    localStorage.setItem('rememberLogin', 'true');
    localStorage.setItem('rememberMe', 'true');
  }, { auth: AUTH_BYPASS, email: emailOverride ?? AUTH_BYPASS.user.email });
}

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForSelector('[data-cy="login-email"]', { state: 'visible' });
  await page.evaluate(() => localStorage.clear());

  const adminDemoButton = page
    .locator('[data-cy^="demo-user"]')
    .filter({ hasText: 'admin@conductores.com' })
    .first();

  if (await adminDemoButton.isVisible().catch(() => false)) {
    await adminDemoButton.click();
  } else {
    await page.fill('[data-cy="login-email"]', ADMIN_USER.email);
    await page.fill('[data-cy="login-password"]', ADMIN_USER.password);
  }

  await page.locator('[data-cy="login-submit"]').click();

  const loggedIn = await page
    .waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 10000 })
    .catch(() => null);

  if (!loggedIn) {
    await applyAuthBypass(page, ADMIN_USER.email);
  }

  await page.goto('/dashboard');
  await page.waitForFunction(() => window.location.pathname.startsWith('/dashboard'), { timeout: 10000 });
}

async function gotoSimHub(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('/simulador');
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/login')) {
      await page.waitForSelector('[data-cy="sim-ags-ahorro"]', { state: 'visible', timeout: 15000 });
      return;
    }

    await applyAuthBypass(page, ADMIN_USER.email);
    await page.waitForTimeout(250);
  }

  throw new Error('No fue posible acceder al Hub de Simuladores por autenticación fallida');
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMonths(text: string | null | undefined): number {
  if (!text) return 0;
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

test.describe('Business Logic Detection', () => {
  test.beforeAll(async () => {
    await ensureArtifactsDir();
  });

  test.describe.configure({ mode: 'serial' });

  test('Simulador AGS Ahorro - flujo completo', async ({ page }) => {
    const scenario = {
      unitValue: 820000,
      initialDown: 300000,
      deliveryMonths: 6,
      consumption: 2000,
      overprice: 5.5
    };

    const expectedMonthly = round2(scenario.consumption * scenario.overprice);
    const expectedSavings = scenario.initialDown + expectedMonthly * scenario.deliveryMonths;
    const expectedRemainder = scenario.unitValue - expectedSavings;
    const amortTerm = 24;
    const monthlyRate = AGS_ANNUAL_RATE / 12;
    const expectedAmortPayment = round2(
      (expectedRemainder * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -amortTerm))
    );

    await login(page);
    await gotoSimHub(page);
    await page.locator('[data-cy="sim-ags-ahorro"]').click();
    await page.waitForURL('**/simulador/ags-ahorro**', { timeout: 20000 });
    await expect(page.locator('[data-cy="simulate-btn"]')).toBeVisible();

    await page.fill('[data-cy="unit-value"]', scenario.unitValue.toString());
    await page.fill('[data-cy="initial-down"]', scenario.initialDown.toString());
    await page.locator('[data-cy="delivery-months"]').selectOption(String(scenario.deliveryMonths));
    const consumptionInput = page.locator('[data-cy="plate-consumption"]').first();
    await consumptionInput.fill(scenario.consumption.toString());
    await consumptionInput.press('Tab');
    await page.fill('[data-cy="overprice-per-liter"]', scenario.overprice.toString());
    await page.locator('[data-cy="simulate-btn"]').click();

    await expect(page.locator('[data-cy="sim-ahorro"]')).toContainText('MX$');

    const monthlyText = await page.locator('[data-cy="sim-ahorro"]').textContent();
    const monthsText = await page.locator('[data-cy="sim-plazo"]').textContent();
    const targetText = await page.locator('[data-cy="sim-pmt"]').textContent();

    const actualMonthly = parseCurrency(monthlyText ?? '');
    const actualMonths = parseMonths(monthsText);
    const actualTarget = parseCurrency(targetText ?? '');

    expect(actualMonthly).toBeCloseTo(expectedMonthly, 2);
    expect(actualMonths).toBe(scenario.deliveryMonths);
    expect(actualTarget).toBeCloseTo(scenario.unitValue, 2);

    const remainderCard = page
      .locator('.ags-ahorro__metric-card')
      .filter({ hasText: 'Remanente' })
      .locator('.ags-ahorro__metric-value')
      .first();
    await expect(remainderCard).toBeVisible();
    const remainderText = await remainderCard.textContent();
    const actualRemainder = parseCurrency(remainderText ?? '');
    expect(actualRemainder).toBeCloseTo(expectedRemainder, 2);

    await page.locator('[data-cy="toggle-view-mode"]').click();
    const amortButton = page.locator('[data-cy="calculate-amortization"]');
    await expect(amortButton).toBeEnabled();
    await amortButton.click();

    await expect(page.getByText('Tabla de Amortización del Remanente')).toBeVisible();
    await expect(page.getByText('Tasa anual AGS: 25.5%')).toBeVisible();
    const amortPaymentText = await page
      .locator('.ags-ahorro__modal-summary-row')
      .filter({ hasText: 'Pago mensual estimado' })
      .locator('strong')
      .first()
      .textContent();
    const actualAmortPayment = parseCurrency(amortPaymentText ?? '');
    expect(actualAmortPayment).toBeCloseTo(expectedAmortPayment, 2);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'simulator-ags.png'),
      fullPage: true
    });

    await page.locator('.ags-ahorro__modal-close').click();
  });

  test('Simulador EdoMex Individual - cálculo de ahorro', async ({ page }) => {
    const scenario = {
      targetDownPayment: 180000,
      consumption: 650,
      overprice: 2.9,
      voluntary: 600
    };

    const expectedCollection = round2(scenario.consumption * scenario.overprice);
    const expectedMonthly = round2(expectedCollection + scenario.voluntary);
    const expectedMonths = Math.ceil(scenario.targetDownPayment / expectedMonthly);

    await login(page);
    await gotoSimHub(page);
    await page.locator('[data-cy="sim-edomex-individual"]').click();
    await page.waitForURL('**/simulador/edomex-individual**', { timeout: 20000 });
    await expect(page.locator('[data-cy="calculate-btn"]')).toBeVisible();

    await page.fill('[data-cy="target-down-payment"]', scenario.targetDownPayment.toString());
    await page.fill('[data-cy="consumption"]', scenario.consumption.toString());
    await page.fill('[data-cy="overprice"]', scenario.overprice.toString());
    await page.fill('[data-cy="voluntary"]', scenario.voluntary.toString());
    await page.locator('[data-cy="calculate-btn"]').click();

    await page.waitForSelector('[data-cy="sim-ahorro"]', { state: 'visible', timeout: 20000 });

    const monthlyText = await page.locator('[data-cy="sim-ahorro"]').textContent();
    const monthsText = await page.locator('[data-cy="sim-plazo"]').textContent();
    const targetText = await page.locator('[data-cy="sim-pmt"]').textContent();

    const actualMonthly = parseCurrency(monthlyText ?? '');
    const actualMonths = parseMonths(monthsText);
    const actualTarget = parseCurrency(targetText ?? '');

    expect(actualMonthly).toBeCloseTo(expectedMonthly, 2);
    expect(actualMonths).toBe(expectedMonths);
    expect(actualTarget).toBeCloseTo(scenario.targetDownPayment, 2);

    const breakdownRows = page.locator('.edomex-individual__breakdown-rows > div');
    const collectionRow = breakdownRows.first().locator('span').nth(1);
    await expect(collectionRow).toBeVisible();
    const collectionText = await collectionRow.textContent();
    const actualCollection = parseCurrency(collectionText ?? '');
    expect(actualCollection).toBeCloseTo(expectedCollection, 2);

    const voluntaryRow = breakdownRows.nth(1).locator('span').nth(1);
    const voluntaryText = await voluntaryRow.textContent();
    const actualVoluntary = parseCurrency(voluntaryText ?? '');
    expect(actualVoluntary).toBeCloseTo(scenario.voluntary, 2);

    const totalRow = breakdownRows.nth(2).locator('span').nth(1);
    const totalText = await totalRow.textContent();
    const actualTotal = parseCurrency(totalText ?? '');
    expect(actualTotal).toBeCloseTo(expectedMonthly, 2);

    const impliedMonthlyRate = EDOMEX_ANNUAL_RATE / 12;
    const amortPayment = round2(
      (scenario.targetDownPayment * impliedMonthlyRate) /
        (1 - Math.pow(1 + impliedMonthlyRate, -expectedMonths))
    );
    test.info().annotations.push({
      type: 'calculation',
      description: `EdoMex implied PMT at 29.9% APR for ${expectedMonths} meses sería MX$${amortPayment.toFixed(2)}`
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'simulator-edomex-individual.png'),
      fullPage: true
    });
  });

  test('Simulador EdoMex Colectivo - contribución y entregas', async ({ page }) => {
    const scenario = {
      memberCount: 12,
      unitPrice: 780000,
      avgConsumption: 400,
      overprice: 3.0,
      voluntary: 200
    };

    const collectionPerMember = round2(clamp(scenario.avgConsumption * scenario.overprice, 500, 3500));
    const voluntaryPerMember = round2(scenario.voluntary);
    const contributionPerMember = round2(collectionPerMember + voluntaryPerMember);
    const groupMonthly = round2(contributionPerMember * scenario.memberCount);
    const monthsToFirstAward = Math.ceil(scenario.unitPrice / groupMonthly);
    const monthsToFullDelivery = monthsToFirstAward * scenario.memberCount;
    const downPaymentPerUnit = round2(scenario.unitPrice * 0.15);
    const totalTarget = round2(downPaymentPerUnit * scenario.memberCount);
    const principal = scenario.unitPrice * (1 - 0.15);
    const memberDebtService = round2(
      (principal * (EDOMEX_ANNUAL_RATE / 12)) /
        (1 - Math.pow(1 + EDOMEX_ANNUAL_RATE / 12, -60))
    );

    await login(page);
    await gotoSimHub(page);
    await page.locator('[data-cy="sim-tanda-colectiva"]').click();
    await page.waitForURL('**/simulador/tanda-colectiva**', { timeout: 20000 });

    await expect(page.locator('[data-cy="members"]')).toBeVisible();
    await page.fill('[data-cy="members"]', scenario.memberCount.toString());
    await page.fill('[data-cy="unit-price"]', scenario.unitPrice.toString());
    await page.fill('[data-cy="avg-consumption"]', scenario.avgConsumption.toString());
    await page.fill('[data-cy="overprice-lit"]', scenario.overprice.toString());
    await page.fill('[data-cy="voluntary-member"]', scenario.voluntary.toString());
    await page.locator('[data-cy="run-edomex-colectivo"]').click();

    await page.waitForSelector('[data-cy="group-monthly"]', { state: 'visible', timeout: 20000 });

    const groupMonthlyText = await page.locator('[data-cy="group-monthly"] .tanda-colectiva__kpi-value').textContent();
    const firstAwardText = await page.locator('[data-cy="first-award"] .tanda-colectiva__kpi-value').textContent();
    const fullDeliveryText = await page.locator('[data-cy="full-delivery"] .tanda-colectiva__kpi-value').textContent();

    const actualGroupMonthly = parseCurrency(groupMonthlyText ?? '');
    const actualFirstAward = parseMonths(firstAwardText);
    const actualFullDelivery = parseMonths(fullDeliveryText);

    expect(actualGroupMonthly).toBeCloseTo(groupMonthly, 2);
    expect(actualFirstAward).toBe(monthsToFirstAward);
    expect(actualFullDelivery).toBe(monthsToFullDelivery);

    const comparisonCells = page.locator('[data-cy="sim-comparison-table"] tbody tr td');
    const comparisonSavings = parseCurrency((await comparisonCells.nth(1).textContent()) ?? '');
    const comparisonPmt = parseCurrency((await comparisonCells.nth(2).textContent()) ?? '');
    expect(comparisonSavings).toBeCloseTo(groupMonthly, 2);
    expect(comparisonPmt).toBeCloseTo(groupMonthly / scenario.memberCount, 2);

    const internalData = await page.evaluate(() => {
      const result = {
        awards: [] as { month: number; mds: number }[]
      };
      const ngGlobal = (window as any).ng;
      if (!ngGlobal) return result;
      const cmpEl = document.querySelector('app-tanda-colectiva');
      if (!cmpEl) return result;
      const cmp = ngGlobal.getComponent?.(cmpEl);
      if (!cmp?.simulationResult?.tandaResult?.awardsByMember) return result;
      const awards = Object.values(cmp.simulationResult.tandaResult.awardsByMember).map((award: any) => ({
        month: award.month,
        mds: award.mds
      }));
      return { awards };
    });

    if (internalData.awards.length > 0) {
      expect(internalData.awards[0].mds).toBeCloseTo(memberDebtService, 2);
    } else {
      test.info().annotations.push({
        type: 'warning',
        description: 'No fue posible leer los pagos MDS desde el componente Angular'
      });
    }

    test.info().annotations.push({
      type: 'calculation',
      description: `Meta grupal proyectada: MX$${totalTarget.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'simulator-edomex-colectivo.png'),
      fullPage: true
    });
  });
});
