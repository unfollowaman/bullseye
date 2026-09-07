import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseManager } from '@/db';

const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test-migrations.db');
const TEST_RECIPES_JSON = path.join(process.cwd(), 'data', 'recipes.json');

describe('Phase 9 — Database Layer & Migration Tests', () => {
  let dbManager: DatabaseManager;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    dbManager = new DatabaseManager(TEST_DB_PATH);
  });

  afterEach(() => {
    dbManager.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  test('1. Database initializes tables correctly', () => {
    const db = dbManager.getDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('schema_migrations');
    expect(tableNames).toContain('projects');
    expect(tableNames).toContain('recipes');
    expect(tableNames).toContain('capture_history');
  });

  test('2. Foreign keys setting ON DELETE SET NULL on projects deletion', () => {
    const db = dbManager.getDb();

    // Insert project
    db.prepare(`
      INSERT INTO projects (id, name, description, default_url, created_at, updated_at)
      VALUES ('p1', 'Test Project', 'Desc', 'http://example.com', '2026-01-01', '2026-01-01')
    `).run();

    // Insert recipe attached to project
    db.prepare(`
      INSERT INTO recipes (id, name, description, project_id, config, actions, created_at, updated_at, version)
      VALUES ('r1', 'Project Recipe', '', 'p1', '{}', '[]', '2026-01-01', '2026-01-01', 1)
    `).run();

    // Insert capture history attached to project
    db.prepare(`
      INSERT INTO capture_history (id, job_id, project_id, recipe_id, url, capture_type, status, viewport, dpr, timestamp, duration_ms, outputs, created_at)
      VALUES ('h1', 'j1', 'p1', 'r1', 'http://example.com', 'screenshot', 'completed', '{}', 1, '2026-01-01', 100, '{}', '2026-01-01')
    `).run();

    // Delete project
    db.prepare("DELETE FROM projects WHERE id = 'p1'").run();

    // Verify recipe project_id is now NULL
    const recipe = db.prepare("SELECT * FROM recipes WHERE id = 'r1'").get() as any;
    expect(recipe).toBeDefined();
    expect(recipe.project_id).toBeNull();

    // Verify history project_id is now NULL
    const history = db.prepare("SELECT * FROM capture_history WHERE id = 'h1'").get() as any;
    expect(history).toBeDefined();
    expect(history.project_id).toBeNull();
  });

  test('3. Migrates Phase 8 data from recipes.json when present', () => {
    // Write temporary recipes.json
    const mockRecipes = [
      {
        id: 'legacy_r1',
        name: 'Legacy Recipe 1',
        description: 'Migrated from Phase 8',
        config: { url: 'http://legacy.com', captureType: 'screenshot' },
        actions: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
      },
    ];

    let originalData: string | null = null;
    if (fs.existsSync(TEST_RECIPES_JSON)) {
      originalData = fs.readFileSync(TEST_RECIPES_JSON, 'utf-8');
    }

    try {
      fs.writeFileSync(TEST_RECIPES_JSON, JSON.stringify(mockRecipes), 'utf-8');

      // Initialize DB and trigger migration
      dbManager.init();
      dbManager.migrateFromRecipesJson();
      const db = dbManager.getDb();

      const migrated = db
        .prepare("SELECT * FROM recipes WHERE id = 'legacy_r1'")
        .get() as any;

      expect(migrated).toBeDefined();
      expect(migrated.name).toBe('Legacy Recipe 1');
      expect(migrated.project_id).toBeNull();
    } finally {
      if (originalData !== null) {
        fs.writeFileSync(TEST_RECIPES_JSON, originalData, 'utf-8');
      } else if (fs.existsSync(TEST_RECIPES_JSON)) {
        fs.unlinkSync(TEST_RECIPES_JSON);
      }
    }
  });
});
