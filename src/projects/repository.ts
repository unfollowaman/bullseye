import { DatabaseManager, dbManager } from '@/db';
import { Project } from './types';

export class ProjectRepository {
  private dbMgr: DatabaseManager;

  constructor(dbMgr: DatabaseManager = dbManager) {
    this.dbMgr = dbMgr;
  }

  private mapRowToProject(row: Record<string, unknown>): Project {
    return {
      id: String(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : '',
      defaultUrl: row.default_url ? String(row.default_url) : '',
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  getAll(): Project[] {
    const db = this.dbMgr.getDb();
    const rows = db
      .prepare('SELECT * FROM projects ORDER BY created_at DESC')
      .all() as Record<string, unknown>[];
    return rows.map((r) => this.mapRowToProject(r));
  }

  getById(id: string): Project | null {
    const db = this.dbMgr.getDb();
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToProject(row);
  }

  save(project: Project): Project {
    const db = this.dbMgr.getDb();
    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(project.id);

    if (existing) {
      db.prepare(`
        UPDATE projects
        SET name = ?, description = ?, default_url = ?, updated_at = ?
        WHERE id = ?
      `).run(
        project.name,
        project.description || '',
        project.defaultUrl || '',
        project.updatedAt,
        project.id
      );
    } else {
      db.prepare(`
        INSERT INTO projects (id, name, description, default_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        project.id,
        project.name,
        project.description || '',
        project.defaultUrl || '',
        project.createdAt,
        project.updatedAt
      );
    }

    return project;
  }

  /**
   * Safe project deletion:
   * Detaches associated recipes and capture_history records by setting project_id to NULL.
   * Foreign keys with ON DELETE SET NULL handle this automatically, but explicit execution ensures clarity.
   */
  delete(id: string): boolean {
    const db = this.dbMgr.getDb();
    const existing = this.getById(id);
    if (!existing) return false;

    // Explicitly detach attached recipes and capture history records for complete safety
    db.prepare('UPDATE recipes SET project_id = NULL WHERE project_id = ?').run(id);
    db.prepare('UPDATE capture_history SET project_id = NULL WHERE project_id = ?').run(id);

    // Delete project row
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    return true;
  }
}

const globalForProjectRepo = globalThis as unknown as {
  projectRepository: ProjectRepository | undefined;
};

export const projectRepository =
  globalForProjectRepo.projectRepository ?? new ProjectRepository();

if (process.env.NODE_ENV !== 'production') {
  globalForProjectRepo.projectRepository = projectRepository;
}
