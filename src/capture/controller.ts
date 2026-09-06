import { BrowserManager, browserManager } from '@/browser/browser-manager';
import { ScreenshotEngine, screenshotEngine } from './screenshot-engine';
import { RecordingEngine, recordingEngine } from './recording-engine';
import { isValidUrl } from '@/utils';
import {
  CaptureOptions,
  CaptureResult,
  CaptureControllerStatus,
} from './types';

export class CaptureController {
  private browserMgr: BrowserManager;
  private screenshotEng: ScreenshotEngine;
  private recordingEng: RecordingEngine;
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
      supportedTypes: ['screenshot', 'recording'],
    };
  }

  validateOptions(options: CaptureOptions): { valid: boolean; message?: string } {
    if (!options.url) {
      return { valid: false, message: 'URL is required' };
    }
    if (!isValidUrl(options.url)) {
      return { valid: false, message: 'Invalid URL format (must start with http:// or https://)' };
    }
    return { valid: true };
  }

  async capture(options: CaptureOptions): Promise<CaptureResult> {
    if (options.type === 'recording') {
      return this.captureRecording(options);
    }
    return this.captureScreenshot(options);
  }

  async captureRecording(options: CaptureOptions): Promise<CaptureResult> {
    const createdAt = new Date().toISOString();
    const validation = this.validateOptions(options);

    if (!validation.valid) {
      return {
        id: `cap_${Date.now()}`,
        type: 'recording',
        status: 'failed',
        url: options.url || '',
        error: validation.message,
        createdAt,
      };
    }

    this.activeCount++;
    try {
      const result = await this.recordingEng.record(options);
      const completedAt = new Date().toISOString();

      if (result.status === 'completed' && result.metadata) {
        return {
          id: result.id,
          type: 'recording',
          status: 'completed',
          url: options.url,
          outputPath: result.metadata.outputPath,
          metadata: result.metadata,
          createdAt,
          completedAt,
        };
      } else {
        return {
          id: result.id,
          type: 'recording',
          status: 'failed',
          url: options.url,
          error: result.error || 'Recording capture failed',
          createdAt,
          completedAt,
        };
      }
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
    }
  }

  async captureScreenshot(options: CaptureOptions): Promise<CaptureResult> {
    const createdAt = new Date().toISOString();
    const validation = this.validateOptions(options);

    if (!validation.valid) {
      return {
        id: `cap_${Date.now()}`,
        type: 'screenshot',
        status: 'failed',
        url: options.url || '',
        error: validation.message,
        createdAt,
      };
    }

    this.activeCount++;
    try {
      const result = await this.screenshotEng.capture(options);
      const completedAt = new Date().toISOString();

      if (result.status === 'completed' && result.metadata) {
        return {
          id: result.id,
          type: 'screenshot',
          status: 'completed',
          url: options.url,
          outputPath: result.metadata.outputPath,
          metadata: result.metadata,
          createdAt,
          completedAt,
        };
      } else {
        return {
          id: result.id,
          type: 'screenshot',
          status: 'failed',
          url: options.url,
          error: result.error || 'Screenshot capture failed',
          createdAt,
          completedAt,
        };
      }
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
    }
  }

  // Backwards-compatible alias for Phase 1 stub tests
  async executeCaptureStub(options: CaptureOptions): Promise<CaptureResult> {
    return this.captureScreenshot(options);
  }
}

export const captureController = new CaptureController();
