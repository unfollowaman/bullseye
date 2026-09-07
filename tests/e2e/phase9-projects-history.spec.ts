import { test, expect } from '@playwright/test';
import { startTestServer, TestServer } from '../fixtures/fixture-server';

test.describe('Phase 9 — Projects & Capture History E2E Tests', () => {
  let server: TestServer;

  test.beforeAll(async () => {
    server = await startTestServer();
  });

  test.afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  test('1. Full API Workflow: Create Project -> Create Recipe in Project -> Execute Recipe -> Capture History Record Created -> Asset Accessible', async ({
    request,
  }) => {
    // A. Create Project
    const projRes = await request.post('/api/projects', {
      data: {
        name: 'Horizon Mobile Redesign',
        description: 'Testing mobile landing page captures',
        defaultUrl: `${server.url}/actions`,
      },
    });

    expect(projRes.status()).toBe(201);
    const projData = await projRes.json();
    const projectId = projData.project.id;
    expect(projectId).toBeDefined();

    // B. Create Recipe inside Project
    const recipeRes = await request.post('/api/recipes', {
      data: {
        name: 'Mobile Click Action Recipe',
        projectId,
        config: {
          url: `${server.url}/actions`,
          captureType: 'screenshot',
          viewport: { width: 375, height: 812 },
          deviceScaleFactor: 2,
        },
        actions: [{ type: 'click', selector: '#click-box' }],
      },
    });

    expect(recipeRes.status()).toBe(201);
    const recipeData = await recipeRes.json();
    const recipeId = recipeData.recipe.id;
    expect(recipeData.recipe.projectId).toBe(projectId);

    // C. Execute Recipe
    const execRes = await request.post(`/api/recipes/${recipeId}/execute`);
    expect(execRes.status()).toBe(200);
    const execData = await execRes.json();
    expect(execData.status).toBe('completed');
    expect(execData.historyRecordId).toBeDefined();

    // D. Retrieve Capture History
    const historyRes = await request.get(`/api/projects/${projectId}/history`);
    expect(historyRes.status()).toBe(200);
    const historyData = await historyRes.json();
    expect(historyData.history.length).toBeGreaterThanOrEqual(1);

    const record = historyData.history.find(
      (h: any) => h.id === execData.historyRecordId || h.jobId === execData.id
    );
    expect(record).toBeDefined();
    expect(record.projectId).toBe(projectId);
    expect(record.recipeId).toBe(recipeId);
    expect(record.status).toBe('completed');
    expect(record.outputs.screenshot?.path).toMatch(/^\/captures\/.*\.png$/);

    // E. Verify Generated Asset is accessible over HTTP
    const assetPath = record.outputs.screenshot.path;
    const assetRes = await request.get(assetPath);
    expect(assetRes.status()).toBe(200);
    expect(assetRes.headers()['content-type']).toContain('image/png');
  });

  test('2. Direct Capture with Project ID and Repeated Independent Capture Records', async ({
    request,
  }) => {
    // Create Project
    const projRes = await request.post('/api/projects', {
      data: { name: 'Direct Captures Project' },
    });
    const projData = await projRes.json();
    const projectId = projData.project.id;

    // Run First Direct Capture
    const cap1 = await request.post('/api/capture', {
      data: {
        projectId,
        url: `${server.url}/actions`,
        captureType: 'screenshot',
      },
    });
    expect(cap1.status()).toBe(200);
    const cap1Data = await cap1.json();

    // Run Second Direct Capture (Repeated)
    const cap2 = await request.post('/api/capture', {
      data: {
        projectId,
        url: `${server.url}/actions`,
        captureType: 'recording',
        recordingOptions: { durationMs: 1000 },
      },
    });
    expect(cap2.status()).toBe(200);
    const cap2Data = await cap2.json();

    // Retrieve Project History
    const historyRes = await request.get(`/api/projects/${projectId}/history`);
    const historyData = await historyRes.json();

    // Verify 2 distinct history records exist
    expect(historyData.history.length).toBe(2);
    expect(cap1Data.id).not.toBe(cap2Data.id);

    const rec1 = historyData.history.find((h: any) => h.jobId === cap1Data.id);
    const rec2 = historyData.history.find((h: any) => h.jobId === cap2Data.id);

    expect(rec1.captureType).toBe('screenshot');
    expect(rec2.captureType).toBe('recording');
  });

  test('3. Project Deletion Detaches Recipes and History Records Safely', async ({ request }) => {
    // Create Project
    const projRes = await request.post('/api/projects', {
      data: { name: 'Project to Delete' },
    });
    expect(projRes.status()).toBe(201);
    const projData = await projRes.json();
    const projectId = projData.project.id;

    // Create Recipe in Project
    const recipeRes = await request.post('/api/recipes', {
      data: {
        name: 'Recipe in Temporary Project',
        projectId,
        config: { url: server.url, captureType: 'screenshot' },
      },
    });
    expect(recipeRes.status()).toBe(201);
    const recipeData = await recipeRes.json();
    const recipeId = recipeData.recipe.id;

    // Run Capture to create History Record
    const capRes = await request.post('/api/capture', {
      data: {
        projectId,
        recipeId,
        url: server.url,
        captureType: 'screenshot',
      },
    });
    expect(capRes.status()).toBe(200);
    const capData = await capRes.json();
    const historyRecordId = capData.historyRecordId;

    // Delete Project
    const delRes = await request.delete(`/api/projects/${projectId}`);
    expect(delRes.status()).toBe(200);

    // Verify Project is gone
    const checkProj = await request.get(`/api/projects/${projectId}`);
    expect(checkProj.status()).toBe(404);

    // Verify Recipe still exists with projectId = null / undefined
    const checkRecipe = await request.get(`/api/recipes/${recipeId}`);
    expect(checkRecipe.status()).toBe(200);
    const checkRecipeData = await checkRecipe.json();
    expect(checkRecipeData.recipe.projectId).toBeUndefined();

    // Verify History Record still exists with projectId = null / undefined
    const checkHistory = await request.get(`/api/history/${historyRecordId}`);
    expect(checkHistory.status()).toBe(200);
    const checkHistoryData = await checkHistory.json();
    expect(checkHistoryData.record.projectId).toBeUndefined();
  });

  test('4. Full UI Navigation & Workflow: Switch Tabs -> Create Project -> View History', async ({
    page,
  }) => {
    const uniqueProjName = `UI Project ${Date.now()}`;

    await page.goto('/');
    await page.waitForSelector('[data-testid="nav-tab-projects"]', { state: 'visible' });

    // 1. Click Projects Nav Tab
    await page.click('[data-testid="nav-tab-projects"]');
    await expect(page.locator('[data-testid="project-manager"]')).toBeVisible();

    // 2. Click Create New Project
    await page.click('[data-testid="create-project-btn"]');
    await page.fill('[data-testid="project-name-input"]', uniqueProjName);
    await page.fill('[data-testid="project-url-input"]', server.url);

    // Click Save Project and wait for API response
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/projects') && res.status() === 201),
      page.click('[data-testid="save-project-btn"]'),
    ]);
    expect(response.ok()).toBe(true);

    // 3. Verify Project card appears
    const projCard = page.locator('[data-testid^="project-card-"]').filter({
      hasText: uniqueProjName,
    });
    await expect(projCard).toBeVisible({ timeout: 10000 });

    // 4. Click History Nav Tab
    await page.click('[data-testid="nav-tab-history"]');
    await expect(page.locator('[data-testid="history-manager"]')).toBeVisible();

    // 5. Click Capture Nav Tab
    await page.click('[data-testid="nav-tab-capture"]');
    await expect(page.locator('[data-testid="capture-form"]')).toBeVisible();
  });
});
