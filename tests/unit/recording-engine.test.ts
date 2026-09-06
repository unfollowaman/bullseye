import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { RecordingEngine } from '@/capture/recording-engine';
import { validateWebM } from '@/utils';
import { startTestServer, TestServer } from '../fixtures/fixture-server';
import { browserManager } from '@/browser/browser-manager';

describe('RecordingEngine', () => {
  let testServer: TestServer;
  let engine: RecordingEngine;
  const tempOutputDir = path.join(process.cwd(), 'tests', 'temp_rec_output');

  beforeAll(async () => {
    testServer = await startTestServer();
    engine = new RecordingEngine();
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

  it('1. Basic recording and WebM output existence', async () => {
    const result = await engine.record({
      url: testServer.url,
      recordingDurationMs: 1500,
      outputDir: tempOutputDir,
      filename: 'basic-recording.webm',
    });

    expect(result.status).toBe('completed');
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.url).toBe(testServer.url);
    expect(result.metadata?.format).toBe('webm');
    expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);
    expect(result.metadata!.fileSizeBytes).toBeGreaterThan(0);
  });

  it('2. Valid WebM container header validation', async () => {
    const result = await engine.record({
      url: testServer.url,
      recordingDurationMs: 1000,
      outputDir: tempOutputDir,
      filename: 'valid-header.webm',
    });

    expect(result.status).toBe('completed');
    const validation = validateWebM(result.metadata!.outputPath);
    expect(validation.valid).toBe(true);
    expect(validation.sizeBytes).toBeGreaterThan(0);
  });

  it('3. Configured recording duration', async () => {
    const durationMs = 2000;
    const startTime = Date.now();

    const result = await engine.record({
      url: testServer.url,
      recordingDurationMs: durationMs,
      outputDir: tempOutputDir,
      filename: 'duration-test.webm',
    });

    const elapsed = Date.now() - startTime;
    expect(result.status).toBe('completed');
    expect(result.metadata?.recordingDurationMs).toBe(durationMs);
    expect(result.metadata?.actualRecordingDurationMs).toBeGreaterThanOrEqual(1800);
    expect(elapsed).toBeGreaterThanOrEqual(durationMs);
  });

  it('4. Custom viewport dimensions', async () => {
    const customViewport = { width: 1920, height: 1080 };
    const result = await engine.record({
      url: testServer.url,
      viewport: customViewport,
      recordingDurationMs: 1000,
      outputDir: tempOutputDir,
      filename: 'custom-viewport.webm',
    });

    expect(result.status).toBe('completed');
    expect(result.metadata?.viewport).toEqual(customViewport);
  });

  it('5. Proper video finalization (file closed and readable)', async () => {
    const result = await engine.record({
      url: `${testServer.url}/animated`,
      recordingDurationMs: 1500,
      outputDir: tempOutputDir,
      filename: 'finalization-test.webm',
    });

    expect(result.status).toBe('completed');
    const filePath = result.metadata!.outputPath;
    expect(fs.existsSync(filePath)).toBe(true);

    // Verify file is finalized, closed, and not locked or 0 bytes
    const stats = fs.statSync(filePath);
    expect(stats.size).toBeGreaterThan(100);

    const validation = validateWebM(filePath);
    expect(validation.valid).toBe(true);
  });

  it('6. Invalid URL error handling', async () => {
    const result = await engine.record({
      url: 'not-a-valid-url',
      outputDir: tempOutputDir,
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Invalid URL format');
  });

  it('7. Navigation timeout error handling', async () => {
    const result = await engine.record({
      url: `${testServer.url}/slow`,
      timeout: 500, // 500ms timeout vs 10000ms delay
      outputDir: tempOutputDir,
    });

    expect(result.status).toBe('failed');
    expect(result.error).toContain('timeout');
  });

  it('8. Failure cleanup and browser health', async () => {
    const result = await engine.record({
      url: 'http://127.0.0.1:59999/unreachable',
      timeout: 1000,
      outputDir: tempOutputDir,
    });

    expect(result.status).toBe('failed');
    // Ensure browser manager is still healthy after failure
    const isHealthy = await browserManager.isHealthy();
    expect(isHealthy).toBe(true);
  });
});
