import { execFile } from 'child_process';
import fs from 'fs';

export interface FFmpegCapabilityResult {
  available: boolean;
  version?: string;
  path?: string;
  error?: string;
}

let cachedFFmpegCapability: FFmpegCapabilityResult | null = null;

/**
 * Dynamically resolves the best available FFmpeg executable path.
 * Checks process.env.FFMPEG_PATH, system 'ffmpeg', or fallback to 'ffmpeg-static'.
 */
export function getFFmpegBinaryPath(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  try {
    // Check if ffmpeg-static is available in node_modules
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require('ffmpeg-static');
    if (typeof ffmpegStatic === 'string' && fs.existsSync(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch {
    // Ignore require error if ffmpeg-static is missing
  }

  return 'ffmpeg';
}

/**
 * Checks if local system or bundled FFmpeg binary is installed and executable.
 * Returns version info without exposing unnecessary raw output.
 */
export async function checkFFmpegAvailability(forceRefresh = false): Promise<FFmpegCapabilityResult> {
  if (cachedFFmpegCapability && !forceRefresh) {
    return cachedFFmpegCapability;
  }

  const binaryPath = getFFmpegBinaryPath();

  return new Promise((resolve) => {
    execFile(binaryPath, ['-version'], { timeout: 5000 }, (err, stdout) => {
      if (err) {
        // If ffmpeg-static or custom path failed, try fallback system 'ffmpeg'
        if (binaryPath !== 'ffmpeg') {
          execFile('ffmpeg', ['-version'], { timeout: 5000 }, (fallbackErr, fallbackStdout) => {
            if (fallbackErr) {
              const errorMsg =
                fallbackErr.code === 'ENOENT'
                  ? 'FFmpeg executable not found in system PATH or node_modules'
                  : fallbackErr.message || 'Failed to execute FFmpeg binary';

              const result: FFmpegCapabilityResult = {
                available: false,
                error: errorMsg,
              };
              cachedFFmpegCapability = result;
              return resolve(result);
            }

            const firstLine = fallbackStdout.split('\n')[0] || '';
            const match = firstLine.match(/ffmpeg\s+version\s+([^\s]+)/i);
            const version = match ? match[1] : firstLine.trim();

            const result: FFmpegCapabilityResult = {
              available: true,
              version: version || 'unknown',
              path: 'ffmpeg',
            };
            cachedFFmpegCapability = result;
            return resolve(result);
          });
          return;
        }

        const errorMsg =
          err.code === 'ENOENT'
            ? 'FFmpeg executable not found in system PATH'
            : err.message || 'Failed to execute FFmpeg binary';

        const result: FFmpegCapabilityResult = {
          available: false,
          error: errorMsg,
        };
        cachedFFmpegCapability = result;
        return resolve(result);
      }

      // Extract version string from first line of output e.g. "ffmpeg version 6.1.1-3ubuntu5 ..."
      const firstLine = stdout.split('\n')[0] || '';
      const match = firstLine.match(/ffmpeg\s+version\s+([^\s]+)/i);
      const version = match ? match[1] : firstLine.trim();

      const result: FFmpegCapabilityResult = {
        available: true,
        version: version || 'unknown',
        path: binaryPath,
      };

      cachedFFmpegCapability = result;
      return resolve(result);
    });
  });
}
