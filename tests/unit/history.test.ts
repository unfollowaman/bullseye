import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseManager } from '@/db';
import { CaptureHistoryRepository } from '@/history/repository';
import { CaptureHistoryService } from '@/history/service';
import { UnifiedCaptureResult } from '@/capture/types';

const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test-history.db');
const TEST_ASSET_PATH = path.join(process.cwd(), 'public', 'captures', 'test-history-asset.png');

describe('Phase 9 — Capture History Engine & Asset Management Unit Tests', () => {
  let dbMgr: DatabaseManager;
  let repo: CaptureHistoryRepository;
  let service: CaptureHistoryService;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    dbMgr = new DatabaseManager(TEST_DB_PATH);
    dbMgr.init();
    repo = new CaptureHistoryRepository(dbMgr);
    service = new CaptureHistoryService(repo);

    // Create dummy asset for retention & asset path tests
    const capturesDir = path.dirname(TEST_ASSET_PATH);
    if (!fs.existsSync(capturesDir)) {
      fs.mkdirSync(capturesDir, { recursive: true });
    }
    fs.writeFileSync(TEST_ASSET_PATH, 'dummy image content', 'utf-8');

    // Create dummy project and recipe in DB
    const db = dbMgr.getDb();
    db.prepare(`
      INSERT INTO projects (id, name, description, default_url, created_at, updated_at)
      VALUES ('p123', 'Test Project P123', '', '', '2026-01-01', '2026-01-01')
    `).run();

    db.prepare(`
      INSERT INTO projects (id, name, description, default_url, created_at, updated_at)
      VALUES ('proj_A', 'Project A', '', '', '2026-01-01', '2026-01-01')
    `).run();

    db.prepare(`
      INSERT INTO projects (id, name, description, default_url, created_at, updated_at)
      VALUES ('proj_B', 'Project B', '', '', '2026-01-01', '2026-01-01')
    `).run();

    db.prepare(`
      INSERT INTO recipes (id, name, description, project_id, config, actions, created_at, updated_at, version)
      VALUES ('r456', 'Recipe R456', '', 'p123', '{}', '[]', '2026-01-01', '2026-01-01', 1)
    `).run();
  });

  afterEach(() => {
    dbMgr.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    if (fs.existsSync(TEST_ASSET_PATH)) {
      fs.unlinkSync(TEST_ASSET_PATH);
    }
  });

  test('1. Successful screenshot capture history record creation with safe asset URL', () => {
    const jobResult: UnifiedCaptureResult = {
      id: 'job_shot_1',
      status: 'completed',
      url: 'https://example.com/shot',
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2,
      requestedCaptureTypes: ['screenshot'],
      outputPaths: { screenshot: TEST_ASSET_PATH },
      timestamps: {
        createdAt: '2026-01-01T10:00:00.000Z',
        completedAt: '2026-01-01T10:00:02.000Z',
      },
      durations: { totalMs: 2000, screenshotMs: 2000 },
      errors: [],
      warnings: [],
    };

    const record = service.recordJobResult(jobResult, { projectId: 'p123' });

    expect(record.id).toMatch(/^history_/);
    expect(record.jobId).toBe('job_shot_1');
    expect(record.projectId).toBe('p123');
    expect(record.url).toBe('https://example.com/shot');
    expect(record.captureType).toBe('screenshot');
    expect(record.status).toBe('completed');
    expect(record.outputs.screenshot?.path).toBe('/captures/test-history-asset.png');
    expect(record.outputs.screenshot?.sizeBytes).toBeGreaterThan(0);
  });

  test('2. Successful recording capture history record', () => {
    const jobResult: UnifiedCaptureResult = {
      id: 'job_rec_1',
      status: 'completed',
      url: 'https://example.com/video',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      requestedCaptureTypes: ['recording'],
      outputPaths: { recording: '/app/public/captures/recording-job_rec_1.webm' },
      timestamps: { createdAt: '2026-01-01T10:00:00.000Z' },
      durations: { totalMs: 5000, recordingMs: 5000 },
      errors: [],
      warnings: [],
    };

    const record = service.recordJobResult(jobResult, { recipeId: 'r456' });

    expect(record.recipeId).toBe('r456');
    expect(record.captureType).toBe('recording');
    expect(record.outputs.recording?.path).toBe('/captures/recording-job_rec_1.webm');
  });

  test('3. Combined capture history record', () => {
    const jobResult: UnifiedCaptureResult = {
      id: 'job_both_1',
      status: 'completed',
      url: 'https://example.com/both',
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      requestedCaptureTypes: ['screenshot', 'recording'],
      outputPaths: {
        screenshot: '/app/public/captures/shot-both.png',
        recording: '/app/public/captures/rec-both.webm',
      },
      timestamps: { createdAt: '2026-01-01T10:00:00.000Z' },
      durations: { totalMs: 6000 },
      errors: [],
      warnings: [],
    };

    const record = service.recordJobResult(jobResult);

    expect(record.captureType).toBe('both');
    expect(record.outputs.screenshot?.path).toBe('/captures/shot-both.png');
    expect(record.outputs.recording?.path).toBe('/captures/rec-both.webm');
  });

  test('4. Failed capture history record with error information', () => {
    const jobResult: UnifiedCaptureResult = {
      id: 'job_fail_1',
      status: 'failed',
      url: 'http://invalid-unreachable-site.com',
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      requestedCaptureTypes: ['screenshot'],
      outputPaths: {},
      timestamps: { createdAt: '2026-01-01T10:00:00.000Z' },
      durations: { totalMs: 100 },
      errors: ['Navigation timeout: frame detached'],
      warnings: [],
    };

    const record = service.recordJobResult(jobResult);

    expect(record.status).toBe('failed');
    expect(record.error).toContain('Navigation timeout');
    expect(record.outputs.screenshot).toBeUndefined();
  });

  test('5. Partial success & cancellation history records', () => {
    const partialResult: UnifiedCaptureResult = {
      id: 'job_part_1',
      status: 'partial',
      url: 'https://example.com/partial',
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      requestedCaptureTypes: ['screenshot', 'recording'],
      outputPaths: { screenshot: '/app/public/captures/partial-shot.png' },
      timestamps: { createdAt: '2026-01-01T10:00:00.000Z' },
      durations: { totalMs: 3000 },
      errors: ['Recording error: Timeout waiting for video stream'],
      warnings: ['Job partially completed: one capture type succeeded while the other failed.'],
    };

    const partRecord = service.recordJobResult(partialResult);
    expect(partRecord.status).toBe('partial');
    expect(partRecord.outputs.screenshot).toBeDefined();
    expect(partRecord.outputs.recording).toBeUndefined();

    const cancelResult: UnifiedCaptureResult = {
      id: 'job_cancel_1',
      status: 'cancelled',
      url: 'https://example.com/cancel',
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      requestedCaptureTypes: ['screenshot'],
      outputPaths: {},
      timestamps: { createdAt: '2026-01-01T10:00:00.000Z' },
      durations: { totalMs: 500 },
      errors: ['Job cancelled by user'],
      warnings: [],
    };

    const cancelRecord = service.recordJobResult(cancelResult);
    expect(cancelRecord.status).toBe('cancelled');
    expect(cancelRecord.error).toContain('Job cancelled');
  });

  test('6. Filtering history records', () => {
    service.createRecord({
      url: 'https://example.com/1',
      captureType: 'screenshot',
      status: 'completed',
      viewport: { width: 1280, height: 720 },
      dpr: 1,
      durationMs: 1000,
      projectId: 'proj_A',
    });

    service.createRecord({
      url: 'https://example.com/2',
      captureType: 'recording',
      status: 'failed',
      viewport: { width: 1280, height: 720 },
      dpr: 1,
      durationMs: 1000,
      projectId: 'proj_B',
    });

    service.createRecord({
      url: 'https://example.com/3',
      captureType: 'screenshot',
      status: 'completed',
      viewport: { width: 1280, height: 720 },
      dpr: 1,
      durationMs: 1000,
      projectId: 'proj_A',
    });

    const projAHistory = service.listHistory({ projectId: 'proj_A' });
    expect(projAHistory.length).toBe(2);

    const completedHistory = service.listHistory({ status: 'completed' });
    expect(completedHistory.length).toBe(2);

    const failedRecord = service.listHistory({ status: 'failed' });
    expect(failedRecord.length).toBe(1);
    expect(failedRecord[0].url).toBe('https://example.com/2');
  });

  test('7. Safe retention behavior: deleting history record does NOT delete physical file', () => {
    const record = service.createRecord({
      url: 'https://example.com/retention',
      captureType: 'screenshot',
      status: 'completed',
      viewport: { width: 1280, height: 720 },
      dpr: 1,
      durationMs: 1000,
      outputs: { screenshot: { path: TEST_ASSET_PATH } },
    });

    expect(fs.existsSync(TEST_ASSET_PATH)).toBe(true);

    const deleted = service.deleteHistoryRecord(record.id);
    expect(deleted).toBe(true);

    // Verify record removed from DB
    expect(service.getHistoryRecord(record.id)).toBeNull();

    // Verify physical asset file still exists on disk
    expect(fs.existsSync(TEST_ASSET_PATH)).toBe(true);
  });
});
