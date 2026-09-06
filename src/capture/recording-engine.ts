import fs from 'fs';
import path from 'path';
import os from 'os';
import { BrowserContext, Page } from 'playwright';
import { BrowserManager, browserManager } from '@/browser/browser-manager';
import { isValidUrl, validateWebM } from '@/utils';
import {
  RecordingOptions,
  RecordingResult,
  RecordingMetadata,
  ViewportDimensions,
} from './types';

const DEFAULT_VIEWPORT: ViewportDimensions = { width: 1280, height: 720 };
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RECORDING_DURATION = 5000;
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'public', 'captures');

export class RecordingEngine {
  private browserMgr: BrowserManager;

  constructor(manager: BrowserManager = browserManager) {
    this.browserMgr = manager;
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
    const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
    const filename = options.filename ?? `recording-${id}.webm`;
    const outputPath = path.isAbsolute(filename) ? filename : path.join(outputDir, filename);

    const tempDir = path.join(os.tmpdir(), `bullseye-rec-tmp-${id}`);

    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
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

      // 2. Navigate to URL
      try {
        await page.goto(options.url, {
          waitUntil: 'domcontentloaded',
          timeout,
        });
      } catch (err: unknown) {
        const errorObj = err as { name?: string; message?: string };
        if (errorObj.name === 'TimeoutError' || errorObj.message?.includes('timeout')) {
          throw new Error(`Navigation timeout of ${timeout}ms exceeded while loading ${options.url}`);
        }
        throw new Error(`Failed to navigate to ${options.url}: ${errorObj.message || err}`);
      }

      // 3. Optional initial wait before recording timeframe
      if (additionalWaitMs > 0) {
        await page.waitForTimeout(additionalWaitMs);
      }

      // 4. Record for configured duration
      const recStart = Date.now();
      await page.waitForTimeout(recordingDurationMs);
      const actualRecordingDurationMs = Date.now() - recStart;

      // 5. Finalize video by closing page/context and saving video stream
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

      // 6. Validate output WebM file
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
        recordingDurationMs,
        actualRecordingDurationMs,
        durationMs,
        format: 'webm',
        outputPath,
        capturedAt: new Date(endTime).toISOString(),
        fileSizeBytes: validation.sizeBytes,
      };

      return {
        id,
        status: 'completed',
        metadata,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown recording error';
      return {
        id,
        status: 'failed',
        error: errorMessage,
      };
    } finally {
      // 7. Cleanup resources & temporary recording artifacts
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
