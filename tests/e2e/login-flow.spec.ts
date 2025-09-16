/**
 * 🎬 PWA CONDUCTORES - COMPLETE E2E DEMO FLOW
 *
 * Co-Founder + QA Automation Engineer Implementation
 * Records complete user journey for professional demo video:
 *
 * 1. 🚀 Login & Authentication
 * 2. 📊 Dashboard Navigation
 * 3. 💰 Cotizador Aguascalientes (25.5% rate validation)
 * 4. 💰 Cotizador Estado de México (29.9% rate validation)
 * 5. 👥 Cotizador Colectivo (multi-vehicle)
 * 6. 🎤 AVI Voice Interview (GO/REVIEW/NO-GO simulation)
 * 7. 🛡️ Protección Rodando (health score demo)
 * 8. 📄 Document Management (upload + OCR simulation)
 * 9. 🚚 Delivery Timeline (77-day calculation)
 * 10. 👋 Professional Logout
 */

import { test, expect, Page } from '@playwright/test';

// Test Data Configuration
const DEMO_USER = {
  email: 'demo.conductor@aguascalientes.com',
  password: 'DemoAGS2024!',
  profile: 'conductor_profesional',
  location: 'aguascalientes',
  vehicleType: 'microbus_pasajeros'
};

const DEMO_RATES = {
  aguascalientes: 25.5,
  edomex: 29.9,
  colectivo_base: 22.0
};

const DEMO_TIMELINES = {
  delivery_days: 77,
  processing_days: 15,
  logistics_days: 62
};

test.describe('🎬 PWA Conductores - Complete Demo Journey', () => {

  test.beforeEach(async ({ page }) => {
    // Mock API responses for reliable demo
    await setupAPIMocks(page);
  });

  test('Complete PWA User Journey - Professional Demo', async ({ page }) => {

    // 🎬 SCENE 1: Professional Landing & Authentication
    await test.step('🚀 Professional Login Flow', async () => {
      await page.goto('/');

      // Wait for PWA to fully load
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveTitle(/Conductores/i);

      // Professional login sequence
      await page.locator('[data-testid="login-email"]').fill(DEMO_USER.email);
      await page.locator('[data-testid="login-password"]').fill(DEMO_USER.password);

      // Click login and wait for authentication
      await page.locator('[data-testid="login-submit"]').click();

      // Wait for dashboard to load
      await page.waitForURL('**/dashboard');
      await page.waitForLoadState('networkidle');
    });

    // 🎬 SCENE 2: Dashboard Overview & Navigation
    await test.step('📊 Dashboard Navigation & Overview', async () => {
      // Verify dashboard components
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="conductor-stats"]')).toBeVisible();

      // Show key metrics
      const statsElement = page.locator('[data-testid="active-policies"]');
      await expect(statsElement).toBeVisible();

      // Brief navigation showcase
      await page.locator('[data-testid="nav-cotizador"]').hover();
      await page.waitForTimeout(1500); // Smooth demo pacing
    });

    // 🎬 SCENE 3: Cotizador Aguascalientes - Rate Validation
    await test.step('💰 Cotizador Aguascalientes - 25.5% Rate Demo', async () => {
      await page.locator('[data-testid="nav-cotizador"]').click();
      await page.waitForLoadState('networkidle');

      // Select Aguascalientes
      await page.locator('[data-testid="location-aguascalientes"]').click();

      // Configure vehicle details
      await page.locator('[data-testid="vehicle-type"]').selectOption('microbus');
      await page.locator('[data-testid="vehicle-capacity"]').fill('22');
      await page.locator('[data-testid="coverage-amount"]').fill('500000');

      // Execute cotización
      await page.locator('[data-testid="calculate-quote"]').click();
      await page.waitForSelector('[data-testid="quote-result"]');

      // Validate AGS rate (25.5%)
      const rateElement = page.locator('[data-testid="insurance-rate"]');
      await expect(rateElement).toContainText('25.5%');

      // Show premium calculation
      await expect(page.locator('[data-testid="monthly-premium"]')).toBeVisible();
    });

    // 🎬 SCENE 4: Cotizador Estado de México - Higher Rate
    await test.step('💰 Cotizador Estado de México - 29.9% Rate Demo', async () => {
      // Navigate to EdoMex cotizador
      await page.locator('[data-testid="location-edomex"]').click();

      // Same vehicle configuration
      await page.locator('[data-testid="vehicle-type"]').selectOption('microbus');
      await page.locator('[data-testid="coverage-amount"]').fill('500000');

      // Execute EdoMex calculation
      await page.locator('[data-testid="calculate-quote"]').click();
      await page.waitForSelector('[data-testid="quote-result"]');

      // Validate EdoMex rate (29.9% - higher risk zone)
      const rateElement = page.locator('[data-testid="insurance-rate"]');
      await expect(rateElement).toContainText('29.9%');

      // Show risk comparison
      await expect(page.locator('[data-testid="risk-zone-indicator"]')).toBeVisible();
    });

    // 🎬 SCENE 5: Cotizador Colectivo - Multi-Vehicle
    await test.step('👥 Cotizador Colectivo - Fleet Management', async () => {
      await page.locator('[data-testid="nav-colectivo"]').click();

      // Add multiple vehicles
      await page.locator('[data-testid="add-vehicle"]').click();
      await page.locator('[data-testid="vehicle-1-type"]').selectOption('microbus');

      await page.locator('[data-testid="add-vehicle"]').click();
      await page.locator('[data-testid="vehicle-2-type"]').selectOption('autobus');

      // Calculate fleet premium
      await page.locator('[data-testid="calculate-fleet"]').click();
      await page.waitForSelector('[data-testid="fleet-result"]');

      // Show fleet discount
      await expect(page.locator('[data-testid="fleet-discount"]')).toBeVisible();
    });

    // 🎬 SCENE 6: AVI Voice Interview - Intelligence Demo
    await test.step('🎤 AVI Voice Interview - AI Decision Engine', async () => {
      await page.locator('[data-testid="nav-avi"]').click();

      // Start AVI interview
      await page.locator('[data-testid="start-avi"]').click();

      // Simulate voice interaction
      await page.locator('[data-testid="voice-record"]').click();
      await page.waitForTimeout(3000); // Simulate recording time

      // Mock voice analysis result - GO decision
      await page.waitForSelector('[data-testid="avi-result"]');
      await expect(page.locator('[data-testid="decision-indicator"]')).toContainText('GO');
      await expect(page.locator('[data-testid="confidence-score"]')).toContainText('750'); // Above GO threshold

      // Show analysis breakdown
      await expect(page.locator('[data-testid="voice-metrics"]')).toBeVisible();
    });

    // 🎬 SCENE 7: Protección Rodando - Health Score
    await test.step('🛡️ Protección Rodando - Health Assessment', async () => {
      await page.locator('[data-testid="nav-proteccion"]').click();

      // Health assessment form
      await page.locator('[data-testid="health-age"]').fill('35');
      await page.locator('[data-testid="health-condition"]').selectOption('good');
      await page.locator('[data-testid="driving-experience"]').fill('10');

      // Calculate health score
      await page.locator('[data-testid="calculate-health"]').click();
      await page.waitForSelector('[data-testid="health-result"]');

      // Show health score and premium impact
      await expect(page.locator('[data-testid="health-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="premium-reduction"]')).toBeVisible();
    });

    // 🎬 SCENE 8: Document Management - OCR Demo
    await test.step('📄 Document Management - OCR Processing', async () => {
      await page.locator('[data-testid="nav-documentos"]').click();

      // Document upload simulation
      const fileInput = page.locator('[data-testid="document-upload"]');

      // Simulate file upload (mock)
      await page.locator('[data-testid="upload-trigger"]').click();

      // OCR processing simulation
      await page.waitForSelector('[data-testid="ocr-progress"]');
      await page.waitForTimeout(2000); // Processing time

      // Show OCR results
      await expect(page.locator('[data-testid="document-status"]')).toContainText('Validado');
      await expect(page.locator('[data-testid="ocr-confidence"]')).toBeVisible();
    });

    // 🎬 SCENE 9: Delivery Timeline - 77-Day Process
    await test.step('🚚 Delivery Timeline - 77-Day Journey', async () => {
      await page.locator('[data-testid="nav-entregas"]').click();

      // Create delivery request
      await page.locator('[data-testid="create-delivery"]').click();

      // Show timeline calculation
      await expect(page.locator('[data-testid="timeline-total"]')).toContainText('77 días');

      // Timeline breakdown
      await expect(page.locator('[data-testid="processing-phase"]')).toContainText('15 días');
      await expect(page.locator('[data-testid="logistics-phase"]')).toContainText('62 días');

      // ETA calculation
      await expect(page.locator('[data-testid="estimated-delivery"]')).toBeVisible();
    });

    // 🎬 SCENE 10: Professional Logout
    await test.step('👋 Professional Session Closure', async () => {
      // User profile menu
      await page.locator('[data-testid="user-menu"]').click();

      // Show user info briefly
      await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();

      // Professional logout
      await page.locator('[data-testid="logout"]').click();

      // Confirm return to login
      await page.waitForURL('**/login');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    // 🎬 FINAL SCENE: Demo completion message
    await test.step('🎉 Demo Completion', async () => {
      // Add a completion indicator for video processing
      await page.evaluate(() => {
        const indicator = document.createElement('div');
        indicator.id = 'demo-complete';
        indicator.textContent = '✅ PWA Demo Complete - Professional Journey';
        indicator.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #4CAF50;
          color: white;
          padding: 20px;
          border-radius: 10px;
          font-size: 24px;
          z-index: 9999;
        `;
        document.body.appendChild(indicator);
      });

      await page.waitForTimeout(3000); // Show completion message
    });
  });
});

// API Mocking Setup for Reliable Demo
async function setupAPIMocks(page: Page) {
  // Mock authentication
  await page.route('**/api/auth/login', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'demo-jwt-token',
        user: {
          id: 'demo-user-001',
          name: 'Conductor Profesional',
          email: DEMO_USER.email,
          profile: DEMO_USER.profile,
          location: DEMO_USER.location
        },
        permissions: ['cotizar', 'avi', 'documentos', 'entregas']
      })
    });
  });

  // Mock cotizador responses
  await page.route('**/api/cotizar/**', route => {
    const url = route.request().url();
    let rate = DEMO_RATES.aguascalientes;

    if (url.includes('edomex')) {
      rate = DEMO_RATES.edomex;
    } else if (url.includes('colectivo')) {
      rate = DEMO_RATES.colectivo_base;
    }

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        rate: rate,
        premium: Math.round(500000 * (rate / 100)),
        coverage: 500000,
        location: url.includes('edomex') ? 'edomex' : 'aguascalientes',
        riskZone: url.includes('edomex') ? 'high' : 'medium'
      })
    });
  });

  // Mock AVI responses
  await page.route('**/api/avi/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        decision: 'GO',
        score: 750,
        confidence: 0.94,
        metrics: {
          latency: 0.25,
          pitch_variance: 0.15,
          hesitation_rate: 0.08,
          honesty_indicators: ['definitivamente', 'claro', 'seguro']
        }
      })
    });
  });

  // Mock health assessment
  await page.route('**/api/health/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        healthScore: 8.5,
        riskReduction: 15,
        premiumDiscount: 0.12,
        factors: ['good_health', 'experienced_driver', 'no_violations']
      })
    });
  });

  // Mock document OCR
  await page.route('**/api/documents/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'validated',
        confidence: 0.96,
        extractedData: {
          documentType: 'license',
          expiryDate: '2026-12-31',
          isValid: true
        }
      })
    });
  });

  // Mock delivery timeline
  await page.route('**/api/delivery/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalDays: DEMO_TIMELINES.delivery_days,
        phases: {
          processing: DEMO_TIMELINES.processing_days,
          logistics: DEMO_TIMELINES.logistics_days
        },
        estimatedDelivery: new Date(Date.now() + (77 * 24 * 60 * 60 * 1000)).toISOString()
      })
    });
  });
}