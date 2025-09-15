/**
 * 🎭 KIBAN/HASE Integration E2E Tests
 * Production-ready testing for risk evaluation system
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:4200';
const BFF_URL = 'http://localhost:3001';
const TIMEOUT = 30000;

// Test data scenarios
const testScenarios = {
  lowRisk: {
    clientId: 'CLI-LOW-RISK-001',
    document: {
      country: 'MX',
      idType: 'INE',
      idNumber: 'ABCD123456789',
      curp: 'ABCD891201HDFXXX01'
    },
    expectedDecision: 'GO',
    expectedCategory: 'LOW'
  },
  mediumRisk: {
    clientId: 'CLI-MEDIUM-RISK-002',
    document: {
      country: 'MX',
      idType: 'INE',
      idNumber: 'EFGH123456789',
      curp: 'EFGH891201HDFXXX02'
    },
    expectedDecision: 'REVIEW',
    expectedCategory: 'MEDIUM'
  },
  highRisk: {
    clientId: 'CLI-HIGH-RISK-003',
    document: {
      country: 'MX',
      idType: 'INE',
      idNumber: 'IJKL123456789',
      curp: 'IJKL891201HDFXXX03'
    },
    expectedDecision: 'NO-GO',
    expectedCategory: 'HIGH'
  },
  notFound: {
    clientId: 'CLI-NOT-FOUND-404',
    document: {
      country: 'MX',
      idType: 'INE',
      idNumber: 'NOTFOUND123456',
      curp: 'NFND891201HDFXXX04'
    },
    expectedDecision: 'REVIEW',
    expectedCategory: 'UNKNOWN'
  }
};

// Test utilities
class KibanHaseTestUtils {
  static async navigateToRiskEvaluation(page: Page, clientId: string) {
    await page.goto(`${BASE_URL}/#/clientes/${clientId}/evaluacion-riesgo`);
    await page.waitForLoadState('networkidle');
  }

  static async waitForRiskPanel(page: Page) {
    await page.waitForSelector('[data-testid="risk-panel"]', { 
      timeout: TIMEOUT,
      state: 'visible' 
    });
  }

  static async triggerRiskEvaluation(page: Page, clientData: any) {
    // Fill client information
    await page.fill('[data-testid="client-id-input"]', clientData.clientId);
    await page.fill('[data-testid="document-number"]', clientData.document.idNumber);
    await page.fill('[data-testid="curp-input"]', clientData.document.curp);
    
    // Click evaluate button
    await page.click('[data-testid="evaluate-risk-btn"]');
    
    // Wait for evaluation to complete
    await page.waitForSelector('[data-testid="risk-evaluation-complete"]', { 
      timeout: TIMEOUT 
    });
  }

  static async getRiskPanelData(page: Page) {
    const panel = page.locator('[data-testid="risk-panel"]');
    
    return {
      kibanScore: await panel.locator('[data-testid="kiban-score"]').textContent(),
      scoreBand: await panel.locator('[data-testid="score-band"]').textContent(),
      haseCategory: await panel.locator('[data-testid="hase-category"]').textContent(),
      decision: await panel.locator('[data-testid="decision-gate"]').textContent(),
      reasons: await panel.locator('[data-testid="risk-reason"]').allTextContents(),
      suggestions: await panel.locator('[data-testid="suggestion"]').allTextContents()
    };
  }

  static async verifyPremiumUXElements(page: Page) {
    // Verify premium icons are present
    const premiumIcons = await page.locator('app-premium-icon').count();
    expect(premiumIcons).toBeGreaterThan(0);
    
    // Verify human microcopy
    const humanMessages = await page.locator('.human-message').count();
    expect(humanMessages).toBeGreaterThan(0);
    
    // Verify animations
    const animatedElements = await page.locator('[class*="animate-"]').count();
    expect(animatedElements).toBeGreaterThan(0);
  }

  static async takeScreenshotOnError(page: Page, testName: string) {
    try {
      await page.screenshot({ 
        path: `test-results/kiban-hase-error-${testName}-${Date.now()}.png`, 
        fullPage: true 
      });
    } catch (error) {
      console.log('Failed to take screenshot:', error);
    }
  }
}

test.describe('🎯 KIBAN/HASE Risk Evaluation System', () => {
  
  test.beforeEach(async ({ page }) => {
    test.setTimeout(TIMEOUT * 2);
    
    // Mock BFF responses for consistent testing
    await page.route(`${BFF_URL}/api/bff/risk/**`, async route => {
      const url = route.request().url();
      const method = route.request().method();
      
      if (method === 'POST' && url.includes('/evaluate')) {
        const requestBody = route.request().postDataJSON();
        const clientId = requestBody?.clientId;
        
        // Return mock responses based on client ID
        if (clientId?.includes('LOW-RISK')) {
          await route.fulfill({
            json: {
              kiban: {
                scoreRaw: 780,
                scoreBand: 'A',
                status: 'OK',
                reasons: [
                  { code: 'GOOD_HISTORY', desc: 'Historial crediticio excelente' }
                ],
                bureauRef: 'KBN-REF-2025-001'
              },
              hase: {
                riskScore01: 0.85,
                category: 'LOW',
                explain: [
                  { factor: 'KIBAN_SCORE', weight: 0.45, impact: 'POS' },
                  { factor: 'AVI_VOICE', weight: 0.25, impact: 'POS' }
                ]
              },
              decision: {
                gate: 'GO',
                hardStops: [],
                suggestions: []
              },
              latencyMs: 1200
            }
          });
        } else if (clientId?.includes('MEDIUM-RISK')) {
          await route.fulfill({
            json: {
              kiban: {
                scoreRaw: 650,
                scoreBand: 'B',
                status: 'OK',
                reasons: [
                  { code: 'UTIL_75', desc: 'Uso de línea de crédito >75%' },
                  { code: 'RECENT_INQUIRY', desc: 'Consultas recientes en buró' }
                ],
                bureauRef: 'KBN-REF-2025-002'
              },
              hase: {
                riskScore01: 0.68,
                category: 'MEDIUM',
                explain: [
                  { factor: 'KIBAN_SCORE', weight: 0.45, impact: 'NEU' },
                  { factor: 'AVI_VOICE', weight: 0.25, impact: 'POS' }
                ]
              },
              decision: {
                gate: 'REVIEW',
                hardStops: [],
                suggestions: ['Requiere aval', 'Reducir plazo a 48 meses']
              },
              latencyMs: 1350
            }
          });
        } else if (clientId?.includes('HIGH-RISK')) {
          await route.fulfill({
            json: {
              kiban: {
                scoreRaw: 420,
                scoreBand: 'D',
                status: 'OK',
                reasons: [
                  { code: 'MORA_90', desc: 'Mora de 90+ días en último año' },
                  { code: 'HIGH_UTIL', desc: 'Uso de línea >90%' },
                  { code: 'DEFAULTS', desc: 'Historial de incumplimientos' }
                ],
                bureauRef: 'KBN-REF-2025-003'
              },
              hase: {
                riskScore01: 0.32,
                category: 'HIGH',
                explain: [
                  { factor: 'KIBAN_SCORE', weight: 0.45, impact: 'NEG' },
                  { factor: 'AVI_VOICE', weight: 0.25, impact: 'NEU' }
                ]
              },
              decision: {
                gate: 'NO-GO',
                hardStops: ['MORA_90'],
                suggestions: ['Alternativa: ahorro 6 meses + reevaluación']
              },
              latencyMs: 980
            }
          });
        } else if (clientId?.includes('NOT-FOUND')) {
          await route.fulfill({
            json: {
              kiban: {
                scoreRaw: 0,
                scoreBand: 'N/A',
                status: 'NOT_FOUND',
                reasons: [],
                bureauRef: ''
              },
              hase: {
                riskScore01: 0.50,
                category: 'UNKNOWN',
                explain: [
                  { factor: 'AVI_VOICE', weight: 0.50, impact: 'POS' },
                  { factor: 'GNV_HISTORY', weight: 0.30, impact: 'POS' }
                ]
              },
              decision: {
                gate: 'REVIEW',
                hardStops: [],
                suggestions: ['Solicitar comprobantes de ingreso', 'Evaluación AVI + GNV']
              },
              latencyMs: 800
            }
          });
        }
      }
    });
  });

  test.describe('🟢 Low Risk Scenarios - GO Decision', () => {
    test('Low risk client gets approved automatically', async ({ page }) => {
      try {
        await KibanHaseTestUtils.navigateToRiskEvaluation(page, testScenarios.lowRisk.clientId);
        await KibanHaseTestUtils.triggerRiskEvaluation(page, testScenarios.lowRisk);
        
        const riskData = await KibanHaseTestUtils.getRiskPanelData(page);
        
        // Verify KIBAN score and band
        expect(riskData.kibanScore).toContain('780');
        expect(riskData.scoreBand).toContain('A');
        
        // Verify HASE category
        expect(riskData.haseCategory).toContain('LOW');
        
        // Verify decision
        expect(riskData.decision).toContain('GO');
        
        // Verify no suggestions for low risk
        expect(riskData.suggestions.length).toBe(0);
        
        // Verify premium UX elements
        await KibanHaseTestUtils.verifyPremiumUXElements(page);
        
      } catch (error) {
        await KibanHaseTestUtils.takeScreenshotOnError(page, 'low-risk-approval');
        throw error;
      }
    });
  });

  test.describe('🟡 Medium Risk Scenarios - REVIEW Decision', () => {
    test('Medium risk client requires review with suggestions', async ({ page }) => {
      try {
        await KibanHaseTestUtils.navigateToRiskEvaluation(page, testScenarios.mediumRisk.clientId);
        await KibanHaseTestUtils.triggerRiskEvaluation(page, testScenarios.mediumRisk);
        
        const riskData = await KibanHaseTestUtils.getRiskPanelData(page);
        
        // Verify KIBAN score and band
        expect(riskData.kibanScore).toContain('650');
        expect(riskData.scoreBand).toContain('B');
        
        // Verify HASE category
        expect(riskData.haseCategory).toContain('MEDIUM');
        
        // Verify decision
        expect(riskData.decision).toContain('REVIEW');
        
        // Verify risk reasons are displayed (max 3)
        expect(riskData.reasons.length).toBeGreaterThan(0);
        expect(riskData.reasons.length).toBeLessThanOrEqual(3);
        
        // Verify suggestions are provided
        expect(riskData.suggestions.length).toBeGreaterThan(0);
        expect(riskData.suggestions.some(s => s.includes('aval'))).toBe(true);
        
        // Verify CTA buttons for mitigation actions
        const ctaButtons = await page.locator('[data-testid="mitigation-cta"]').count();
        expect(ctaButtons).toBeGreaterThan(0);
        
      } catch (error) {
        await KibanHaseTestUtils.takeScreenshotOnError(page, 'medium-risk-review');
        throw error;
      }
    });
    
    test('Review decision shows mitigation options', async ({ page }) => {
      try {
        await KibanHaseTestUtils.navigateToRiskEvaluation(page, testScenarios.mediumRisk.clientId);
        await KibanHaseTestUtils.triggerRiskEvaluation(page, testScenarios.mediumRisk);
        
        // Click on "Add Guarantor" suggestion
        const addGuarantorBtn = page.locator('[data-testid="add-guarantor-btn"]');
        if (await addGuarantorBtn.isVisible()) {
          await addGuarantorBtn.click();
          
          // Verify guarantor form opens
          await expect(page.locator('[data-testid="guarantor-form"]')).toBeVisible();
        }
        
        // Click on "Reduce Term" suggestion
        const reduceTermBtn = page.locator('[data-testid="reduce-term-btn"]');
        if (await reduceTermBtn.isVisible()) {
          await reduceTermBtn.click();
          
          // Verify cotizador opens with reduced term
          await page.waitForURL('**/cotizador**');
          const termInput = page.locator('[data-testid="term-months"]');
          const termValue = await termInput.inputValue();
          expect(parseInt(termValue)).toBeLessThanOrEqual(48);
        }
        
      } catch (error) {
        await KibanHaseTestUtils.takeScreenshotOnError(page, 'mitigation-actions');
        throw error;
      }
    });
  });

  test.describe('🔴 High Risk Scenarios - NO-GO Decision', () => {
    test('High risk client gets rejected with hard stops', async ({ page }) => {
      try {
        await KibanHaseTestUtils.navigateToRiskEvaluation(page, testScenarios.highRisk.clientId);
        await KibanHaseTestUtils.triggerRiskEvaluation(page, testScenarios.highRisk);
        
        const riskData = await KibanHaseTestUtils.getRiskPanelData(page);
        
        // Verify KIBAN score and band
        expect(riskData.kibanScore).toContain('420');
        expect(riskData.scoreBand).toContain('D');
        
        // Verify HASE category
        expect(riskData.haseCategory).toContain('HIGH');
        
        // Verify decision
        expect(riskData.decision).toContain('NO-GO');
        
        // Verify hard stop reasons are shown
        expect(riskData.reasons.some(r => r.includes('90'))).toBe(true); // MORA_90
        
        // Verify alternative suggestions
        expect(riskData.suggestions.some(s => s.includes('ahorro'))).toBe(true);
        
        // Verify rejection message with human microcopy
        const rejectionMessage = await page.locator('[data-testid="rejection-message"]');
        expect(await rejectionMessage.isVisible()).toBe(true);
        
        const messageText = await rejectionMessage.textContent();
        expect(messageText).toContain('NO-GO');
        expect(messageText).toContain('Mora 90 días');
        
      } catch (error) {
        await KibanHaseTestUtils.takeScreenshotOnError(page, 'high-risk-rejection');
        throw error;
      }
    });
  });

  test.describe('❓ Not Found Scenarios - Fallback to AVI+GNV', () => {
    test('Not found in KIBAN falls back to AVI+GNV evaluation', async ({ page }) => {
      try {
        await KibanHaseTestUtils.navigateToRiskEvaluation(page, testScenarios.notFound.clientId);
        await KibanHaseTestUtils.triggerRiskEvaluation(page, testScenarios.notFound);
        
        const riskData = await KibanHaseTestUtils.getRiskPanelData(page);
        
        // Verify NOT_FOUND status is handled gracefully
        expect(riskData.scoreBand).toContain('N/A');
        
        // Verify fallback to REVIEW decision
        expect(riskData.decision).toContain('REVIEW');
        
        // Verify fallback suggestions
        expect(riskData.suggestions.some(s => s.includes('comprobantes'))).toBe(true);
        expect(riskData.suggestions.some(s => s.includes('AVI'))).toBe(true);
        
        // Verify informative message about alternative evaluation
        const fallbackMessage = await page.locator('[data-testid="fallback-message"]');
        expect(await fallbackMessage.isVisible()).toBe(true);
        
        const messageText = await fallbackMessage.textContent();
        expect(messageText).toContain('No encontrado en buró');
        expect(messageText).toContain('evidencia adicional');
        
      } catch (error) {
        await KibanHaseTestUtils.takeScreenshotOnError(page, 'not-found-fallback');
        throw error;
      }
    });
  });

  test.describe('⚡ Performance & UX', () => {
    test('Risk evaluation completes within performance thresholds', async ({ page }) => {
      const startTime = Date.now();
      
      await KibanHaseTestUtils.navigateToRiskEvaluation(page, testScenarios.lowRisk.clientId);
      
      // Start performance measurement
      await page.addInitScript(() => {
        window.performance.mark('evaluation-start');
      });
      
      await KibanHaseTestUtils.triggerRiskEvaluation(page, testScenarios.lowRisk);
      
      // End performance measurement
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete within 5 seconds
      expect(totalTime).toBeLessThan(5000);
      
      // Verify loading states are shown during evaluation
      const loadingIndicator = page.locator('[data-testid="evaluation-loading"]');
      // Loading should be gone after completion
      expect(await loadingIndicator.isVisible()).toBe(false);
    });
    
    test('Premium UX components render correctly', async ({ page }) => {
      await KibanHaseTestUtils.navigateToRiskEvaluation(page, testScenarios.mediumRisk.clientId);
      await KibanHaseTestUtils.triggerRiskEvaluation(page, testScenarios.mediumRisk);
      
      // Verify premium icons with semantic context
      const riskIcons = await page.locator('[data-testid="risk-icon"]').count();
      expect(riskIcons).toBeGreaterThan(0);
      
      // Verify score visualization
      const scoreVisualization = page.locator('[data-testid="score-visualization"]');
      expect(await scoreVisualization.isVisible()).toBe(true);
      
      // Verify decision chip with proper styling
      const decisionChip = page.locator('[data-testid="decision-chip"]');
      expect(await decisionChip.isVisible()).toBe(true);
      
      const chipClass = await decisionChip.getAttribute('class');
      expect(chipClass).toContain('chip-review'); // Should have appropriate styling
      
      // Verify animations are working
      const animatedElements = await page.locator('.animate-fadeIn, .animate-slideUp').count();
      expect(animatedElements).toBeGreaterThan(0);
    });
  });

  test.describe('🔄 Error Handling & Resilience', () => {
    test('Handles BFF API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route(`${BFF_URL}/api/bff/risk/evaluate`, route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      try {
        await KibanHaseTestUtils.navigateToRiskEvaluation(page, testScenarios.lowRisk.clientId);
        await KibanHaseTestUtils.triggerRiskEvaluation(page, testScenarios.lowRisk);
        
        // Should show error message
        const errorMessage = await page.locator('[data-testid="api-error-message"]');
        expect(await errorMessage.isVisible()).toBe(true);
        
        // Should offer retry option
        const retryButton = await page.locator('[data-testid="retry-evaluation-btn"]');
        expect(await retryButton.isVisible()).toBe(true);
        
      } catch (error) {
        await KibanHaseTestUtils.takeScreenshotOnError(page, 'api-error-handling');
        throw error;
      }
    });
    
    test('Handles timeout scenarios', async ({ page }) => {
      // Mock slow response
      await page.route(`${BFF_URL}/api/bff/risk/evaluate`, async route => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10s delay
        route.fulfill({ json: { timeout: true } });
      });
      
      await KibanHaseTestUtils.navigateToRiskEvaluation(page, testScenarios.lowRisk.clientId);
      
      // Should show timeout handling
      const timeoutMessage = page.locator('[data-testid="timeout-message"]');
      
      // Trigger evaluation and expect timeout handling
      await KibanHaseTestUtils.triggerRiskEvaluation(page, testScenarios.lowRisk);
      
      // Verify timeout is handled gracefully
      await expect(timeoutMessage).toBeVisible({ timeout: 12000 });
    });
  });
});

test.describe('🔗 Integration with Existing Systems', () => {
  test('KIBAN/HASE integrates with Webhook Retry System', async ({ page }) => {
    // Test webhook integration
    await page.route(`${BFF_URL}/api/bff/webhooks/**`, route => {
      route.fulfill({
        json: {
          webhookId: 'WH-KIBAN-001',
          status: 'processed',
          retryCount: 0,
          success: true
        }
      });
    });
    
    await KibanHaseTestUtils.navigateToRiskEvaluation(page, testScenarios.lowRisk.clientId);
    await KibanHaseTestUtils.triggerRiskEvaluation(page, testScenarios.lowRisk);
    
    // Verify webhook processing status
    const webhookStatus = page.locator('[data-testid="webhook-status"]');
    if (await webhookStatus.isVisible()) {
      expect(await webhookStatus.textContent()).toContain('processed');
    }
  });
  
  test('Risk evaluation integrates with Premium Icons', async ({ page }) => {
    await KibanHaseTestUtils.navigateToRiskEvaluation(page, testScenarios.mediumRisk.clientId);
    await KibanHaseTestUtils.triggerRiskEvaluation(page, testScenarios.mediumRisk);
    
    // Verify premium icons are used for risk factors
    const premiumIcons = await page.locator('app-premium-icon').count();
    expect(premiumIcons).toBeGreaterThan(0);
    
    // Verify icons have appropriate semantic context
    const riskIcon = page.locator('app-premium-icon[semantic-context="risk"]').first();
    if (await riskIcon.isVisible()) {
      const iconType = await riskIcon.getAttribute('icon-type');
      expect(['warning', 'shield', 'alert'].includes(iconType)).toBe(true);
    }
  });
  
  test('Human microcopy system provides contextual messages', async ({ page }) => {
    await KibanHaseTestUtils.navigateToRiskEvaluation(page, testScenarios.highRisk.clientId);
    await KibanHaseTestUtils.triggerRiskEvaluation(page, testScenarios.highRisk);
    
    // Verify human messages are used
    const humanMessage = page.locator('.human-message').first();
    expect(await humanMessage.isVisible()).toBe(true);
    
    const messageText = await humanMessage.textContent();
    expect(messageText.length).toBeGreaterThan(20); // Should be meaningful message
    expect(messageText).not.toContain('ERROR'); // Should not show technical errors
    expect(messageText).not.toContain('null'); // Should not show null values
  });
});