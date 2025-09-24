/**
 * 🎥 SIMPLE PWA DEMO - Basic functionality test with video recording
 *
 * This is a simplified version that should work reliably in CI/CD
 */

import { test, expect } from '@playwright/test';

test.describe('PWA Conductores - Simple Demo', () => {
  test('Basic PWA functionality and navigation', async ({ page }) => {
    console.log('🎬 Starting PWA demo recording...');

    try {
      // Navigate to PWA
      console.log('📍 Navigating to PWA...');
      await page.goto('http://localhost:4200');

      // Wait for PWA to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Check if PWA loads
      console.log('✅ PWA loaded successfully');
      await expect(page).toHaveTitle(/Conductores/i);

      // Take screenshot for demo
      await page.screenshot({ path: 'demo-home.png' });

      // Try to find main navigation or content
      const mainContent = page.locator('body');
      await expect(mainContent).toBeVisible();

      console.log('🎯 Demo recording complete');

    } catch (error) {
      console.error('❌ Demo test failed:', error);
      await page.screenshot({ path: 'demo-error.png' });
      throw error;
    }
  });
});