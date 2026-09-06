import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CaptureController, captureController } from '@/capture/controller';
import { startTestServer, TestServer } from '../fixtures/fixture-server';
import { validateWebM } from '@/utils';

describe('CaptureController Phase 4 Integration Tests', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = await startTestServer();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.close();
    }
  });

  it('1. Screenshot-only job', async () => {
    const job = await captureController.executeJob({
      url: testServer.url,
      captureType: 'screenshot',
      viewport: { width: 1024, height: 768 },
    });

    expect(job.status).toBe('completed');
    expect(job.requestedCaptureTypes).toEqual(['screenshot']);
    expect(job.screenshotResult?.status).toBe('completed');
    expect(job.recordingResult).toBeUndefined();

    const screenshotPath = job.outputPaths.screenshot;
    expect(screenshotPath).toBeDefined();
    expect(fs.existsSync(screenshotPath!)).toBe(true);

    expect(job.timestamps.createdAt).toBeDefined();
    expect(job.timestamps.startedAt).toBeDefined();
    expect(job.timestamps.completedAt).toBeDefined();
    expect(job.durations.screenshotMs).toBeGreaterThan(0);
  });

  it('2. Recording-only job', async () => {
    const job = await captureController.executeJob({
      url: testServer.url,
      captureType: 'recording',
      recordingOptions: { durationMs: 2000 },
    });

    expect(job.status).toBe('completed');
    expect(job.requestedCaptureTypes).toEqual(['recording']);
    expect(job.recordingResult?.status).toBe('completed');
    expect(job.screenshotResult).toBeUndefined();

    const recordingPath = job.outputPaths.recording;
    expect(recordingPath).toBeDefined();
    expect(fs.existsSync(recordingPath!)).toBe(true);

    const webmValid = validateWebM(recordingPath!);
    expect(webmValid.valid).toBe(true);

    expect(job.durations.recordingMs).toBeGreaterThan(1500);
  });

  it('3. Combined screenshot + recording job ("both")', async () => {
    const job = await captureController.executeJob({
      url: testServer.url,
      captureType: 'both',
      viewport: { width: 1280, height: 720 },
      recordingOptions: { durationMs: 2000 },
    });

    expect(job.status).toBe('completed');
    expect(job.requestedCaptureTypes).toEqual(['screenshot', 'recording']);
    expect(job.screenshotResult?.status).toBe('completed');
    expect(job.recordingResult?.status).toBe('completed');

    expect(job.outputPaths.screenshot).toBeDefined();
    expect(fs.existsSync(job.outputPaths.screenshot!)).toBe(true);

    expect(job.outputPaths.recording).toBeDefined();
    expect(fs.existsSync(job.outputPaths.recording!)).toBe(true);

    const webmValid = validateWebM(job.outputPaths.recording!);
    expect(webmValid.valid).toBe(true);

    expect(job.durations.screenshotMs).toBeGreaterThan(0);
    expect(job.durations.recordingMs).toBeGreaterThan(0);
    expect(job.durations.totalMs).toBeGreaterThan(0);
  });

  it('4. Invalid URL handling', async () => {
    const validation = captureController.validateConfig({
      url: 'invalid-url-string',
      captureType: 'screenshot',
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes('Invalid URL'))).toBe(true);

    const job = await captureController.executeJob({
      url: 'not-a-valid-http-url',
      captureType: 'screenshot',
    });

    expect(job.status).toBe('failed');
    expect(job.errors.length).toBeGreaterThan(0);
  });

  it('5. Invalid configuration options', async () => {
    const validation = captureController.validateConfig({
      url: testServer.url,
      captureType: 'screenshot',
      viewport: { width: -100, height: 0 },
      deviceScaleFactor: -1,
      timeoutOptions: { timeoutMs: -50 },
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('6. Job state transitions tracking', async () => {
    const controller = new CaptureController();
    const config = {
      url: testServer.url,
      captureType: 'screenshot' as const,
    };

    const jobPromise = controller.executeJob(config);
    // Verify job is tracked in memory
    const trackedJobs = Array.from((controller as any).jobs.values());
    expect(trackedJobs.length).toBeGreaterThan(0);

    const completedJob = await jobPromise;
    expect(completedJob.status).toBe('completed');
    expect(controller.getJob(completedJob.id)?.status).toBe('completed');
  });

  it('7. Partial success behavior when 1 engine fails and 1 succeeds', async () => {
    const mockScreenshotEng = {
      capture: async () => ({
        id: 'shot_123',
        status: 'completed' as const,
        metadata: {
          id: 'shot_123',
          url: testServer.url,
          viewport: { width: 1280, height: 720 },
          deviceScaleFactor: 1,
          mode: 'viewport' as const,
          outputPath: path.join(process.cwd(), 'public', 'captures', 'dummy.png'),
          capturedAt: new Date().toISOString(),
          durationMs: 100,
          fileSizeBytes: 1000,
        },
      }),
    };

    const mockRecEng = {
      record: async () => ({
        id: 'rec_123',
        status: 'failed' as const,
        error: 'Simulated recording engine failure',
      }),
    };

    const controller = new CaptureController(
      undefined,
      mockScreenshotEng as any,
      mockRecEng as any
    );

    const job = await controller.executeJob({
      url: testServer.url,
      captureType: 'both',
    });

    expect(job.status).toBe('partial');
    expect(job.screenshotResult?.status).toBe('completed');
    expect(job.recordingResult?.status).toBe('failed');
    expect(job.outputPaths.screenshot).toBeDefined();
    expect(job.outputPaths.recording).toBeUndefined();
    expect(job.errors.some((e) => e.includes('Simulated recording engine failure'))).toBe(true);
    expect(job.warnings.length).toBeGreaterThan(0);
  });

  it('8. Cancellation and cleanup behavior', async () => {
    const controller = new CaptureController();

    const jobPromise = controller.executeJob({
      url: testServer.url,
      captureType: 'recording',
      recordingOptions: { durationMs: 5000 },
    });

    // Extract job ID from in-progress job map
    const activeJobs = Array.from((controller as any).jobs.keys());
    expect(activeJobs.length).toBe(1);
    const jobId = activeJobs[0] as string;

    const cancelSuccess = await controller.cancelJob(jobId, 'Test cancellation');
    expect(cancelSuccess).toBe(true);

    const jobResult = await jobPromise;
    expect(jobResult.status).toBe('cancelled');
    expect(jobResult.errors.some((e) => e.includes('Test cancellation'))).toBe(true);
  });
});
