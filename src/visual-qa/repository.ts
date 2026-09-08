import { DatabaseManager, dbManager } from '../db';
import { VisualQAResult } from './types';

export class VisualQARepository {
  private dbManager: DatabaseManager;

  constructor(dbManagerParam?: DatabaseManager) {
    this.dbManager = dbManagerParam || dbManager;
  }

  public save(result: VisualQAResult): void {
    const db = this.dbManager.getDb();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO visual_qa_comparisons (
        id,
        baseline_capture_id,
        baseline_asset_path,
        current_capture_id,
        current_asset_path,
        outcome,
        match,
        changed_pixels,
        total_pixels,
        changed_percentage,
        config,
        diff_asset_path,
        diff_web_path,
        overlay_asset_path,
        overlay_web_path,
        dimensions,
        duration_ms,
        warnings,
        error,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      result.id,
      result.baselineCaptureId || null,
      result.baselineAssetPath,
      result.currentCaptureId || null,
      result.currentAssetPath,
      result.outcome,
      result.match ? 1 : 0,
      result.metrics.changedPixels,
      result.metrics.totalPixels,
      result.metrics.changedPercentage,
      JSON.stringify(result.config),
      result.diffAsset ? result.diffAsset.safePath : null,
      result.diffAsset ? result.diffAsset.webPath : null,
      result.overlayAsset ? result.overlayAsset.safePath : null,
      result.overlayAsset ? result.overlayAsset.webPath : null,
      JSON.stringify({
        baseline: result.baselineDimensions,
        current: result.currentDimensions,
      }),
      result.durationMs,
      JSON.stringify(result.warnings || []),
      result.error || null,
      result.createdAt
    );
  }

  public getById(id: string): VisualQAResult | null {
    const db = this.dbManager.getDb();
    const stmt = db.prepare('SELECT * FROM visual_qa_comparisons WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;

    if (!row) return null;

    return this.mapRowToResult(row);
  }

  public getAll(filter?: {
    baselineCaptureId?: string;
    currentCaptureId?: string;
    outcome?: string;
    limit?: number;
    offset?: number;
  }): VisualQAResult[] {
    const db = this.dbManager.getDb();

    let sql = 'SELECT * FROM visual_qa_comparisons WHERE 1=1';
    const params: (string | number | null)[] = [];

    if (filter?.baselineCaptureId) {
      sql += ' AND baseline_capture_id = ?';
      params.push(filter.baselineCaptureId);
    }

    if (filter?.currentCaptureId) {
      sql += ' AND current_capture_id = ?';
      params.push(filter.currentCaptureId);
    }

    if (filter?.outcome) {
      sql += ' AND outcome = ?';
      params.push(filter.outcome);
    }

    sql += ' ORDER BY created_at DESC';

    if (typeof filter?.limit === 'number') {
      sql += ' LIMIT ?';
      params.push(filter.limit);

      if (typeof filter?.offset === 'number') {
        sql += ' OFFSET ?';
        params.push(filter.offset);
      }
    }

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as Record<string, unknown>[];

    return rows.map((r) => this.mapRowToResult(r));
  }

  public delete(id: string): boolean {
    const db = this.dbManager.getDb();
    const stmt = db.prepare('DELETE FROM visual_qa_comparisons WHERE id = ?');
    stmt.run(id);
    return true;
  }

  private mapRowToResult(row: Record<string, unknown>): VisualQAResult {
    const parsedConfig = JSON.parse(String(row.config || '{}'));
    const parsedDims = JSON.parse(String(row.dimensions || '{}'));
    const parsedWarnings = JSON.parse(String(row.warnings || '[]'));

    let diffAsset: VisualQAResult['diffAsset'];
    if (row.diff_asset_path) {
      diffAsset = {
        safePath: String(row.diff_asset_path),
        webPath: String(row.diff_web_path || ''),
        filename: String(row.diff_asset_path).split('/').pop() || '',
        width: parsedDims.baseline?.width || 0,
        height: parsedDims.baseline?.height || 0,
        sizeBytes: 0,
        format: parsedConfig.outputFormat || 'png',
      };
    }

    let overlayAsset: VisualQAResult['overlayAsset'];
    if (row.overlay_asset_path) {
      overlayAsset = {
        safePath: String(row.overlay_asset_path),
        webPath: String(row.overlay_web_path || ''),
        filename: String(row.overlay_asset_path).split('/').pop() || '',
        width: parsedDims.baseline?.width || 0,
        height: parsedDims.baseline?.height || 0,
        sizeBytes: 0,
        format: parsedConfig.outputFormat || 'png',
      };
    }

    const matchBool = Number(row.match) === 1;
    const statusVal = row.error ? 'error' : 'completed';

    return {
      id: String(row.id),
      baselineAssetPath: String(row.baseline_asset_path),
      currentAssetPath: String(row.current_asset_path),
      baselineCaptureId: row.baseline_capture_id
        ? String(row.baseline_capture_id)
        : undefined,
      currentCaptureId: row.current_capture_id
        ? String(row.current_capture_id)
        : undefined,
      baselineDimensions: parsedDims.baseline,
      currentDimensions: parsedDims.current,
      status: statusVal,
      outcome: String(row.outcome) as VisualQAResult['outcome'],
      match: matchBool,
      metrics: {
        changedPixels: Number(row.changed_pixels || 0),
        totalPixels: Number(row.total_pixels || 0),
        changedPercentage: Number(row.changed_percentage || 0),
      },
      config: parsedConfig,
      diffAsset,
      overlayAsset,
      createdAt: String(row.created_at),
      durationMs: Number(row.duration_ms || 0),
      warnings: parsedWarnings,
      error: row.error ? String(row.error) : undefined,
      version: 1,
    };
  }
}

const globalForVisualQARepository = globalThis as unknown as {
  visualQARepository: VisualQARepository | undefined;
};

export const visualQARepository =
  globalForVisualQARepository.visualQARepository ?? new VisualQARepository();

if (process.env.NODE_ENV !== 'production') {
  globalForVisualQARepository.visualQARepository = visualQARepository;
}
