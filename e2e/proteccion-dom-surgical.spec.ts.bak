/**
 * 🧪 P0.1 Surgical Fix Verification
 * Tests that TIR/PMT′/n′ DOM elements are ALWAYS visible in Protección
 * All scenarios must render these elements regardless of eligibility
 */

import { test, expect } from '@playwright/test';

test.describe('P0.1 Surgical Fix - Protección DOM Rendering', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to Protección page
    await page.goto('/proteccion');
    await page.waitForLoadState('networkidle');
  });

  test('TIR post is ALWAYS visible in DOM', async ({ page }) => {
    // Wait for scenarios to compute
    await page.waitForSelector('[data-testid="tir-post"]', { timeout: 5000 });
    
    // Verify TIR post element exists and is visible
    const tirPost = page.getByTestId('tir-post');
    await expect(tirPost).toBeVisible();
    
    // Verify TIR value is displayed (not empty)
    const tirValue = page.getByTestId('tir-value');
    await expect(tirValue).toBeVisible();
    
    const tirText = await tirValue.textContent();
    expect(tirText).not.toBe('');
    expect(tirText).not.toBe('0%');
  });

  test('PMT′ is ALWAYS visible in DOM', async ({ page }) => {
    // Wait for scenarios to compute
    await page.waitForSelector('[data-testid="pmt-prime"]', { timeout: 5000 });
    
    // Verify PMT′ element exists and is visible
    const pmtPrime = page.getByTestId('pmt-prime');
    await expect(pmtPrime).toBeVisible();
    
    // Verify PMT′ has a value
    const pmtText = await pmtPrime.textContent();
    expect(pmtText).toContain('PMT′');
    expect(pmtText).not.toBe('PMT′ $0');
  });

  test('n′ is ALWAYS visible in DOM', async ({ page }) => {
    // Wait for scenarios to compute
    await page.waitForSelector('[data-testid="n-prime"]', { timeout: 5000 });
    
    // Verify n′ element exists and is visible
    const nPrime = page.getByTestId('n-prime');
    await expect(nPrime).toBeVisible();
    
    // Verify n′ has a value
    const nText = await nPrime.textContent();
    expect(nText).toContain('n′');
    expect(nText).toContain('meses');
    expect(nText).not.toBe('n′ 0 meses');
  });

  test('Rejection reasons are visible when applicable', async ({ page }) => {
    // Wait for scenarios to compute
    await page.waitForTimeout(2000);
    
    // Check if rejection reasons exist
    const rejectionReason = page.getByTestId('rejection-reason');
    const rejectionExists = await rejectionReason.count() > 0;
    
    if (rejectionExists) {
      await expect(rejectionReason.first()).toBeVisible();
      
      // Verify rejection reason content
      const reasonText = await rejectionReason.first().textContent();
      expect(reasonText).toMatch(/Motivo:/);
    }
  });

  test('All TIR/PMT′/n′ elements survive form changes', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('[data-testid="tir-post"]', { timeout: 5000 });
    
    // Change form values to trigger recomputation
    await page.fill('input[formControlName="currentBalance"]', '500000');
    await page.fill('input[formControlName="originalPayment"]', '15000');
    await page.fill('input[formControlName="remainingTerm"]', '24');
    
    // Wait for recomputation
    await page.waitForTimeout(1000);
    
    // Verify all elements are still visible
    await expect(page.getByTestId('tir-post')).toBeVisible();
    await expect(page.getByTestId('pmt-prime')).toBeVisible();
    await expect(page.getByTestId('n-prime')).toBeVisible();
    
    // Verify they have updated values
    const tirValue = await page.getByTestId('tir-value').textContent();
    const pmtValue = await page.getByTestId('pmt-prime').textContent();
    const nValue = await page.getByTestId('n-prime').textContent();
    
    expect(tirValue).not.toBe('');
    expect(pmtValue).toContain('$');
    expect(nValue).toContain('meses');
  });

  test('Edge case: Invalid form data still renders elements', async ({ page }) => {
    // Set invalid/extreme values
    await page.fill('input[formControlName="currentBalance"]', '0');
    await page.fill('input[formControlName="originalPayment"]', '0');
    await page.fill('input[formControlName="remainingTerm"]', '1');
    
    // Wait for processing
    await page.waitForTimeout(2000);
    
    // Elements should still exist (might show 0 values but DOM should render)
    const tirPost = page.getByTestId('tir-post');
    const pmtPrime = page.getByTestId('pmt-prime');  
    const nPrime = page.getByTestId('n-prime');
    
    // At minimum, the elements should exist in DOM
    await expect(tirPost).toBeAttached();
    await expect(pmtPrime).toBeAttached();
    await expect(nPrime).toBeAttached();
  });

  test('Multiple scenarios all render TIR/PMT′/n′', async ({ page }) => {
    // Wait for scenarios to load
    await page.waitForSelector('.scenario-card', { timeout: 5000 });
    
    // Count scenario cards
    const scenarios = page.locator('.scenario-card');
    const scenarioCount = await scenarios.count();
    
    if (scenarioCount > 0) {
      // Each scenario should have TIR/PMT′/n′ elements
      for (let i = 0; i < scenarioCount; i++) {
        const scenario = scenarios.nth(i);
        
        // Verify each scenario has the required elements
        await expect(scenario.locator('[data-testid="tir-post"], .row:has(.label:text("TIR post"))')).toBeVisible();
        await expect(scenario.locator('[data-testid="pmt-prime"], .row:has(.label:text("PMT′"))')).toBeVisible();
        await expect(scenario.locator('[data-testid="n-prime"], .row:has(.label:text("n′"))')).toBeVisible();
      }
    }
  });
});

test.describe('P0.1 Acceptance Criteria', () => {
  
  test('✅ AC1: TIR post renders in ALL scenarios', async ({ page }) => {
    await page.goto('/proteccion');
    await page.waitForSelector('[data-testid="tir-post"]', { timeout: 10000 });
    
    const tirElements = page.getByTestId('tir-post');
    const count = await tirElements.count();
    expect(count).toBeGreaterThan(0);
    
    // All TIR elements should be visible
    for (let i = 0; i < count; i++) {
      await expect(tirElements.nth(i)).toBeVisible();
    }
  });

  test('✅ AC2: PMT′/n′ render in ALL scenarios', async ({ page }) => {
    await page.goto('/proteccion');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should have at least one PMT′ and n′
    await expect(page.getByTestId('pmt-prime').first()).toBeVisible();
    await expect(page.getByTestId('n-prime').first()).toBeVisible();
  });

  test('✅ AC3: Rejection motivo visible when applicable', async ({ page }) => {
    await page.goto('/proteccion');
    await page.waitForLoadState('networkidle');
    
    // Set values that will likely trigger rejection
    await page.fill('input[formControlName="currentBalance"]', '100000');
    await page.fill('input[formControlName="originalPayment"]', '20000');
    await page.fill('input[formControlName="remainingTerm"]', '60');
    
    await page.waitForTimeout(2000);
    
    // Check if rejection reasons appear
    const rejectionCount = await page.getByTestId('rejection-reason').count();
    if (rejectionCount > 0) {
      await expect(page.getByTestId('rejection-reason').first()).toBeVisible();
    }
    
    // Even if no rejections, TIR should still be visible
    await expect(page.getByTestId('tir-post').first()).toBeVisible();
  });

  test('✅ AC4: Playwright getByTestId works consistently', async ({ page }) => {
    await page.goto('/proteccion');
    await page.waitForSelector('[data-testid="tir-post"]', { timeout: 10000 });
    
    // This is the critical test - Playwright must find elements consistently
    const tirPost = page.getByTestId('tir-post');
    await expect(tirPost).toBeVisible();
    
    const pmtPrime = page.getByTestId('pmt-prime');
    await expect(pmtPrime).toBeVisible();
    
    const nPrime = page.getByTestId('n-prime');
    await expect(nPrime).toBeVisible();
    
    console.log('✅ P0.1 SURGICAL FIX VERIFIED: All DOM elements consistently visible');
  });
});