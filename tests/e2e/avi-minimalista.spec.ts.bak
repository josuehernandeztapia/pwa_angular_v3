import { test, expect } from '@playwright/test';

/**
 * PR#8 - AVI Minimalista E2E Tests
 * Tests for GO/REVIEW/NO-GO decisions with proper data-cy attributes
 */

test.describe('AVI Minimalista - Decision & Flags', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/avi-interview');
  });

  test('AVI shows GO decision and flags correctly', async ({ page }) => {
    // Start interview
    await page.locator('.start-btn').first().click();

    // Simulate GO scenario by evaluating component directly
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        // Mock GO scenario
        component.finalDecision = 'GO';
        component.finalFlags = ['High latency', 'Minor inconsistencies'];
        component.showResults = true;
        component.isAnalyzing = false;
        component.dualEngineResult = {
          consolidatedScore: { totalScore: 850 },
          consensus: { level: 'HIGH' },
          scientificScore: { totalScore: 840, riskLevel: 'LOW', processingTime: 120 },
          heuristicScore: { totalScore: 860, riskLevel: 'LOW', processingTime: 95 },
          recommendations: ['Continuar con el proceso'],
          processingTime: 215,
          engineReliability: { scientific: 0.95, heuristic: 0.92, overall: 0.94 }
        };
        // Trigger change detection
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Wait for decision to appear
    await page.waitForSelector('[data-cy="avi-decision"]', { timeout: 5000 });

    // Validate decision
    const decision = await page.locator('[data-cy="avi-decision"]').innerText();
    expect(decision.trim()).toBe('GO');

    // Validate flags
    const flags = await page.locator('[data-cy="avi-flag"]').allTextContents();
    expect(flags.length).toBeGreaterThan(0);
    expect(flags).toContain('High latency');
    expect(flags).toContain('Minor inconsistencies');

    // Screenshot
    await expect(page).toHaveScreenshot('avi-go.png');
  });

  test('AVI shows REVIEW decision and flags correctly', async ({ page }) => {
    // Start interview
    await page.locator('.start-btn').first().click();

    // Simulate REVIEW scenario
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        // Mock REVIEW scenario
        component.finalDecision = 'REVIEW';
        component.finalFlags = ['Deception indicators', 'Speech hesitation', 'Inconsistent timeline'];
        component.showResults = true;
        component.isAnalyzing = false;
        component.dualEngineResult = {
          consolidatedScore: { totalScore: 650 },
          consensus: { level: 'MEDIUM' },
          scientificScore: { totalScore: 620, riskLevel: 'MEDIUM', processingTime: 150 },
          heuristicScore: { totalScore: 680, riskLevel: 'MEDIUM', processingTime: 110 },
          recommendations: ['Requiere revisión adicional', 'Solicitar documentación extra'],
          processingTime: 260,
          engineReliability: { scientific: 0.88, heuristic: 0.85, overall: 0.87 }
        };
        // Trigger change detection
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Wait for decision to appear
    await page.waitForSelector('[data-cy="avi-decision"]');

    // Validate decision
    const decision = await page.locator('[data-cy="avi-decision"]').innerText();
    expect(decision.trim()).toBe('REVIEW');

    // Validate flags
    const flags = await page.locator('[data-cy="avi-flag"]').allTextContents();
    expect(flags.length).toBeGreaterThanOrEqual(3);
    expect(flags).toContain('Deception indicators');
    expect(flags).toContain('Speech hesitation');
    expect(flags).toContain('Inconsistent timeline');

    // Screenshot
    await expect(page).toHaveScreenshot('avi-review.png');
  });

  test('AVI shows NO-GO decision and flags correctly', async ({ page }) => {
    // Start interview
    await page.locator('.start-btn').first().click();

    // Simulate NO-GO scenario
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        // Mock NO-GO scenario
        component.finalDecision = 'NO-GO';
        component.finalFlags = ['Strong deception patterns', 'Multiple contradictions', 'Evasive responses'];
        component.showResults = true;
        component.isAnalyzing = false;
        component.dualEngineResult = {
          consolidatedScore: { totalScore: 320 },
          consensus: { level: 'LOW' },
          scientificScore: { totalScore: 300, riskLevel: 'CRITICAL', processingTime: 180 },
          heuristicScore: { totalScore: 340, riskLevel: 'HIGH', processingTime: 125 },
          recommendations: ['No continuar con el proceso', 'Solicitar documentación completa', 'Revisión presencial requerida'],
          processingTime: 305,
          engineReliability: { scientific: 0.92, heuristic: 0.89, overall: 0.91 }
        };
        // Trigger change detection
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Wait for decision to appear
    await page.waitForSelector('[data-cy="avi-decision"]');

    // Validate decision
    const decision = await page.locator('[data-cy="avi-decision"]').innerText();
    expect(decision.trim()).toBe('NO-GO');

    // Validate flags
    const flags = await page.locator('[data-cy="avi-flag"]').allTextContents();
    expect(flags.length).toBeGreaterThanOrEqual(3);
    expect(flags).toContain('Strong deception patterns');
    expect(flags).toContain('Multiple contradictions');
    expect(flags).toContain('Evasive responses');

    // Screenshot
    await expect(page).toHaveScreenshot('avi-nogo.png');
  });

  test('AVI shows skeleton loader during analysis', async ({ page }) => {
    // Start interview
    await page.locator('.start-btn').first().click();

    // Simulate analyzing state
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        component.isAnalyzing = true;
        component.showResults = false;
        // Trigger change detection
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Validate skeleton loader is visible
    await expect(page.locator('.animate-pulse')).toBeVisible();
    await expect(page.locator('.analyzing-state')).toBeVisible();

    // Validate loading text
    await expect(page.locator('text=Analizando respuestas...')).toBeVisible();

    // Screenshot of loading state
    await expect(page).toHaveScreenshot('avi-loading.png');
  });

  test('AVI card follows minimalista design patterns', async ({ page }) => {
    // Start interview and simulate completed analysis
    await page.locator('.start-btn').first().click();

    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        component.finalDecision = 'REVIEW';
        component.finalFlags = ['Test flag'];
        component.showResults = true;
        component.isAnalyzing = false;
        component.dualEngineResult = {
          consolidatedScore: { totalScore: 600 },
          consensus: { level: 'MEDIUM' },
          scientificScore: { totalScore: 580, riskLevel: 'MEDIUM', processingTime: 100 },
          heuristicScore: { totalScore: 620, riskLevel: 'MEDIUM', processingTime: 90 },
          recommendations: ['Test recommendation'],
          processingTime: 190,
          engineReliability: { scientific: 0.90, heuristic: 0.88, overall: 0.89 }
        };
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Wait for results
    await page.waitForSelector('[data-cy="avi-decision"]');

    // Validate minimalista design elements
    const card = page.locator('.ui-card').first();
    await expect(card).toBeVisible();

    // Validate title styling
    const title = page.locator('h2:has-text("Resultado AVI")');
    await expect(title).toBeVisible();

    // Validate decision styling (large text)
    const decision = page.locator('[data-cy="avi-decision"]');
    await expect(decision).toHaveClass(/text-2xl/);

    // Validate flags styling (small, discrete)
    const flags = page.locator('[data-cy="avi-flag"]').first();
    await expect(flags).toHaveClass(/text-sm/);

    // Check dark mode classes are present
    await expect(title).toHaveClass(/dark:text-slate-100/);
    await expect(flags).toHaveClass(/dark:text-slate-400/);
  });

  test('AVI validates all required data-cy attributes', async ({ page }) => {
    // Start interview and complete simulation
    await page.locator('.start-btn').first().click();

    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        component.finalDecision = 'GO';
        component.finalFlags = ['Flag 1', 'Flag 2', 'Flag 3'];
        component.showResults = true;
        component.isAnalyzing = false;
        component.dualEngineResult = {
          consolidatedScore: { totalScore: 800 },
          consensus: { level: 'HIGH' },
          scientificScore: { totalScore: 790, riskLevel: 'LOW', processingTime: 100 },
          heuristicScore: { totalScore: 810, riskLevel: 'LOW', processingTime: 90 },
          recommendations: ['Continue process'],
          processingTime: 190,
          engineReliability: { scientific: 0.95, heuristic: 0.92, overall: 0.94 }
        };
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Validate required data-cy attributes exist
    await expect(page.locator('[data-cy="avi-decision"]')).toBeVisible();

    const flagElements = page.locator('[data-cy="avi-flag"]');
    await expect(flagElements).toHaveCount(3);

    // Validate all flags have the correct attribute
    for (let i = 0; i < 3; i++) {
      await expect(flagElements.nth(i)).toBeVisible();
    }
  });

});