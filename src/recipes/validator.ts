import { CreateRecipeInput, Recipe, RecipeValidationResult, UpdateRecipeInput } from './types';
import { captureController } from '@/capture/controller';
import { validateActions } from '@/capture/action-validator';

export const CURRENT_RECIPE_VERSION = 1;

/**
 * Validates a recipe input or recipe object.
 */
export function validateRecipeInput(
  input: CreateRecipeInput | UpdateRecipeInput | Partial<Recipe>
): RecipeValidationResult {
  const errors: string[] = [];

  // Name validation (required for creation/full validation)
  if ('name' in input && input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.trim().length === 0) {
      errors.push('Recipe name is required and cannot be empty');
    }
  }

  // Capture Configuration validation
  if (input.config) {
    const configValidation = captureController.validateConfig(input.config);
    if (!configValidation.valid) {
      errors.push(...configValidation.errors.map((e) => `Config error: ${e}`));
    }
  }

  // Action Sequence validation
  const actions = input.actions ?? (input.config ? input.config.actions : undefined);
  if (actions !== undefined) {
    if (!Array.isArray(actions)) {
      errors.push('Actions must be an array');
    } else {
      const actionValidation = validateActions(actions);
      if (!actionValidation.valid) {
        errors.push(...actionValidation.errors.map((e) => `Action error: ${e}`));
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Ensures full recipe structure is valid before persistence.
 */
export function validateFullRecipe(recipe: Partial<Recipe>): RecipeValidationResult {
  const errors: string[] = [];

  if (!recipe.id || typeof recipe.id !== 'string') {
    errors.push('Recipe ID is required');
  }

  if (!recipe.name || typeof recipe.name !== 'string' || recipe.name.trim().length === 0) {
    errors.push('Recipe name is required');
  }

  if (!recipe.config) {
    errors.push('Recipe capture configuration is required');
  }

  if (!Array.isArray(recipe.actions)) {
    errors.push('Recipe actions must be an array');
  }

  const inputValidation = validateRecipeInput(recipe);
  errors.push(...inputValidation.errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}
