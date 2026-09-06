import { test, expect } from '@playwright/test';

test.describe('Phase 5 UI End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Bullseye Dashboard');
  });

  test('1. System status widget renders correctly', async ({ page }) => {
    const statusCard = page.getByTestId('system-status-card');
    await expect(statusCard).toBeVisible();
    await expect(statusCard).toContainText('Ready');
    await expect(statusCard).toContainText('Active:');
  });

  test('2. Screenshot capture flow displays PNG preview and download button', async ({ page }) => {
    // Fill URL and set Screenshot type
    await page.fill('#target-url', 'http://localhost:3000');
    await page.selectOption('#capture-type', 'screenshot');
    await page.selectOption('#screenshot-mode', 'viewport');

    // Click Start Capture
    await page.click('button[data-testid="start-capture-button"]');

    // Verify result card and preview image appear
    const previewImg = page.getByTestId('screenshot-preview-image');
    await expect(previewImg).toBeVisible({ timeout: 15000 });

    // Verify download link exists and has screenshot extension
    const downloadBtn = page.getByTestId('download-screenshot-button');
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toHaveAttribute('download', /screenshot-.*\.png/);
  });

  test('3. Screen recording capture flow displays WebM video player and download button', async ({ page }) => {
    // Fill URL, select recording, duration 2000ms
    await page.fill('#target-url', 'http://localhost:3000');
    await page.selectOption('#capture-type', 'recording');
    await page.fill('#recording-duration', '2000');

    // Click Start Capture
    await page.click('button[data-testid="start-capture-button"]');

    // Verify video player appears and starts playing
    const videoPlayer = page.getByTestId('recording-video-player');
    await expect(videoPlayer).toBeVisible({ timeout: 20000 });

    // Verify WebM download button
    const downloadBtn = page.getByTestId('download-recording-button');
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toHaveAttribute('download', /recording-.*\.webm/);
  });

  test('4. Combined capture ("both") displays screenshot PNG and WebM video player independently', async ({ page }) => {
    await page.fill('#target-url', 'http://localhost:3000');
    await page.selectOption('#capture-type', 'both');
    await page.fill('#recording-duration', '2000');

    await page.click('button[data-testid="start-capture-button"]');

    // Expect both preview image and video player
    const previewImg = page.getByTestId('screenshot-preview-image');
    const videoPlayer = page.getByTestId('recording-video-player');

    await expect(previewImg).toBeVisible({ timeout: 25000 });
    await expect(videoPlayer).toBeVisible({ timeout: 25000 });
  });

  test('5. Client-side input validation prevents submission on invalid URL', async ({ page }) => {
    await page.fill('#target-url', 'not-a-valid-http-url');
    await page.click('button[data-testid="start-capture-button"]');

    const statusBadge = page.getByTestId('status-badge');
    await expect(statusBadge).toHaveText('Capture Failed');

    const resultContainer = page.getByTestId('result-container');
    await expect(resultContainer).toContainText('Invalid URL');
  });

  test('6. In-flight capture cancellation', async ({ page }) => {
    await page.fill('#target-url', 'http://localhost:3000');
    await page.selectOption('#capture-type', 'recording');
    await page.fill('#recording-duration', '15000'); // 15 seconds

    // Click start
    await page.click('button[data-testid="start-capture-button"]');

    // Wait for cancel button to be visible while running
    const cancelBtn = page.getByTestId('cancel-capture-button');
    await expect(cancelBtn).toBeVisible({ timeout: 5000 });

    // Click cancel
    await cancelBtn.click();

    // Verify status transitions to Cancelled
    const statusBadge = page.getByTestId('status-badge');
    await expect(statusBadge).toHaveText('Capture Cancelled', { timeout: 10000 });
  });
});
