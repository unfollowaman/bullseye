import fs from 'fs';
import path from 'path';
import { BrowserContext, Page } from 'playwright';
import { BrowserManager, browserManager } from '@/browser/browser-manager';
import { isValidUrl } from '@/utils';
import { PageStabilizer } from './stabilizer';
import { getSecureOutputPath } from './path-utils';
import { ActionExecutor, actionExecutor } from './action-executor';
import {
  ScreenshotOptions,
  ScreenshotResult,
  ScreenshotMetadata,
  ViewportDimensions,
  ScreenshotMode,
  ActionDiagnostic,
} from './types';

const DEFAULT_VIEWPORT: ViewportDimensions = { width: 1280, height: 720 };
const DEFAULT_TIMEOUT = 30000;

export class ScreenshotEngine {
  private browserMgr: BrowserManager;
  private actionEng: ActionExecutor;

  constructor(
    manager: BrowserManager = browserManager,
    actionEng: ActionExecutor = actionExecutor
  ) {
    this.browserMgr = manager;
    this.actionEng = actionEng;
  }

  async capture(options: ScreenshotOptions): Promise<ScreenshotResult> {
    const startTime = Date.now();
    const id = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

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
    const mode: ScreenshotMode = options.mode ?? (options.fullPage ? 'fullPage' : 'viewport');
    const fullPage = mode === 'fullPage';
    const disableAnimations = options.disableAnimations ?? false;
    const additionalWaitMs = options.additionalWaitMs ?? 0;
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;

    let outputPath: string;
    try {
      const secureResult = getSecureOutputPath(
        options.outputDir,
        options.filename,
        `screenshot-${id}`,
        '.png'
      );
      outputPath = secureResult.safePath;
    } catch (err) {
      return {
        id,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Path security error',
      };
    }

    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let actionDiagnostics: ActionDiagnostic[] | undefined;

    try {
      if (options.cancellationToken?.cancelled) {
        throw new Error('Screenshot cancelled by user');
      }

      // 1. Create Browser Context & Page
      context = await this.browserMgr.createContext({
        viewport: {
          width: viewport.width,
          height: viewport.height,
        },
        deviceScaleFactor,
      });

      page = await context.newPage();
      page.setDefaultTimeout(timeout);
      page.setDefaultNavigationTimeout(timeout);

      // 2. Navigate with normalized error handling
      try {
        await page.goto(options.url, {
          waitUntil: 'domcontentloaded',
          timeout,
        });
      } catch (err: unknown) {
        throw PageStabilizer.normalizeError(err, options.url, timeout);
      }

      if (options.cancellationToken?.cancelled) {
        throw new Error('Screenshot cancelled by user');
      }

      // 3. Page Stabilization
      await PageStabilizer.stabilize(page, {
        disableAnimations,
        additionalWaitMs,
        timeout,
        fullPage,
      });

      if (options.cancellationToken?.cancelled) {
        throw new Error('Screenshot cancelled by user');
      }

      // 4. Action Execution (if actions supplied)
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
          throw new Error('Screenshot cancelled by user');
        }
      }

      // 5. Capture screenshot
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      await page.screenshot({
        path: outputPath,
        fullPage,
        type: 'png',
      });

      const endTime = Date.now();
      const durationMs = endTime - startTime;
      const fileStats = fs.statSync(outputPath);

      const metadata: ScreenshotMetadata = {
        id,
        url: options.url,
        viewport,
        deviceScaleFactor,
        mode,
        outputPath,
        capturedAt: new Date(endTime).toISOString(),
        durationMs,
        fileSizeBytes: fileStats.size,
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
      // 6. Cleanup context & page safely regardless of success or error
      if (page) {
        await page.close().catch(() => {});
      }
      if (context) {
        await context.close().catch(() => {});
      }
    }
  }
}

export const screenshotEngine = new ScreenshotEngine();
