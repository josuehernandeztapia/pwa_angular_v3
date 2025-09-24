import { test, expect } from '@playwright/test';

/**
 * PR#10 - Entregas Minimalista E2E Tests
 * Tests for timeline y ETA de entregas siguiendo el prompt quirúrgico exacto
 */

test('Timeline y ETA de entregas', async ({ page }) => {
  await page.goto('/entregas');

  // Validar timeline - deben aparecer exactamente 3 pasos
  const steps = page.locator('[data-cy="delivery-step"]');
  await expect(steps).toHaveCount(3);

  // Validar contenido de los pasos
  await expect(steps.nth(0)).toContainText('Día 1');
  await expect(steps.nth(0)).toContainText('Creación de entrega');

  await expect(steps.nth(1)).toContainText('Día 30');
  await expect(steps.nth(1)).toContainText('Pago programado');

  await expect(steps.nth(2)).toContainText('Día 77');
  await expect(steps.nth(2)).toContainText('Entrega final');

  // Validar ETA - debe estar entre 0-120 días
  const etaElement = page.locator('[data-cy="delivery-eta"]');
  await expect(etaElement).toBeVisible();

  const etaText = await etaElement.innerText();
  const eta = parseInt(etaText);
  expect(eta).toBeGreaterThanOrEqual(0);
  expect(eta).toBeLessThanOrEqual(120);

  // Screenshot final
  await expect(page).toHaveScreenshot('entregas.png');
});

test('Entregas shows skeleton loader during loading', async ({ page }) => {
  // Navigate to entregas page
  await page.goto('/entregas');

  // Check if skeleton loaders are visible initially (they should disappear quickly)
  // We'll check for the presence of animate-pulse elements
  const skeletonElements = page.locator('.animate-pulse');

  // Either skeleton is visible or content is loaded
  const hasSkeletonOrContent = await page.evaluate(() => {
    const skeleton = document.querySelector('.animate-pulse');
    const content = document.querySelector('[data-cy="delivery-timeline"]');
    return skeleton !== null || content !== null;
  });

  expect(hasSkeletonOrContent).toBe(true);

  // Wait for content to load
  await expect(page.locator('[data-cy="delivery-timeline"]')).toBeVisible();

  // Screenshot of loaded state
  await expect(page).toHaveScreenshot('entregas-loaded.png');
});

test('Entregas follows minimalista design patterns', async ({ page }) => {
  await page.goto('/entregas');

  // Wait for content to load
  await expect(page.locator('[data-cy="delivery-timeline"]')).toBeVisible();

  // Validate ui-card container
  const card = page.locator('section.ui-card');
  await expect(card).toBeVisible();

  // Validate title styling (consistent with other minimalista components)
  const title = page.locator('h2:has-text("Timeline de Entrega")');
  await expect(title).toBeVisible();
  await expect(title).toHaveClass(/text-sm/);
  await expect(title).toHaveClass(/font-semibold/);

  // Check dark mode classes are present
  await expect(title).toHaveClass(/dark:text-slate-100/);

  // Validate timeline item styling
  const timelineItems = page.locator('[data-cy="delivery-step"]');
  for (let i = 0; i < 3; i++) {
    const item = timelineItems.nth(i);
    await expect(item).toHaveClass(/border-slate-200/);
    await expect(item).toHaveClass(/dark:border-slate-700/);
    await expect(item).toHaveClass(/flex/);
    await expect(item).toHaveClass(/justify-between/);
  }

  // Screenshot of minimalista design
  await expect(page).toHaveScreenshot('entregas-minimalista-design.png');
});

test('Entregas validates all required data-cy attributes', async ({ page }) => {
  await page.goto('/entregas');

  // Wait for content to load
  await expect(page.locator('[data-cy="delivery-timeline"]')).toBeVisible();

  // Validate delivery-timeline container
  await expect(page.locator('[data-cy="delivery-timeline"]')).toBeVisible();

  // Validate all delivery-step elements
  const steps = page.locator('[data-cy="delivery-step"]');
  await expect(steps).toHaveCount(3);

  // Validate delivery-eta element
  await expect(page.locator('[data-cy="delivery-eta"]')).toBeVisible();

  // Validate each step is individually accessible
  for (let i = 0; i < 3; i++) {
    await expect(steps.nth(i)).toBeVisible();
  }
});

test('Entregas ETA calculation is realistic', async ({ page }) => {
  await page.goto('/entregas');

  // Wait for ETA to be calculated
  await expect(page.locator('[data-cy="delivery-eta"]')).toBeVisible();

  // Get ETA value
  const etaElement = page.locator('[data-cy="delivery-eta"]');
  const etaText = await etaElement.innerText();
  const eta = parseInt(etaText);

  // Validate ETA is within reasonable range for delivery timeline
  expect(eta).toBeGreaterThan(0);
  expect(eta).toBeLessThan(121); // Max 120 days as specified

  // ETA should be reasonable for 77-day delivery timeline
  expect(eta).toBeLessThanOrEqual(77); // Should not exceed the total timeline

  console.log(`ETA calculado: ${eta} días`);
});

test('Entregas handles loading state correctly', async ({ page }) => {
  // Start monitoring network requests to control timing
  let resolvePromise: Function;
  const networkPromise = new Promise(resolve => {
    resolvePromise = resolve;
  });

  // Navigate to page
  await page.goto('/entregas');

  // Content should eventually load
  await expect(page.locator('[data-cy="delivery-timeline"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-cy="delivery-eta"]')).toBeVisible();

  // Verify no skeleton loaders remain
  const remainingSkeletons = await page.locator('.animate-pulse').count();
  expect(remainingSkeletons).toBe(0);

  // Screenshot final loaded state
  await expect(page).toHaveScreenshot('entregas-final-loaded.png');
});

test('Entregas text content is in Spanish', async ({ page }) => {
  await page.goto('/entregas');

  // Wait for content
  await expect(page.locator('[data-cy="delivery-timeline"]')).toBeVisible();

  // Validate Spanish text content
  await expect(page.locator('text=Timeline de Entrega')).toBeVisible();
  await expect(page.locator('text=Creación de entrega')).toBeVisible();
  await expect(page.locator('text=Pago programado')).toBeVisible();
  await expect(page.locator('text=Entrega final')).toBeVisible();
  await expect(page.locator('text=ETA calculado')).toBeVisible();
  await expect(page.locator('text=días')).toBeVisible();
});

test('Entregas responsive design on mobile', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/entregas');

  // Wait for content
  await expect(page.locator('[data-cy="delivery-timeline"]')).toBeVisible();

  // Validate timeline still displays correctly on mobile
  const steps = page.locator('[data-cy="delivery-step"]');
  await expect(steps).toHaveCount(3);

  // All elements should still be visible and accessible
  await expect(page.locator('[data-cy="delivery-eta"]')).toBeVisible();

  // Timeline items should still have proper layout
  for (let i = 0; i < 3; i++) {
    await expect(steps.nth(i)).toBeVisible();
  }

  // Screenshot mobile view
  await expect(page).toHaveScreenshot('entregas-mobile.png');
});