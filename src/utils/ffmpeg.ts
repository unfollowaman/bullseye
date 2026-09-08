import { execFile } from 'child_process';

export interface FFmpegCapabilityResult {
  available: boolean;
  version?: string;
  path?: string;
  error?: string;
}

let cachedFFmpegCapability: FFmpegCapabilityResult | null = null;

/**
 * Checks if local system FFmpeg binary is installed and executable.
 * Returns version info without exposing unnecessary raw output.
 */
export async function checkFFmpegAvailability(forceRefresh = false): Promise<FFmpegCapabilityResult> {
  if (cachedFFmpegCapability && !forceRefresh) {
    return cachedFFmpegCapability;
  }

  return new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], { timeout: 5000 }, (err, stdout) => {
      if (err) {
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
        path: 'ffmpeg',
      };

      cachedFFmpegCapability = result;
      return resolve(result);
    });
  });
}
