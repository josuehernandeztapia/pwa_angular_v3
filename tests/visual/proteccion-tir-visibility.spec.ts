// 🛡️ PROTECCIÓN TIR VISIBILITY E2E TEST
import { test, expect } from '@playwright/test';

test.describe('Protección TIR Visibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proteccion');
    await page.waitForLoadState('networkidle');
  });

  test('TIR post values should always be visible in all scenarios', async ({ page }) => {
    // Fill form with values that generate both eligible and ineligible scenarios
    await page.fill('input[formcontrolname="currentBalance"]', '320000');
    await page.fill('input[formcontrolname="originalPayment"]', '10500');
    await page.fill('input[formcontrolname="remainingTerm"]', '36');
    await page.selectOption('select[formcontrolname="market"]', 'edomex');
    
    // Calculate scenarios
    await page.click('button[type="button"]:has-text("Calcular Escenarios")');
    
    // Wait for scenarios to load
    await page.waitForSelector('.scenario-card', { timeout: 10000 });
    
    // Get all scenario cards
    const scenarioCards = await page.locator('.scenario-card').all();
    expect(scenarioCards.length).toBeGreaterThan(0);
    
    // Verify each scenario card has TIR post value visible
    for (const card of scenarioCards) {
      // TIR post row should be visible
      const tirPostRow = card.locator('[data-testid="tir-post"]');
      await expect(tirPostRow).toBeVisible();
      
      // TIR value should be visible and not empty
      const tirValue = card.locator('[data-testid="tir-value"]');
      await expect(tirValue).toBeVisible();
      
      const tirText = await tirValue.textContent();
      expect(tirText).toBeTruthy();
      expect(tirText).toMatch(/^\d+(\.\d+)?%$/); // Should be a percentage
      
      // Verify TIR has either 'ok' or 'bad' class (color coding)
      const hasOkClass = await tirValue.evaluate(el => el.classList.contains('ok'));
      const hasBadClass = await tirValue.evaluate(el => el.classList.contains('bad'));
      expect(hasOkClass || hasBadClass).toBe(true);
    }
  });

  test('Rejection reasons should be visible when scenarios are not eligible', async ({ page }) => {
    // Fill form with values that will generate rejected scenarios
    await page.fill('input[formcontrolname="currentBalance"]', '100000');
    await page.fill('input[formcontrolname="originalPayment"]', '3000');
    await page.fill('input[formcontrolname="remainingTerm"]', '12');
    await page.selectOption('select[formcontrolname="market"]', 'aguascalientes');
    
    // Calculate scenarios
    await page.click('button[type="button"]:has-text("Calcular Escenarios")');
    
    // Wait for scenarios to load
    await page.waitForSelector('.scenario-card', { timeout: 10000 });
    
    // Check for rejected scenarios
    const rejectedCards = await page.locator('.scenario-card.rejected').all();
    
    if (rejectedCards.length > 0) {
      for (const card of rejectedCards) {
        // Should have rejection box
        const rejectionBox = card.locator('[data-testid="rejection-reason"]');
        await expect(rejectionBox).toBeVisible();
        
        // Should have at least one rejection reason
        const rejectionReasons = await card.locator('.rejection .reason').all();
        expect(rejectionReasons.length).toBeGreaterThan(0);
        
        // Verify common rejection reasons
        const irrRejection = card.locator('[data-testid="irr-rejection"]');
        const pmtRejection = card.locator('[data-testid="pmt-rejection"]');
        
        const hasIrrRejection = await irrRejection.isVisible();
        const hasPmtRejection = await pmtRejection.isVisible();
        
        expect(hasIrrRejection || hasPmtRejection).toBe(true);
      }
    }
  });

  test('All scenario data should be present in DOM regardless of eligibility', async ({ page }) => {
    // Fill form 
    await page.fill('input[formcontrolname="currentBalance"]', '500000');
    await page.fill('input[formcontrolname="originalPayment"]', '15000');
    await page.fill('input[formcontrolname="remainingTerm"]', '48');
    await page.selectOption('select[formcontrolname="market"]', 'edomex');
    
    // Calculate scenarios
    await page.click('button[type="button"]:has-text("Calcular Escenarios")');
    
    // Wait for scenarios to load
    await page.waitForSelector('.scenario-card', { timeout: 10000 });
    
    const scenarioCards = await page.locator('.scenario-card').all();
    
    for (const card of scenarioCards) {
      // Scenario should have title
      const title = card.locator('.scenario-header h3');
      await expect(title).toBeVisible();
      
      // Should have eligibility badge
      const badge = card.locator('.badge');
      await expect(badge).toBeVisible();
      
      // Should have PMT′ (new monthly payment)
      const pmtRow = card.locator('.row:has(.label:text("PMT′"))');
      await expect(pmtRow).toBeVisible();
      
      // Should have n′ (new term)
      const termRow = card.locator('.row:has(.label:text("n′"))');
      await expect(termRow).toBeVisible();
      
      // Should have TIR post (already tested above)
      const tirRow = card.locator('[data-testid="tir-post"]');
      await expect(tirRow).toBeVisible();
    }
  });

  test('Edge case: All scenarios rejected should still show TIR values', async ({ page }) => {
    // Use extreme values that will likely reject all scenarios
    await page.fill('input[formcontrolname="currentBalance"]', '50000');
    await page.fill('input[formcontrolname="originalPayment"]', '8000');
    await page.fill('input[formcontrolname="remainingTerm"]', '6');
    await page.selectOption('select[formcontrolname="market"]', 'aguascalientes');
    
    // Calculate scenarios
    await page.click('button[type="button"]:has-text("Calcular Escenarios")');
    
    // Wait for scenarios to load or "no eligible scenarios" message
    await page.waitForTimeout(2000);
    
    // Check if scenarios were generated
    const scenarioCards = await page.locator('.scenario-card').all();
    
    if (scenarioCards.length > 0) {
      // If scenarios exist, verify TIR is visible even if all are rejected
      for (const card of scenarioCards) {
        const tirValue = card.locator('[data-testid="tir-value"]');
        await expect(tirValue).toBeVisible();
        
        const tirText = await tirValue.textContent();
        expect(tirText).toBeTruthy();
        expect(tirText).toMatch(/^\d+(\.\d+)?%$/);
      }
    }
  });
});