import fs from 'fs';
import path from 'path';
import { Recipe } from './types';
import { CURRENT_RECIPE_VERSION } from './validator';

export class RecipeRepository {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath =
      filePath || path.join(process.cwd(), 'data', 'recipes.json');
  }

  private ensureDir(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Migrate legacy or older versioned recipe objects to current schema version.
   */
  private migrateRecipe(raw: Record<string, unknown>): Recipe {
    return {
      id: String(raw.id),
      name: typeof raw.name === 'string' ? raw.name : 'Untitled Recipe',
      description: typeof raw.description === 'string' ? raw.description : '',
      config: (raw.config as Recipe['config']) || { url: '' },
      actions: Array.isArray(raw.actions) ? (raw.actions as Recipe['actions']) : [],
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
      version: CURRENT_RECIPE_VERSION,
    };
  }

  /**
   * Read all recipes from storage.
   */
  getAll(): Recipe[] {
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }
      const data = fs.readFileSync(this.filePath, 'utf-8');
      if (!data.trim()) {
        return [];
      }
      const rawList = JSON.parse(data);
      if (!Array.isArray(rawList)) {
        return [];
      }
      return rawList.map((raw) => this.migrateRecipe(raw as Record<string, unknown>));
    } catch (err) {
      console.error('Failed to read recipes repository:', err);
      return [];
    }
  }

  /**
   * Save all recipes to storage atomically.
   */
  saveAll(recipes: Recipe[]): void {
    this.ensureDir();
    const tempFile = `${this.filePath}.tmp`;
    const serialized = JSON.stringify(recipes, null, 2);
    fs.writeFileSync(tempFile, serialized, 'utf-8');
    fs.renameSync(tempFile, this.filePath);
  }

  /**
   * Find recipe by ID.
   */
  getById(id: string): Recipe | null {
    const recipes = this.getAll();
    return recipes.find((r) => r.id === id) || null;
  }

  /**
   * Save (insert or update) a recipe.
   */
  save(recipe: Recipe): Recipe {
    const recipes = this.getAll();
    const index = recipes.findIndex((r) => r.id === recipe.id);
    if (index >= 0) {
      recipes[index] = recipe;
    } else {
      recipes.push(recipe);
    }
    this.saveAll(recipes);
    return recipe;
  }

  /**
   * Delete a recipe by ID.
   */
  delete(id: string): boolean {
    const recipes = this.getAll();
    const initialLength = recipes.length;
    const filtered = recipes.filter((r) => r.id !== id);
    if (filtered.length === initialLength) {
      return false;
    }
    this.saveAll(filtered);
    return true;
  }
}

// Singleton repository instance
const globalForRecipeRepo = globalThis as unknown as {
  recipeRepository: RecipeRepository | undefined;
};

export const recipeRepository =
  globalForRecipeRepo.recipeRepository ?? new RecipeRepository();

if (process.env.NODE_ENV !== 'production') {
  globalForRecipeRepo.recipeRepository = recipeRepository;
}
