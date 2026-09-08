import fs from 'fs';

export interface Mp4ValidationResult {
  valid: boolean;
  sizeBytes: number;
  error?: string;
}

/**
 * Validates whether a file exists, has content, and has a valid MP4 ISOBMFF container header.
 * MP4 files start with an atom box where offset 4-7 is "ftyp" (0x66 0x74 0x79 0x70).
 */
export function validateMp4(filePath: string): Mp4ValidationResult {
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

    if (bytesRead < 8) {
      return { valid: false, sizeBytes: stats.size, error: 'File header too small to be a valid MP4 container' };
    }

    // Check for 'ftyp' at bytes 4..7 (0x66, 0x74, 0x79, 0x70)
    const ftypBox = buffer.subarray(4, 8).toString('ascii');
    if (ftypBox !== 'ftyp') {
      return {
        valid: false,
        sizeBytes: stats.size,
        error: `Invalid MP4 header magic bytes: expected 'ftyp' at byte offset 4, found '${ftypBox}'`,
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
