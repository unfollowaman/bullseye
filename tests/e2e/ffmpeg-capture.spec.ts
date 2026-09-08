import { test, expect } from '@playwright/test';

test.describe('Phase 11 FFmpeg Pipeline E2E Tests', () => {
  test('1. GET /api/ffmpeg endpoint returns system FFmpeg status', async ({ request }) => {
    const res = await request.get('/api/ffmpeg');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.available).toBe(true);
    expect(body.version).toBeDefined();
    expect(body.version).not.toBe('unknown');
  });

  test('2. Screen recording with MP4 conversion generates both WebM and valid playable MP4', async ({ page }) => {
    await page.goto('/');

    // Configure capture form for recording + MP4 conversion
    await page.fill('#target-url', 'http://localhost:3000');
    await page.selectOption('#capture-type', 'recording');
    await page.fill('#recording-duration', '2000');

    // Check Convert to MP4
    const mp4Checkbox = page.getByTestId('convert-to-mp4-checkbox');
    await expect(mp4Checkbox).toBeVisible();
    await mp4Checkbox.check();

    // Select High Quality
    const qualitySelect = page.getByTestId('mp4-quality-select');
    await expect(qualitySelect).toBeVisible();
    await page.selectOption('#mp4-quality-select', 'high');

    // Submit capture
    await page.click('button[data-testid="start-capture-button"]');

    // Verify WebM download button and MP4 download button appear
    const webmDownloadBtn = page.getByTestId('download-recording-button');
    const mp4DownloadBtn = page.getByTestId('download-mp4-button');

    await expect(webmDownloadBtn).toBeVisible({ timeout: 25000 });
    await expect(mp4DownloadBtn).toBeVisible({ timeout: 25000 });

    await expect(webmDownloadBtn).toHaveAttribute('download', /recording-.*\.webm/);
    await expect(mp4DownloadBtn).toHaveAttribute('download', /recording-.*\.mp4/);

    // Switch to MP4 video tab and verify MP4 player
    const mp4TabBtn = page.getByTestId('select-mp4-tab');
    await expect(mp4TabBtn).toBeVisible();
    await mp4TabBtn.click();

    const mp4Player = page.getByTestId('mp4-video-player');
    await expect(mp4Player).toBeVisible();
  });

  test('3. WebM-only recording mode works without invoking MP4 conversion', async ({ page }) => {
    await page.goto('/');

    await page.fill('#target-url', 'http://localhost:3000');
    await page.selectOption('#capture-type', 'recording');
    await page.fill('#recording-duration', '2000');

    // Ensure convert to MP4 is unchecked
    const mp4Checkbox = page.getByTestId('convert-to-mp4-checkbox');
    if (await mp4Checkbox.isChecked()) {
      await mp4Checkbox.uncheck();
    }

    await page.click('button[data-testid="start-capture-button"]');

    // Verify WebM download button is visible, but MP4 download button is NOT present
    const webmDownloadBtn = page.getByTestId('download-recording-button');
    await expect(webmDownloadBtn).toBeVisible({ timeout: 20000 });

    const mp4DownloadBtn = page.getByTestId('download-mp4-button');
    await expect(mp4DownloadBtn).not.toBeVisible();
  });

  test('4. Capture History record displays MP4 asset download link', async ({ page }) => {
    // 1. Perform a recording + MP4 capture first
    await page.goto('/');
    await page.fill('#target-url', 'http://localhost:3000');
    await page.selectOption('#capture-type', 'recording');
    await page.fill('#recording-duration', '2000');
    await page.getByTestId('convert-to-mp4-checkbox').check();
    await page.click('button[data-testid="start-capture-button"]');

    await expect(page.getByTestId('download-mp4-button')).toBeVisible({ timeout: 25000 });

    // 2. Navigate to History page
    await page.goto('/history');

    const historyManager = page.getByTestId('history-manager');
    await expect(historyManager).toBeVisible();

    // Filter by recording type
    await page.selectOption('[data-testid="filter-type"]', 'recording');

    // Click Details on the latest recording record
    const detailsBtn = page.locator('button[data-testid^="view-detail-btn-"]').first();
    await expect(detailsBtn).toBeVisible();
    await detailsBtn.click();

    // Verify history detail modal displays MP4 Download link
    const modal = page.getByTestId('history-detail-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Converted Output (MP4)');
    await expect(modal.getByRole('link', { name: 'Download MP4' })).toBeVisible();
  });
});
