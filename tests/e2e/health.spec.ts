import { test, expect } from '@playwright/test';

test.describe('Bullseye Foundation E2E', () => {
  test('should load health check endpoint successfully', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.captureController).toBeDefined();
    expect(body.captureController.supportedTypes).toContain('screenshot');
  });

  test('should load capture status endpoint successfully', async ({ request }) => {
    const response = await request.get('/api/capture/status');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.supportedTypes).toContain('recording');
  });

  test('should render dashboard home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Bullseye Dashboard');
    await expect(page.locator('body')).toContainText('System Status');
  });
});
