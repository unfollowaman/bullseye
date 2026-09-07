import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseManager } from '@/db';
import { ProjectRepository } from '@/projects/repository';
import { ProjectService } from '@/projects/service';

const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test-projects.db');

describe('Phase 9 — Project Domain & Management Unit Tests', () => {
  let dbMgr: DatabaseManager;
  let repo: ProjectRepository;
  let service: ProjectService;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    dbMgr = new DatabaseManager(TEST_DB_PATH);
    dbMgr.init();
    repo = new ProjectRepository(dbMgr);
    service = new ProjectService(repo);
  });

  afterEach(() => {
    dbMgr.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  test('1. Create project with valid inputs', () => {
    const project = service.createProject({
      name: 'Horizon Redesign',
      description: 'Marketing website update',
      defaultUrl: 'https://example.com/horizon',
    });

    expect(project.id).toMatch(/^proj_/);
    expect(project.name).toBe('Horizon Redesign');
    expect(project.description).toBe('Marketing website update');
    expect(project.defaultUrl).toBe('https://example.com/horizon');
    expect(project.createdAt).toBeDefined();
    expect(project.updatedAt).toBeDefined();
  });

  test('2. Reject invalid project inputs', () => {
    expect(() =>
      service.createProject({ name: '   ' })
    ).toThrow(/required/i);

    expect(() =>
      service.createProject({ name: 'Valid Name', defaultUrl: 'not-a-valid-url' })
    ).toThrow(/Invalid default URL/i);
  });

  test('3. List and retrieve projects', () => {
    const p1 = service.createProject({ name: 'Alpha Project' });
    const p2 = service.createProject({ name: 'Beta Project' });

    const list = service.listProjects();
    expect(list.length).toBe(2);

    const retrievedP1 = service.getProject(p1.id);
    expect(retrievedP1?.name).toBe('Alpha Project');

    const notFound = service.getProject('non-existent-id');
    expect(notFound).toBeNull();
  });

  test('4. Update project details', () => {
    const p = service.createProject({ name: 'Initial Name', description: 'Initial Desc' });

    const updated = service.updateProject(p.id, {
      name: 'Updated Name',
      defaultUrl: 'https://updated.com',
    });

    expect(updated.name).toBe('Updated Name');
    expect(updated.description).toBe('Initial Desc');
    expect(updated.defaultUrl).toBe('https://updated.com');

    const refetched = service.getProject(p.id);
    expect(refetched?.name).toBe('Updated Name');
  });

  test('5. Safe deletion behavior', () => {
    const p = service.createProject({ name: 'ToDelete Project' });
    const db = dbMgr.getDb();

    // Attach dummy recipe and capture history record
    db.prepare(`
      INSERT INTO recipes (id, name, description, project_id, config, actions, created_at, updated_at, version)
      VALUES ('r_test', 'Recipe in Project', '', ?, '{}', '[]', '2026-01-01', '2026-01-01', 1)
    `).run(p.id);

    db.prepare(`
      INSERT INTO capture_history (id, job_id, project_id, recipe_id, url, capture_type, status, viewport, dpr, timestamp, duration_ms, outputs, created_at)
      VALUES ('h_test', 'j_test', ?, 'r_test', 'http://example.com', 'screenshot', 'completed', '{}', 1, '2026-01-01', 100, '{}', '2026-01-01')
    `).run(p.id);

    const deleted = service.deleteProject(p.id);
    expect(deleted).toBe(true);

    // Verify project deleted
    expect(service.getProject(p.id)).toBeNull();

    // Verify recipe & history detached safely
    const recipe = db.prepare("SELECT * FROM recipes WHERE id = 'r_test'").get() as any;
    expect(recipe).toBeDefined();
    expect(recipe.project_id).toBeNull();

    const history = db.prepare("SELECT * FROM capture_history WHERE id = 'h_test'").get() as any;
    expect(history).toBeDefined();
    expect(history.project_id).toBeNull();
  });
});
