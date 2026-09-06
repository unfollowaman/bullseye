import fs from 'fs';
import path from 'path';
import os from 'os';
import { BrowserContext, Page } from 'playwright';
import { BrowserManager, browserManager } from '@/browser/browser-manager';
import { isValidUrl, validateWebM } from '@/utils';
import { PageStabilizer } from './stabilizer';
import { getSecureOutputPath } from './path-utils';
import { ActionExecutor, actionExecutor } from './action-executor';
import {
  RecordingOptions,
  RecordingResult,
  RecordingMetadata,
  ViewportDimensions,
  ActionDiagnostic,
} from './types';

const DEFAULT_VIEWPORT: ViewportDimensions = { width: 1280, height: 720 };
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RECORDING_DURATION = 5000;

export class RecordingEngine {
  private browserMgr: BrowserManager;
  private actionEng: ActionExecutor;

  constructor(
    manager: BrowserManager = browserManager,
    actionEng: ActionExecutor = actionExecutor
  ) {
    this.browserMgr = manager;
    this.actionEng = actionEng;
  }

  async record(options: RecordingOptions): Promise<RecordingResult> {
    const startTime = Date.now();
    const id = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    if (!options.url) {
      return {
        id,
        status: 'failed',
        error: 'URL is required',
      };
    }

    if (!isValidUrl(options.url)) {
      return {
        id,
        status: 'failed',
        error: `Invalid URL format: '${options.url}'. Must be a valid http:// or https:// URL.`,
      };
    }

    const viewport: ViewportDimensions = options.viewport ?? DEFAULT_VIEWPORT;
    const deviceScaleFactor = options.deviceScaleFactor ?? 1;
    const recordingDurationMs = options.recordingDurationMs ?? options.durationMs ?? DEFAULT_RECORDING_DURATION;
    const additionalWaitMs = options.additionalWaitMs ?? 0;
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;

    let outputPath: string;
    try {
      const secureResult = getSecureOutputPath(
        options.outputDir,
        options.filename,
        `recording-${id}`,
        '.webm'
      );
      outputPath = secureResult.safePath;
    } catch (err) {
      return {
        id,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Path security error',
      };
    }

    const tempDir = path.join(os.tmpdir(), `bullseye-rec-tmp-${id}`);

    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let actionDiagnostics: ActionDiagnostic[] | undefined;

    try {
      if (options.cancellationToken?.cancelled) {
        throw new Error('Recording cancelled by user');
      }

      fs.mkdirSync(tempDir, { recursive: true });

      // 1. Create Browser Context with native Playwright video recording
      context = await this.browserMgr.createContext({
        viewport: {
          width: viewport.width,
          height: viewport.height,
        },
        deviceScaleFactor,
        recordVideo: {
          dir: tempDir,
          size: {
            width: viewport.width,
            height: viewport.height,
          },
        },
      });

      page = await context.newPage();
      page.setDefaultTimeout(timeout);
      page.setDefaultNavigationTimeout(timeout);

      // 2. Navigate to URL with normalized error handling
      try {
        await page.goto(options.url, {
          waitUntil: 'domcontentloaded',
          timeout,
        });
      } catch (err: unknown) {
        throw PageStabilizer.normalizeError(err, options.url, timeout);
      }

      if (options.cancellationToken?.cancelled) {
        throw new Error('Recording cancelled by user');
      }

      // 3. Stabilization / initial wait before action execution
      await PageStabilizer.stabilize(page, {
        additionalWaitMs,
        timeout,
      });

      if (options.cancellationToken?.cancelled) {
        throw new Error('Recording cancelled by user');
      }

      const recStart = Date.now();

      // 4. Execute actions while video is actively recording
      if (options.actions && options.actions.length > 0) {
        const actionResult = await this.actionEng.execute(page, options.actions, {
          cancellationToken: options.cancellationToken,
          defaultTimeoutMs: timeout,
        });

        actionDiagnostics = actionResult.diagnostics;

        if (!actionResult.success) {
          throw new Error(actionResult.error || 'Action execution failed');
        }

        if (options.cancellationToken?.cancelled) {
          throw new Error('Recording cancelled by user');
        }
      }

      // 5. Record for remaining configured duration (if actions finished earlier)
      const elapsedActionTime = Date.now() - recStart;
      const targetDuration = Math.max(recordingDurationMs, elapsedActionTime);

      const sliceMs = 100;
      while (Date.now() - recStart < targetDuration) {
        if (options.cancellationToken?.cancelled) {
          throw new Error('Recording cancelled by user');
        }
        const remaining = targetDuration - (Date.now() - recStart);
        await page.waitForTimeout(Math.min(sliceMs, remaining));
      }
      const actualRecordingDurationMs = Date.now() - recStart;

      // 6. Finalize video by closing page/context and saving video stream
      const video = page.video();
      if (!video) {
        throw new Error('Video recording failed: Playwright video instance was not created');
      }

      await page.close();
      page = null;

      await context.close();
      context = null;

      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      await video.saveAs(outputPath);

      // 7. Validate output WebM file
      const validation = validateWebM(outputPath);
      if (!validation.valid) {
        throw new Error(`Recorded video finalization failed: ${validation.error}`);
      }

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      const metadata: RecordingMetadata = {
        id,
        url: options.url,
        viewport,
        deviceScaleFactor,
        recordingDurationMs: targetDuration,
        actualRecordingDurationMs,
        durationMs,
        format: 'webm',
        outputPath,
        capturedAt: new Date(endTime).toISOString(),
        fileSizeBytes: validation.sizeBytes,
        actionDiagnostics,
      };

      return {
        id,
        status: 'completed',
        metadata,
        actionDiagnostics,
      };
    } catch (err: unknown) {
      const normalizedErr = PageStabilizer.normalizeError(err, options.url, timeout);
      // Clean up orphaned output file if present
      if (fs.existsSync(outputPath!)) {
        try { fs.unlinkSync(outputPath!); } catch {}
      }
      return {
        id,
        status: 'failed',
        error: normalizedErr.message,
        actionDiagnostics,
      };
    } finally {
      // 8. Cleanup resources & temporary recording artifacts
      if (page) {
        await page.close().catch(() => {});
      }
      if (context) {
        await context.close().catch(() => {});
      }
      if (fs.existsSync(tempDir)) {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // Ignore temp dir cleanup errors
        }
      }
    }
  }
}

export const recordingEngine = new RecordingEngine();
