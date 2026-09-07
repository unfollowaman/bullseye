import { test, expect } from '@playwright/test';

test.describe('Phase 10 — Device & Capture Presets E2E Tests', () => {
  test('Select device preset -> configure capture -> capture -> output matching expected viewport/DPR', async ({ page }) => {
    await page.goto('/');

    // Verify capture form page loaded
    await expect(page.getByTestId('capture-form')).toBeVisible();

    // Fill target URL
    await page.fill('#target-url', 'https://example.com');

    // Select Device Preset: Mobile iPhone
    await page.selectOption('[data-testid="device-preset-select"]', 'device_mobile_iphone');

    // Check viewport inputs automatically updated
    await expect(page.getByTestId('viewport-width-input')).toHaveValue('390');
    await expect(page.getByTestId('viewport-height-input')).toHaveValue('844');
    await expect(page.getByTestId('device-scale-factor-select')).toHaveValue('3');

    // Start Capture
    await page.click('[data-testid="start-capture-button"]');

    // Wait for capture completion
    await expect(page.getByTestId('capture-status')).toContainText(/finished|completed/i, { timeout: 30000 });

    // Verify screenshot result rendered
    await expect(page.getByTestId('screenshot-result')).toBeVisible();
    await expect(page.getByTestId('screenshot-result')).toContainText('390');
    await expect(page.getByTestId('screenshot-result')).toContainText('844');
  });

  test('Select capture preset -> execute capture -> verify resolved configuration', async ({ page }) => {
    await page.goto('/');

    // Select Capture Preset: Full Page Desktop Audit
    await page.selectOption('[data-testid="capture-preset-select"]', 'preset_fullpage_audit');

    // Verify form populated correctly
    await expect(page.getByTestId('screenshot-mode-select')).toHaveValue('fullPage');
    await expect(page.getByTestId('viewport-width-input')).toHaveValue('1920');
    await expect(page.getByTestId('viewport-height-input')).toHaveValue('1080');

    // Fill target URL and execute
    await page.fill('#target-url', 'https://example.com');
    await page.click('[data-testid="start-capture-button"]');

    await expect(page.getByTestId('capture-status')).toContainText(/finished|completed/i, { timeout: 30000 });
    await expect(page.getByTestId('screenshot-result')).toBeVisible();
  });

  test('Recipe -> preset/resolved configuration -> Capture Controller -> output', async ({ page }) => {
    await page.goto('/recipes');

    // Verify recipes page loaded
    await expect(page.getByText('Capture Recipes')).toBeVisible();

    // Create a new recipe with preset configuration
    await page.click('button:has-text("New Recipe")');
    await page.fill('input[placeholder="e.g., Homepage Desktop Audit"]', 'Preset Test Recipe');
    await page.fill('input[placeholder="https://example.com"]', 'https://example.com');

    // Select preset in recipe form
    await page.selectOption('[data-testid="device-preset-select"]', 'device_laptop_retina');
    await page.click('button:has-text("Save Recipe")');

    // Verify recipe was created
    await expect(page.getByText('Preset Test Recipe')).toBeVisible();

    // Execute recipe
    await page.click('button:has-text("Run Recipe")');

    // Verify execution succeeded
    await expect(page.getByText(/Recipe executed successfully|finished/i)).toBeVisible({ timeout: 30000 });
  });
});
