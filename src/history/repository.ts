import { DatabaseManager, dbManager } from '@/db';
import { CaptureHistoryFilter, CaptureHistoryRecord } from './types';

export class CaptureHistoryRepository {
  private dbMgr: DatabaseManager;

  constructor(dbMgrOrPath?: DatabaseManager | string) {
    if (typeof dbMgrOrPath === 'string') {
      this.dbMgr = new DatabaseManager(dbMgrOrPath);
    } else {
      this.dbMgr = dbMgrOrPath || dbManager;
    }
  }

  private mapRowToRecord(row: Record<string, unknown>): CaptureHistoryRecord {
    let viewportObj = { width: 1280, height: 720 };
    let outputsObj = {};
    let warningsArr: string[] = [];

    try {
      if (typeof row.viewport === 'string' && row.viewport.trim()) {
        viewportObj = JSON.parse(row.viewport);
      } else if (row.viewport && typeof row.viewport === 'object') {
        viewportObj = row.viewport as { width: number; height: number };
      }
    } catch {}

    try {
      if (typeof row.outputs === 'string' && row.outputs.trim()) {
        outputsObj = JSON.parse(row.outputs);
      } else if (row.outputs && typeof row.outputs === 'object') {
        outputsObj = row.outputs as CaptureHistoryRecord['outputs'];
      }
    } catch {}

    try {
      if (typeof row.warnings === 'string' && row.warnings.trim()) {
        warningsArr = JSON.parse(row.warnings);
      } else if (Array.isArray(row.warnings)) {
        warningsArr = row.warnings as string[];
      }
    } catch {}

    return {
      id: String(row.id),
      jobId: row.job_id ? String(row.job_id) : undefined,
      projectId: row.project_id ? String(row.project_id) : undefined,
      recipeId: row.recipe_id ? String(row.recipe_id) : undefined,
      url: String(row.url || ''),
      captureType: row.capture_type as CaptureHistoryRecord['captureType'],
      status: row.status as CaptureHistoryRecord['status'],
      viewport: viewportObj,
      dpr: Number(row.dpr) || 1,
      timestamp: String(row.timestamp),
      durationMs: Number(row.duration_ms) || 0,
      outputs: outputsObj,
      error: row.error ? String(row.error) : undefined,
      warnings: warningsArr,
      createdAt: String(row.created_at),
    };
  }

  getById(id: string): CaptureHistoryRecord | null {
    const db = this.dbMgr.getDb();
    const row = db.prepare('SELECT * FROM capture_history WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToRecord(row);
  }

  getAll(filter: CaptureHistoryFilter = {}): CaptureHistoryRecord[] {
    const db = this.dbMgr.getDb();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.projectId) {
      conditions.push('project_id = ?');
      params.push(filter.projectId);
    }

    if (filter.recipeId) {
      conditions.push('recipe_id = ?');
      params.push(filter.recipeId);
    }

    if (filter.status) {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    if (filter.captureType) {
      conditions.push('capture_type = ?');
      params.push(filter.captureType);
    }

    let query = 'SELECT * FROM capture_history';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const limit = filter.limit ?? 100;
    const offset = filter.offset ?? 0;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.mapRowToRecord(r));
  }

  save(record: CaptureHistoryRecord): CaptureHistoryRecord {
    const db = this.dbMgr.getDb();
    const existing = db.prepare('SELECT id FROM capture_history WHERE id = ?').get(record.id);

    const viewportStr = JSON.stringify(record.viewport || {});
    const outputsStr = JSON.stringify(record.outputs || {});
    const warningsStr = JSON.stringify(record.warnings || []);

    let projId = record.projectId || null;
    if (projId) {
      const pExists = db.prepare('SELECT id FROM projects WHERE id = ?').get(projId);
      if (!pExists) projId = null;
    }

    let recId = record.recipeId || null;
    if (recId) {
      const rExists = db.prepare('SELECT id FROM recipes WHERE id = ?').get(recId);
      if (!rExists) recId = null;
    }

    if (existing) {
      db.prepare(`
        UPDATE capture_history
        SET job_id = ?, project_id = ?, recipe_id = ?, url = ?, capture_type = ?, status = ?,
            viewport = ?, dpr = ?, timestamp = ?, duration_ms = ?, outputs = ?, error = ?, warnings = ?
        WHERE id = ?
      `).run(
        record.jobId || null,
        projId,
        recId,
        record.url,
        record.captureType,
        record.status,
        viewportStr,
        record.dpr,
        record.timestamp,
        record.durationMs,
        outputsStr,
        record.error || null,
        warningsStr,
        record.id
      );
    } else {
      db.prepare(`
        INSERT INTO capture_history
        (id, job_id, project_id, recipe_id, url, capture_type, status, viewport, dpr, timestamp, duration_ms, outputs, error, warnings, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        record.id,
        record.jobId || null,
        projId,
        recId,
        record.url,
        record.captureType,
        record.status,
        viewportStr,
        record.dpr,
        record.timestamp,
        record.durationMs,
        outputsStr,
        record.error || null,
        warningsStr,
        record.createdAt
      );
    }

    return record;
  }

  /**
   * Deletes a history record from the database.
   * Requirement 16: Does NOT automatically delete physical capture asset files from disk.
   */
  delete(id: string): boolean {
    const db = this.dbMgr.getDb();
    const existing = this.getById(id);
    if (!existing) return false;

    db.prepare('DELETE FROM capture_history WHERE id = ?').run(id);
    return true;
  }
}

const globalForHistoryRepo = globalThis as unknown as {
  captureHistoryRepository: CaptureHistoryRepository | undefined;
};

export const captureHistoryRepository =
  globalForHistoryRepo.captureHistoryRepository ?? new CaptureHistoryRepository();

if (process.env.NODE_ENV !== 'production') {
  globalForHistoryRepo.captureHistoryRepository = captureHistoryRepository;
}
