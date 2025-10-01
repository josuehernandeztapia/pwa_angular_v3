import { test, expect } from '@playwright/test';

/**
 * PR#11 - Configuración Minimalista E2E Tests
 * Tests for dual-mode configuration system (Cotizador/Simulador) with financial calculations
 */

test.describe('Configuración Minimalista - Dual-Mode System', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to configuracion page
    await page.goto('/configuracion');
  });

  test('Configuración shows dual-mode selector correctly', async ({ page }) => {
    // Wait for configuracion page to load
    await expect(page.locator('[data-testid="main-card"]')).toBeVisible();

    // Validate dual-mode toggle is present
    const modeToggle = page.locator('[data-cy="config-mode-toggle"]');
    await expect(modeToggle).toBeVisible();

    // Check both mode buttons exist
    const cotizadorBtn = page.locator('[data-cy="config-mode-toggle"] button:has-text("Cotizador")');
    const simuladorBtn = page.locator('[data-cy="config-mode-toggle"] button:has-text("Simulador")');

    await expect(cotizadorBtn).toBeVisible();
    await expect(simuladorBtn).toBeVisible();

    // Cotizador should be active by default
    await expect(cotizadorBtn).toHaveClass(/active/);
    await expect(simuladorBtn).not.toHaveClass(/active/);

    // Screenshot initial state
    await expect(page).toHaveScreenshot('configuracion-dual-mode-initial.png');
  });

  test('Configuración dual-mode switching works correctly', async ({ page }) => {
    await page.waitForSelector('[data-cy="config-mode-toggle"]');

    const cotizadorBtn = page.locator('[data-cy="config-mode-toggle"] button:has-text("Cotizador")');
    const simuladorBtn = page.locator('[data-cy="config-mode-toggle"] button:has-text("Simulador")');

    // Switch to Simulador
    await simuladorBtn.click();
    await expect(simuladorBtn).toHaveClass(/active/);
    await expect(cotizadorBtn).not.toHaveClass(/active/);

    // Wait for any recalculation animations
    await page.waitForTimeout(500);

    // Switch back to Cotizador
    await cotizadorBtn.click();
    await expect(cotizadorBtn).toHaveClass(/active/);
    await expect(simuladorBtn).not.toHaveClass(/active/);

    // Screenshot mode switching
    await expect(page).toHaveScreenshot('configuracion-mode-switching.png');
  });

  test('Configuración shows input grid with all fields', async ({ page }) => {
    await page.waitForSelector('[data-cy="config-precio"]');

    // Validate all configuration inputs exist
    await expect(page.locator('[data-cy="config-precio"]')).toBeVisible();
    await expect(page.locator('[data-cy="config-eng"]')).toBeVisible();
    await expect(page.locator('[data-cy="config-plazo"]')).toBeVisible();
    await expect(page.locator('[data-cy="config-cliente"]')).toBeVisible();
    await expect(page.locator('[data-cy="config-mercado"]')).toBeVisible();

    // Check default values are loaded
    const precioInput = page.locator('[data-cy="config-precio"]');
    const engancheInput = page.locator('[data-cy="config-eng"]');

    await expect(precioInput).toHaveValue('250000');
    await expect(engancheInput).toHaveValue('20');

    // Screenshot input grid
    await expect(page).toHaveScreenshot('configuracion-input-grid.png');
  });

  test('Configuración shows product packages correctly', async ({ page }) => {
    await page.waitForSelector('[data-cy="product-package"]');

    // Validate all three packages are visible
    const packages = page.locator('[data-cy="product-package"]');
    await expect(packages).toHaveCount(3);

    // Check package content
    await expect(packages.nth(0)).toContainText('Básico');
    await expect(packages.nth(0)).toContainText('15000');

    await expect(packages.nth(1)).toContainText('Premium');
    await expect(packages.nth(1)).toContainText('35000');
    await expect(packages.nth(1)).toContainText('Recomendado'); // Should have recommended badge

    await expect(packages.nth(2)).toContainText('Colectivo');
    await expect(packages.nth(2)).toContainText('75000');

    // Screenshot packages
    await expect(page).toHaveScreenshot('configuracion-product-packages.png');
  });

  test('Configuración package selection works correctly', async ({ page }) => {
    await page.waitForSelector('[data-cy="product-package"]');

    const packages = page.locator('[data-cy="product-package"]');

    // Click on Premium package
    await packages.nth(1).click();
    await expect(packages.nth(1)).toHaveClass(/selected/);

    // Wait for recalculation
    await page.waitForTimeout(500);

    // Click on Básico package
    await packages.nth(0).click();
    await expect(packages.nth(0)).toHaveClass(/selected/);
    await expect(packages.nth(1)).not.toHaveClass(/selected/);

    // Screenshot package selection
    await expect(page).toHaveScreenshot('configuracion-package-selection.png');
  });

  test('Configuración financial results display correctly', async ({ page }) => {
    await page.waitForSelector('[data-cy="config-result"]');

    const resultsSection = page.locator('[data-cy="config-result"]');
    await expect(resultsSection).toBeVisible();

    // Wait for calculation to complete (should show skeleton then results)
    await page.waitForTimeout(1000);

    // Check that financial results are displayed
    await expect(resultsSection).toContainText('PMT Mensual');
    await expect(resultsSection).toContainText('Tasa Efectiva');
    await expect(resultsSection).toContainText('Ahorro Total');
    await expect(resultsSection).toContainText('Total a Pagar');

    // Validate currency formatting is present
    await expect(resultsSection.locator('text=/\\$[\\d,]+/')).toHaveCount({ min: 3 });
    await expect(resultsSection.locator('text=/[\\d.]+%/')).toHaveCount({ min: 1 });

    // Screenshot financial results
    await expect(page).toHaveScreenshot('configuracion-financial-results.png');
  });

  test('Configuración shows skeleton loader during recalculation', async ({ page }) => {
    await page.waitForSelector('[data-cy="config-precio"]');

    // Change precio to trigger recalculation
    await page.fill('[data-cy="config-precio"]', '300000');

    // Should show loading skeleton briefly
    const loadingElements = page.locator('.animate-pulse');
    await expect(loadingElements.first()).toBeVisible();

    // Wait for calculation to complete
    await page.waitForTimeout(1000);

    // Loading should be gone and results should be visible
    const resultsSection = page.locator('[data-cy="config-result"]');
    await expect(resultsSection).toContainText('PMT Mensual');

    // Screenshot after recalculation
    await expect(page).toHaveScreenshot('configuracion-after-recalculation.png');
  });

  test('Configuración validates input fields with sobrias messages', async ({ page }) => {
    await page.waitForSelector('[data-cy="config-precio"]');

    // Test precio validation - enter invalid value
    await page.fill('[data-cy="config-precio"]', '0');
    await page.blur('[data-cy="config-precio"]');

    // Should show validation error
    await expect(page.locator('text=El precio debe ser mayor a 0')).toBeVisible();

    // Test enganche validation - enter invalid percentage
    await page.fill('[data-cy="config-eng"]', '150');
    await page.blur('[data-cy="config-eng"]');

    // Should show validation error
    await expect(page.locator('text=El enganche no puede superar el 100%')).toBeVisible();

    // Fix values to clear errors
    await page.fill('[data-cy="config-precio"]', '250000');
    await page.fill('[data-cy="config-eng"]', '20');

    await page.waitForTimeout(500);

    // Errors should be cleared
    await expect(page.locator('text=El precio debe ser mayor a 0')).not.toBeVisible();
    await expect(page.locator('text=El enganche no puede superar el 100%')).not.toBeVisible();

    // Screenshot validation states
    await expect(page).toHaveScreenshot('configuracion-validation-cleared.png');
  });

  test('Configuración follows minimalista design patterns', async ({ page }) => {
    await page.waitForSelector('[data-testid="main-card"]');

    // Validate ui-card container
    const uiCard = page.locator('[data-testid="main-card"]');
    await expect(uiCard).toBeVisible();

    // Validate title styling (consistent with other components)
    const title = page.locator('h2:has-text("Configuración de Flujos y Productos")');
    await expect(title).toBeVisible();
    await expect(title).toHaveClass(/text-sm/);
    await expect(title).toHaveClass(/font-semibold/);

    // Check dark mode classes are present
    await expect(title).toHaveClass(/dark:text-slate-100/);

    // Validate mode selector styling
    const modeSelector = page.locator('[data-cy="config-mode-toggle"]');
    await expect(modeSelector).toHaveClass(/mode-selector/);

    // Validate input field styling
    const priceInput = page.locator('[data-cy="config-precio"]');
    await expect(priceInput).toHaveClass(/field-input/);

    // Screenshot minimalista design
    await expect(page).toHaveScreenshot('configuracion-minimalista-design.png');
  });

  test('Configuración validates all required data-cy attributes', async ({ page }) => {
    await page.waitForSelector('[data-testid="main-card"]');

    // Validate all required data-cy attributes exist
    await expect(page.locator('[data-cy="config-mode-toggle"]')).toBeVisible();
    await expect(page.locator('[data-cy="config-precio"]')).toBeVisible();
    await expect(page.locator('[data-cy="config-eng"]')).toBeVisible();
    await expect(page.locator('[data-cy="config-plazo"]')).toBeVisible();
    await expect(page.locator('[data-cy="config-cliente"]')).toBeVisible();
    await expect(page.locator('[data-cy="config-mercado"]')).toBeVisible();
    await expect(page.locator('[data-cy="product-package"]')).toHaveCount(3);
    await expect(page.locator('[data-cy="config-result"]')).toBeVisible();

    // Validate each product package is individually accessible
    const packages = page.locator('[data-cy="product-package"]');
    for (let i = 0; i < 3; i++) {
      await expect(packages.nth(i)).toBeVisible();
    }
  });

  test('Configuración input interactions work correctly', async ({ page }) => {
    await page.waitForSelector('[data-cy="config-precio"]');

    // Test numeric input interactions
    await page.fill('[data-cy="config-precio"]', '500000');
    await expect(page.locator('[data-cy="config-precio"]')).toHaveValue('500000');

    await page.fill('[data-cy="config-eng"]', '30');
    await expect(page.locator('[data-cy="config-eng"]')).toHaveValue('30');

    // Test select interactions
    await page.selectOption('[data-cy="config-plazo"]', '48');
    await expect(page.locator('[data-cy="config-plazo"]')).toHaveValue('48');

    await page.selectOption('[data-cy="config-cliente"]', 'vip');
    await expect(page.locator('[data-cy="config-cliente"]')).toHaveValue('vip');

    await page.selectOption('[data-cy="config-mercado"]', 'premium');
    await expect(page.locator('[data-cy="config-mercado"]')).toHaveValue('premium');

    // Wait for recalculation
    await page.waitForTimeout(1000);

    // Screenshot input interactions
    await expect(page).toHaveScreenshot('configuracion-input-interactions.png');
  });

  test('Configuración responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/configuracion');

    // Wait for content
    await expect(page.locator('[data-testid="main-card"]')).toBeVisible();

    // Validate mode selector still works on mobile
    const modeToggle = page.locator('[data-cy="config-mode-toggle"]');
    await expect(modeToggle).toBeVisible();

    // All input fields should still be accessible
    await expect(page.locator('[data-cy="config-precio"]')).toBeVisible();
    await expect(page.locator('[data-cy="config-eng"]')).toBeVisible();
    await expect(page.locator('[data-cy="config-plazo"]')).toBeVisible();

    // Product packages should stack vertically
    const packages = page.locator('[data-cy="product-package"]');
    await expect(packages).toHaveCount(3);

    // Financial results should still be visible
    await expect(page.locator('[data-cy="config-result"]')).toBeVisible();

    // Screenshot mobile view
    await expect(page).toHaveScreenshot('configuracion-mobile.png');
  });

  test('Configuración dark mode compatibility', async ({ page }) => {
    // Set dark mode (assuming dark mode is controlled by class or data attribute)
    await page.addStyleTag({
      content: `
        html { color-scheme: dark; }
        .dark { color-scheme: dark; }
      `
    });

    await page.goto('/configuracion');
    await page.waitForSelector('[data-testid="main-card"]');

    // Validate dark mode styling is applied
    const title = page.locator('h2:has-text("Configuración de Flujos y Productos")');
    await expect(title).toBeVisible();

    // All components should be visible in dark mode
    await expect(page.locator('[data-cy="config-mode-toggle"]')).toBeVisible();
    await expect(page.locator('[data-cy="config-precio"]')).toBeVisible();
    await expect(page.locator('[data-cy="product-package"]')).toHaveCount(3);
    await expect(page.locator('[data-cy="config-result"]')).toBeVisible();

    // Screenshot dark mode
    await expect(page).toHaveScreenshot('configuracion-dark-mode.png');
  });

  test('Configuración complex workflow simulation', async ({ page }) => {
    await page.waitForSelector('[data-cy="config-mode-toggle"]');

    // Complete workflow simulation
    // 1. Switch to Simulador mode
    await page.click('[data-cy="config-mode-toggle"] button:has-text("Simulador")');

    // 2. Update configuration values
    await page.fill('[data-cy="config-precio"]', '750000');
    await page.fill('[data-cy="config-eng"]', '25');
    await page.selectOption('[data-cy="config-plazo"]', '60');
    await page.selectOption('[data-cy="config-cliente"]', 'vip');
    await page.selectOption('[data-cy="config-mercado"]', 'premium');

    // 3. Select Premium package
    const packages = page.locator('[data-cy="product-package"]');
    await packages.nth(1).click(); // Premium package

    // Wait for all calculations to complete
    await page.waitForTimeout(1500);

    // 4. Validate final results are displayed
    const resultsSection = page.locator('[data-cy="config-result"]');
    await expect(resultsSection).toContainText('PMT Mensual');
    await expect(resultsSection).toContainText('Total a Pagar');

    // 5. Switch back to Cotizador to verify state preservation
    await page.click('[data-cy="config-mode-toggle"] button:has-text("Cotizador")');
    await page.waitForTimeout(500);

    // Values should be preserved
    await expect(page.locator('[data-cy="config-precio"]')).toHaveValue('750000');
    await expect(packages.nth(1)).toHaveClass(/selected/);

    // Screenshot complete workflow
    await expect(page).toHaveScreenshot('configuracion-complete-workflow.png');
  });

});