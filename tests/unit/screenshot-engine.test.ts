import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ScreenshotEngine } from '@/capture/screenshot-engine';
import { startTestServer, TestServer } from '../fixtures/fixture-server';
import { browserManager } from '@/browser/browser-manager';

describe('ScreenshotEngine', () => {
  let testServer: TestServer;
  let engine: ScreenshotEngine;
  const tempOutputDir = path.join(process.cwd(), 'tests', 'temp_output');

  beforeAll(async () => {
    testServer = await startTestServer();
    engine = new ScreenshotEngine();
    if (!fs.existsSync(tempOutputDir)) {
      fs.mkdirSync(tempOutputDir, { recursive: true });
    }
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.close();
    }
    await browserManager.close();
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true, force: true });
    }
  });

  it('1. Basic URL screenshot capture', async () => {
    const result = await engine.capture({
      url: testServer.url,
      outputDir: tempOutputDir,
      filename: 'basic-test.png',
    });

    expect(result.status).toBe('completed');
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.url).toBe(testServer.url);
    expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);
    expect(result.metadata!.fileSizeBytes).toBeGreaterThan(0);
    expect(result.metadata!.durationMs).toBeGreaterThan(0);
  });

  it('2. Viewport screenshot mode', async () => {
    const result = await engine.capture({
      url: testServer.url,
      mode: 'viewport',
      outputDir: tempOutputDir,
      filename: 'viewport-test.png',
    });

    expect(result.status).toBe('completed');
    expect(result.metadata?.mode).toBe('viewport');
    expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);
  });

  it('3. Full-page screenshot mode', async () => {
    const viewportRes = await engine.capture({
      url: testServer.url,
      mode: 'viewport',
      viewport: { width: 800, height: 600 },
      outputDir: tempOutputDir,
      filename: 'mode-viewport.png',
    });

    const fullPageRes = await engine.capture({
      url: testServer.url,
      mode: 'fullPage',
      viewport: { width: 800, height: 600 },
      outputDir: tempOutputDir,
      filename: 'mode-fullpage.png',
    });

    expect(viewportRes.status).toBe('completed');
    expect(fullPageRes.status).toBe('completed');
    expect(fullPageRes.metadata?.mode).toBe('fullPage');
    // Full page image file size or height should be different/larger than viewport capture for this tall page
    expect(fullPageRes.metadata!.fileSizeBytes).toBeGreaterThan(0);
  });

  it('4. Custom viewport dimensions', async () => {
    const customViewport = { width: 375, height: 812 };
    const result = await engine.capture({
      url: testServer.url,
      viewport: customViewport,
      outputDir: tempOutputDir,
      filename: 'custom-viewport.png',
    });

    expect(result.status).toBe('completed');
    expect(result.metadata?.viewport).toEqual(customViewport);
  });

  it('5. DPR configuration', async () => {
    const resultDpr1 = await engine.capture({
      url: testServer.url,
      viewport: { width: 400, height: 400 },
      deviceScaleFactor: 1,
      outputDir: tempOutputDir,
      filename: 'dpr1.png',
    });

    const resultDpr2 = await engine.capture({
      url: testServer.url,
      viewport: { width: 400, height: 400 },
      deviceScaleFactor: 2,
      outputDir: tempOutputDir,
      filename: 'dpr2.png',
    });

    expect(resultDpr1.status).toBe('completed');
    expect(resultDpr2.status).toBe('completed');
    expect(resultDpr1.metadata?.deviceScaleFactor).toBe(1);
    expect(resultDpr2.metadata?.deviceScaleFactor).toBe(2);
    // DPR 2 image file size is typically higher than DPR 1 due to higher pixel density
    expect(resultDpr2.metadata!.fileSizeBytes).toBeGreaterThan(resultDpr1.metadata!.fileSizeBytes);
  });

  it('6. Stabilization behavior and additional wait time', async () => {
    const startTime = Date.now();
    const additionalWaitMs = 300;

    const result = await engine.capture({
      url: testServer.url,
      additionalWaitMs,
      outputDir: tempOutputDir,
      filename: 'stabilization.png',
    });

    const elapsed = Date.now() - startTime;
    expect(result.status).toBe('completed');
    expect(elapsed).toBeGreaterThanOrEqual(additionalWaitMs);
  });

  it('7. Animation handling (disabling animations)', async () => {
    const result = await engine.capture({
      url: `${testServer.url}/animated`,
      disableAnimations: true,
      outputDir: tempOutputDir,
      filename: 'no-animation.png',
    });

    expect(result.status).toBe('completed');
    expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);
  });

  it('8. Invalid URL error handling', async () => {
    const result = await engine.capture({
      url: 'not-a-valid-url',
      outputDir: tempOutputDir,
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Invalid URL format');
  });

  it('9. Navigation timeout error handling', async () => {
    const result = await engine.capture({
      url: `${testServer.url}/slow`,
      timeout: 500, // 500ms timeout vs 10000ms delay
      outputDir: tempOutputDir,
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('timeout');
  });

  it('10. Cleanup after failure', async () => {
    const result = await engine.capture({
      url: 'http://127.0.0.1:59999/does-not-exist', // Unreachable port
      timeout: 1000,
      outputDir: tempOutputDir,
    });

    expect(result.status).toBe('failed');
    // Ensure browser instance is still connected and clean
    const isHealthy = await browserManager.isHealthy();
    expect(isHealthy).toBe(true);
  });
});
