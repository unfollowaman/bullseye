import fs from 'fs';
import path from 'path';
import { BrowserContext, Page } from 'playwright';
import { BrowserManager, browserManager } from '@/browser/browser-manager';
import { isValidUrl } from '@/utils';
import {
  ScreenshotOptions,
  ScreenshotResult,
  ScreenshotMetadata,
  ViewportDimensions,
  ScreenshotMode,
} from './types';

const DEFAULT_VIEWPORT: ViewportDimensions = { width: 1280, height: 720 };
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'public', 'captures');

export class ScreenshotEngine {
  private browserMgr: BrowserManager;

  constructor(manager: BrowserManager = browserManager) {
    this.browserMgr = manager;
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
    const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
    const filename = options.filename ?? `screenshot-${id}.png`;
    const outputPath = path.isAbsolute(filename) ? filename : path.join(outputDir, filename);

    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
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

      // 2. Navigate
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

      // 3. Page Stabilization
      await this.stabilizePage(page, {
        disableAnimations,
        additionalWaitMs,
        timeout,
      });

      // 4. Capture
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
      };

      return {
        id,
        status: 'completed',
        metadata,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown screenshot error';
      return {
        id,
        status: 'failed',
        error: errorMessage,
      };
    } finally {
      // 5. Cleanup context & page safely regardless of success or error
      if (page) {
        await page.close().catch(() => {});
      }
      if (context) {
        await context.close().catch(() => {});
      }
    }
  }

  private async stabilizePage(
    page: Page,
    options: { disableAnimations: boolean; additionalWaitMs: number; timeout: number }
  ): Promise<void> {
    // a. Wait for network stabilization (with fallback timeout)
    try {
      await page.waitForLoadState('networkidle', {
        timeout: Math.min(options.timeout, 2000),
      });
    } catch {
      // Ignore networkidle timeout if page keeps connections open
    }

    // b. Wait for document fonts
    try {
      await page.evaluate(async () => {
        if ('fonts' in document) {
          await document.fonts.ready;
        }
      });
    } catch {
      // Ignore font wait failures
    }

    // c. Wait for images to finish loading
    try {
      await page.evaluate(async () => {
        const images = Array.from(document.images);
        await Promise.all(
          images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              const onDone = () => resolve(true);
              img.addEventListener('load', onDone, { once: true });
              img.addEventListener('error', onDone, { once: true });
            });
          })
        );
      });
    } catch {
      // Ignore image load wait failures
    }

    // d. Disable animations if requested
    if (options.disableAnimations) {
      try {
        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              -webkit-transition: none !important;
              -moz-transition: none !important;
              -o-transition: none !important;
              transition: none !important;
              -webkit-animation: none !important;
              -moz-animation: none !important;
              -o-animation: none !important;
              animation: none !important;
              scroll-behavior: auto !important;
            }
          `,
        });

        await page.evaluate(() => {
          if ('getAnimations' in document) {
            document.getAnimations().forEach((anim) => anim.finish());
          }
        });
      } catch {
        // Ignore animation override failures
      }
    }

    // e. Configurable additional wait time
    if (options.additionalWaitMs > 0) {
      await page.waitForTimeout(options.additionalWaitMs);
    }
  }
}

export const screenshotEngine = new ScreenshotEngine();
