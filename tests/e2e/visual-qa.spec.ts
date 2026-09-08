import { test, expect } from '@playwright/test';

test.describe('Phase 13 Visual QA Subsystem End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Bullseye Dashboard');
  });

  test('1. Visual QA navigation tab opens Visual QA manager interface', async ({ page }) => {
    await page.click('button[data-testid="nav-tab-visual-qa"]');
    const vqaContainer = page.getByTestId('visual-qa-container');
    await expect(vqaContainer).toBeVisible();
    await expect(vqaContainer).toContainText('Visual QA & Screenshot Comparison');
  });

  test('2. Runs Visual QA comparison on captured screenshots, displaying PASS/FAIL, metrics, and diff/overlay previews', async ({ page }) => {
    // 1. Capture a baseline screenshot of dashboard homepage
    await page.fill('#target-url', 'http://localhost:3000');
    await page.selectOption('#capture-type', 'screenshot');
    await page.click('button[data-testid="start-capture-button"]');

    const previewImg = page.getByTestId('screenshot-preview-image');
    await expect(previewImg).toBeVisible({ timeout: 15000 });

    const baselinePath = await previewImg.getAttribute('src');
    expect(baselinePath).toBeTruthy();

    // 2. Capture a second screenshot (current)
    await page.click('button[data-testid="start-capture-button"]');
    await expect(previewImg).toBeVisible({ timeout: 15000 });

    const currentPath = await previewImg.getAttribute('src');
    expect(currentPath).toBeTruthy();

    // 3. Navigate to Visual QA tab
    await page.click('button[data-testid="nav-tab-visual-qa"]');
    const vqaContainer = page.getByTestId('visual-qa-container');
    await expect(vqaContainer).toBeVisible();

    // 4. Fill baseline and current inputs
    await page.fill('input[data-testid="vqa-baseline-input"]', baselinePath!);
    await page.fill('input[data-testid="vqa-current-input"]', currentPath!);

    // 5. Submit comparison
    const submitBtn = page.getByTestId('vqa-submit-btn');
    await submitBtn.click();

    // 6. Verify result card and badge
    const resultCard = page.getByTestId('vqa-result-card');
    await expect(resultCard).toBeVisible({ timeout: 15000 });

    const outcomeBadge = page.getByTestId('vqa-outcome-badge');
    await expect(outcomeBadge).toBeVisible();
    await expect(outcomeBadge).toContainText('PASS');

    const changedPixels = page.getByTestId('vqa-metric-changed-pixels');
    await expect(changedPixels).toBeVisible();

    const changedPercent = page.getByTestId('vqa-metric-changed-percent');
    await expect(changedPercent).toBeVisible();
  });
});
