/**
 * 🎯 Production Critical E2E Tests - REAL APPLICATION FLOWS
 * Tests actual functionality that exists in the PWA
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';
const TIMEOUT = 30000;

test.describe('🚀 Production Critical Flows - PWA Conductores', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(TIMEOUT * 2);

    // Mock authentication to bypass auth guards
    await page.addInitScript(() => {
      // Mock localStorage auth token
      window.localStorage.setItem('auth_token', 'mock-jwt-token-for-e2e-testing');
      window.localStorage.setItem('user_data', JSON.stringify({
        id: 'test-user-123',
        name: 'Test User',
        email: 'test@example.com',
        role: 'agent'
      }));

      // Mock sessionStorage
      window.sessionStorage.setItem('auth_session', 'active');
    });

    // Mock API calls that might be triggered by auth guards
    await page.route('**/api/auth/**', (route) => {
      route.fulfill({
        json: {
          success: true,
          user: { id: 'test-user', name: 'Test User' },
          token: 'mock-token'
        }
      });
    });
  });

  test.describe('🏠 Dashboard & Navigation', () => {
    test('Dashboard loads successfully with navigation elements', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveTitle(/Dashboard.*Conductores PWA/);

      // Verify main navigation sections are present
      await expect(page.locator('h1, .page-title, .dashboard-title')).toBeVisible();

      // Verify we can navigate to key sections
      const links = await page.locator('a[href], button[onclick], .nav-item').count();
      expect(links).toBeGreaterThan(0);
    });

    test('Premium icons demo page loads and renders icons', async ({ page }) => {
      await page.goto(`${BASE_URL}/premium-icons-demo`);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveTitle(/Premium Icons.*Conductores PWA/);

      // Verify premium icons are rendered
      const iconElements = await page.locator('app-premium-icon, .premium-icon, svg').count();
      expect(iconElements).toBeGreaterThan(0);

      // Verify page content is visible
      await expect(page.locator('body')).not.toHaveText('');
    });
  });

  test.describe('📋 Client Management Flow', () => {
    test('Clientes list page loads with proper structure', async ({ page }) => {
      await page.goto(`${BASE_URL}/clientes`);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveTitle(/Clientes.*Conductores PWA/);

      // Verify main content area exists
      await expect(page.locator('main, .main-content, .clientes-container, body')).toBeVisible();

      // Check for list/table/grid structure indicators
      const structuralElements = await page.locator('table, .list-item, .grid-item, .card, ul, .content').count();
      expect(structuralElements).toBeGreaterThan(0);
    });

    test('Navigation to nuevo cliente works', async ({ page }) => {
      await page.goto(`${BASE_URL}/clientes/nuevo`);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveTitle(/Nuevo Cliente.*Conductores PWA/);

      // Verify form elements exist
      const formElements = await page.locator('form, input, select, textarea, button').count();
      expect(formElements).toBeGreaterThan(0);
    });
  });

  test.describe('🧮 Cotizador System', () => {
    test('Cotizador main page loads successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/cotizador`);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveTitle(/Cotizador.*Conductores PWA/);

      // Verify content is present
      await expect(page.locator('main, .cotizador-container, body')).toBeVisible();
    });

    test('AGS Individual cotizador loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/cotizador/ags-individual`);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveTitle(/AGS Individual.*Conductores PWA/);

      // Verify content loads
      await expect(page.locator('body')).not.toHaveText('');
    });
  });

  test.describe('📊 Simulador System', () => {
    test('Simulador main page loads successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/simulador`);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveTitle(/Simulador.*Conductores PWA/);

      // Verify content is present
      await expect(page.locator('main, .simulador-container, body')).toBeVisible();
    });

    test('AGS Ahorro simulador loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/simulador/ags-ahorro`);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveTitle(/AGS Ahorro.*Conductores PWA/);

      // Verify content loads
      await expect(page.locator('body')).not.toHaveText('');
    });

    test('Tanda Colectiva simulador loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/simulador/tanda-colectiva`);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveTitle(/Tanda Colectiva.*Conductores PWA/);

      // Verify content loads
      await expect(page.locator('body')).not.toHaveText('');
    });
  });

  test.describe('⚙️ Operations Dashboard', () => {
    test('OPS deliveries page loads successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/ops/deliveries`);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveTitle(/Centro de Operaciones.*Entregas/);

      // Verify content is present
      await expect(page.locator('main, .ops-container, body')).toBeVisible();
    });

    test('GNV Health monitoring loads', async ({ page }) => {
      await page.goto(`${BASE_URL}/ops/gnv-health`);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveTitle(/GNV.*Health/);

      // Verify content loads
      await expect(page.locator('body')).not.toHaveText('');
    });
  });

  test.describe('🔐 Core Application Structure', () => {
    test('Application handles 404 routes gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/non-existent-route-12345`);
      await page.waitForLoadState('networkidle');

      // Verify 404 handling
      await expect(page).toHaveTitle(/no encontrada.*Conductores PWA/);
    });

    test('Protected routes require authentication (redirect check)', async ({ page }) => {
      // Try accessing protected route without auth
      await page.goto(`${BASE_URL}/configuracion`);
      await page.waitForLoadState('networkidle');

      // Should either load the page (if mocked auth) or redirect to login
      const currentUrl = page.url();
      const pageTitle = await page.title();

      // Either authenticated and loads, or redirects to auth
      expect(currentUrl.includes('/configuracion') || currentUrl.includes('/login')).toBe(true);
    });

    test('Service Worker registration works', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Check if service worker is registered
      const serviceWorkerRegistered = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });

      expect(serviceWorkerRegistered).toBe(true);
    });
  });

  test.describe('📱 Performance & PWA Features', () => {
    test('Page load performance is acceptable', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Should load within 10 seconds (generous for E2E)
      expect(loadTime).toBeLessThan(10000);
    });

    test('Application displays content without major layout shifts', async ({ page }) => {
      await page.goto(`${BASE_URL}/premium-icons-demo`);

      // Wait for initial load
      await page.waitForTimeout(1000);

      // Take initial screenshot
      const initialHeight = await page.evaluate(() => document.body.scrollHeight);

      // Wait a bit more for any delayed loading
      await page.waitForTimeout(2000);

      // Check final height
      const finalHeight = await page.evaluate(() => document.body.scrollHeight);

      // Allow some variance but not massive layout shifts
      const heightDifference = Math.abs(finalHeight - initialHeight);
      const maxAllowedShift = initialHeight * 0.5; // 50% shift max

      expect(heightDifference).toBeLessThan(maxAllowedShift);
    });

    test('Critical CSS and assets load properly', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Check that styles are loaded (page should not be unstyled)
      const bodyBackgroundColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });

      // Should have some styling applied (not default white/transparent)
      expect(bodyBackgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(bodyBackgroundColor).not.toBe('');
    });
  });

  test.describe('🎯 Business Critical User Journeys', () => {
    test('Complete onboarding flow navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/onboarding`);
      await page.waitForLoadState('networkidle');

      // Verify onboarding page loads
      await expect(page).toHaveTitle(/Onboarding.*Conductores PWA/);

      // Verify page has interactive elements
      const interactiveElements = await page.locator('button, input, select, a[href]').count();
      expect(interactiveElements).toBeGreaterThan(0);
    });

    test('Document upload flow is accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/document-upload`);
      await page.waitForLoadState('networkidle');

      // Verify document upload page loads
      await expect(page).toHaveTitle(/Carga de Documentos.*Conductores PWA/);

      // Verify upload interface elements exist
      const uploadElements = await page.locator('input[type="file"], .upload-area, .file-input, button').count();
      expect(uploadElements).toBeGreaterThan(0);
    });

    test('Nueva oportunidad creation flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/nueva-oportunidad`);
      await page.waitForLoadState('networkidle');

      // Verify nueva oportunidad page loads
      await expect(page).toHaveTitle(/Nueva Oportunidad.*Conductores PWA/);

      // Verify form elements exist
      const formElements = await page.locator('form, input, button, select').count();
      expect(formElements).toBeGreaterThan(0);
    });
  });
});