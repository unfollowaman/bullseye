import fs from 'fs';

export interface WebMValidationResult {
  valid: boolean;
  sizeBytes: number;
  error?: string;
}

/**
 * Validates whether a file exists, has content, and has a valid EBML (WebM/Matroska) header.
 * EBML Header magic number is 0x1A45DFA3.
 */
export function validateWebM(filePath: string): WebMValidationResult {
  if (!fs.existsSync(filePath)) {
    return { valid: false, sizeBytes: 0, error: `File does not exist: ${filePath}` };
  }

  let stats: fs.Stats;
  try {
    stats = fs.statSync(filePath);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, sizeBytes: 0, error: `Failed to stat file: ${msg}` };
  }

  if (stats.size === 0) {
    return { valid: false, sizeBytes: 0, error: `File is empty (0 bytes): ${filePath}` };
  }

  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(64);
    const bytesRead = fs.readSync(fd, buffer, 0, 64, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) {
      return { valid: false, sizeBytes: stats.size, error: 'File header too small to be a valid WebM container' };
    }

    // Check EBML Header Magic Number: 0x1A 0x45 0xDF 0xA3
    const isEbmlHeader =
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3;

    if (!isEbmlHeader) {
      return {
        valid: false,
        sizeBytes: stats.size,
        error: `Invalid WebM header magic bytes: expected 1A45DFA3, found ${buffer.slice(0, 4).toString('hex').toUpperCase()}`,
      };
    }

    return {
      valid: true,
      sizeBytes: stats.size,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, sizeBytes: stats.size, error: `Failed reading file header: ${msg}` };
  }
}
