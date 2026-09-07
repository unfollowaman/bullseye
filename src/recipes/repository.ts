import { DatabaseManager, dbManager } from '@/db';
import { Recipe } from './types';
import { CURRENT_RECIPE_VERSION } from './validator';

export class RecipeRepository {
  private dbMgr: DatabaseManager;

  constructor(dbMgrOrPath?: DatabaseManager | string) {
    if (typeof dbMgrOrPath === 'string') {
      this.dbMgr = new DatabaseManager(dbMgrOrPath);
    } else {
      this.dbMgr = dbMgrOrPath || dbManager;
    }
  }

  private mapRowToRecipe(row: Record<string, unknown>): Recipe {
    let configObj = {};
    let actionsArr = [];

    try {
      if (typeof row.config === 'string' && row.config.trim()) {
        configObj = JSON.parse(row.config);
      } else if (row.config && typeof row.config === 'object') {
        configObj = row.config;
      }
    } catch {
      configObj = {};
    }

    try {
      if (typeof row.actions === 'string' && row.actions.trim()) {
        actionsArr = JSON.parse(row.actions);
      } else if (Array.isArray(row.actions)) {
        actionsArr = row.actions;
      }
    } catch {
      actionsArr = [];
    }

    return {
      id: String(row.id),
      name: String(row.name || 'Untitled Recipe'),
      description: row.description ? String(row.description) : '',
      projectId: row.project_id ? String(row.project_id) : undefined,
      config: configObj as Recipe['config'],
      actions: actionsArr as Recipe['actions'],
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      version: Number(row.version) || CURRENT_RECIPE_VERSION,
    };
  }

  /**
   * Read all recipes from storage.
   */
  getAll(): Recipe[] {
    const db = this.dbMgr.getDb();
    const rows = db.prepare('SELECT * FROM recipes ORDER BY created_at DESC').all() as Record<string, unknown>[];
    return rows.map((r) => this.mapRowToRecipe(r));
  }

  /**
   * Find recipe by ID.
   */
  getById(id: string): Recipe | null {
    const db = this.dbMgr.getDb();
    const row = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToRecipe(row);
  }

  /**
   * Find recipes belonging to a specific Project ID.
   */
  getByProjectId(projectId: string): Recipe[] {
    const db = this.dbMgr.getDb();
    const rows = db
      .prepare('SELECT * FROM recipes WHERE project_id = ? ORDER BY created_at DESC')
      .all(projectId) as Record<string, unknown>[];
    return rows.map((r) => this.mapRowToRecipe(r));
  }

  /**
   * Save (insert or update) a recipe.
   */
  save(recipe: Recipe): Recipe {
    const db = this.dbMgr.getDb();
    const existing = db.prepare('SELECT id FROM recipes WHERE id = ?').get(recipe.id);

    const configStr = JSON.stringify(recipe.config || {});
    const actionsStr = JSON.stringify(recipe.actions || []);
    const projId = recipe.projectId || null;

    if (existing) {
      db.prepare(`
        UPDATE recipes
        SET name = ?, description = ?, project_id = ?, config = ?, actions = ?, updated_at = ?, version = ?
        WHERE id = ?
      `).run(
        recipe.name,
        recipe.description || '',
        projId,
        configStr,
        actionsStr,
        recipe.updatedAt,
        recipe.version || CURRENT_RECIPE_VERSION,
        recipe.id
      );
    } else {
      db.prepare(`
        INSERT INTO recipes (id, name, description, project_id, config, actions, created_at, updated_at, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        recipe.id,
        recipe.name,
        recipe.description || '',
        projId,
        configStr,
        actionsStr,
        recipe.createdAt,
        recipe.updatedAt,
        recipe.version || CURRENT_RECIPE_VERSION
      );
    }

    return recipe;
  }

  /**
   * Safe recipe deletion:
   * Detaches associated capture_history records by setting recipe_id to NULL.
   */
  delete(id: string): boolean {
    const db = this.dbMgr.getDb();
    const existing = this.getById(id);
    if (!existing) return false;

    db.prepare('UPDATE capture_history SET recipe_id = NULL WHERE recipe_id = ?').run(id);
    db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
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
