import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseManager } from '@/db';
import { RecipeRepository } from '@/recipes/repository';
import { RecipeService } from '@/recipes/service';
import { ProjectRepository } from '@/projects/repository';
import { ProjectService } from '@/projects/service';

const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test-recipes-projects.db');

describe('Phase 9 — Recipe Project Association Unit Tests', () => {
  let dbMgr: DatabaseManager;
  let recipeRepo: RecipeRepository;
  let recipeService: RecipeService;
  let projectRepo: ProjectRepository;
  let projectService: ProjectService;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    dbMgr = new DatabaseManager(TEST_DB_PATH);
    dbMgr.init();
    recipeRepo = new RecipeRepository(dbMgr);
    recipeService = new RecipeService(recipeRepo);
    projectRepo = new ProjectRepository(dbMgr);
    projectService = new ProjectService(projectRepo);
  });

  afterEach(() => {
    dbMgr.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  test('1. Create recipe with project association', () => {
    const proj = projectService.createProject({ name: 'E-commerce Redesign' });

    const recipe = recipeService.createRecipe({
      name: 'Checkout Flow Test',
      projectId: proj.id,
      config: {
        url: 'https://example.com/checkout',
        captureType: 'screenshot',
      },
    });

    expect(recipe.projectId).toBe(proj.id);

    const projectRecipes = recipeService.listRecipes(proj.id);
    expect(projectRecipes.length).toBe(1);
    expect(projectRecipes[0].name).toBe('Checkout Flow Test');
  });

  test('2. Reassign recipe to a different project', () => {
    const p1 = projectService.createProject({ name: 'Project One' });
    const p2 = projectService.createProject({ name: 'Project Two' });

    const recipe = recipeService.createRecipe({
      name: 'Shared Component Test',
      projectId: p1.id,
      config: { url: 'https://example.com/component' },
    });

    expect(recipeService.listRecipes(p1.id).length).toBe(1);
    expect(recipeService.listRecipes(p2.id).length).toBe(0);

    // Reassign to p2
    const reassigned = recipeService.assignToProject(recipe.id, p2.id);
    expect(reassigned.projectId).toBe(p2.id);

    expect(recipeService.listRecipes(p1.id).length).toBe(0);
    expect(recipeService.listRecipes(p2.id).length).toBe(1);
  });

  test('3. Remove recipe from project without deleting recipe', () => {
    const proj = projectService.createProject({ name: 'Temp Project' });

    const recipe = recipeService.createRecipe({
      name: 'Unassignable Recipe',
      projectId: proj.id,
      config: { url: 'https://example.com' },
    });

    expect(recipeService.listRecipes(proj.id).length).toBe(1);

    // Remove from project
    const detached = recipeService.removeFromProject(recipe.id);
    expect(detached.projectId).toBeUndefined();

    // Verify recipe still exists as standalone
    expect(recipeService.listRecipes(proj.id).length).toBe(0);
    expect(recipeService.getRecipe(recipe.id)).toBeDefined();
    expect(recipeService.getRecipe(recipe.id)?.name).toBe('Unassignable Recipe');
  });

  test('4. Backward compatibility: existing recipes without projectId continue working', () => {
    const standaloneRecipe = recipeService.createRecipe({
      name: 'Global Standalone Recipe',
      config: { url: 'https://example.com/global' },
    });

    expect(standaloneRecipe.projectId).toBeUndefined();

    const allRecipes = recipeService.listRecipes();
    expect(allRecipes.some((r) => r.id === standaloneRecipe.id)).toBe(true);

    const fetched = recipeService.getRecipe(standaloneRecipe.id);
    expect(fetched?.name).toBe('Global Standalone Recipe');
    expect(fetched?.projectId).toBeUndefined();
  });
});
