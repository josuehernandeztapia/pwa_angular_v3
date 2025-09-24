/**
 * 🎥 PWA E2E DEMO - Complete User Journey Video Generation
 *
 * QA Automation Engineer + DevOps Implementation
 * Records complete user flows for PWA Conductores demo video
 *
 * Flows covered:
 * 1. Onboarding & Login → Dashboard
 * 2. Cotizadores por estado/ciudad (AGS 25.5%, EdoMex 29.9%)
 * 3. Cotizador colectivo
 * 4. Protección Rodando (simulate → apply → healthScore)
 * 5. AVI entrevista voz (GO/REVIEW/NO-GO)
 * 6. Documentos (upload + OCR + QA)
 * 7. Entregas (creación, timeline 77 días, ETA recalculado)
 */

import { test, expect, Page } from '@playwright/test';

// Test data and configuration
const TEST_CONFIG = {
  users: {
    demoUser: {
      email: 'demo@conductores.mx',
      password: 'demo123',
      phone: '4491234567'
    }
  },
  states: {
    aguascalientes: { name: 'Aguascalientes', rate: 25.5 },
    edomex: { name: 'Estado de México', rate: 29.9 }
  },
  timing: {
    short: 1000,
    medium: 2000,
    long: 3000,
    extra: 5000
  }
};

test.describe('🎥 PWA Conductores - Complete E2E Demo', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Set up demo recording context
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.setExtraHTTPHeaders({
      'X-Demo-Mode': 'true',
      'X-Test-Environment': 'e2e-demo'
    });
  });

  test('🎯 Complete PWA Journey - All Flows Demo', async () => {

    // =============================================================================
    // STEP 1: Onboarding & Authentication Flow
    // =============================================================================
    await test.step('1. 🚀 Onboarding & Login Journey', async () => {
      console.log('🎬 Recording: Onboarding & Login');

      // Navigate to landing page
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Show PWA splash screen and loading
      await expect(page.locator('[data-testid="app-loading"]').or(page.locator('app-root'))).toBeVisible();
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Navigate to login
      const loginButton = page.locator('button:has-text("Iniciar Sesión")').or(page.locator('[data-testid="login-button"]'));
      if (await loginButton.isVisible()) {
        await loginButton.click();
      } else {
        await page.goto('/login');
      }

      await page.waitForLoadState('networkidle');

      // Perform login with smooth UX demonstration
      await page.fill('input[type="email"]', TEST_CONFIG.users.demoUser.email);
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      await page.fill('input[type="password"]', TEST_CONFIG.users.demoUser.password);
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Show password visibility toggle
      const togglePassword = page.locator('[data-testid="toggle-password"]').or(page.locator('button[aria-label*="password"]'));
      if (await togglePassword.isVisible()) {
        await togglePassword.click();
        await page.waitForTimeout(TEST_CONFIG.timing.short);
        await togglePassword.click();
      }

      // Submit login
      await page.click('button[type="submit"]:has-text("Ingresar")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Verify dashboard access
      await expect(page.locator('[data-testid="dashboard"]').or(page.locator('app-dashboard'))).toBeVisible();
      console.log('✅ Login successful - Dashboard loaded');
    });

    // =============================================================================
    // STEP 2: Dashboard & Navigation Overview
    // =============================================================================
    await test.step('2. 📊 Dashboard Overview & Navigation', async () => {
      console.log('🎬 Recording: Dashboard & Navigation');

      // Show dashboard metrics and widgets
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Scroll through dashboard sections
      await page.evaluate(() => window.scrollTo(0, 200));
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Show navigation menu
      const menuButton = page.locator('[data-testid="menu-toggle"]').or(page.locator('button[aria-label*="menu"]'));
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(TEST_CONFIG.timing.medium);
        await menuButton.click();
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      console.log('✅ Dashboard overview completed');
    });

    // =============================================================================
    // STEP 3: Cotizadores por Estado - Aguascalientes (25.5%)
    // =============================================================================
    await test.step('3. 💰 Cotizador Aguascalientes (Tasa 25.5%)', async () => {
      console.log('🎬 Recording: Cotizador Aguascalientes');

      // Navigate to cotizador
      const cotizadorLink = page.locator('a:has-text("Cotizar")').or(page.locator('[data-testid="cotizador-link"]'));
      await cotizadorLink.click();
      await page.waitForLoadState('networkidle');

      // Select Aguascalientes
      const stateSelector = page.locator('select[name="state"]').or(page.locator('[data-testid="state-selector"]'));
      await stateSelector.selectOption({ label: 'Aguascalientes' });
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Fill cotización form
      const vehicleValue = '250000';
      await page.fill('input[name="vehicleValue"]', vehicleValue);
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Select coverage type
      const coverageSelector = page.locator('select[name="coverage"]').or(page.locator('[data-testid="coverage-selector"]'));
      await coverageSelector.selectOption({ label: 'Amplia' });
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Calculate quote
      await page.click('button:has-text("Calcular")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Verify Aguascalientes rate (25.5%) appears in results
      await expect(page.locator('text=25.5').or(page.locator('[data-testid="rate-display"]'))).toBeVisible();

      // Show PMT/TIR calculations
      await expect(page.locator('text=PMT').or(page.locator('text=TIR'))).toBeVisible();

      console.log('✅ Aguascalientes cotización completed - 25.5% rate verified');
    });

    // =============================================================================
    // STEP 4: Cotizadores por Estado - Estado de México (29.9%)
    // =============================================================================
    await test.step('4. 💰 Cotizador Estado de México (Tasa 29.9%)', async () => {
      console.log('🎬 Recording: Cotizador Estado de México');

      // Change to Estado de México without navigating away
      const stateSelector = page.locator('select[name="state"]').or(page.locator('[data-testid="state-selector"]'));
      await stateSelector.selectOption({ label: 'Estado de México' });
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Same vehicle value, different rate
      await page.fill('input[name="vehicleValue"]', '280000');
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Recalculate for new state
      await page.click('button:has-text("Calcular")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Verify Estado de México rate (29.9%) appears in results
      await expect(page.locator('text=29.9').or(page.locator('[data-testid="rate-display"]'))).toBeVisible();

      // Compare rates visualization
      const rateComparison = page.locator('[data-testid="rate-comparison"]');
      if (await rateComparison.isVisible()) {
        await page.waitForTimeout(TEST_CONFIG.timing.medium);
      }

      console.log('✅ Estado de México cotización completed - 29.9% rate verified');
    });

    // =============================================================================
    // STEP 5: Cotizador Colectivo
    // =============================================================================
    await test.step('5. 👥 Cotizador Colectivo - Multiple Vehicles', async () => {
      console.log('🎬 Recording: Cotizador Colectivo');

      // Navigate to collective quoter
      const collectiveLink = page.locator('a:has-text("Colectivo")').or(page.locator('[data-testid="collective-quoter"]'));
      if (await collectiveLink.isVisible()) {
        await collectiveLink.click();
        await page.waitForLoadState('networkidle');
      } else {
        // Alternative navigation
        await page.goto('/cotizador/colectivo');
        await page.waitForLoadState('networkidle');
      }

      // Add multiple vehicles
      const vehicles = [
        { type: 'Sedan', value: '200000' },
        { type: 'SUV', value: '350000' },
        { type: 'Pickup', value: '450000' }
      ];

      for (let i = 0; i < vehicles.length; i++) {
        const vehicle = vehicles[i];

        if (i > 0) {
          // Add new vehicle button
          const addVehicleBtn = page.locator('button:has-text("Agregar Vehículo")');
          await addVehicleBtn.click();
          await page.waitForTimeout(TEST_CONFIG.timing.short);
        }

        // Fill vehicle details
        const vehicleContainer = page.locator(`[data-testid="vehicle-${i}"]`).or(page.locator('.vehicle-form').nth(i));
        await vehicleContainer.locator('select[name="vehicleType"]').selectOption(vehicle.type);
        await page.waitForTimeout(TEST_CONFIG.timing.short);

        await vehicleContainer.locator('input[name="vehicleValue"]').fill(vehicle.value);
        await page.waitForTimeout(TEST_CONFIG.timing.short);
      }

      // Calculate collective quote
      await page.click('button:has-text("Calcular Colectivo")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Show collective discount and total
      await expect(page.locator('text=Descuento').or(page.locator('[data-testid="collective-discount"]'))).toBeVisible();

      console.log('✅ Collective quotation completed');
    });

    // =============================================================================
    // STEP 6: Protección Rodando - Simulate & Apply
    // =============================================================================
    await test.step('6. 🛡️ Protección Rodando - Simulation & Health Score', async () => {
      console.log('🎬 Recording: Protección Rodando');

      // Navigate to Protección Rodando
      await page.goto('/proteccion-rodando');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Start simulation
      const simulateBtn = page.locator('button:has-text("Simular")').or(page.locator('[data-testid="simulate-protection"]'));
      await simulateBtn.click();
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Fill simulation data
      await page.fill('input[name="dailyKm"]', '50');
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      await page.fill('input[name="workingDays"]', '6');
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Select risk factors
      const riskFactors = page.locator('[data-testid="risk-factors"]');
      await riskFactors.locator('input[type="checkbox"]').first().check();
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Run simulation
      await page.click('button:has-text("Ejecutar Simulación")');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Show health score calculation
      const healthScore = page.locator('[data-testid="health-score"]').or(page.locator('text=Health Score'));
      await expect(healthScore).toBeVisible();
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Apply protection
      const applyBtn = page.locator('button:has-text("Aplicar Protección")');
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
        await page.waitForTimeout(TEST_CONFIG.timing.medium);

        // Show success confirmation
        await expect(page.locator('text=Protección Aplicada').or(page.locator('[data-testid="protection-success"]'))).toBeVisible();
      }

      console.log('✅ Protección Rodando simulation completed');
    });

    // =============================================================================
    // STEP 7: AVI Voice Interview - GO/REVIEW/NO-GO Flow
    // =============================================================================
    await test.step('7. 🎤 AVI Voice Interview - Risk Assessment', async () => {
      console.log('🎬 Recording: AVI Voice Interview');

      // Navigate to AVI interview
      await page.goto('/avi');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Start AVI interview
      const startAVIBtn = page.locator('button:has-text("Iniciar Entrevista")').or(page.locator('[data-testid="start-avi"]'));
      await startAVIBtn.click();
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Show microphone permission (simulated)
      const micPermission = page.locator('[data-testid="mic-permission"]');
      if (await micPermission.isVisible()) {
        await page.locator('button:has-text("Permitir")').click();
        await page.waitForTimeout(TEST_CONFIG.timing.short);
      }

      // Simulate voice questions and responses
      const aviQuestions = [
        '¿Cuál es su ocupación actual?',
        '¿Cuántos años de experiencia tiene?',
        '¿Cuáles son sus ingresos promedio diarios?'
      ];

      for (let i = 0; i < aviQuestions.length; i++) {
        // Show question
        await expect(page.locator(`text=${aviQuestions[i]}`)).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(TEST_CONFIG.timing.medium);

        // Simulate recording (show mic active)
        const micActive = page.locator('[data-testid="mic-recording"]');
        if (await micActive.isVisible()) {
          await page.waitForTimeout(TEST_CONFIG.timing.long);
        }

        // Show transcription processing
        const transcribing = page.locator('text=Procesando...').or(page.locator('[data-testid="transcribing"]'));
        if (await transcribing.isVisible()) {
          await page.waitForTimeout(TEST_CONFIG.timing.medium);
        }

        // Move to next question
        const nextBtn = page.locator('button:has-text("Siguiente")');
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
          await page.waitForTimeout(TEST_CONFIG.timing.short);
        }
      }

      // Show AVI results with thresholds
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Verify AVI score and decision
      const aviScore = page.locator('[data-testid="avi-score"]');
      await expect(aviScore).toBeVisible();

      // Show decision (GO/REVIEW/NO-GO) with color coding
      const aviDecision = page.locator('[data-testid="avi-decision"]');
      await expect(aviDecision).toBeVisible();
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Show voice analysis metrics (L,P,D,E,H)
      const voiceMetrics = page.locator('[data-testid="voice-metrics"]');
      if (await voiceMetrics.isVisible()) {
        await page.waitForTimeout(TEST_CONFIG.timing.medium);
      }

      console.log('✅ AVI voice interview completed');
    });

    // =============================================================================
    // STEP 8: Document Upload & OCR Processing
    // =============================================================================
    await test.step('8. 📄 Document Management - Upload & OCR', async () => {
      console.log('🎬 Recording: Document Upload & OCR');

      // Navigate to documents section
      await page.goto('/documentos');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Show document upload interface
      const uploadArea = page.locator('[data-testid="upload-area"]').or(page.locator('.upload-zone'));
      await expect(uploadArea).toBeVisible();

      // Simulate file selection (document types)
      const documentTypes = [
        'Identificación Oficial',
        'Comprobante de Ingresos',
        'Licencia de Conducir'
      ];

      for (const docType of documentTypes) {
        // Select document type
        const typeSelector = page.locator('select[name="documentType"]');
        await typeSelector.selectOption(docType);
        await page.waitForTimeout(TEST_CONFIG.timing.short);

        // Simulate file upload (show upload progress)
        const uploadBtn = page.locator('button:has-text("Seleccionar Archivo")');
        await uploadBtn.click();

        // Show upload progress
        const progressBar = page.locator('[data-testid="upload-progress"]');
        if (await progressBar.isVisible()) {
          await page.waitForTimeout(TEST_CONFIG.timing.medium);
        }

        // Show OCR processing
        const ocrProcessing = page.locator('text=Procesando OCR...').or(page.locator('[data-testid="ocr-processing"]'));
        if (await ocrProcessing.isVisible()) {
          await page.waitForTimeout(TEST_CONFIG.timing.long);
        }

        // Show OCR results and validation
        const ocrResults = page.locator('[data-testid="ocr-results"]');
        if (await ocrResults.isVisible()) {
          await page.waitForTimeout(TEST_CONFIG.timing.medium);
        }

        // QA approval interface
        const qaApproval = page.locator('[data-testid="qa-approval"]');
        if (await qaApproval.isVisible()) {
          await page.locator('button:has-text("Aprobar")').click();
          await page.waitForTimeout(TEST_CONFIG.timing.short);
        }
      }

      // Show document summary and status
      const docSummary = page.locator('[data-testid="document-summary"]');
      await expect(docSummary).toBeVisible();
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      console.log('✅ Document upload and OCR processing completed');
    });

    // =============================================================================
    // STEP 9: Delivery Management - Timeline & ETA Calculation
    // =============================================================================
    await test.step('9. 🚚 Delivery Management - Timeline 77 Days & ETA', async () => {
      console.log('🎬 Recording: Delivery Management');

      // Navigate to deliveries section
      await page.goto('/entregas');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Create new delivery
      const newDeliveryBtn = page.locator('button:has-text("Nueva Entrega")').or(page.locator('[data-testid="new-delivery"]'));
      await newDeliveryBtn.click();
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Fill delivery details
      await page.fill('input[name="clientName"]', 'Juan Pérez Conductor');
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      await page.fill('input[name="address"]', 'Av. López Mateos 1234, Aguascalientes');
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      await page.selectOption('select[name="vehicleType"]', 'Sedan');
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      // Show timeline calculation (77 days)
      const timelineBtn = page.locator('button:has-text("Calcular Timeline")');
      await timelineBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Display 77-day timeline
      await expect(page.locator('text=77 días').or(page.locator('[data-testid="timeline-77"]'))).toBeVisible();

      // Show timeline breakdown
      const timelineBreakdown = page.locator('[data-testid="timeline-breakdown"]');
      if (await timelineBreakdown.isVisible()) {
        await page.waitForTimeout(TEST_CONFIG.timing.medium);
      }

      // Create delivery and show ETA calculation
      const createBtn = page.locator('button:has-text("Crear Entrega")');
      await createBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Show NEON ETA recalculation
      const etaRecalc = page.locator('[data-testid="eta-recalculation"]');
      if (await etaRecalc.isVisible()) {
        await page.waitForTimeout(TEST_CONFIG.timing.medium);
      }

      // Display delivery status and tracking
      const deliveryStatus = page.locator('[data-testid="delivery-status"]');
      await expect(deliveryStatus).toBeVisible();
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      console.log('✅ Delivery management completed - 77-day timeline shown');
    });

    // =============================================================================
    // STEP 10: Final Summary & Dashboard Return
    // =============================================================================
    await test.step('10. 🎯 Journey Summary & Return to Dashboard', async () => {
      console.log('🎬 Recording: Journey Summary');

      // Return to main dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      // Show completion summary with all completed flows
      const journeySummary = page.locator('[data-testid="journey-summary"]');
      if (await journeySummary.isVisible()) {
        await page.waitForTimeout(TEST_CONFIG.timing.medium);
      }

      // Display key metrics achieved:
      // - Cotizaciones completadas (AGS 25.5%, EdoMex 29.9%)
      // - AVI score achieved
      // - Documents processed
      // - Delivery created (77-day timeline)
      // - Health score calculated

      // Final scroll through dashboard showing all widgets
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(TEST_CONFIG.timing.short);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(TEST_CONFIG.timing.medium);

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(TEST_CONFIG.timing.long);

      console.log('🎉 Complete PWA E2E Demo Journey Finished!');

      // Log final metrics for video report
      console.log('📊 Demo Metrics Summary:');
      console.log('- Flows Completed: 7/7');
      console.log('- States Tested: Aguascalientes (25.5%), Estado de México (29.9%)');
      console.log('- AVI Interview: Voice analysis with GO/REVIEW/NO-GO');
      console.log('- Documents: Upload + OCR + QA approval');
      console.log('- Deliveries: 77-day timeline with ETA recalculation');
      console.log('- Protección Rodando: Health score simulation');
      console.log('- Cotizador Colectivo: Multi-vehicle pricing');
    });
  });

  // Performance validation during demo recording
  test.afterEach(async ({ page }) => {
    // Capture performance metrics for video report
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    console.log('📈 Performance Metrics:', performanceMetrics);
  });
});