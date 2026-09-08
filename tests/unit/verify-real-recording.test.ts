import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { startTestServer, TestServer } from '../fixtures/fixture-server';
import { captureController } from '@/capture/controller';
import { validateWebM, validateMp4 } from '@/utils';
import { CaptureAction } from '@/capture/action-types';

describe('Real Recording Visual Verification (Phase 14)', () => {
  let testServer: TestServer;
  let verificationDir: string;

  beforeAll(async () => {
    testServer = await startTestServer();
    verificationDir = path.join(process.cwd(), 'public', 'captures', 'verification-phase14');
    fs.mkdirSync(verificationDir, { recursive: true });
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.close();
    }
  });

  it('generates real WebM and MP4 recording with full choreography (move -> click -> scroll -> move) and verifies media & extracted frames', async () => {
    const actions: CaptureAction[] = [
      { type: 'mouse_move', x: 125, y: 75, durationMs: 400, easing: 'ease-in-out' },
      { type: 'pause', durationMs: 200 },
      { type: 'click', x: 125, y: 75, durationMs: 100 },
      { type: 'pause', durationMs: 300 },
      { type: 'smooth_scroll', y: 400, durationMs: 500, easing: 'ease-in-out' },
      { type: 'pause', durationMs: 300 },
      { type: 'mouse_move', x: 125, y: 175, durationMs: 400, easing: 'ease-in-out' },
      { type: 'pause', durationMs: 300 },
    ];

    const result = await captureController.executeJob({
      url: `${testServer.url}/actions`,
      type: 'recording',
      recordingOptions: {
        durationMs: 3500,
        convertToMp4: true,
        filename: 'real-verification-phase14.webm',
        advancedRecordingOptions: {
          cursorEnabled: true,
          clickIndicatorEnabled: true,
          cursorStyle: 'default',
          cursorSize: 24,
        },
      },
      actions,
      outputDir: verificationDir,
    });

    // 1. Verify Job Status
    expect(result.status).toBe('completed');
    expect(result.outputPaths.recording).toBeDefined();
    expect(result.outputPaths.mp4).toBeDefined();

    const webmPath = result.outputPaths.recording!;
    const mp4Path = result.outputPaths.mp4!;

    // 2. Validate Container Headers
    const webmValid = validateWebM(webmPath);
    expect(webmValid.valid).toBe(true);
    expect(webmValid.sizeBytes).toBeGreaterThan(1000);

    const mp4Valid = validateMp4(mp4Path);
    expect(mp4Valid.valid).toBe(true);
    expect(mp4Valid.sizeBytes).toBeGreaterThan(1000);

    // 3. Extract Frames at 0.5s, 1.0s, 1.5s, 2.0s, 2.5s using FFmpeg for Visual Verification
    const frameOutputs: string[] = [];
    const timestamps = ['00:00:00.500', '00:00:01.000', '00:00:01.500', '00:00:02.000', '00:00:02.500'];

    timestamps.forEach((ts, idx) => {
      const framePath = path.join(verificationDir, `frame-${idx + 1}-${ts.replace(/[:.]/g, '-')}.png`);
      try {
        execFileSync('ffmpeg', [
          '-y',
          '-ss',
          ts,
          '-i',
          mp4Path,
          '-vframes',
          '1',
          framePath,
        ]);
        if (fs.existsSync(framePath) && fs.statSync(framePath).size > 0) {
          frameOutputs.push(framePath);
        }
      } catch {}
    });

    expect(frameOutputs.length).toBeGreaterThan(0);

    // Write a JSON summary file for inspection
    const summaryPath = path.join(verificationDir, 'verification-summary.json');
    fs.writeFileSync(
      summaryPath,
      JSON.stringify(
        {
          webmPath,
          mp4Path,
          webmSize: webmValid.sizeBytes,
          mp4Size: mp4Valid.sizeBytes,
          extractedFrames: frameOutputs,
          actionDiagnostics: result.actionDiagnostics,
        },
        null,
        2
      )
    );

    expect(fs.existsSync(summaryPath)).toBe(true);
  });
});
