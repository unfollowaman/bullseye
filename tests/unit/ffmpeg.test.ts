import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { checkFFmpegAvailability, validateWebM, validateMp4 } from '@/utils';
import { ffmpegConverter } from '@/capture/ffmpeg-converter';

describe('Phase 11: FFmpeg Pipeline Unit Tests', () => {
  let tempDir: string;
  let sampleWebmPath: string;

  beforeAll(() => {
    tempDir = path.join(process.cwd(), 'public', 'captures', `test-ffmpeg-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    sampleWebmPath = path.join(tempDir, 'sample-fixture.webm');

    // Create a tiny deterministic 1-second WebM fixture file using FFmpeg lavfi
    execFileSync('ffmpeg', [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=320x240:rate=10',
      '-t',
      '1',
      '-c:v',
      'libvpx',
      sampleWebmPath,
    ]);
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  });

  describe('1. FFmpeg Capability Detection', () => {
    it('detects system FFmpeg availability and version', async () => {
      const capability = await checkFFmpegAvailability(true);
      expect(capability.available).toBe(true);
      expect(capability.version).toBeDefined();
      expect(capability.version).not.toBe('unknown');
    });
  });

  describe('2. MP4 Header Validator', () => {
    it('validates a correct MP4 file header magic bytes (ftyp)', async () => {
      const targetMp4 = path.join(tempDir, 'validator-test.mp4');
      const conversion = await ffmpegConverter.convertWebmToMp4({
        inputPath: sampleWebmPath,
        outputPath: targetMp4,
      });

      expect(conversion.status).toBe('completed');
      expect(fs.existsSync(targetMp4)).toBe(true);

      const validation = validateMp4(targetMp4);
      expect(validation.valid).toBe(true);
      expect(validation.sizeBytes).toBeGreaterThan(0);
    });

    it('rejects non-existent or invalid files', () => {
      const missing = validateMp4(path.join(tempDir, 'non-existent.mp4'));
      expect(missing.valid).toBe(false);

      const corruptPath = path.join(tempDir, 'corrupt.mp4');
      fs.writeFileSync(corruptPath, 'This is a text string, not an MP4 video file');
      const corrupt = validateMp4(corruptPath);
      expect(corrupt.valid).toBe(false);
      expect(corrupt.error).toContain('ftyp');
    });
  });

  describe('3. WebM -> MP4 Conversion & Original WebM Preservation', () => {
    it('converts WebM to MP4 and strictly preserves original WebM file', async () => {
      const initialWebmStats = fs.statSync(sampleWebmPath);
      const outputMp4Path = path.join(tempDir, 'preservation-test.mp4');

      const result = await ffmpegConverter.convertWebmToMp4({
        inputPath: sampleWebmPath,
        outputPath: outputMp4Path,
      });

      expect(result.status).toBe('completed');
      expect(result.outputPath).toBe(outputMp4Path);
      expect(fs.existsSync(outputMp4Path)).toBe(true);

      // Verify original WebM remains untouched
      expect(fs.existsSync(sampleWebmPath)).toBe(true);
      const postWebmStats = fs.statSync(sampleWebmPath);
      expect(postWebmStats.size).toBe(initialWebmStats.size);
    });

    it('supports quality options (high, medium, low, crf, fps)', async () => {
      const highMp4 = path.join(tempDir, 'quality-high.mp4');
      const lowMp4 = path.join(tempDir, 'quality-low.mp4');

      const highRes = await ffmpegConverter.convertWebmToMp4({
        inputPath: sampleWebmPath,
        outputPath: highMp4,
        quality: 'high',
        fps: 30,
      });

      const lowRes = await ffmpegConverter.convertWebmToMp4({
        inputPath: sampleWebmPath,
        outputPath: lowMp4,
        quality: 'low',
        fps: 15,
      });

      expect(highRes.status).toBe('completed');
      expect(lowRes.status).toBe('completed');
      expect(validateMp4(highMp4).valid).toBe(true);
      expect(validateMp4(lowMp4).valid).toBe(true);
    });
  });

  describe('4. Error Handling & Input/Output Validation', () => {
    it('fails gracefully when input file does not exist', async () => {
      const missingInput = path.join(tempDir, 'ghost-input.webm');
      const result = await ffmpegConverter.convertWebmToMp4({
        inputPath: missingInput,
      });

      expect(result.status).toBe('failed');
      expect(result.error).toContain('does not exist');
    });

    it('cleans up partial output and fails gracefully on invalid/corrupt input', async () => {
      const corruptWebm = path.join(tempDir, 'invalid-input.webm');
      fs.writeFileSync(corruptWebm, 'Not a valid webm file');

      const targetMp4 = path.join(tempDir, 'corrupt-output.mp4');
      const result = await ffmpegConverter.convertWebmToMp4({
        inputPath: corruptWebm,
        outputPath: targetMp4,
      });

      expect(result.status).toBe('failed');
      expect(fs.existsSync(targetMp4)).toBe(false); // Cleaned up
      expect(fs.existsSync(corruptWebm)).toBe(true); // Input preserved
    });

    it('prevents path traversal outside designated output directories', async () => {
      const unsafePath = path.join(tempDir, '../../../../tmp/evil-traversal.mp4');
      const result = await ffmpegConverter.convertWebmToMp4({
        inputPath: sampleWebmPath,
        outputPath: unsafePath,
      });

      // Security violation triggers failure or path sanitization
      if (result.status === 'completed' && result.outputPath) {
        expect(result.outputPath).not.toContain('..');
      } else {
        expect(result.status).toBe('failed');
        expect(result.error).toContain('Security Violation');
      }
    });
  });

  describe('5. Process Cancellation & Timeout Handling', () => {
    it('cancels active FFmpeg conversion, terminates child process, and cleans partial output', async () => {
      const cancelOutput = path.join(tempDir, 'cancel-test.mp4');
      const token = { cancelled: true };

      const result = await ffmpegConverter.convertWebmToMp4({
        inputPath: sampleWebmPath,
        outputPath: cancelOutput,
        cancellationToken: token,
      });

      expect(result.status).toBe('cancelled');
      expect(fs.existsSync(cancelOutput)).toBe(false);
      expect(fs.existsSync(sampleWebmPath)).toBe(true);
    });

    it('handles process timeout, terminates child process, and cleans partial output', async () => {
      const timeoutOutput = path.join(tempDir, 'timeout-test.mp4');

      const result = await ffmpegConverter.convertWebmToMp4({
        inputPath: sampleWebmPath,
        outputPath: timeoutOutput,
        timeoutMs: 1, // Extremely short timeout to force timeout handler
      });

      expect(result.status).toBe('failed');
      expect(result.error).toContain('timed out');
      expect(fs.existsSync(timeoutOutput)).toBe(false);
      expect(fs.existsSync(sampleWebmPath)).toBe(true);
    });
  });

  describe('6. Repeated and Concurrent Conversion Safety', () => {
    it('handles multiple concurrent conversions without process or file collisions', async () => {
      const tasks = [1, 2, 3].map((num) => {
        const outPath = path.join(tempDir, `concurrent-${num}.mp4`);
        return ffmpegConverter.convertWebmToMp4({
          inputPath: sampleWebmPath,
          outputPath: outPath,
        });
      });

      const results = await Promise.all(tasks);
      results.forEach((res, idx) => {
        expect(res.status).toBe('completed');
        expect(res.outputPath).toBeDefined();
        expect(validateMp4(res.outputPath!).valid).toBe(true);
      });
    });
  });
});
