import fs from 'fs';
import http from 'http';
import path from 'path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ScreenshotEngine } from '../../src/capture/screenshot-engine';
import { visualQAService } from '../../src/visual-qa/service';

describe('Real Bullseye Capture & Visual QA Verification', () => {
  let server: http.Server;
  let serverUrl: string;
  let pageContent = '<html><body style="background: white; color: black; font-size: 24px;"><h1>Bullseye Baseline Page</h1></body></html>';

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(pageContent);
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        serverUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  it('1. Captures real baseline and identical page -> verifies PASS (0% diff)', async () => {
    const screenshotEngine = new ScreenshotEngine();

    // Capture baseline screenshot
    const baseResult = await screenshotEngine.capture({
      url: serverUrl,
      viewport: { width: 1024, height: 768 },
      mode: 'viewport',
    });
    expect(baseResult.status).toBe('completed');
    expect(baseResult.metadata?.outputPath).toBeDefined();

    const baselinePath = baseResult.metadata!.outputPath;

    // Capture current identical screenshot
    const currResult = await screenshotEngine.capture({
      url: serverUrl,
      viewport: { width: 1024, height: 768 },
      mode: 'viewport',
    });
    expect(currResult.status).toBe('completed');
    expect(currResult.metadata?.outputPath).toBeDefined();

    const currentPath = currResult.metadata!.outputPath;

    // Run Visual QA comparison
    const qaResult = await visualQAService.compare({
      baselineAssetPath: baselinePath,
      currentAssetPath: currentPath,
      pixelTolerance: 5,
      thresholdPercent: 0.0,
    });

    expect(qaResult.status).toBe('completed');
    expect(qaResult.outcome).toBe('pass');
    expect(qaResult.match).toBe(true);
    expect(qaResult.metrics.changedPixels).toBe(0);
    expect(qaResult.metrics.changedPercentage).toBe(0.0);
  });

  it('2. Captures baseline and modified page -> verifies FAIL (>0% diff) and inspects diff & overlay assets', async () => {
    const screenshotEngine = new ScreenshotEngine();

    // Baseline capture
    pageContent = '<html><body style="background: white; color: black; font-size: 24px; padding: 20px;"><h1>Original Heading</h1></body></html>';
    const baseResult = await screenshotEngine.capture({
      url: serverUrl,
      viewport: { width: 1024, height: 768 },
      mode: 'viewport',
    });
    expect(baseResult.status).toBe('completed');
    const baselinePath = baseResult.metadata!.outputPath;

    // Intentionally change page content for regression detection
    pageContent = '<html><body style="background: white; color: red; font-size: 24px; padding: 20px;"><h1>MODIFIED Heading Regression</h1><p>Added paragraph text.</p></body></html>';
    const currResult = await screenshotEngine.capture({
      url: serverUrl,
      viewport: { width: 1024, height: 768 },
      mode: 'viewport',
    });
    expect(currResult.status).toBe('completed');
    const currentPath = currResult.metadata!.outputPath;

    // Run Visual QA
    const qaResult = await visualQAService.compare({
      baselineAssetPath: baselinePath,
      currentAssetPath: currentPath,
      diffColor: '#ff00ff',
      overlayOpacity: 0.5,
    });

    expect(qaResult.status).toBe('completed');
    expect(qaResult.outcome).toBe('fail');
    expect(qaResult.match).toBe(false);
    expect(qaResult.metrics.changedPixels).toBeGreaterThan(0);
    expect(qaResult.metrics.changedPercentage).toBeGreaterThan(0);

    // Inspect generated diff asset
    expect(qaResult.diffAsset).toBeDefined();
    const diffPath = qaResult.diffAsset!.safePath;
    expect(fs.existsSync(diffPath)).toBe(true);

    const diffMeta = await sharp(diffPath).metadata();
    expect(diffMeta.width).toBe(1024);
    expect(diffMeta.height).toBe(768);
    expect(diffMeta.format).toBe('png');

    // Inspect generated overlay asset
    expect(qaResult.overlayAsset).toBeDefined();
    const overlayPath = qaResult.overlayAsset!.safePath;
    expect(fs.existsSync(overlayPath)).toBe(true);

    const overlayMeta = await sharp(overlayPath).metadata();
    expect(overlayMeta.width).toBe(1024);
    expect(overlayMeta.height).toBe(768);
    expect(overlayMeta.format).toBe('png');
  });
});
