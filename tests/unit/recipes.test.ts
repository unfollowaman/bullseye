import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { RecipeRepository } from '@/recipes/repository';
import { RecipeService } from '@/recipes/service';
import { validateRecipeInput, validateFullRecipe } from '@/recipes/validator';
import { startTestServer, TestServer } from '../fixtures/fixture-server';

describe('Phase 8 — Capture Recipes Unit Tests', () => {
  let testServer: TestServer;
  let testRepoPath: string;
  let repo: RecipeRepository;
  let service: RecipeService;

  beforeEach(async () => {
    testServer = await startTestServer();
    testRepoPath = path.join(process.cwd(), 'data', `test-recipes-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.json`);
    repo = new RecipeRepository(testRepoPath);
    service = new RecipeService(repo);
  });

  afterEach(async () => {
    if (testServer) {
      await testServer.close();
    }
    if (fs.existsSync(testRepoPath)) {
      try {
        fs.unlinkSync(testRepoPath);
      } catch {}
    }
    if (fs.existsSync(`${testRepoPath}.tmp`)) {
      try {
        fs.unlinkSync(`${testRepoPath}.tmp`);
      } catch {}
    }
  });

  describe('1. Model & Validation', () => {
    it('validates a valid create recipe input', () => {
      const res = validateRecipeInput({
        name: 'Test Recipe',
        config: {
          url: testServer.url,
          captureType: 'screenshot',
        },
        actions: [{ type: 'wait', durationMs: 100 }],
      });
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('rejects empty recipe name', () => {
      const res = validateRecipeInput({
        name: '   ',
        config: {
          url: testServer.url,
          captureType: 'screenshot',
        },
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('name'))).toBe(true);
    });

    it('rejects invalid action sequence', () => {
      const res = validateRecipeInput({
        name: 'Invalid Action Recipe',
        config: {
          url: testServer.url,
        },
        actions: [
          { type: 'wait', durationMs: -50 }, // invalid duration
        ],
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('cannot be negative'))).toBe(true);
    });
  });

  describe('2. Persistence & Repository', () => {
    it('saves, reads, and deletes recipes cleanly', () => {
      expect(repo.getAll()).toHaveLength(0);

      const created = service.createRecipe({
        name: 'Persisted Recipe',
        config: { url: `${testServer.url}/actions`, captureType: 'screenshot' },
        actions: [{ type: 'click', selector: '#click-box' }],
      });

      expect(created.id).toBeDefined();
      expect(repo.getAll()).toHaveLength(1);

      const fetched = repo.getById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.name).toBe('Persisted Recipe');

      const deleted = repo.delete(created.id);
      expect(deleted).toBe(true);
      expect(repo.getAll()).toHaveLength(0);
    });
  });

  describe('3. Recipe Management (CRUD & Independence)', () => {
    it('creates, lists, retrieves, updates, and duplicates recipes', () => {
      const recipe1 = service.createRecipe({
        name: 'Original Recipe',
        description: 'First version',
        config: { url: testServer.url, captureType: 'screenshot' },
        actions: [{ type: 'wait', durationMs: 200 }],
      });

      const list = service.listRecipes();
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe('Original Recipe');

      // Update recipe
      const updated = service.updateRecipe(recipe1.id, {
        name: 'Updated Recipe Name',
        actions: [{ type: 'wait', durationMs: 500 }],
      });
      expect(updated.name).toBe('Updated Recipe Name');
      if (updated.actions[0].type === 'wait') {
        expect(updated.actions[0].durationMs).toBe(500);
      } else {
        throw new Error('Expected wait action');
      }

      // Duplicate recipe
      const copy = service.duplicateRecipe(recipe1.id);
      expect(copy.id).not.toBe(recipe1.id);
      expect(copy.name).toContain('(Copy)');
      expect(service.listRecipes()).toHaveLength(2);

      // Verify independence: modify copy, original should remain unchanged
      service.updateRecipe(copy.id, {
        name: 'Modified Copy Name',
        actions: [{ type: 'scroll', y: 100 }],
      });

      const originalAfter = service.getRecipe(recipe1.id);
      const copyAfter = service.getRecipe(copy.id);

      expect(originalAfter?.name).toBe('Updated Recipe Name');
      expect(originalAfter?.actions[0].type).toBe('wait');
      expect(copyAfter?.name).toBe('Modified Copy Name');
      expect(copyAfter?.actions[0].type).toBe('scroll');
    });

    it('deleting a recipe removes it without leaving orphaned records', () => {
      const r1 = service.createRecipe({
        name: 'R1',
        config: { url: testServer.url },
      });
      const r2 = service.createRecipe({
        name: 'R2',
        config: { url: testServer.url },
      });

      expect(service.listRecipes()).toHaveLength(2);

      service.deleteRecipe(r1.id);

      const remaining = service.listRecipes();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(r2.id);
      expect(service.getRecipe(r1.id)).toBeNull();
    });
  });

  describe('4. Execution Engine Integration', () => {
    it('executes a recipe with zero actions (empty action sequence)', async () => {
      const emptyActionRecipe = service.createRecipe({
        name: 'Empty Action Recipe',
        config: { url: testServer.url, captureType: 'screenshot' },
        actions: [],
      });

      const result = await service.executeRecipe(emptyActionRecipe.id);

      expect(result.status).toBe('completed');
      expect(result.outputPaths.screenshot).toBeDefined();
      expect(fs.existsSync(result.outputPaths.screenshot!)).toBe(true);

      // Verify stored recipe was NOT mutated during execution
      const stored = service.getRecipe(emptyActionRecipe.id);
      expect(stored?.actions).toHaveLength(0);
    });

    it('executes a screenshot recipe with multi-action sequence', async () => {
      const multiActionRecipe = service.createRecipe({
        name: 'Multi Action Recipe',
        config: { url: `${testServer.url}/actions`, captureType: 'screenshot' },
        actions: [
          { type: 'click', selector: '#click-box' },
          { type: 'type_text', selector: '#text-input', text: 'Recipe Unit Test' },
          { type: 'scroll', y: 200 },
        ],
      });

      const result = await service.executeRecipe(multiActionRecipe.id);

      expect(result.status).toBe('completed');
      expect(result.actionDiagnostics).toHaveLength(3);
      expect(result.actionDiagnostics![0].actionType).toBe('click');
      expect(result.actionDiagnostics![1].actionType).toBe('type_text');
      expect(result.actionDiagnostics![2].actionType).toBe('scroll');
    });

    it('executes a recording recipe and returns WebM output', async () => {
      const recRecipe = service.createRecipe({
        name: 'Recording Recipe',
        config: {
          url: `${testServer.url}/actions`,
          captureType: 'recording',
          recordingOptions: { durationMs: 1500 },
        },
        actions: [{ type: 'hover', selector: '#hover-box' }],
      });

      const result = await service.executeRecipe(recRecipe.id);

      expect(result.status).toBe('completed');
      expect(result.outputPaths.recording).toMatch(/\.webm$/);
      expect(fs.existsSync(result.outputPaths.recording!)).toBe(true);
    });

    it('executes a combined ("both") recipe', async () => {
      const combinedRecipe = service.createRecipe({
        name: 'Combined Recipe',
        config: {
          url: `${testServer.url}/actions`,
          captureType: 'both',
          recordingOptions: { durationMs: 1000 },
        },
        actions: [{ type: 'wait', durationMs: 100 }],
      });

      const result = await service.executeRecipe(combinedRecipe.id);

      expect(result.status).toBe('completed');
      expect(result.outputPaths.screenshot).toBeDefined();
      expect(result.outputPaths.recording).toBeDefined();
    });

    it('handles execution failure without corrupting stored recipe', async () => {
      const failRecipe = service.createRecipe({
        name: 'Failing Execution Recipe',
        config: {
          url: 'http://127.0.0.1:1/invalid-port-unreachable',
          captureType: 'screenshot',
          timeoutOptions: { timeoutMs: 1000 },
        },
      });

      const result = await service.executeRecipe(failRecipe.id);

      expect(result.status).toBe('failed');
      expect(result.errors.length).toBeGreaterThan(0);

      // Verify stored recipe remains intact
      const stored = service.getRecipe(failRecipe.id);
      expect(stored).not.toBeNull();
      expect(stored?.name).toBe('Failing Execution Recipe');
    });
  });
});
