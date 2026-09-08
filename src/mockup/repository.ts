import { DatabaseManager, dbManager } from '../db';
import { MockupResult } from './types';

export interface ListMockupsFilter {
  sourceCaptureId?: string;
  mockupType?: string;
  limit?: number;
  offset?: number;
}

export class MockupRepository {
  private dbMgr: DatabaseManager;

  constructor(dbMgrOrPath?: DatabaseManager | string) {
    if (typeof dbMgrOrPath === 'string') {
      this.dbMgr = new DatabaseManager(dbMgrOrPath);
    } else {
      this.dbMgr = dbMgrOrPath || dbManager;
    }
  }

  private mapRowToResult(row: Record<string, unknown>): MockupResult {
    let configObj = {};
    let warningsArr: string[] = [];

    try {
      if (typeof row.config === 'string' && row.config.trim()) {
        configObj = JSON.parse(row.config);
      }
    } catch {}

    try {
      if (typeof row.warnings === 'string' && row.warnings.trim()) {
        warningsArr = JSON.parse(row.warnings);
      }
    } catch {}

    const width = Number(row.width) || 0;
    const height = Number(row.height) || 0;
    const sizeBytes = Number(row.size_bytes) || 0;
    const outputPathStr = String(row.output_path || '');

    return {
      id: String(row.id),
      mockupType: String(row.mockup_type) as MockupResult['mockupType'],
      sourceAssetPath: String(row.source_asset_path || ''),
      sourceCaptureId: row.source_capture_id ? String(row.source_capture_id) : undefined,
      config: configObj as MockupResult['config'],
      generatedAsset: {
        safePath: outputPathStr,
        webPath: String(row.web_path || ''),
        filename: outputPathStr ? outputPathStr.split('/').pop() || '' : '',
        width,
        height,
        sizeBytes,
        format: String(row.format || 'png') as MockupResult['generatedAsset']['format'],
      },
      dimensions: { width, height },
      createdAt: String(row.created_at),
      version: 1,
      warnings: warningsArr,
    };
  }

  getById(id: string): MockupResult | null {
    const db = this.dbMgr.getDb();
    const row = db.prepare('SELECT * FROM mockups WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToResult(row);
  }

  getAll(filter: ListMockupsFilter = {}): MockupResult[] {
    const db = this.dbMgr.getDb();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter.sourceCaptureId) {
      conditions.push('source_capture_id = ?');
      params.push(filter.sourceCaptureId);
    }

    if (filter.mockupType) {
      conditions.push('mockup_type = ?');
      params.push(filter.mockupType);
    }

    let query = 'SELECT * FROM mockups';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const limit = filter.limit ?? 100;
    const offset = filter.offset ?? 0;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map((r) => this.mapRowToResult(r));
  }

  save(mockup: MockupResult): MockupResult {
    const db = this.dbMgr.getDb();
    const existing = db.prepare('SELECT id FROM mockups WHERE id = ?').get(mockup.id);

    const configStr = JSON.stringify(mockup.config || {});
    const warningsStr = JSON.stringify(mockup.warnings || []);

    let capId = mockup.sourceCaptureId || null;
    if (capId) {
      const cExists = db.prepare('SELECT id FROM capture_history WHERE id = ?').get(capId);
      if (!cExists) capId = null;
    }

    if (existing) {
      db.prepare(`
        UPDATE mockups
        SET source_capture_id = ?, source_asset_path = ?, mockup_type = ?, config = ?,
            output_path = ?, web_path = ?, width = ?, height = ?, size_bytes = ?, format = ?, warnings = ?
        WHERE id = ?
      `).run(
        capId,
        mockup.sourceAssetPath,
        mockup.mockupType,
        configStr,
        mockup.generatedAsset.safePath,
        mockup.generatedAsset.webPath,
        mockup.generatedAsset.width,
        mockup.generatedAsset.height,
        mockup.generatedAsset.sizeBytes,
        mockup.generatedAsset.format,
        warningsStr,
        mockup.id
      );
    } else {
      db.prepare(`
        INSERT INTO mockups
        (id, source_capture_id, source_asset_path, mockup_type, config, output_path, web_path, width, height, size_bytes, format, warnings, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        mockup.id,
        capId,
        mockup.sourceAssetPath,
        mockup.mockupType,
        configStr,
        mockup.generatedAsset.safePath,
        mockup.generatedAsset.webPath,
        mockup.generatedAsset.width,
        mockup.generatedAsset.height,
        mockup.generatedAsset.sizeBytes,
        mockup.generatedAsset.format,
        warningsStr,
        mockup.createdAt
      );
    }

    return mockup;
  }

  delete(id: string): boolean {
    const db = this.dbMgr.getDb();
    const existing = this.getById(id);
    if (!existing) return false;

    db.prepare('DELETE FROM mockups WHERE id = ?').run(id);
    return true;
  }
}

const globalForMockupRepo = globalThis as unknown as {
  mockupRepository: MockupRepository | undefined;
};

export const mockupRepository =
  globalForMockupRepo.mockupRepository ?? new MockupRepository();

if (process.env.NODE_ENV !== 'production') {
  globalForMockupRepo.mockupRepository = mockupRepository;
}
