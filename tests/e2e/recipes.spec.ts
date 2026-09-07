import { test, expect } from '@playwright/test';
import { startTestServer, TestServer } from '../fixtures/fixture-server';

test.describe('Phase 8 — Capture Recipes E2E Tests', () => {
  let server: TestServer;

  test.beforeAll(async () => {
    server = await startTestServer();
  });

  test.afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  test('1. Full Recipe Lifecycle via API: Create -> Retrieve -> Execute -> Edit -> Duplicate -> Delete', async ({
    request,
  }) => {
    // A. Create Recipe
    const createRes = await request.post('/api/recipes', {
      data: {
        name: 'E2E Homepage Demo Recipe',
        description: 'E2E full lifecycle test recipe',
        config: {
          url: `${server.url}/actions`,
          captureType: 'screenshot',
          viewport: { width: 1280, height: 720 },
        },
        actions: [
          { type: 'click', selector: '#click-box' },
          { type: 'type_text', selector: '#text-input', text: 'E2E Recipe Exec' },
        ],
      },
    });

    expect(createRes.status()).toBe(201);
    const createData = await createRes.json();
    expect(createData.success).toBe(true);
    const recipeId = createData.recipe.id;
    expect(recipeId).toBeDefined();

    // B. Retrieve Recipe List
    const listRes = await request.get('/api/recipes');
    expect(listRes.status()).toBe(200);
    const listData = await listRes.json();
    const found = listData.recipes.find((r: any) => r.id === recipeId);
    expect(found).toBeDefined();
    expect(found.name).toBe('E2E Homepage Demo Recipe');

    // C. Execute Recipe
    const execRes = await request.post(`/api/recipes/${recipeId}/execute`);
    expect(execRes.status()).toBe(200);
    const execData = await execRes.json();
    expect(execData.status).toBe('completed');
    expect(execData.outputPaths.screenshot).toBeDefined();
    expect(execData.actionDiagnostics).toHaveLength(2);
    expect(execData.actionDiagnostics[0].actionType).toBe('click');

    // D. Edit Recipe
    const editRes = await request.put(`/api/recipes/${recipeId}`, {
      data: {
        name: 'Edited E2E Recipe Name',
        actions: [{ type: 'scroll', y: 300 }],
      },
    });
    expect(editRes.status()).toBe(200);
    const editData = await editRes.json();
    expect(editData.recipe.name).toBe('Edited E2E Recipe Name');
    expect(editData.recipe.actions).toHaveLength(1);

    // E. Duplicate Recipe
    const dupRes = await request.post(`/api/recipes/${recipeId}/duplicate`);
    expect(dupRes.status()).toBe(201);
    const dupData = await dupRes.json();
    const dupId = dupData.recipe.id;
    expect(dupId).not.toBe(recipeId);
    expect(dupData.recipe.name).toContain('(Copy)');

    // Verify modifying duplicated recipe does NOT affect original
    await request.put(`/api/recipes/${dupId}`, {
      data: { name: 'Modified Duplicate' },
    });

    const origCheck = await request.get(`/api/recipes/${recipeId}`);
    const origData = await origCheck.json();
    expect(origData.recipe.name).toBe('Edited E2E Recipe Name');

    // F. Delete Recipes
    const del1 = await request.delete(`/api/recipes/${recipeId}`);
    expect(del1.status()).toBe(200);
    const del2 = await request.delete(`/api/recipes/${dupId}`);
    expect(del2.status()).toBe(200);

    // Verify deletion leaves no orphaned records
    const finalListRes = await request.get('/api/recipes');
    const finalListData = await finalListRes.json();
    expect(finalListData.recipes.some((r: any) => r.id === recipeId || r.id === dupId)).toBe(false);
  });

  test('2. Execute Recording and Combined ("both") Recipes', async ({ request }) => {
    // Create combined recipe
    const createRes = await request.post('/api/recipes', {
      data: {
        name: 'Combined Recipe E2E',
        config: {
          url: `${server.url}/actions`,
          captureType: 'both',
          recordingOptions: { durationMs: 1200 },
        },
        actions: [{ type: 'wait', durationMs: 100 }],
      },
    });

    const createData = await createRes.json();
    const recipeId = createData.recipe.id;

    // Execute combined recipe
    const execRes = await request.post(`/api/recipes/${recipeId}/execute`);
    expect(execRes.status()).toBe(200);
    const execData = await execRes.json();
    expect(execData.status).toBe('completed');
    expect(execData.outputPaths.screenshot).toMatch(/screenshot-.*\.png/);
    expect(execData.outputPaths.recording).toMatch(/recording-.*\.webm/);

    // Cleanup
    await request.delete(`/api/recipes/${recipeId}`);
  });

  test('3. UI Recipe Workflow: Navigate to Recipes -> Create -> List -> Execute -> Delete', async ({
    page,
  }) => {
    const uniqueRecipeName = `UI Recipe ${Date.now()}`;

    await page.goto('/');
    await page.waitForSelector('[data-testid="nav-tab-recipes"]', { state: 'visible' });

    // Switch to Recipes tab
    await page.click('[data-testid="nav-tab-recipes"]');
    await expect(page.locator('[data-testid="recipe-manager"]')).toBeVisible();

    // Click New Recipe
    await page.click('[data-testid="create-recipe-btn"]');
    await expect(page.locator('[data-testid="recipe-editor-form"]')).toBeVisible();

    // Fill in recipe details
    await page.fill('[data-testid="recipe-name-input"]', uniqueRecipeName);
    await page.fill('[data-testid="recipe-url-input"]', `${server.url}/actions`);

    // Add an action
    await page.selectOption('[data-testid="add-action-type-select"]', 'click');
    await page.click('[data-testid="add-action-btn"]');
    await page.fill('[data-testid="action-0-selector"]', '#click-box');

    // Save recipe and wait for response
    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/recipes') && res.status() === 201),
      page.click('[data-testid="save-recipe-submit-btn"]'),
    ]);
    expect(response.ok()).toBe(true);

    // Locate unique recipe card using data-testid title
    const recipeTitle = page.locator('h4').filter({ hasText: uniqueRecipeName });
    await expect(recipeTitle).toBeVisible({ timeout: 10000 });

    const recipeCard = page.locator('[data-testid^="recipe-card-"]').filter({
      has: page.locator('h4').filter({ hasText: uniqueRecipeName }),
    });

    // Execute recipe from UI
    const executeBtn = recipeCard.locator('[data-testid^="execute-recipe-btn-"]');
    await executeBtn.click();

    // Verify execution result output container is displayed
    await expect(page.locator('[data-testid="recipe-execution-result-container"]')).toBeVisible({
      timeout: 15000,
    });

    // Delete recipe
    const deleteBtn = recipeCard.locator('[data-testid^="delete-recipe-btn-"]');
    await deleteBtn.click();
    const confirmBtn = recipeCard.locator('[data-testid^="confirm-delete-btn-"]');
    await confirmBtn.click();

    // Verify removed
    await expect(recipeTitle).not.toBeVisible();
  });
});
