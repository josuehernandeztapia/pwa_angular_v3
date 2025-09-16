import { test, expect } from '@playwright/test';

test('PWA Demo Flow', async ({ page }) => {
  // Navigate to app
  await page.goto('/');
  await page.waitForTimeout(3000);

  // Simple demo - just navigate and wait for recording
  await expect(page).toHaveTitle(/Conductores/i);
  await page.waitForTimeout(5000);

  console.log('Demo recording completed');
});
