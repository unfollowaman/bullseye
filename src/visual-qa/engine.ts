import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getSecureOutputPath } from '../capture/path-utils';
import {
  ResolvedVisualQAConfig,
  VisualQAAssetRef,
  VisualQAConfig,
  VisualQAResult,
} from './types';
import { validateVisualQAConfig } from './validator';

export interface CompareOptions {
  signal?: AbortSignal;
}

export class VisualQAEngine {
  /**
   * Safely resolves asset path relative to project root or public directory,
   * enforcing security bounds against directory traversal.
   */
  public resolvePhysicalPath(inputPath: string): string {
    const cwd = process.cwd();

    let resolved: string;
    if (inputPath.startsWith('/captures/')) {
      resolved = path.join(cwd, 'public', inputPath);
    } else if (path.isAbsolute(inputPath)) {
      resolved = path.resolve(inputPath);
    } else {
      resolved = path.resolve(cwd, inputPath);
    }

    if (!resolved.startsWith(cwd)) {
      throw new Error(
        `Security Violation: Path '${inputPath}' escapes designated application directory.`
      );
    }

    return resolved;
  }

  /**
   * Helper to parse hex color string into [r, g, b] array.
   */
  private parseHexColor(hexStr: string): [number, number, number] {
    let clean = hexStr.replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (clean.length !== 6) {
      return [255, 0, 255]; // fallback magenta
    }
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  /**
   * Compares baseline and current screenshots according to config.
   */
  public async compare(
    rawConfig: VisualQAConfig,
    options?: CompareOptions
  ): Promise<VisualQAResult> {
    const startTime = Date.now();
    const id = `qa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const createdAt = new Date().toISOString();

    if (options?.signal?.aborted) {
      throw new Error('Visual QA comparison cancelled by user.');
    }

    // 1. Validate configuration
    const valResult = validateVisualQAConfig(rawConfig);
    if (!valResult.valid || !valResult.sanitizedConfig) {
      const durationMs = Date.now() - startTime;
      return {
        id,
        baselineAssetPath: String(rawConfig?.baselineAssetPath || ''),
        currentAssetPath: String(rawConfig?.currentAssetPath || ''),
        status: 'error',
        outcome: 'error',
        match: false,
        metrics: { changedPixels: 0, totalPixels: 0, changedPercentage: 0 },
        config: (valResult.sanitizedConfig || rawConfig) as ResolvedVisualQAConfig,
        createdAt,
        durationMs,
        warnings: valResult.warnings,
        error: `Invalid comparison configuration: ${valResult.errors.join('; ')}`,
        version: 1,
      };
    }

    const config = valResult.sanitizedConfig;
    const warnings = [...valResult.warnings];

    // 2. Resolve baseline physical path
    let baselinePhysicalPath: string;
    try {
      baselinePhysicalPath = this.resolvePhysicalPath(config.baselineAssetPath);
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      return {
        id,
        baselineAssetPath: config.baselineAssetPath,
        currentAssetPath: config.currentAssetPath,
        status: 'error',
        outcome: 'error',
        match: false,
        metrics: { changedPixels: 0, totalPixels: 0, changedPercentage: 0 },
        config,
        createdAt,
        durationMs,
        warnings,
        error: `Invalid baseline asset path: ${(err as Error).message}`,
        version: 1,
      };
    }

    if (!fs.existsSync(baselinePhysicalPath)) {
      const durationMs = Date.now() - startTime;
      return {
        id,
        baselineAssetPath: config.baselineAssetPath,
        currentAssetPath: config.currentAssetPath,
        status: 'error',
        outcome: 'error',
        match: false,
        metrics: { changedPixels: 0, totalPixels: 0, changedPercentage: 0 },
        config,
        createdAt,
        durationMs,
        warnings,
        error: `Missing baseline asset: file does not exist at '${config.baselineAssetPath}'.`,
        version: 1,
      };
    }

    // 3. Resolve current physical path
    let currentPhysicalPath: string;
    try {
      currentPhysicalPath = this.resolvePhysicalPath(config.currentAssetPath);
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      return {
        id,
        baselineAssetPath: config.baselineAssetPath,
        currentAssetPath: config.currentAssetPath,
        status: 'error',
        outcome: 'error',
        match: false,
        metrics: { changedPixels: 0, totalPixels: 0, changedPercentage: 0 },
        config,
        createdAt,
        durationMs,
        warnings,
        error: `Invalid current asset path: ${(err as Error).message}`,
        version: 1,
      };
    }

    if (!fs.existsSync(currentPhysicalPath)) {
      const durationMs = Date.now() - startTime;
      return {
        id,
        baselineAssetPath: config.baselineAssetPath,
        currentAssetPath: config.currentAssetPath,
        status: 'error',
        outcome: 'error',
        match: false,
        metrics: { changedPixels: 0, totalPixels: 0, changedPercentage: 0 },
        config,
        createdAt,
        durationMs,
        warnings,
        error: `Missing current screenshot asset: file does not exist at '${config.currentAssetPath}'.`,
        version: 1,
      };
    }

    // 4. Load baseline image & metadata
    let baselineBuffer: Buffer;
    let baselineWidth = 0;
    let baselineHeight = 0;
    try {
      const fileBuf = fs.readFileSync(baselinePhysicalPath);
      const meta = await sharp(fileBuf).metadata();
      if (!meta.width || !meta.height) {
        throw new Error('Image metadata missing width or height.');
      }
      baselineWidth = meta.width;
      baselineHeight = meta.height;

      const { data } = await sharp(fileBuf)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      baselineBuffer = data;
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      return {
        id,
        baselineAssetPath: config.baselineAssetPath,
        currentAssetPath: config.currentAssetPath,
        status: 'error',
        outcome: 'error',
        match: false,
        metrics: { changedPixels: 0, totalPixels: 0, changedPercentage: 0 },
        config,
        createdAt,
        durationMs,
        warnings,
        error: `Invalid or corrupt baseline image: ${(err as Error).message}`,
        version: 1,
      };
    }

    // 5. Load current image & metadata
    let currentBuffer: Buffer;
    let currentWidth = 0;
    let currentHeight = 0;
    try {
      const fileBuf = fs.readFileSync(currentPhysicalPath);
      const meta = await sharp(fileBuf).metadata();
      if (!meta.width || !meta.height) {
        throw new Error('Image metadata missing width or height.');
      }
      currentWidth = meta.width;
      currentHeight = meta.height;

      const { data } = await sharp(fileBuf)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      currentBuffer = data;
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      return {
        id,
        baselineAssetPath: config.baselineAssetPath,
        currentAssetPath: config.currentAssetPath,
        status: 'error',
        outcome: 'error',
        match: false,
        metrics: { changedPixels: 0, totalPixels: 0, changedPercentage: 0 },
        config,
        createdAt,
        durationMs,
        warnings,
        error: `Invalid or corrupt current image: ${(err as Error).message}`,
        version: 1,
      };
    }

    const baselineDimensions = { width: baselineWidth, height: baselineHeight };
    const currentDimensions = { width: currentWidth, height: currentHeight };

    // 6. Dimension Compatibility Validation
    if (baselineWidth !== currentWidth || baselineHeight !== currentHeight) {
      const durationMs = Date.now() - startTime;
      return {
        id,
        baselineAssetPath: config.baselineAssetPath,
        currentAssetPath: config.currentAssetPath,
        baselineDimensions,
        currentDimensions,
        status: 'error',
        outcome: 'error',
        match: false,
        metrics: { changedPixels: 0, totalPixels: 0, changedPercentage: 0 },
        config,
        createdAt,
        durationMs,
        warnings,
        error: `Incompatible dimensions: baseline is ${baselineWidth}x${baselineHeight}, but current screenshot is ${currentWidth}x${currentHeight}. Screenshots must match dimensions for comparison.`,
        version: 1,
      };
    }

    if (options?.signal?.aborted) {
      throw new Error('Visual QA comparison cancelled by user.');
    }

    // 7. Perform Pixel Comparison
    const width = baselineWidth;
    const height = baselineHeight;
    const totalPixels = width * height;
    const pixelTolerance = config.pixelTolerance;

    let changedPixels = 0;
    const changedMask = new Uint8Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r1 = baselineBuffer[idx];
      const g1 = baselineBuffer[idx + 1];
      const b1 = baselineBuffer[idx + 2];
      const a1 = baselineBuffer[idx + 3];

      const r2 = currentBuffer[idx];
      const g2 = currentBuffer[idx + 1];
      const b2 = currentBuffer[idx + 2];
      const a2 = currentBuffer[idx + 3];

      const maxDiff = Math.max(
        Math.abs(r1 - r2),
        Math.abs(g1 - g2),
        Math.abs(b1 - b2),
        Math.abs(a1 - a2)
      );

      if (maxDiff > pixelTolerance) {
        changedPixels++;
        changedMask[i] = 1;
      }
    }

    const changedPercentageRaw = (changedPixels / totalPixels) * 100;
    const changedPercentage = Math.round(changedPercentageRaw * 10000) / 10000; // 4 decimal places

    const match = changedPercentage <= config.thresholdPercent;
    const outcome = match ? 'pass' : 'fail';

    // 8. Generate Diff Image Asset (if enabled)
    let diffAsset: VisualQAAssetRef | undefined;
    if (config.generateDiff) {
      const diffRgb = this.parseHexColor(config.diffColor);
      const diffData = Buffer.alloc(totalPixels * 4);

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        if (changedMask[i] === 1) {
          diffData[idx] = diffRgb[0];
          diffData[idx + 1] = diffRgb[1];
          diffData[idx + 2] = diffRgb[2];
          diffData[idx + 3] = 255;
        } else {
          // Dimmed grayscale baseline for unchanged pixels
          const r = baselineBuffer[idx];
          const g = baselineBuffer[idx + 1];
          const b = baselineBuffer[idx + 2];
          const lum = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
          const dimmed = Math.round(lum * 0.4);
          diffData[idx] = dimmed;
          diffData[idx + 1] = dimmed;
          diffData[idx + 2] = dimmed;
          diffData[idx + 3] = 255;
        }
      }

      const prefix = config.outputFilenamePrefix
        ? `${config.outputFilenamePrefix}-diff`
        : 'vqa-diff';
      const ext = `.${config.outputFormat}`;
      const securePath = getSecureOutputPath(
        config.outputDir,
        undefined,
        prefix,
        ext
      );

      const outputPath = securePath.safePath;
      const filename = securePath.filename;

      const capturesDir = path.resolve(process.cwd(), 'public', 'captures');
      let webPath = `/captures/${filename}`;
      if (!outputPath.startsWith(capturesDir)) {
        webPath = outputPath;
      }

      try {
        let pipeline = sharp(diffData, {
          raw: { width, height, channels: 4 },
        });

        if (config.outputFormat === 'png') {
          pipeline = pipeline.png({ quality: 90 });
        } else if (config.outputFormat === 'jpeg') {
          pipeline = pipeline.jpeg({ quality: 90 });
        } else if (config.outputFormat === 'webp') {
          pipeline = pipeline.webp({ quality: 90 });
        }

        await pipeline.toFile(outputPath);

        // Verification of generated image
        const stat = fs.statSync(outputPath);
        if (stat.size === 0) {
          throw new Error('Generated diff file is 0 bytes.');
        }

        const outMeta = await sharp(outputPath).metadata();
        if (!outMeta.width || !outMeta.height) {
          throw new Error('Generated diff file metadata is corrupt.');
        }

        diffAsset = {
          safePath: outputPath,
          webPath,
          filename,
          width: outMeta.width,
          height: outMeta.height,
          sizeBytes: stat.size,
          format: config.outputFormat,
        };
      } catch (err: unknown) {
        if (fs.existsSync(outputPath)) {
          try {
            fs.unlinkSync(outputPath);
          } catch {}
        }
        warnings.push(`Failed to generate diff image: ${(err as Error).message}`);
      }
    }

    // 9. Generate Overlay Image Asset (if enabled)
    let overlayAsset: VisualQAAssetRef | undefined;
    if (config.generateOverlay) {
      const alpha = config.overlayOpacity;
      const overlayData = Buffer.alloc(totalPixels * 4);

      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const r1 = baselineBuffer[idx];
        const g1 = baselineBuffer[idx + 1];
        const b1 = baselineBuffer[idx + 2];
        const a1 = baselineBuffer[idx + 3];

        const r2 = currentBuffer[idx];
        const g2 = currentBuffer[idx + 1];
        const b2 = currentBuffer[idx + 2];
        const a2 = currentBuffer[idx + 3];

        overlayData[idx] = Math.round(r1 * (1 - alpha) + r2 * alpha);
        overlayData[idx + 1] = Math.round(g1 * (1 - alpha) + g2 * alpha);
        overlayData[idx + 2] = Math.round(b1 * (1 - alpha) + b2 * alpha);
        overlayData[idx + 3] = Math.round(a1 * (1 - alpha) + a2 * alpha);
      }

      const prefix = config.outputFilenamePrefix
        ? `${config.outputFilenamePrefix}-overlay`
        : 'vqa-overlay';
      const ext = `.${config.outputFormat}`;
      const securePath = getSecureOutputPath(
        config.outputDir,
        undefined,
        prefix,
        ext
      );

      const outputPath = securePath.safePath;
      const filename = securePath.filename;

      const capturesDir = path.resolve(process.cwd(), 'public', 'captures');
      let webPath = `/captures/${filename}`;
      if (!outputPath.startsWith(capturesDir)) {
        webPath = outputPath;
      }

      try {
        let pipeline = sharp(overlayData, {
          raw: { width, height, channels: 4 },
        });

        if (config.outputFormat === 'png') {
          pipeline = pipeline.png({ quality: 90 });
        } else if (config.outputFormat === 'jpeg') {
          pipeline = pipeline.jpeg({ quality: 90 });
        } else if (config.outputFormat === 'webp') {
          pipeline = pipeline.webp({ quality: 90 });
        }

        await pipeline.toFile(outputPath);

        // Verification of generated image
        const stat = fs.statSync(outputPath);
        if (stat.size === 0) {
          throw new Error('Generated overlay file is 0 bytes.');
        }

        const outMeta = await sharp(outputPath).metadata();
        if (!outMeta.width || !outMeta.height) {
          throw new Error('Generated overlay file metadata is corrupt.');
        }

        overlayAsset = {
          safePath: outputPath,
          webPath,
          filename,
          width: outMeta.width,
          height: outMeta.height,
          sizeBytes: stat.size,
          format: config.outputFormat,
        };
      } catch (err: unknown) {
        if (fs.existsSync(outputPath)) {
          try {
            fs.unlinkSync(outputPath);
          } catch {}
        }
        warnings.push(`Failed to generate overlay image: ${(err as Error).message}`);
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      id,
      baselineAssetPath: config.baselineAssetPath,
      currentAssetPath: config.currentAssetPath,
      baselineCaptureId: config.baselineCaptureId,
      currentCaptureId: config.currentCaptureId,
      baselineDimensions,
      currentDimensions,
      status: 'completed',
      outcome,
      match,
      metrics: {
        changedPixels,
        totalPixels,
        changedPercentage,
      },
      config,
      diffAsset,
      overlayAsset,
      createdAt,
      durationMs,
      warnings,
      version: 1,
    };
  }
}

const globalForVisualQAEngine = globalThis as unknown as {
  visualQAEngine: VisualQAEngine | undefined;
};

export const visualQAEngine =
  globalForVisualQAEngine.visualQAEngine ?? new VisualQAEngine();

if (process.env.NODE_ENV !== 'production') {
  globalForVisualQAEngine.visualQAEngine = visualQAEngine;
}
