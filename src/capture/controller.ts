import { BrowserManager, browserManager } from '@/browser/browser-manager';
import { isValidUrl } from '@/utils';
import {
  CaptureOptions,
  CaptureResult,
  CaptureControllerStatus,
} from './types';

export class CaptureController {
  private browserMgr: BrowserManager;
  private activeCount: number = 0;

  constructor(manager: BrowserManager = browserManager) {
    this.browserMgr = manager;
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

  // Phase 1 stub for future capture implementation
  async executeCaptureStub(options: CaptureOptions): Promise<CaptureResult> {
    const validation = this.validateOptions(options);
    if (!validation.valid) {
      return {
        id: `cap_${Date.now()}`,
        type: 'screenshot',
        status: 'failed',
        url: options.url,
        error: validation.message,
        createdAt: new Date().toISOString(),
      };
    }

    return {
      id: `cap_${Date.now()}`,
      type: 'screenshot',
      status: 'idle',
      url: options.url,
      createdAt: new Date().toISOString(),
    };
  }
}

export const captureController = new CaptureController();
