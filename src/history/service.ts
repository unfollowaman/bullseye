import fs from 'fs';
import { CaptureHistoryRepository, captureHistoryRepository } from './repository';
import {
  CaptureHistoryFilter,
  CaptureHistoryOutputs,
  CaptureHistoryRecord,
  CreateHistoryRecordInput,
} from './types';
import { UnifiedCaptureResult, UnifiedCaptureType } from '@/capture/types';
import { getPublicAssetUrl } from '@/utils/url-utils';

export class CaptureHistoryService {
  private repo: CaptureHistoryRepository;

  constructor(repo: CaptureHistoryRepository = captureHistoryRepository) {
    this.repo = repo;
  }

  listHistory(filter: CaptureHistoryFilter = {}): CaptureHistoryRecord[] {
    return this.repo.getAll(filter);
  }

  getHistoryRecord(id: string): CaptureHistoryRecord | null {
    return this.repo.getById(id);
  }

  createRecord(input: CreateHistoryRecordInput): CaptureHistoryRecord {
    const id = `history_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const record: CaptureHistoryRecord = {
      id,
      jobId: input.jobId,
      projectId: input.projectId,
      recipeId: input.recipeId,
      url: input.url,
      captureType: input.captureType,
      status: input.status,
      viewport: input.viewport || { width: 1280, height: 720 },
      dpr: input.dpr || 1,
      timestamp: input.timestamp || now,
      durationMs: input.durationMs || 0,
      outputs: input.outputs || {},
      error: input.error,
      warnings: input.warnings || [],
      createdAt: now,
    };

    return this.repo.save(record);
  }

  /**
   * Helper to convert a UnifiedCaptureResult into a persistent CaptureHistoryRecord.
   */
  recordJobResult(
    jobResult: UnifiedCaptureResult,
    context?: { projectId?: string; recipeId?: string }
  ): CaptureHistoryRecord {
    const outputs: CaptureHistoryOutputs = {};

    // 1. Process Screenshot output if present
    const screenshotFsPath =
      jobResult.screenshotResult?.metadata?.outputPath || jobResult.outputPaths?.screenshot;

    if (screenshotFsPath) {
      const safeWebPath = getPublicAssetUrl(screenshotFsPath) || screenshotFsPath;
      let sizeBytes: number | undefined;

      try {
        if (fs.existsSync(screenshotFsPath)) {
          sizeBytes = fs.statSync(screenshotFsPath).size;
        }
      } catch {}

      outputs.screenshot = {
        path: safeWebPath,
        width: jobResult.screenshotResult?.metadata?.viewport?.width || jobResult.viewport.width,
        height: jobResult.screenshotResult?.metadata?.viewport?.height || jobResult.viewport.height,
        sizeBytes,
      };
    }

    // 2. Process Recording output if present
    const recordingFsPath =
      jobResult.recordingResult?.metadata?.outputPath || jobResult.outputPaths?.recording;

    if (recordingFsPath) {
      const safeWebPath = getPublicAssetUrl(recordingFsPath) || recordingFsPath;
      let sizeBytes: number | undefined;

      try {
        if (fs.existsSync(recordingFsPath)) {
          sizeBytes = fs.statSync(recordingFsPath).size;
        }
      } catch {}

      outputs.recording = {
        path: safeWebPath,
        durationMs:
          jobResult.recordingResult?.metadata?.durationMs ||
          jobResult.durations?.recordingMs ||
          0,
        format: jobResult.recordingResult?.metadata?.format || 'webm',
        sizeBytes,
      };
    }

    // Determine raw capture type
    let captureType: UnifiedCaptureType = 'screenshot';
    if (
      jobResult.requestedCaptureTypes.includes('screenshot') &&
      jobResult.requestedCaptureTypes.includes('recording')
    ) {
      captureType = 'both';
    } else if (jobResult.requestedCaptureTypes.includes('recording')) {
      captureType = 'recording';
    }

    const primaryError =
      jobResult.errors && jobResult.errors.length > 0 ? jobResult.errors.join('; ') : undefined;

    const recordInput: CreateHistoryRecordInput = {
      jobId: jobResult.id,
      projectId: context?.projectId || jobResult.projectId,
      recipeId: context?.recipeId || jobResult.recipeId,
      url: jobResult.url,
      captureType,
      status: jobResult.status,
      viewport: jobResult.viewport,
      dpr: jobResult.deviceScaleFactor,
      timestamp: jobResult.timestamps.completedAt || jobResult.timestamps.createdAt,
      durationMs: jobResult.durations.totalMs || 0,
      outputs,
      error: primaryError,
      warnings: jobResult.warnings,
    };

    return this.createRecord(recordInput);
  }

  deleteHistoryRecord(id: string): boolean {
    return this.repo.delete(id);
  }
}

const globalForHistoryService = globalThis as unknown as {
  captureHistoryService: CaptureHistoryService | undefined;
};

export const captureHistoryService =
  globalForHistoryService.captureHistoryService ?? new CaptureHistoryService();

if (process.env.NODE_ENV !== 'production') {
  globalForHistoryService.captureHistoryService = captureHistoryService;
}
