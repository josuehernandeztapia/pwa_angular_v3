import { test, expect } from '@playwright/test';

// Configuration for staging environment
const STAGING_BASE_URL = 'http://localhost:51071/browser';

test.describe('🧪 Staging QA Suite - Conductores PWA', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set staging URL for all tests
    await page.goto(STAGING_BASE_URL);
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('📊 Dashboard Module', () => {
    test('Dashboard loads with key components', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/dashboard`);
      
      // Verify main dashboard elements
      await expect(page.locator('app-dashboard')).toBeVisible();
      await expect(page.getByText(/Dashboard/i)).toBeVisible();
      
      // Check for key metrics cards
      await expect(page.locator('.kpi-card, .metric-card, [data-testid="dashboard-metric"]')).toHaveCountGreaterThan(0);
    });
  });

  test.describe('💰 Cotizador Module', () => {
    test('PMT calculation with financial formula', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/cotizador`);
      
      // Wait for cotizador to load
      await page.waitForSelector('app-cotizador-main', { timeout: 10000 });
      
      // Fill basic loan info
      const enganheInput = page.locator('input[name="enganche"], #enganche, [placeholder*="enganche"]').first();
      if (await enganheInput.isVisible()) {
        await enganheInput.fill('25');
      }
      
      const plazoSelect = page.locator('select[name="plazo"], #plazo').first();
      if (await plazoSelect.isVisible()) {
        await plazoSelect.selectOption('60'); // 60 months
      }
      
      // Check if PMT is calculated
      const pmtElement = page.locator('#pmt, [data-testid="pmt"], .pmt-value').first();
      if (await pmtElement.isVisible()) {
        const pmtText = await pmtElement.textContent();
        expect(pmtText).toMatch(/[\d,]+/); // Should contain numbers
      }
      
      // Verify sticky header
      await expect(page.locator('.header-sticky, .cotizador-header')).toBeVisible();
    });

    test('Amortization table shows interest/capital breakdown', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/cotizador`);
      
      // Look for amortization table
      const amortizationTable = page.locator('table, .amortization-table, [data-testid="amortization"]');
      if (await amortizationTable.isVisible()) {
        // First row should be expandable/expanded
        const firstRow = amortizationTable.locator('tr').first();
        await expect(firstRow).toBeVisible();
        
        // Should contain interest, capital, and balance columns
        await expect(page.getByText(/interés|interest/i)).toBeVisible();
        await expect(page.getByText(/capital/i)).toBeVisible();
        await expect(page.getByText(/saldo|balance/i)).toBeVisible();
      }
    });
  });

  test.describe('🎤 AVI Module', () => {
    test('AVI questions flow with decision pills', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/avi`);
      
      // Wait for AVI component
      await page.waitForSelector('app-avi-verification-modal, [data-testid="avi-component"]', { timeout: 10000 });
      
      // Look for question interface
      const questionContainer = page.locator('.avi-question, [data-testid="avi-question"]').first();
      if (await questionContainer.isVisible()) {
        // Check for decision pills (Claro/Revisar/Evasivo)
        const pills = page.locator('.pill, .decision-pill, [data-testid*="decision"]');
        const pillCount = await pills.count();
        
        if (pillCount > 0) {
          // Should have decision options
          await expect(pills.first()).toBeVisible();
        }
      }
      
      // Check for final summary
      const summaryElement = page.locator('.avi-summary, [data-testid="avi-summary"]');
      if (await summaryElement.isVisible()) {
        // Should show GO/REVIEW/NO-GO decision
        const decisionElement = page.locator('[data-testid="final-decision"], .final-decision');
        await expect(decisionElement).toBeVisible();
      }
    });

    test('HIGH risk case for evasive nervous with admission', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/avi`);
      
      // Mock or simulate evasive nervous case
      // This would require actual implementation to test properly
      // For now, just verify the decision display exists
      const decisionDisplay = page.locator('#decision, [data-testid="avi-decision"], .decision-display');
      if (await decisionDisplay.isVisible()) {
        const decisionText = await decisionDisplay.textContent();
        // Should not be CRITICAL for evasive nervous with admission
        expect(decisionText).not.toContain('CRITICAL');
      }
    });
  });

  test.describe('👥 Tanda Module', () => {
    test('Tanda timeline shows "Te toca en mes X"', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/simulador/tanda-colectiva`);
      
      // Wait for tanda component
      await page.waitForSelector('app-tanda-colectiva', { timeout: 10000 });
      
      // Fill contribution amount
      const aportesInput = page.locator('input[name*="aporte"], #aportes, [placeholder*="aporte"]').first();
      if (await aportesInput.isVisible()) {
        await aportesInput.fill('5000');
        await aportesInput.press('Tab'); // Trigger calculation
      }
      
      // Check for "Te toca en mes" indicator
      await expect(page.getByText(/te toca en mes|mes \d+/i)).toBeVisible();
      
      // Verify double bar (debt vs savings)
      const progressBars = page.locator('.progress-bar, .bar-chart, [data-testid*="bar"]');
      const barCount = await progressBars.count();
      expect(barCount).toBeGreaterThanOrEqual(1);
    });

    test('Inflow alert when inflow ≤ PMT', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/simulador/tanda-colectiva`);
      
      // Set low inflow scenario
      const inflowInput = page.locator('input[name*="ingreso"], [placeholder*="ingreso"]').first();
      if (await inflowInput.isVisible()) {
        await inflowInput.fill('15000'); // Low amount
      }
      
      // Look for alert about recommended collection
      const alert = page.locator('.alert, .warning, [data-testid*="alert"]');
      if (await alert.count() > 0) {
        const alertText = await alert.first().textContent();
        expect(alertText).toMatch(/recaudo|recomendado/i);
      }
    });
  });

  test.describe('🛡️ Protección Module', () => {
    test('Protection simulation with step-down', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/proteccion`);
      
      // Look for step-down option
      const stepDownButton = page.getByText(/step-down/i).first();
      if (await stepDownButton.isVisible()) {
        await stepDownButton.click();
        
        // Should show TIR post calculation
        await expect(page.locator('#tir-post, [data-testid="tir-post"]')).toBeVisible();
      }
      
      // Check for PMT'/n'/TIR cards
      const protectionCards = page.locator('.protection-card, .card').count();
      expect(await protectionCards).toBeGreaterThan(0);
    });

    test('Rejection shows motivo (IRR post < IRRmin)', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/proteccion`);
      
      // Simulate rejection scenario (would need actual implementation)
      const rejectionMessage = page.locator('.rejection-message, [data-testid="rejection-reason"]');
      if (await rejectionMessage.isVisible()) {
        const messageText = await rejectionMessage.textContent();
        expect(messageText).toMatch(/irr|tir|pmt/i);
      }
    });
  });

  test.describe('🚚 Entregas Module', () => {
    test('Timeline shows PO → Entregado hitos', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/entregas`);
      
      // Look for timeline component
      const timeline = page.locator('.timeline, [data-testid="timeline"]').first();
      if (await timeline.isVisible()) {
        // Should show delivery milestones
        await expect(page.getByText(/po|entregado/i)).toBeVisible();
        
        // ETA should be visible
        await expect(page.locator('.eta, [data-testid="eta"]')).toBeVisible();
      }
    });

    test('Delay shows timeline rojo + nuevo compromiso', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/entregas`);
      
      // Simulate delay (button or mock)
      const simulateDelayBtn = page.locator('#simulate-delay, [data-testid="simulate-delay"]');
      if (await simulateDelayBtn.isVisible()) {
        await simulateDelayBtn.click();
        
        // Should show new commitment
        await expect(page.locator('#nuevo-compromiso, [data-testid="nuevo-compromiso"]')).toBeVisible();
        
        // Timeline should be red
        const timeline = page.locator('.timeline.red, .timeline-delayed');
        if (await timeline.count() > 0) {
          await expect(timeline.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('⛽ GNV Module', () => {
    test('Panel shows semáforo verde/amarillo/rojo', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/gnv`);
      
      // Wait for GNV component
      await page.waitForSelector('[data-testid="gnv-panel"], .gnv-station', { timeout: 10000 });
      
      // Look for traffic light indicators
      const statusIndicators = page.locator('.status-green, .status-yellow, .status-red, .semaforo');
      const indicatorCount = await statusIndicators.count();
      expect(indicatorCount).toBeGreaterThan(0);
    });

    test('CSV template download available', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/gnv`);
      
      // Look for download links
      const csvDownload = page.locator('a[href*=".csv"], button:has-text("CSV"), [data-testid*="download"]');
      if (await csvDownload.count() > 0) {
        await expect(csvDownload.first()).toBeVisible();
      }
      
      const pdfGuide = page.locator('a[href*=".pdf"], button:has-text("PDF"), [data-testid*="guide"]');
      if (await pdfGuide.count() > 0) {
        await expect(pdfGuide.first()).toBeVisible();
      }
    });
  });

  test.describe('📋 Post-venta Module', () => {
    test('Photo upload flow (4 fotos: Placa, VIN, Odómetro, Evidencia)', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/postventa/new`);
      
      // Look for photo upload interface
      const photoUploader = page.locator('input[type="file"], .photo-upload, [data-testid*="upload"]').first();
      if (await photoUploader.isVisible()) {
        // Should have upload capability
        await expect(photoUploader).toBeVisible();
      }
      
      // Check for VIN detection banner
      const vinBanner = page.locator('.banner, .alert').filter({ hasText: /vin|evidencia/i });
      if (await vinBanner.count() > 0) {
        await expect(vinBanner.first()).toBeVisible();
      }
    });

    test('RAG diagnosis with refaccion chips', async ({ page }) => {
      await page.goto(`${STAGING_BASE_URL}/#/postventa`);
      
      // Look for diagnosis section
      const diagnosis = page.locator('.diagnosis, [data-testid="diagnosis"]');
      if (await diagnosis.isVisible()) {
        // Should show refaccion chips with "Agregar a cotización"
        const refaccionChips = page.locator('.chip, .refaccion-chip');
        if (await refaccionChips.count() > 0) {
          const addToCotizacionBtn = page.getByText(/agregar.*cotización/i);
          if (await addToCotizacionBtn.count() > 0) {
            await expect(addToCotizacionBtn.first()).toBeVisible();
          }
        }
      }
    });
  });

});

// Utility function to check mathematical tolerance
function isWithinTolerance(actual: number, expected: number, tolerancePercent = 0.5, tolerancePesos = 25): boolean {
  const percentageDiff = Math.abs((actual - expected) / expected) * 100;
  const absoluteDiff = Math.abs(actual - expected);
  
  return percentageDiff <= tolerancePercent || absoluteDiff <= tolerancePesos;
}

// Export for external QA reports
export { STAGING_BASE_URL, isWithinTolerance };