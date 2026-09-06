import path from 'path';

const CAPTURES_ROOT_DIR = path.resolve(process.cwd(), 'public', 'captures');

export interface SecurePathResult {
  safePath: string;
  filename: string;
}

/**
 * Ensures output directory and filename are strictly contained within the allowed captures root directory
 * or explicit custom output directory (e.g. tests using custom outputDir inside project root),
 * preventing path traversal attacks (e.g. `../../../etc/passwd` or `/etc/passwd`).
 */
export function getSecureOutputPath(
  outputDir?: string,
  filename?: string,
  defaultPrefix: string = 'capture',
  defaultExt: string = '.png'
): SecurePathResult {
  const allowedBaseDir = path.resolve(process.cwd());
  const targetDir = outputDir ? path.resolve(outputDir) : CAPTURES_ROOT_DIR;

  // Verify targetDir is inside process.cwd()
  if (!targetDir.startsWith(allowedBaseDir)) {
    throw new Error(`Security Violation: Output directory '${targetDir}' escapes designated application directory.`);
  }

  // Sanitize filename to prevent directory traversal in filename
  const rawFilename = filename || `${defaultPrefix}-${Date.now()}_${Math.random().toString(36).substring(2, 8)}${defaultExt}`;

  // Extract base filename (drops relative or absolute path components in filename)
  const safeFilename = path.basename(rawFilename);

  // Compute full resolved path
  const fullPath = path.resolve(targetDir, safeFilename);

  // Ensure fullPath starts with allowedBaseDir
  if (!fullPath.startsWith(allowedBaseDir)) {
    throw new Error(`Security Violation: Output path '${fullPath}' escapes designated application directory.`);
  }

  return {
    safePath: fullPath,
    filename: safeFilename,
  };
}
