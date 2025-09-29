import { test, expect } from '@playwright/test';

/**
 * PR#9 - Documents Minimalista E2E Tests
 * Tests for document upload, OCR states, and documents table with proper data-cy attributes
 */

test.describe('Documents Minimalista - Upload & OCR States', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to documents upload page (adjust route as needed)
    await page.goto('/documents/upload');
  });

  test('Documents shows upload UI correctly', async ({ page }) => {
    // Check upload section is visible
    await expect(page.locator('[data-cy="document-upload"]')).toBeVisible();

    // Validate upload area styling with semantic classes
    const uploadArea = page.locator('[data-cy="document-upload"]');
    await expect(uploadArea).toHaveClass(/documents__upload-area/);  // OpenAI semantic class

    // Check for upload icon and text
    await expect(page.locator('text=Subir documento')).toBeVisible();

    // Screenshot initial state
    await expect(page).toHaveScreenshot('documents-upload-initial.png');
  });

  test('Documents shows OCR Pendiente state correctly', async ({ page }) => {
    // Simulate OCR processing by injecting component state
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        component.showOCRStatus = true;
        component.ocrStatus = 'processing';
        component.isProcessingDocument = false;
        // Trigger change detection
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Wait for OCR status to appear
    await page.waitForSelector('[data-cy="ocr-status"]', { timeout: 5000 });

    // Validate OCR Pendiente state
    const ocrStatus = page.locator('[data-cy="ocr-status"]');
    await expect(ocrStatus).toBeVisible();

    const pendienteElement = page.locator('[data-cy="ocr-pendiente"]');
    await expect(pendienteElement).toBeVisible();
    await expect(pendienteElement).toHaveText('Pendiente');

    // Check for pulsing animation
    await expect(page.locator('[data-cy="ocr-status"] .animate-pulse')).toBeVisible();

    // Screenshot
    await expect(page).toHaveScreenshot('documents-ocr-pendiente.png');
  });

  test('Documents shows OCR Validado state correctly', async ({ page }) => {
    // Simulate OCR validated state
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        component.showOCRStatus = true;
        component.ocrStatus = 'validated';
        component.isProcessingDocument = false;
        component.processedDocuments = [
          { name: 'documento-test.pdf', type: 'PDF', status: 'validated' }
        ];
        // Trigger change detection
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Wait for OCR status to appear
    await page.waitForSelector('[data-cy="ocr-status"]');

    // Validate OCR Validado state
    const validadoElement = page.locator('[data-cy="ocr-validado"]');
    await expect(validadoElement).toBeVisible();
    await expect(validadoElement).toHaveText('Validado');

    // Check for success styling with semantic class
    await expect(validadoElement).toHaveClass(/documents__status--success/);

    // Screenshot
    await expect(page).toHaveScreenshot('documents-ocr-validado.png');
  });

  test('Documents shows OCR Error state correctly', async ({ page }) => {
    // Simulate OCR error state
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        component.showOCRStatus = true;
        component.ocrStatus = 'error';
        component.isProcessingDocument = false;
        component.processedDocuments = [
          { name: 'documento-error.pdf', type: 'PDF', status: 'error' }
        ];
        // Trigger change detection
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Wait for OCR status to appear
    await page.waitForSelector('[data-cy="ocr-status"]');

    // Validate OCR Error state
    const errorElement = page.locator('[data-cy="ocr-error"]');
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toHaveText('Error');

    // Check for error styling with semantic class
    await expect(errorElement).toHaveClass(/documents__status--error/);

    // Screenshot
    await expect(page).toHaveScreenshot('documents-ocr-error.png');
  });

  test('Documents shows skeleton loader during processing', async ({ page }) => {
    // Simulate processing state
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        component.isProcessingDocument = true;
        component.showOCRStatus = false;
        component.processedDocuments = [];
        // Trigger change detection
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Validate skeleton loader is visible
    await expect(page.locator('[data-cy="documents-loading"]')).toBeVisible();
    await expect(page.locator('.animate-pulse')).toBeVisible();

    // Check skeleton elements
    const skeletonElements = page.locator('[data-cy="documents-loading"] .h-4');
    await expect(skeletonElements).toHaveCount(2);

    // Screenshot of loading state
    await expect(page).toHaveScreenshot('documents-loading.png');
  });

  test('Documents shows documents table correctly', async ({ page }) => {
    // Simulate documents table with multiple documents
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        component.isProcessingDocument = false;
        component.showOCRStatus = false;
        component.processedDocuments = [
          { name: 'cedula-identidad.pdf', type: 'PDF', status: 'validated' },
          { name: 'comprobante-ingresos.jpg', type: 'Imagen', status: 'pending' },
          { name: 'documento-corrupto.pdf', type: 'PDF', status: 'error' }
        ];
        // Trigger change detection
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Wait for documents table to appear
    await page.waitForSelector('[data-cy="documents-table"]');

    // Validate documents table is visible
    const documentsTable = page.locator('[data-cy="documents-table"]');
    await expect(documentsTable).toBeVisible();

    // Check all documents are listed
    const documentItems = page.locator('[data-cy="documents-table"] .space-y-2 > div');
    await expect(documentItems).toHaveCount(3);

    // Validate document status indicators
    const statusElements = page.locator('[data-cy="doc-status"]');
    await expect(statusElements).toHaveCount(3);

    // Check specific status texts
    await expect(statusElements.nth(0)).toHaveText('Validado');
    await expect(statusElements.nth(1)).toHaveText('Pendiente');
    await expect(statusElements.nth(2)).toHaveText('Error');

    // Check status semantic classes
    await expect(statusElements.nth(0)).toHaveClass(/documents__status--success/);
    await expect(statusElements.nth(1)).toHaveClass(/documents__status--pending/);
    await expect(statusElements.nth(2)).toHaveClass(/documents__status--error/);

    // Screenshot
    await expect(page).toHaveScreenshot('documents-table.png');
  });

  test('Documents follows minimalista design patterns', async ({ page }) => {
    // Simulate complete state with documents
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        component.isProcessingDocument = false;
        component.showOCRStatus = true;
        component.ocrStatus = 'validated';
        component.processedDocuments = [
          { name: 'test-document.pdf', type: 'PDF', status: 'validated' }
        ];
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Wait for all elements to load
    await page.waitForSelector('[data-cy="documents-table"]');

    // Validate minimalista UI card styling
    const uiCard = page.locator('.ui-card').first();
    await expect(uiCard).toBeVisible();

    // Validate title styling (consistent with AVI)
    const title = page.locator('h2:has-text("Documentos")');
    await expect(title).toBeVisible();
    await expect(title).toHaveClass(/text-sm/);
    await expect(title).toHaveClass(/font-semibold/);

    // Check semantic title classes
    await expect(title).toHaveClass(/documents__title/);

    // Validate upload area semantic styling
    const uploadArea = page.locator('[data-cy="document-upload"]');
    await expect(uploadArea).toHaveClass(/documents__upload-area/);

    // Screenshot of complete minimalista design
    await expect(page).toHaveScreenshot('documents-minimalista-design.png');
  });

  test('Documents validates all required data-cy attributes', async ({ page }) => {
    // Simulate full state to test all data-cy attributes
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        component.showOCRStatus = true;
        component.ocrStatus = 'validated';
        component.isProcessingDocument = false;
        component.processedDocuments = [
          { name: 'test1.pdf', type: 'PDF', status: 'validated' },
          { name: 'test2.jpg', type: 'Imagen', status: 'pending' }
        ];
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Validate required data-cy attributes exist
    await expect(page.locator('[data-cy="document-upload"]')).toBeVisible();
    await expect(page.locator('[data-cy="ocr-status"]')).toBeVisible();
    await expect(page.locator('[data-cy="ocr-validado"]')).toBeVisible();
    await expect(page.locator('[data-cy="documents-table"]')).toBeVisible();

    // Validate doc-status attributes
    const docStatusElements = page.locator('[data-cy="doc-status"]');
    await expect(docStatusElements).toHaveCount(2);

    // Check each doc status element is visible
    for (let i = 0; i < 2; i++) {
      await expect(docStatusElements.nth(i)).toBeVisible();
    }
  });

  test('Documents handles file upload interaction', async ({ page }) => {
    // Test file upload interaction
    const uploadArea = page.locator('[data-cy="document-upload"]');
    await expect(uploadArea).toBeVisible();

    // Simulate file selection (note: actual file upload would require more setup)
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component && component.onFileSelected) {
        // Mock file event
        const mockEvent = {
          target: {
            files: [{
              name: 'test-upload.pdf',
              type: 'application/pdf',
              size: 1024
            }]
          }
        };
        component.onFileSelected(mockEvent);
      }
    });

    // Wait a moment for processing simulation
    await page.waitForTimeout(1000);

    // Screenshot of interaction
    await expect(page).toHaveScreenshot('documents-upload-interaction.png');
  });

  test('Documents shows empty state when no documents', async ({ page }) => {
    // Ensure clean state
    await page.evaluate(() => {
      const component = (window as any).ngComponent;
      if (component) {
        component.isProcessingDocument = false;
        component.showOCRStatus = false;
        component.processedDocuments = [];
        if (component.cdr) component.cdr.detectChanges();
      }
    });

    // Only upload area should be visible, no table or status
    await expect(page.locator('[data-cy="document-upload"]')).toBeVisible();
    await expect(page.locator('[data-cy="ocr-status"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="documents-table"]')).not.toBeVisible();
    await expect(page.locator('[data-cy="documents-loading"]')).not.toBeVisible();

    // Screenshot of empty state
    await expect(page).toHaveScreenshot('documents-empty-state.png');
  });

});