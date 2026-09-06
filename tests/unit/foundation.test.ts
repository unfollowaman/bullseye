import { describe, it, expect } from 'vitest';
import { config } from '@/config';
import { isValidUrl, formatTimestamp } from '@/utils';
import { CaptureController } from '@/capture/controller';

describe('App Configuration', () => {
  it('should load default configuration settings', () => {
    expect(config.port).toBeDefined();
    expect(config.appUrl).toBe('http://localhost:3000');
    expect(config.isHeadless).toBe(true);
  });
});

describe('Utils', () => {
  it('should format timestamp correctly', () => {
    const timestamp = formatTimestamp();
    expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('should validate URLs correctly', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('invalid-url')).toBe(false);
  });
});

describe('CaptureController Stub', () => {
  it('should validate options', () => {
    const mockBrowserMgr = {
      getBrowser: async () => ({} as any),
      createContext: async () => ({} as any),
      isHealthy: async () => true,
      close: async () => {},
    };
    const controller = new CaptureController(mockBrowserMgr as any);

    const validResult = controller.validateOptions({ url: 'https://example.com' });
    expect(validResult.valid).toBe(true);

    const invalidResult = controller.validateOptions({ url: 'not-a-url' });
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.message).toContain('Invalid URL');
  });

  it('should return capture status', async () => {
    const mockBrowserMgr = {
      getBrowser: async () => ({} as any),
      createContext: async () => ({} as any),
      isHealthy: async () => true,
      close: async () => {},
    };
    const controller = new CaptureController(mockBrowserMgr as any);
    const status = await controller.getStatus();

    expect(status.ready).toBe(true);
    expect(status.supportedTypes).toEqual(['screenshot', 'recording']);
  });
});
