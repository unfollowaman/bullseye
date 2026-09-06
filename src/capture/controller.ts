import path from 'path';
import fs from 'fs';
import { BrowserManager, browserManager } from '@/browser/browser-manager';
import { ScreenshotEngine, screenshotEngine } from './screenshot-engine';
import { RecordingEngine, recordingEngine } from './recording-engine';
import { CaptureLogger } from './logger';
import { isValidUrl } from '@/utils';
import { validateActions } from './action-validator';
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
} from './types';

const DEFAULT_VIEWPORT: ViewportDimensions = { width: 1280, height: 720 };
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RECORDING_DURATION = 5000;
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'public', 'captures');

export class CaptureController {
  private browserMgr: BrowserManager;
  private screenshotEng: ScreenshotEngine;
  private recordingEng: RecordingEngine;
  private jobs: Map<string, UnifiedCaptureResult> = new Map();
  private cancellationTokens: Map<string, { cancelled: boolean; cancelFn?: () => void }> = new Map();
  private activeCount: number = 0;

  constructor(
    manager: BrowserManager = browserManager,
    screenshotEng: ScreenshotEngine = screenshotEngine,
    recEngine: RecordingEngine = recordingEngine
  ) {
    this.browserMgr = manager;
    this.screenshotEng = screenshotEng;
    this.recordingEng = recEngine;
  }

  async getStatus(): Promise<CaptureControllerStatus> {
    const browserHealthy = await this.browserMgr.isHealthy();
    return {
      ready: browserHealthy,
      activeCaptures: this.activeCount,
      supportedTypes: ['screenshot', 'recording', 'both'],
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

    // 3. Viewport validation
    if (config.viewport) {
      if (
        typeof config.viewport.width !== 'number' ||
        config.viewport.width <= 0 ||
        isNaN(config.viewport.width)
      ) {
        errors.push('Viewport width must be a positive number');
      }
      if (
        typeof config.viewport.height !== 'number' ||
        config.viewport.height <= 0 ||
        isNaN(config.viewport.height)
      ) {
        errors.push('Viewport height must be a positive number');
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
      }
    }

    // 5. Timeout options validation
    const timeout = config.timeoutOptions?.timeoutMs ?? config.timeout;
    if (timeout !== undefined) {
      if (typeof timeout !== 'number' || timeout <= 0 || isNaN(timeout)) {
        errors.push('Timeout must be a positive number (milliseconds)');
      }
    }

    // 6. Recording options validation
    const recDuration = config.recordingOptions?.durationMs ?? config.recordingDurationMs;
    if (recDuration !== undefined) {
      if (typeof recDuration !== 'number' || recDuration < 0 || isNaN(recDuration)) {
        errors.push('Recording duration must be a non-negative number (milliseconds)');
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
      return job;
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
    let screenshotMs: number | undefined;
    let recordingMs: number | undefined;

    try {
      // Handle cancellation check prior to engine operations
      if (this.isCancelled(jobId)) {
        return this.finalizeCancelledJob(jobId);
      }

      const outputDir = config.outputDir ?? DEFAULT_OUTPUT_DIR;
      const disableAnimations =
        config.stabilizationOptions?.disableAnimations ?? config.disableAnimations ?? false;
      const additionalWaitMs =
        config.stabilizationOptions?.additionalWaitMs ?? config.additionalWaitMs ?? 0;
      const timeout = config.timeoutOptions?.timeoutMs ?? config.timeout ?? DEFAULT_TIMEOUT;

      // 1. Screenshot Operation if requested
      if (requestedCaptureTypes.includes('screenshot')) {
        if (this.isCancelled(jobId)) {
          return this.finalizeCancelledJob(jobId);
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
        if (this.isCancelled(jobId)) {
          return this.finalizeCancelledJob(jobId);
        }

        const durationMs =
          config.recordingOptions?.durationMs ?? config.recordingDurationMs ?? DEFAULT_RECORDING_DURATION;

        CaptureLogger.logRecordingStarted(jobId, durationMs);
        const recStart = Date.now();

        const recordingFilename =
          config.recordingOptions?.filename ??
          (rawType === 'both' ? `recording-${jobId}.webm` : config.filename ?? `recording-${jobId}.webm`);

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
        };

        recordingResult = await this.recordingEng.record(recOptions);
        recordingMs = Date.now() - recStart;

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

      // Check cancellation during or after execution
      if (this.isCancelled(jobId)) {
        return this.finalizeCancelledJob(jobId);
      }

      // Determine final JobStatus
      const totalMs = Date.now() - startTime;
      const completedAt = new Date().toISOString();

      let finalStatus: JobStatus;
      if (requestedCaptureTypes.length === 1) {
        if (requestedCaptureTypes.includes('screenshot')) {
          finalStatus = screenshotResult?.status === 'completed' ? 'completed' : 'failed';
        } else {
          finalStatus = recordingResult?.status === 'completed' ? 'completed' : 'failed';
        }
      } else {
        // Both requested
        const shotOk = screenshotResult?.status === 'completed';
        const recOk = recordingResult?.status === 'completed';

        if (shotOk && recOk) {
          finalStatus = 'completed';
        } else if (shotOk || recOk) {
          finalStatus = 'partial';
          job.warnings.push('Job partially completed: one capture type succeeded while the other failed.');
        } else {
          finalStatus = 'failed';
        }
      }

      if (this.isCancelled(jobId) || this.jobs.get(jobId)?.status === 'cancelled') {
        return (this.jobs.get(jobId) as UnifiedCaptureResult) || this.finalizeCancelledJob(jobId);
      }

      const actionDiagnostics = screenshotResult?.actionDiagnostics ?? recordingResult?.actionDiagnostics;

      job = {
        ...job,
        status: finalStatus,
        screenshotResult,
        recordingResult,
        timestamps: { ...job.timestamps, completedAt },
        durations: { totalMs, screenshotMs, recordingMs },
        actionDiagnostics,
      };

      this.jobs.set(jobId, job);
      CaptureLogger.logCaptureCompleted(jobId, finalStatus, totalMs);
      return job;
    } catch (err: unknown) {
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
      return job;
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.cancellationTokens.delete(jobId);
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
    }

    const cancelledJob: UnifiedCaptureResult = {
      id: jobId,
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
      outputPath: unifiedResult.outputPaths.screenshot || unifiedResult.outputPaths.recording,
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
