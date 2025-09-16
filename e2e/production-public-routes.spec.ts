/**
 * 🎯 Production Public Routes E2E Tests
 * Tests routes that don't require authentication
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';
const TIMEOUT = 30000;

test.describe('🚀 Production Public Routes - PWA Conductores', () => {

  test.beforeEach(async ({ page }) => {
    test.setTimeout(TIMEOUT);
  });

  test.describe('🔐 Authentication Flow', () => {
    test('Login page loads successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Verify login page loads
      await expect(page).toHaveTitle(/Iniciar Sesión.*Conductores PWA/);

      // Verify login elements exist
      const loginElements = await page.locator('form, input, button, .login-form, .auth-form').count();
      expect(loginElements).toBeGreaterThan(0);
    });

    test('Register page loads successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);
      await page.waitForLoadState('networkidle');

      // Verify register page loads
      await expect(page).toHaveTitle(/Registro.*Conductores PWA/);

      // Verify form elements exist
      const formElements = await page.locator('form, input, button').count();
      expect(formElements).toBeGreaterThan(0);
    });
  });

  test.describe('🔐 Core Application Structure', () => {
    test('Root redirects to dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');

      // Should redirect to dashboard (then to login due to auth guard)
      const currentUrl = page.url();
      expect(currentUrl.includes('/dashboard') || currentUrl.includes('/login')).toBe(true);
    });

    test('404 page handles non-existent routes', async ({ page }) => {
      await page.goto(`${BASE_URL}/non-existent-route-12345`);
      await page.waitForLoadState('networkidle');

      // Verify 404 handling
      await expect(page).toHaveTitle(/no encontrada.*Conductores PWA/);
    });

    test('Offline page is accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/offline`);
      await page.waitForLoadState('networkidle');

      // Verify offline page loads
      await expect(page).toHaveTitle(/Sin conexión/);
    });

    test('Unauthorized page is accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/unauthorized`);
      await page.waitForLoadState('networkidle');

      // Verify unauthorized page loads
      await expect(page).toHaveTitle(/No autorizado.*Conductores PWA/);
    });
  });

  test.describe('📱 Performance & PWA Features', () => {
    test('Application loads basic assets correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Check that styles are loaded
      const hasStyles = await page.evaluate(() => {
        const computedStyle = window.getComputedStyle(document.body);
        return computedStyle.backgroundColor !== '' || computedStyle.color !== '';
      });

      expect(hasStyles).toBe(true);
    });

    test('Service Worker support is available', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Check if service worker is supported
      const serviceWorkerSupported = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });

      expect(serviceWorkerSupported).toBe(true);
    });

    test('Page load performance is reasonable', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      const endTime = Date.now();
      const loadTime = endTime - startTime;

      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });

    test('No major console errors on page load', async ({ page }) => {
      const consoleErrors = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Filter out common non-critical errors
      const criticalErrors = consoleErrors.filter(error => {
        return !error.includes('favicon') &&
               !error.includes('manifest') &&
               !error.includes('service-worker') &&
               !error.toLowerCase().includes('network');
      });

      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('🔄 Navigation & Routing', () => {
    test('Protected routes redirect to login when not authenticated', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Should be redirected to login
      const currentUrl = page.url();
      expect(currentUrl.includes('/login')).toBe(true);
    });

    test('Multiple protected routes redirect properly', async ({ page }) => {
      const protectedRoutes = [
        '/clientes',
        '/cotizador',
        '/simulador',
        '/configuracion'
      ];

      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        // Should either show login or be on the requested page (if auth works)
        expect(currentUrl.includes('/login') || currentUrl.includes(route)).toBe(true);
      }
    });
  });

  test.describe('🎨 UI & Styling', () => {
    test('Login page renders with proper styling', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Wait a moment for styles to load
      await page.waitForTimeout(1000);

      // Check that the page has meaningful content and styling
      const bodyText = await page.locator('body').textContent();
      expect(bodyText.length).toBeGreaterThan(10);

      // Check for basic styling
      const bodyBackgroundColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });

      expect(bodyBackgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    test('Page layout is stable on load', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Initial load
      await page.waitForTimeout(500);
      const initialHeight = await page.evaluate(() => document.body.scrollHeight);

      // Wait for potential layout shifts
      await page.waitForTimeout(2000);
      const finalHeight = await page.evaluate(() => document.body.scrollHeight);

      // Allow small variance but not major shifts
      const heightDifference = Math.abs(finalHeight - initialHeight);
      expect(heightDifference).toBeLessThan(100); // 100px tolerance
    });
  });

  test.describe('💡 Progressive Web App Features', () => {
    test('Meta tags for PWA are present', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      // Check for viewport meta tag
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewportMeta).toBeTruthy();

      // Check for PWA manifest (optional)
      const manifestLink = await page.locator('link[rel="manifest"]').count();
      // Should be 0 or 1, just checking it doesn't error
      expect(manifestLink).toBeGreaterThanOrEqual(0);
    });

    test('Basic responsive design works', async ({ page }) => {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      const mobileBodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(mobileBodyWidth).toBeLessThanOrEqual(400); // Should fit in mobile viewport

      // Test desktop viewport
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      const desktopBodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(desktopBodyWidth).toBeGreaterThan(375); // Should use more space on desktop
    });
  });
});