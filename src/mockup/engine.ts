import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { getSecureOutputPath } from '../capture/path-utils';
import { renderMockupSvg } from './templates';
import {
  MockupConfig,
  MockupOutputFormat,
  MockupResult,
} from './types';
import { validateMockupConfig } from './validator';

export interface GenerateMockupOptions {
  signal?: AbortSignal;
}

export class MockupEngine {
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
      throw new Error(`Security Violation: Path '${inputPath}' escapes designated application directory.`);
    }

    return resolved;
  }

  public async generateMockup(
    rawConfig: MockupConfig,
    options?: GenerateMockupOptions
  ): Promise<MockupResult> {
    if (options?.signal?.aborted) {
      throw new Error('Mockup generation cancelled by user.');
    }

    const valResult = validateMockupConfig(rawConfig);
    if (!valResult.valid || !valResult.sanitizedConfig) {
      throw new Error(`Invalid mockup configuration: ${valResult.errors.join('; ')}`);
    }

    const config = valResult.sanitizedConfig;
    const warnings = [...valResult.warnings];

    let physicalSourcePath: string;
    try {
      physicalSourcePath = this.resolvePhysicalPath(config.sourceAssetPath);
    } catch (err: unknown) {
      throw new Error(`Invalid source asset path: ${(err as Error).message}`);
    }

    if (!fs.existsSync(physicalSourcePath)) {
      throw new Error(`Missing source asset: file does not exist at path '${config.sourceAssetPath}'.`);
    }

    let imgWidth = 0;
    let imgHeight = 0;
    let sourceBuffer: Buffer;

    try {
      sourceBuffer = fs.readFileSync(physicalSourcePath);
      const metadata = await sharp(sourceBuffer).metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Image metadata missing width or height.');
      }

      imgWidth = metadata.width;
      imgHeight = metadata.height;
    } catch (err: unknown) {
      throw new Error(`Invalid or corrupt source image file: ${(err as Error).message}`);
    }

    if (options?.signal?.aborted) {
      throw new Error('Mockup generation cancelled by user.');
    }

    const base64Data = `data:image/png;base64,${sourceBuffer.toString('base64')}`;

    let svgString: string;
    try {
      svgString = renderMockupSvg(base64Data, imgWidth, imgHeight, config);
    } catch (err: unknown) {
      throw new Error(`Mockup SVG template rendering failed: ${(err as Error).message}`);
    }

    const defaultPrefix = `mockup-${config.type}`;
    const defaultExt = `.${config.outputFormat || 'png'}`;
    const securePath = getSecureOutputPath(config.outputDir, config.outputFilename, defaultPrefix, defaultExt);

    const outputPath = securePath.safePath;
    const filename = securePath.filename;

    const capturesDir = path.resolve(process.cwd(), 'public', 'captures');
    let webPath = `/captures/${filename}`;
    if (!outputPath.startsWith(capturesDir)) {
      webPath = outputPath;
    }

    if (options?.signal?.aborted) {
      throw new Error('Mockup generation cancelled by user.');
    }

    try {
      const svgBuffer = Buffer.from(svgString);
      let pipeline = sharp(svgBuffer);

      const format: MockupOutputFormat = config.outputFormat || 'png';
      if (format === 'png') {
        pipeline = pipeline.png({ quality: 90 });
      } else if (format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality: 90 });
      } else if (format === 'webp') {
        pipeline = pipeline.webp({ quality: 90 });
      }

      await pipeline.toFile(outputPath);
    } catch (err: unknown) {
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch {}
      }
      throw new Error(`Mockup rendering/rasterization failed: ${(err as Error).message}`);
    }

    let outWidth = 0;
    let outHeight = 0;
    let sizeBytes = 0;

    try {
      const stat = fs.statSync(outputPath);
      sizeBytes = stat.size;

      if (sizeBytes === 0) {
        throw new Error('Generated output image file is 0 bytes.');
      }

      const outMeta = await sharp(outputPath).metadata();
      if (!outMeta.width || !outMeta.height) {
        throw new Error('Generated output image is corrupted or missing dimensions.');
      }

      outWidth = outMeta.width;
      outHeight = outMeta.height;
    } catch (err: unknown) {
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch {}
      }
      throw new Error(`Generated mockup verification failed: ${(err as Error).message}`);
    }

    const id = `mockup_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const createdAt = new Date().toISOString();

    const result: MockupResult = {
      id,
      mockupType: config.type,
      sourceAssetPath: config.sourceAssetPath,
      sourceCaptureId: config.sourceCaptureId,
      config,
      generatedAsset: {
        safePath: outputPath,
        webPath,
        filename,
        width: outWidth,
        height: outHeight,
        sizeBytes,
        format: config.outputFormat || 'png',
      },
      dimensions: {
        width: outWidth,
        height: outHeight,
      },
      createdAt,
      version: 1,
      warnings,
    };

    return result;
  }
}

const globalForMockupEngine = globalThis as unknown as {
  mockupEngine: MockupEngine | undefined;
};

export const mockupEngine = globalForMockupEngine.mockupEngine ?? new MockupEngine();

if (process.env.NODE_ENV !== 'production') {
  globalForMockupEngine.mockupEngine = mockupEngine;
}
