import path from 'path';
import fs from 'fs';
import { BrowserManager, browserManager } from '@/browser/browser-manager';
import { ScreenshotEngine, screenshotEngine } from './screenshot-engine';
import { RecordingEngine, recordingEngine } from './recording-engine';
import { ffmpegConverter, FFmpegConverter } from './ffmpeg-converter';
import { CaptureLogger } from './logger';
import { isValidUrl, checkFFmpegAvailability } from '@/utils';
import { validateActions } from './action-validator';
import { captureHistoryService, CaptureHistoryService } from '@/history/service';
import { config as appConfig } from '@/config';
import {
  CaptureOptions,
  CaptureResult,
  CaptureControllerStatus,
  UnifiedCaptureConfig,
  UnifiedCaptureResult,
  JobStatus,
  ScreenshotOptions,
  RecordingOptions,
  ViewportDimensions,
  ScreenshotResult,
  RecordingResult,
  Mp4Result,
} from './types';

const DEFAULT_VIEWPORT: ViewportDimensions = { width: 1280, height: 720 };
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RECORDING_DURATION = 5000;
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'public', 'captures');

export class CaptureController {
  private browserMgr: BrowserManager;
  private screenshotEng: ScreenshotEngine;
  private recordingEng: RecordingEngine;
  private ffmpegConv: FFmpegConverter;
  private historySvc: CaptureHistoryService;
  private jobs: Map<string, UnifiedCaptureResult> = new Map();
  private cancellationTokens: Map<string, { cancelled: boolean; cancelFn?: () => void }> = new Map();
  private activeCount: number = 0;
  private maxConcurrentJobs: number = appConfig.maxConcurrentJobs || 4;
  private concurrencyQueue: (() => void)[] = [];

  constructor(
    manager: BrowserManager = browserManager,
    screenshotEng: ScreenshotEngine = screenshotEngine,
    recEngine: RecordingEngine = recordingEngine,
    historySvc: CaptureHistoryService = captureHistoryService,
    ffmpegConv: FFmpegConverter = ffmpegConverter
  ) {
    this.browserMgr = manager;
    this.screenshotEng = screenshotEng;
    this.recordingEng = recEngine;
    this.historySvc = historySvc;
    this.ffmpegConv = ffmpegConv;
  }

  private async acquireConcurrencySlot(): Promise<void> {
    if (this.activeCount < this.maxConcurrentJobs) {
      return;
    }
    return new Promise<void>((resolve) => {
      this.concurrencyQueue.push(resolve);
    });
  }

  private releaseConcurrencySlot(): void {
    const next = this.concurrencyQueue.shift();
    if (next) {
      next();
    }
  }

  async getStatus(): Promise<CaptureControllerStatus> {
    const browserHealthy = await this.browserMgr.isHealthy();
    const ffmpegCap = await checkFFmpegAvailability();
    return {
      ready: browserHealthy,
      activeCaptures: this.activeCount,
      supportedTypes: ['screenshot', 'recording', 'both'],
      ffmpegAvailable: ffmpegCap.available,
      ffmpegVersion: ffmpegCap.version,
    };
  }

  // Retrieve a tracked job by ID
  getJob(jobId: string): UnifiedCaptureResult | undefined {
    return this.jobs.get(jobId);
  }

  // Validate capture configuration before browser execution
  validateConfig(config: UnifiedCaptureConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. URL validation
    if (!config.url) {
      errors.push('URL is required');
    } else if (!isValidUrl(config.url)) {
      errors.push(`Invalid URL format: '${config.url}'. Must be a valid http:// or https:// URL.`);
    }

    // 2. Capture Type validation
    const rawType = config.captureType ?? config.type ?? 'screenshot';
    if (!['screenshot', 'recording', 'both'].includes(rawType)) {
      errors.push(`Invalid capture type: '${rawType}'. Must be 'screenshot', 'recording', or 'both'.`);
    }

    // 3. Viewport validation & bounds
    if (config.viewport) {
      if (
        typeof config.viewport.width !== 'number' ||
        config.viewport.width <= 0 ||
        isNaN(config.viewport.width)
      ) {
        errors.push('Viewport width must be a positive number');
      } else if (config.viewport.width > appConfig.maxViewportWidth) {
        errors.push(`Viewport width cannot exceed ${appConfig.maxViewportWidth}px`);
      }

      if (
        typeof config.viewport.height !== 'number' ||
        config.viewport.height <= 0 ||
        isNaN(config.viewport.height)
      ) {
        errors.push('Viewport height must be a positive number');
      } else if (config.viewport.height > appConfig.maxViewportHeight) {
        errors.push(`Viewport height cannot exceed ${appConfig.maxViewportHeight}px`);
      }
    }

    // 4. DPR validation
    if (config.deviceScaleFactor !== undefined) {
      if (
        typeof config.deviceScaleFactor !== 'number' ||
        config.deviceScaleFactor <= 0 ||
        isNaN(config.deviceScaleFactor)
      ) {
        errors.push('Device scale factor (DPR) must be a positive number');
      } else if (config.deviceScaleFactor > 4) {
        errors.push('Device scale factor (DPR) cannot exceed 4');
      }
    }

    // 5. Timeout options validation & bounds
    const timeout = config.timeoutOptions?.timeoutMs ?? config.timeout;
    if (timeout !== undefined) {
      if (typeof timeout !== 'number' || timeout <= 0 || isNaN(timeout)) {
        errors.push('Timeout must be a positive number (milliseconds)');
      } else if (timeout > appConfig.maxTimeoutMs) {
        errors.push(`Timeout cannot exceed ${appConfig.maxTimeoutMs}ms`);
      }
    }

    // 6. Recording options validation & bounds
    const recDuration = config.recordingOptions?.durationMs ?? config.recordingDurationMs;
    if (recDuration !== undefined) {
      if (typeof recDuration !== 'number' || recDuration < 0 || isNaN(recDuration)) {
        errors.push('Recording duration must be a non-negative number (milliseconds)');
      } else if (recDuration > appConfig.maxRecordingDurationMs) {
        errors.push(`Recording duration cannot exceed ${appConfig.maxRecordingDurationMs}ms`);
      }
    }

    // 7. Actions validation
    if (config.actions !== undefined) {
      const actVal = validateActions(config.actions);
      if (!actVal.valid) {
        errors.push(...actVal.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Legacy validateOptions for backward compatibility
  validateOptions(options: CaptureOptions): { valid: boolean; message?: string } {
    const validation = this.validateConfig(options);
    if (!validation.valid) {
      return { valid: false, message: validation.errors.join('; ') };
    }
    return { valid: true };
  }

  /**
   * Safely persists a capture history record without failing the capture execution
   * if history database writing fails (Requirement 18).
   */
  private persistHistorySafely(job: UnifiedCaptureResult): UnifiedCaptureResult {
    try {
      const historyRecord = this.historySvc.recordJobResult(job);
      if (historyRecord?.id) {
        job.historyRecordId = historyRecord.id;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const warn = `Warning: Failed to persist capture history record: ${errMsg}`;
      job.warnings = [...(job.warnings || []), warn];
      CaptureLogger.warn('history_persistence_failed', { jobId: job.id, error: errMsg });
    }
    return job;
  }

  // Main execution entrypoint for unified captures
  async executeJob(config: UnifiedCaptureConfig): Promise<UnifiedCaptureResult> {
    const jobId = config.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const createdAt = new Date().toISOString();
    const rawType = config.captureType ?? config.type ?? 'screenshot';

    CaptureLogger.logJobCreated(jobId, config.url || '', rawType, { config });

    // Normalize requested types
    const requestedCaptureTypes: ('screenshot' | 'recording')[] =
      rawType === 'both' ? ['screenshot', 'recording'] : [rawType as 'screenshot' | 'recording'];

    const viewport: ViewportDimensions = config.viewport ?? DEFAULT_VIEWPORT;
    const deviceScaleFactor = config.deviceScaleFactor ?? 1;

    // Build initial pending job state
    let job: UnifiedCaptureResult = {
      id: jobId,
      projectId: config.projectId,
      recipeId: config.recipeId,
      status: 'pending',
      url: config.url || '',
      viewport,
      deviceScaleFactor,
      requestedCaptureTypes,
      outputPaths: {},
      timestamps: { createdAt },
      durations: {},
      errors: [],
      warnings: [],
    };

    this.jobs.set(jobId, job);
    this.cancellationTokens.set(jobId, { cancelled: false });

    // Validate before execution
    const validation = this.validateConfig(config);
    CaptureLogger.logValidation(jobId, validation.valid, validation.errors.join('; '));

    if (!validation.valid) {
      job = {
        ...job,
        status: 'failed',
        timestamps: { ...job.timestamps, completedAt: new Date().toISOString() },
        errors: validation.errors,
      };
      this.jobs.set(jobId, job);
      CaptureLogger.logCaptureFailed(jobId, validation.errors.join('; '));
      return this.persistHistorySafely(job);
    }

    // Acquire concurrency slot before browser launch
    await this.acquireConcurrencySlot();

    // Check cancellation after acquiring slot
    if (this.isCancelled(jobId) || this.jobs.get(jobId)?.status === 'cancelled') {
      const cJob = this.jobs.get(jobId) || (await this.finalizeCancelledJob(jobId));
      return this.persistHistorySafely(cJob);
    }

    // Transition to running
    const startedAt = new Date().toISOString();
    const startTime = Date.now();
    job = {
      ...job,
      status: 'running',
      timestamps: { ...job.timestamps, startedAt },
    };
    this.jobs.set(jobId, job);
    this.activeCount++;

    CaptureLogger.logCaptureStarted(jobId, requestedCaptureTypes);

    let screenshotResult: ScreenshotResult | undefined;
    let recordingResult: RecordingResult | undefined;
    let mp4Result: Mp4Result | undefined;
    let screenshotMs: number | undefined;
    let recordingMs: number | undefined;
    let mp4Ms: number | undefined;

    try {
      // Handle cancellation check prior to engine operations
      if (this.isCancelled(jobId) || this.jobs.get(jobId)?.status === 'cancelled') {
        const cancelledJob = this.jobs.get(jobId) || (await this.finalizeCancelledJob(jobId));
        return this.persistHistorySafely(cancelledJob);
      }

      const outputDir = config.outputDir ?? DEFAULT_OUTPUT_DIR;
      const disableAnimations =
        config.stabilizationOptions?.disableAnimations ?? config.disableAnimations ?? false;
      const additionalWaitMs =
        config.stabilizationOptions?.additionalWaitMs ?? config.additionalWaitMs ?? 0;
      const timeout = config.timeoutOptions?.timeoutMs ?? config.timeout ?? DEFAULT_TIMEOUT;

      // 1. Screenshot Operation if requested
      if (requestedCaptureTypes.includes('screenshot')) {
        if (this.isCancelled(jobId) || this.jobs.get(jobId)?.status === 'cancelled') {
          const cancelledJob = this.jobs.get(jobId) || (await this.finalizeCancelledJob(jobId));
          return this.persistHistorySafely(cancelledJob);
        }

        CaptureLogger.logScreenshotStarted(jobId);
        const shotStart = Date.now();

        const screenshotMode =
          config.screenshotOptions?.mode ?? config.mode ?? (config.screenshotOptions?.fullPage || config.fullPage ? 'fullPage' : 'viewport');

        const screenshotFilename =
          config.screenshotOptions?.filename ??
          (rawType === 'both' ? `screenshot-${jobId}.png` : config.filename ?? `screenshot-${jobId}.png`);

        const token = this.cancellationTokens.get(jobId);
        const shotOptions: ScreenshotOptions = {
          url: config.url,
          viewport,
          deviceScaleFactor,
          mode: screenshotMode,
          disableAnimations,
          additionalWaitMs,
          timeout,
          outputDir,
          filename: screenshotFilename,
          cancellationToken: token,
          actions: config.actions,
        };

        screenshotResult = await this.screenshotEng.capture(shotOptions);
        screenshotMs = Date.now() - shotStart;

        if (this.isCancelled(jobId) || this.jobs.get(jobId)?.status === 'cancelled') {
          const cancelledJob = this.jobs.get(jobId) || (await this.finalizeCancelledJob(jobId));
          return this.persistHistorySafely(cancelledJob);
        }

        if (screenshotResult.status === 'completed' && screenshotResult.metadata) {
          job.outputPaths.screenshot = screenshotResult.metadata.outputPath;
          CaptureLogger.logScreenshotCompleted(
            jobId,
            screenshotMs,
            screenshotResult.metadata.outputPath
          );
        } else {
          const err = screenshotResult.error || 'Screenshot capture failed';
          job.errors.push(`Screenshot error: ${err}`);
          CaptureLogger.logScreenshotFailed(jobId, err);
        }
      }

      // 2. Recording Operation if requested
      if (requestedCaptureTypes.includes('recording')) {
        if (this.isCancelled(jobId) || this.jobs.get(jobId)?.status === 'cancelled') {
          const cancelledJob = this.jobs.get(jobId) || (await this.finalizeCancelledJob(jobId));
          return this.persistHistorySafely(cancelledJob);
        }

        const durationMs =
          config.recordingOptions?.durationMs ?? config.recordingDurationMs ?? DEFAULT_RECORDING_DURATION;

        CaptureLogger.logRecordingStarted(jobId, durationMs);
        const recStart = Date.now();

        const recordingFilename =
          config.recordingOptions?.filename ??
          (rawType === 'both' ? `recording-${jobId}.webm` : config.filename ?? `recording-${jobId}.webm`);

        const advancedRecordingOptions =
          config.recordingOptions?.advancedRecordingOptions ?? config.advancedRecordingOptions;

        const token = this.cancellationTokens.get(jobId);
        const recOptions: RecordingOptions = {
          url: config.url,
          viewport,
          deviceScaleFactor,
          recordingDurationMs: durationMs,
          additionalWaitMs,
          timeout,
          outputDir,
          filename: recordingFilename,
          cancellationToken: token,
          actions: config.actions,
          advancedRecordingOptions,
        };

        recordingResult = await this.recordingEng.record(recOptions);
        recordingMs = Date.now() - recStart;

        if (this.isCancelled(jobId) || this.jobs.get(jobId)?.status === 'cancelled') {
          const cancelledJob = this.jobs.get(jobId) || (await this.finalizeCancelledJob(jobId));
          return this.persistHistorySafely(cancelledJob);
        }

        if (recordingResult.status === 'completed' && recordingResult.metadata) {
          job.outputPaths.recording = recordingResult.metadata.outputPath;
          CaptureLogger.logRecordingCompleted(
            jobId,
            recordingMs,
            recordingResult.metadata.outputPath
          );
        } else {
          const err = recordingResult.error || 'Recording capture failed';
          job.errors.push(`Recording error: ${err}`);
          CaptureLogger.logRecordingFailed(jobId, err);
        }
      }

      // 3. MP4 Conversion Operation if requested and recording succeeded
      const convertToMp4 =
        config.recordingOptions?.convertToMp4 ?? config.convertToMp4 ?? false;
      const mp4Options = config.recordingOptions?.mp4Options ?? config.mp4Options;

      if (
        requestedCaptureTypes.includes('recording') &&
        recordingResult?.status === 'completed' &&
        recordingResult.metadata?.outputPath &&
        convertToMp4
      ) {
        if (this.isCancelled(jobId) || this.jobs.get(jobId)?.status === 'cancelled') {
          const cancelledJob = this.jobs.get(jobId) || (await this.finalizeCancelledJob(jobId));
          return this.persistHistorySafely(cancelledJob);
        }

        const mp4Start = Date.now();
        const token = this.cancellationTokens.get(jobId);

        const baseFilename =
          config.recordingOptions?.filename || config.filename;
        const mp4Filename = baseFilename
          ? baseFilename.replace(/\.webm$/i, '.mp4')
          : `recording-${jobId}.mp4`;

        const convRes = await this.ffmpegConv.convertWebmToMp4({
          inputPath: recordingResult.metadata.outputPath,
          outputDir,
          filename: mp4Filename,
          quality: mp4Options?.quality,
          crf: mp4Options?.crf,
          fps: mp4Options?.fps,
          timeoutMs: mp4Options?.timeoutMs,
          cancellationToken: token,
        });

        mp4Ms = Date.now() - mp4Start;

        if (this.isCancelled(jobId) || this.jobs.get(jobId)?.status === 'cancelled') {
          const cancelledJob = this.jobs.get(jobId) || (await this.finalizeCancelledJob(jobId));
          return this.persistHistorySafely(cancelledJob);
        }

        if (convRes.status === 'completed' && convRes.outputPath) {
          job.outputPaths.mp4 = convRes.outputPath;
          mp4Result = {
            status: 'completed',
            outputPath: convRes.outputPath,
            fileSizeBytes: convRes.fileSizeBytes,
            durationMs: convRes.durationMs,
          };
          recordingResult.mp4Result = mp4Result;
          recordingResult.metadata.mp4OutputPath = convRes.outputPath;
        } else if (convRes.status === 'cancelled') {
          const cancelledJob = this.jobs.get(jobId) || (await this.finalizeCancelledJob(jobId));
          return this.persistHistorySafely(cancelledJob);
        } else {
          const err = convRes.error || 'MP4 conversion failed';
          mp4Result = {
            status: 'failed',
            error: err,
          };
          recordingResult.mp4Result = mp4Result;
          job.errors.push(`MP4 conversion error: ${err}`);
          job.warnings.push(`MP4 conversion failed (${err}). Original WebM recording remains available.`);
        }
      }

      // Check cancellation during or after execution
      if (this.isCancelled(jobId) || this.jobs.get(jobId)?.status === 'cancelled') {
        const cancelledJob = this.jobs.get(jobId) || (await this.finalizeCancelledJob(jobId));
        return this.persistHistorySafely(cancelledJob);
      }

      // Determine final JobStatus
      const totalMs = Date.now() - startTime;
      const completedAt = new Date().toISOString();

      let finalStatus: JobStatus;
      if (requestedCaptureTypes.length === 1) {
        if (requestedCaptureTypes.includes('screenshot')) {
          finalStatus = screenshotResult?.status === 'completed' ? 'completed' : 'failed';
        } else {
          const recOk = recordingResult?.status === 'completed';
          if (!recOk) {
            finalStatus = 'failed';
          } else if (convertToMp4 && mp4Result?.status === 'failed') {
            finalStatus = 'partial';
          } else {
            finalStatus = 'completed';
          }
        }
      } else {
        // Both requested
        const shotOk = screenshotResult?.status === 'completed';
        const recOk = recordingResult?.status === 'completed';
        const mp4Ok = !convertToMp4 || mp4Result?.status === 'completed';

        if (shotOk && recOk && mp4Ok) {
          finalStatus = 'completed';
        } else if (shotOk || recOk) {
          finalStatus = 'partial';
          job.warnings.push('Job partially completed: one or more capture output steps failed.');
        } else {
          finalStatus = 'failed';
        }
      }

      if (this.isCancelled(jobId) || this.jobs.get(jobId)?.status === 'cancelled') {
        const cJob = this.jobs.get(jobId) || (await this.finalizeCancelledJob(jobId));
        return this.persistHistorySafely(cJob);
      }

      const actionDiagnostics = screenshotResult?.actionDiagnostics ?? recordingResult?.actionDiagnostics;

      job = {
        ...job,
        status: finalStatus,
        screenshotResult,
        recordingResult,
        mp4Result,
        timestamps: { ...job.timestamps, completedAt },
        durations: { totalMs, screenshotMs, recordingMs, mp4Ms },
        actionDiagnostics,
      };

      this.jobs.set(jobId, job);
      CaptureLogger.logCaptureCompleted(jobId, finalStatus, totalMs);
      return this.persistHistorySafely(job);
    } catch (err: unknown) {
      if (this.isCancelled(jobId) || this.jobs.get(jobId)?.status === 'cancelled') {
        const cancelledJob = this.jobs.get(jobId) || (await this.finalizeCancelledJob(jobId));
        return this.persistHistorySafely(cancelledJob);
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown execution error';
      job.errors.push(errorMessage);
      job = {
        ...job,
        status: 'failed',
        timestamps: { ...job.timestamps, completedAt: new Date().toISOString() },
        durations: { ...job.durations, totalMs: Date.now() - startTime },
      };
      this.jobs.set(jobId, job);
      CaptureLogger.logCaptureFailed(jobId, errorMessage);
      return this.persistHistorySafely(job);
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.cancellationTokens.delete(jobId);
      this.releaseConcurrencySlot();
      CaptureLogger.logCleanup(jobId);
    }
  }

  // Cancel an active or pending job safely
  async cancelJob(jobId: string, reason: string = 'User requested cancellation'): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return false; // Job is already terminal
    }

    const token = this.cancellationTokens.get(jobId);
    if (token) {
      token.cancelled = true;
      if (token.cancelFn) {
        token.cancelFn();
      }
    }

    CaptureLogger.logCancellation(jobId, reason);

    // Finalize cancelled job state and cleanup temporary files
    await this.finalizeCancelledJob(jobId, reason);
    return true;
  }

  private isCancelled(jobId: string): boolean {
    return this.cancellationTokens.get(jobId)?.cancelled ?? false;
  }

  private async finalizeCancelledJob(jobId: string, reason?: string): Promise<UnifiedCaptureResult> {
    const existing = this.jobs.get(jobId);
    const completedAt = new Date().toISOString();

    // Clean up any generated output files upon cancellation
    if (existing?.outputPaths) {
      if (existing.outputPaths.screenshot && fs.existsSync(existing.outputPaths.screenshot)) {
        try { fs.unlinkSync(existing.outputPaths.screenshot); } catch {}
      }
      if (existing.outputPaths.recording && fs.existsSync(existing.outputPaths.recording)) {
        try { fs.unlinkSync(existing.outputPaths.recording); } catch {}
      }
      if (existing.outputPaths.mp4 && fs.existsSync(existing.outputPaths.mp4)) {
        try { fs.unlinkSync(existing.outputPaths.mp4); } catch {}
      }
    }

    const cancelledJob: UnifiedCaptureResult = {
      id: jobId,
      projectId: existing?.projectId,
      recipeId: existing?.recipeId,
      status: 'cancelled',
      url: existing?.url || '',
      viewport: existing?.viewport || DEFAULT_VIEWPORT,
      deviceScaleFactor: existing?.deviceScaleFactor || 1,
      requestedCaptureTypes: existing?.requestedCaptureTypes || ['screenshot'],
      outputPaths: {},
      timestamps: {
        createdAt: existing?.timestamps.createdAt || completedAt,
        startedAt: existing?.timestamps.startedAt,
        completedAt,
      },
      durations: existing?.durations || {},
      errors: [...(existing?.errors || []), reason ? `Job cancelled: ${reason}` : 'Job cancelled'],
      warnings: existing?.warnings || [],
    };

    this.jobs.set(jobId, cancelledJob);
    CaptureLogger.logCleanup(jobId, 'Cleaned outputs for cancelled job');

    // Persist cancellation in history
    this.persistHistorySafely(cancelledJob);
    return cancelledJob;
  }

  // Backwards-compatible capture method for Phase 1-3 API and callers
  async capture(options: CaptureOptions): Promise<CaptureResult> {
    const unifiedResult = await this.executeJob(options);

    const primaryType = (options.captureType ?? options.type ?? 'screenshot') as 'screenshot' | 'recording' | 'both';
    const primaryMeta = unifiedResult.screenshotResult?.metadata || unifiedResult.recordingResult?.metadata;
    const primaryError = unifiedResult.errors.length > 0 ? unifiedResult.errors.join('; ') : undefined;

    const legacyStatus =
      unifiedResult.status === 'completed'
        ? 'completed'
        : unifiedResult.status === 'partial'
        ? 'completed'
        : 'failed';

    return {
      id: unifiedResult.id,
      type: primaryType,
      status: legacyStatus,
      url: unifiedResult.url,
      outputPath: unifiedResult.outputPaths.screenshot || unifiedResult.outputPaths.recording || unifiedResult.outputPaths.mp4,
      metadata: primaryMeta,
      error: primaryError,
      createdAt: unifiedResult.timestamps.createdAt,
      completedAt: unifiedResult.timestamps.completedAt,
      unifiedResult,
    };
  }

  async captureScreenshot(options: CaptureOptions): Promise<CaptureResult> {
    return this.capture({ ...options, captureType: 'screenshot' });
  }

  async captureRecording(options: CaptureOptions): Promise<CaptureResult> {
    return this.capture({ ...options, captureType: 'recording' });
  }

  async executeCaptureStub(options: CaptureOptions): Promise<CaptureResult> {
    return this.captureScreenshot(options);
  }
}

const globalForCapture = globalThis as unknown as {
  captureController: CaptureController | undefined;
};

export const captureController =
  globalForCapture.captureController ?? new CaptureController();

if (process.env.NODE_ENV !== 'production') {
  globalForCapture.captureController = captureController;
}
