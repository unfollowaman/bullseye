import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { checkFFmpegAvailability, validateMp4 } from '@/utils';
import { getSecureOutputPath } from './path-utils';

export type Mp4QualityPreset = 'high' | 'medium' | 'low';

export interface Mp4ConversionOptions {
  inputPath: string;
  outputPath?: string;
  outputDir?: string;
  filename?: string;
  quality?: Mp4QualityPreset;
  crf?: number;
  fps?: number;
  timeoutMs?: number;
  cancellationToken?: { cancelled: boolean };
}

export interface Mp4ConversionResult {
  status: 'completed' | 'failed' | 'cancelled';
  outputPath?: string;
  fileSizeBytes?: number;
  durationMs?: number;
  error?: string;
  exitCode?: number | null;
}

const DEFAULT_TIMEOUT_MS = 60000;

export class FFmpegConverter {
  async convertWebmToMp4(options: Mp4ConversionOptions): Promise<Mp4ConversionResult> {
    const startTime = Date.now();

    // 1. Check input path existence
    if (!options.inputPath) {
      return { status: 'failed', error: 'Input WebM path is required' };
    }

    if (!fs.existsSync(options.inputPath)) {
      return { status: 'failed', error: `Input WebM file does not exist: ${options.inputPath}` };
    }

    // 2. Check system FFmpeg availability
    const capability = await checkFFmpegAvailability();
    if (!capability.available) {
      return {
        status: 'failed',
        error: `FFmpeg is not available: ${capability.error || 'System binary missing'}`,
      };
    }

    // 3. Resolve secure output path
    let resolvedOutputPath: string;
    try {
      if (options.outputPath) {
        // Validate custom outputPath directory and filename
        const secureResult = getSecureOutputPath(
          path.dirname(options.outputPath),
          path.basename(options.outputPath),
          'conversion',
          '.mp4'
        );
        resolvedOutputPath = secureResult.safePath;
      } else {
        const defaultFilename = `recording-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.mp4`;
        const secureResult = getSecureOutputPath(
          options.outputDir || path.dirname(options.inputPath),
          options.filename || defaultFilename,
          'conversion',
          '.mp4'
        );
        resolvedOutputPath = secureResult.safePath;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { status: 'failed', error: `Path security error: ${msg}` };
    }

    // Ensure target directory exists
    fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });

    // 4. Map Quality options to CRF
    let crf = 23; // Default 'medium' quality
    if (options.crf !== undefined) {
      crf = options.crf;
    } else if (options.quality === 'high') {
      crf = 18;
    } else if (options.quality === 'low') {
      crf = 28;
    }

    // 5. Construct FFmpeg arguments
    const args: string[] = [
      '-y', // Overwrite output file if exists
      '-i',
      options.inputPath,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'fast',
      '-crf',
      String(crf),
    ];

    if (options.fps && options.fps > 0) {
      args.push('-r', String(options.fps));
    }

    // Audio encoding and web faststart optimizations
    args.push('-c:a', 'aac', '-movflags', '+faststart', resolvedOutputPath);

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return new Promise((resolve) => {
      let child: ChildProcess | null = null;
      let stderrBuffer = '';
      let isTimedOut = false;
      let isCancelled = false;
      let timeoutTimer: NodeJS.Timeout | null = null;
      let pollInterval: NodeJS.Timeout | null = null;

      const cleanupPartialOutput = () => {
        if (fs.existsSync(resolvedOutputPath)) {
          try {
            fs.unlinkSync(resolvedOutputPath);
          } catch {}
        }
      };

      const killChildProcess = () => {
        if (!child || child.killed) return;
        try {
          child.kill('SIGTERM');
        } catch {}

        // Force kill if process does not exit in 2 seconds
        const forceTimer = setTimeout(() => {
          if (child && !child.killed) {
            try {
              child.kill('SIGKILL');
            } catch {}
          }
        }, 2000);

        if (forceTimer.unref) forceTimer.unref();
      };

      // Check pre-existing cancellation
      if (options.cancellationToken?.cancelled) {
        cleanupPartialOutput();
        return resolve({
          status: 'cancelled',
          error: 'MP4 conversion cancelled prior to process execution',
        });
      }

      // Spawn child process
      try {
        child = spawn('ffmpeg', args, {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (err: unknown) {
        cleanupPartialOutput();
        const msg = err instanceof Error ? err.message : String(err);
        return resolve({
          status: 'failed',
          error: `Failed to spawn FFmpeg process: ${msg}`,
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (chunk: Buffer) => {
          stderrBuffer += chunk.toString('utf-8');
          // Keep buffer size manageable (last 50KB)
          if (stderrBuffer.length > 50000) {
            stderrBuffer = stderrBuffer.slice(-50000);
          }
        });
      }

      // Timeout timer
      timeoutTimer = setTimeout(() => {
        isTimedOut = true;
        killChildProcess();
      }, timeoutMs);

      // Poll for cancellation
      if (options.cancellationToken) {
        pollInterval = setInterval(() => {
          if (options.cancellationToken?.cancelled && !isCancelled) {
            isCancelled = true;
            killChildProcess();
          }
        }, 100);
      }

      child.on('error', (err: Error) => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (pollInterval) clearInterval(pollInterval);
        cleanupPartialOutput();
        return resolve({
          status: 'failed',
          error: `FFmpeg process error: ${err.message}`,
        });
      });

      child.on('close', (code: number | null) => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (pollInterval) clearInterval(pollInterval);

        if (isCancelled || options.cancellationToken?.cancelled) {
          cleanupPartialOutput();
          return resolve({
            status: 'cancelled',
            error: 'MP4 conversion cancelled by user',
            exitCode: code,
          });
        }

        if (isTimedOut) {
          cleanupPartialOutput();
          return resolve({
            status: 'failed',
            error: `FFmpeg MP4 conversion timed out after ${timeoutMs}ms`,
            exitCode: code,
          });
        }

        if (code !== 0) {
          cleanupPartialOutput();
          const stderrTail = stderrBuffer.trim().slice(-500) || 'Unknown error';
          return resolve({
            status: 'failed',
            error: `FFmpeg process exited with code ${code}: ${stderrTail}`,
            exitCode: code,
          });
        }

        // Validate generated MP4 file
        const validation = validateMp4(resolvedOutputPath);
        if (!validation.valid) {
          cleanupPartialOutput();
          return resolve({
            status: 'failed',
            error: `Generated MP4 file is invalid: ${validation.error}`,
            exitCode: code,
          });
        }

        const durationMs = Date.now() - startTime;
        return resolve({
          status: 'completed',
          outputPath: resolvedOutputPath,
          fileSizeBytes: validation.sizeBytes,
          durationMs,
          exitCode: code,
        });
      });
    });
  }
}

export const ffmpegConverter = new FFmpegConverter();
