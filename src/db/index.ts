import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

export class DatabaseManager {
  private db: DatabaseSync | null = null;
  private dbPath: string;
  private isCustomDb: boolean;

  constructor(dbPath?: string) {
    this.isCustomDb = !!dbPath;
    this.dbPath =
      dbPath ||
      process.env.BULLSEYE_DB_PATH ||
      path.join(process.cwd(), 'data', 'bullseye.db');
  }

  public getDb(): DatabaseSync {
    if (!this.db) {
      this.init();
    }
    return this.db!;
  }

  public init(): DatabaseSync {
    if (this.db) {
      return this.db;
    }

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(this.dbPath);

    // Enable foreign keys
    this.db.exec('PRAGMA foreign_keys = ON;');

    // Initialize Schema
    this.initSchema();

    // Run migration from legacy recipes.json only for default DB
    if (!this.isCustomDb) {
      this.migrateFromRecipesJson();
    }

    return this.db;
  }

  private initSchema(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        default_url TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        project_id TEXT,
        config TEXT NOT NULL,
        actions TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS capture_history (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        project_id TEXT,
        recipe_id TEXT,
        url TEXT NOT NULL,
        capture_type TEXT NOT NULL,
        status TEXT NOT NULL,
        viewport TEXT NOT NULL,
        dpr REAL NOT NULL,
        timestamp TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        outputs TEXT NOT NULL,
        error TEXT,
        warnings TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
      );
    `);

    // Record initial migration
    const migrationCheck = this.db.prepare(
      'SELECT version FROM schema_migrations WHERE version = 1'
    ).all();

    if (migrationCheck.length === 0) {
      this.db.prepare(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)'
      ).run(1, new Date().toISOString());
    }
  }

  /**
   * Seamlessly migrates existing Phase 8 recipes from data/recipes.json into SQLite DB.
   */
  public migrateFromRecipesJson(): void {
    if (!this.db) return;

    const recipesJsonPath = path.join(process.cwd(), 'data', 'recipes.json');
    if (!fs.existsSync(recipesJsonPath)) {
      return;
    }

    try {
      const rawData = fs.readFileSync(recipesJsonPath, 'utf-8');
      if (!rawData.trim()) return;

      const recipes = JSON.parse(rawData);
      if (!Array.isArray(recipes)) return;

      const checkStmt = this.db.prepare('SELECT id FROM recipes WHERE id = ?');
      const insertStmt = this.db.prepare(`
        INSERT INTO recipes (id, name, description, project_id, config, actions, created_at, updated_at, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const recipe of recipes) {
        if (!recipe || typeof recipe !== 'object' || !recipe.id) continue;

        const existing = checkStmt.get(String(recipe.id));
        if (!existing) {
          insertStmt.run(
            String(recipe.id),
            recipe.name || 'Untitled Recipe',
            recipe.description || '',
            recipe.projectId || null,
            JSON.stringify(recipe.config || {}),
            JSON.stringify(recipe.actions || []),
            recipe.createdAt || new Date().toISOString(),
            recipe.updatedAt || new Date().toISOString(),
            recipe.version || 1
          );
        }
      }
    } catch (err) {
      console.error('Failed to migrate recipes from recipes.json:', err);
    }
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Global Singleton Instance
const globalForDb = globalThis as unknown as {
  dbManager: DatabaseManager | undefined;
};

export const dbManager = globalForDb.dbManager ?? new DatabaseManager();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.dbManager = dbManager;
}
