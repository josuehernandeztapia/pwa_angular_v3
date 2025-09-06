import { expect, Page, test } from '@playwright/test';

// Helper to bootstrap auth via localStorage before navigation
async function mockAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'demo_jwt_token_' + Date.now());
    localStorage.setItem('refresh_token', 'demo_refresh_token_' + Date.now());
    localStorage.setItem('current_user', JSON.stringify({
      id: '1', name: 'Asesor Demo', email: 'demo@conductores.com', role: 'asesor', permissions: []
    }));
  });
}

test.describe('Flow Builder Visual', () => {
  test('@flow-editor should open from configuración modal and render palettes', async ({ page }: { page: Page }) => {
    await mockAuth(page);
    await page.goto('/configuracion');

    // Ensure page header loaded
    await expect(page.getByRole('heading', { name: '⚙️ Configuración' })).toBeVisible();

    // Ensure Flow Builder toggle is enabled then click button
    await page.getByRole('button', { name: '🎨 Abrir Constructor' }).click();

    // Header of Flow Builder
    await expect(page.getByRole('heading', { name: '🎨 Flow Builder' })).toBeVisible();

    // Palette categories exist
    await expect(page.getByText('📦 Componentes')).toBeVisible();
    await expect(page.getByText('🌍 Mercados')).toBeVisible();
    await expect(page.getByText('📄 Documentos')).toBeVisible();
    await expect(page.getByText('🔍 Verificaciones')).toBeVisible();
    await expect(page.getByText('💼 Productos')).toBeVisible();

    await expect(page).toHaveScreenshot();
  });

  test('@flow-connections should show disabled Deploy until nodes exist', async ({ page }: { page: Page }) => {
    await mockAuth(page);
    await page.goto('/configuracion');
    await page.getByRole('button', { name: '🎨 Abrir Constructor' }).click();

    const deployBtn = page.getByRole('button', { name: '🚀 Deploy' });
    await expect(deployBtn).toBeDisabled();
  });
});

