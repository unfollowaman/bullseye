import { RecipeRepository, recipeRepository } from './repository';
import {
  CreateRecipeInput,
  Recipe,
  UpdateRecipeInput,
} from './types';
import { validateRecipeInput, validateFullRecipe, CURRENT_RECIPE_VERSION } from './validator';
import { captureController, CaptureController } from '@/capture/controller';
import { UnifiedCaptureConfig, UnifiedCaptureResult } from '@/capture/types';

export class RecipeService {
  private repo: RecipeRepository;
  private controller: CaptureController;

  constructor(
    repo: RecipeRepository = recipeRepository,
    controller: CaptureController = captureController
  ) {
    this.repo = repo;
    this.controller = controller;
  }

  listRecipes(): Recipe[] {
    return this.repo.getAll();
  }

  getRecipe(id: string): Recipe | null {
    return this.repo.getById(id);
  }

  createRecipe(input: CreateRecipeInput): Recipe {
    const validation = validateRecipeInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid recipe creation input: ${validation.errors.join('; ')}`);
    }

    const id = `recipe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const actions = input.actions ?? input.config.actions ?? [];
    // Ensure config URL is synced
    const config: UnifiedCaptureConfig = {
      ...input.config,
      actions,
    };

    const newRecipe: Recipe = {
      id,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      config,
      actions,
      createdAt: now,
      updatedAt: now,
      version: CURRENT_RECIPE_VERSION,
    };

    const fullVal = validateFullRecipe(newRecipe);
    if (!fullVal.valid) {
      throw new Error(`Failed recipe validation: ${fullVal.errors.join('; ')}`);
    }

    return this.repo.save(newRecipe);
  }

  updateRecipe(id: string, input: UpdateRecipeInput): Recipe {
    const existing = this.repo.getById(id);
    if (!existing) {
      throw new Error(`Recipe with ID '${id}' not found`);
    }

    const validation = validateRecipeInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid recipe update input: ${validation.errors.join('; ')}`);
    }

    const actions = input.actions ?? input.config?.actions ?? existing.actions;
    const mergedConfig: UnifiedCaptureConfig = {
      ...existing.config,
      ...(input.config || {}),
      actions,
    };

    const updatedRecipe: Recipe = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      description: input.description !== undefined ? input.description.trim() : existing.description,
      config: mergedConfig,
      actions,
      updatedAt: new Date().toISOString(),
    };

    const fullVal = validateFullRecipe(updatedRecipe);
    if (!fullVal.valid) {
      throw new Error(`Failed recipe validation: ${fullVal.errors.join('; ')}`);
    }

    return this.repo.save(updatedRecipe);
  }

  duplicateRecipe(id: string): Recipe {
    const existing = this.repo.getById(id);
    if (!existing) {
      throw new Error(`Recipe with ID '${id}' not found`);
    }

    const newId = `recipe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    // Deep copy actions and config to ensure complete independence
    const clonedActions = JSON.parse(JSON.stringify(existing.actions));
    const clonedConfig: UnifiedCaptureConfig = JSON.parse(JSON.stringify(existing.config));
    clonedConfig.actions = clonedActions;

    const duplicated: Recipe = {
      id: newId,
      name: `${existing.name} (Copy)`,
      description: existing.description,
      config: clonedConfig,
      actions: clonedActions,
      createdAt: now,
      updatedAt: now,
      version: CURRENT_RECIPE_VERSION,
    };

    return this.repo.save(duplicated);
  }

  deleteRecipe(id: string): boolean {
    return this.repo.delete(id);
  }

  /**
   * Executes a recipe by passing its capture config + actions to Capture Controller.
   * Ensures stored recipe is NOT mutated.
   */
  async executeRecipe(
    id: string,
    overrideOptions?: Partial<UnifiedCaptureConfig>
  ): Promise<UnifiedCaptureResult> {
    const recipe = this.repo.getById(id);
    if (!recipe) {
      throw new Error(`Recipe with ID '${id}' not found`);
    }

    // Ensure execution uses a clone so stored recipe remains untouched
    const executionConfig: UnifiedCaptureConfig = {
      ...JSON.parse(JSON.stringify(recipe.config)),
      ...(overrideOptions ? JSON.parse(JSON.stringify(overrideOptions)) : {}),
      // Use actions from recipe (or overridden actions)
      actions: overrideOptions?.actions
        ? JSON.parse(JSON.stringify(overrideOptions.actions))
        : JSON.parse(JSON.stringify(recipe.actions)),
    };

    // Execute via existing Capture Controller infrastructure
    return await this.controller.executeJob(executionConfig);
  }
}

const globalForRecipeService = globalThis as unknown as {
  recipeService: RecipeService | undefined;
};

export const recipeService =
  globalForRecipeService.recipeService ?? new RecipeService();

if (process.env.NODE_ENV !== 'production') {
  globalForRecipeService.recipeService = recipeService;
}
