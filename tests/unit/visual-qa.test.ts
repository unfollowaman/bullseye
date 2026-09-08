import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { DatabaseManager } from '../../src/db';
import { VisualQAEngine } from '../../src/visual-qa/engine';
import { VisualQARepository } from '../../src/visual-qa/repository';
import { VisualQAService } from '../../src/visual-qa/service';
import { validateVisualQAConfig } from '../../src/visual-qa/validator';

describe('Phase 13 — Visual QA Subsystem Unit & Integration Tests', () => {
  const testDir = path.join(process.cwd(), 'public', 'captures', 'test-fixtures-vqa');
  let engine: VisualQAEngine;
  let dbManager: DatabaseManager;
  let repo: VisualQARepository;
  let service: VisualQAService;

  const pathA = path.join(testDir, 'img_a.png');
  const pathAIdentical = path.join(testDir, 'img_a_copy.png');
  const path1Pixel = path.join(testDir, 'img_1pixel.png');
  const pathSmallChange = path.join(testDir, 'img_small_change.png');
  const pathLargeChange = path.join(testDir, 'img_large_change.png');
  const pathBlueSquare = path.join(testDir, 'img_blue.png');
  const pathNoise = path.join(testDir, 'img_noise.png');
  const pathDiffDims = path.join(testDir, 'img_diff_dims.png');
  const pathCorrupt = path.join(testDir, 'img_corrupt.png');

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    engine = new VisualQAEngine();

    const dbPath = path.join(process.cwd(), 'data', `test_vqa_${Date.now()}.db`);
    dbManager = new DatabaseManager(dbPath);
    dbManager.init();
    repo = new VisualQARepository(dbManager);
    service = new VisualQAService(engine, repo);

    // 1. Image A: 100x100 Solid White PNG
    const whiteBuf = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .png()
      .toBuffer();
    fs.writeFileSync(pathA, whiteBuf);
    fs.writeFileSync(pathAIdentical, whiteBuf);

    // 2. Image 1Pixel: 100x100 White PNG with 1 pixel changed to Black at (10, 10)
    const rawData1 = Buffer.alloc(100 * 100 * 4, 255);
    // pixel index 10,10 -> (10 * 100 + 10) * 4
    const idx1 = (10 * 100 + 10) * 4;
    rawData1[idx1] = 0; // R
    rawData1[idx1 + 1] = 0; // G
    rawData1[idx1 + 2] = 0; // B
    rawData1[idx1 + 3] = 255;
    const buf1Pixel = await sharp(rawData1, { raw: { width: 100, height: 100, channels: 4 } }).png().toBuffer();
    fs.writeFileSync(path1Pixel, buf1Pixel);

    // 3. Image SmallChange: 100x100 White PNG with 10x10 black square (100 pixels changed = 1.0%)
    const rawDataSmall = Buffer.alloc(100 * 100 * 4, 255);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        const idx = (y * 100 + x) * 4;
        rawDataSmall[idx] = 0;
        rawDataSmall[idx + 1] = 0;
        rawDataSmall[idx + 2] = 0;
        rawDataSmall[idx + 3] = 255;
      }
    }
    const bufSmall = await sharp(rawDataSmall, { raw: { width: 100, height: 100, channels: 4 } }).png().toBuffer();
    fs.writeFileSync(pathSmallChange, bufSmall);

    // 4. Image LargeChange: 100x100 White PNG with half image (50x100) black (5000 pixels changed = 50.0%)
    const rawDataLarge = Buffer.alloc(100 * 100 * 4, 255);
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 50; x++) {
        const idx = (y * 100 + x) * 4;
        rawDataLarge[idx] = 0;
        rawDataLarge[idx + 1] = 0;
        rawDataLarge[idx + 2] = 0;
        rawDataLarge[idx + 3] = 255;
      }
    }
    const bufLarge = await sharp(rawDataLarge, { raw: { width: 100, height: 100, channels: 4 } }).png().toBuffer();
    fs.writeFileSync(pathLargeChange, bufLarge);

    // 5. Image Blue Square: 100x100 Solid Blue PNG (100% changed compared to white)
    const bufBlue = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } },
    })
      .png()
      .toBuffer();
    fs.writeFileSync(pathBlueSquare, bufBlue);

    // 6. Image Noise: 100x100 White PNG with 50 pixels shifted by RGB diff of 5 (e.g. RGB 250 instead of 255)
    const rawDataNoise = Buffer.alloc(100 * 100 * 4, 255);
    for (let i = 0; i < 50; i++) {
      const idx = i * 4;
      rawDataNoise[idx] = 250;
      rawDataNoise[idx + 1] = 250;
      rawDataNoise[idx + 2] = 250;
    }
    const bufNoise = await sharp(rawDataNoise, { raw: { width: 100, height: 100, channels: 4 } }).png().toBuffer();
    fs.writeFileSync(pathNoise, bufNoise);

    // 7. Image Diff Dimensions: 200x150 PNG
    const bufDiffDims = await sharp({
      create: { width: 200, height: 150, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .png()
      .toBuffer();
    fs.writeFileSync(pathDiffDims, bufDiffDims);

    // 8. Image Corrupt: invalid non-image file
    fs.writeFileSync(pathCorrupt, Buffer.from('NOT_AN_IMAGE_FILE_CORRUPT_BYTES_XYZ'));
  });

  describe('1. Configuration Validation', () => {
    it('validates configuration and supplies defaults', () => {
      const res = validateVisualQAConfig({
        baselineAssetPath: '/captures/a.png',
        currentAssetPath: '/captures/b.png',
      });

      expect(res.valid).toBe(true);
      expect(res.sanitizedConfig?.pixelTolerance).toBe(10);
      expect(res.sanitizedConfig?.thresholdPercent).toBe(0);
      expect(res.sanitizedConfig?.diffColor).toBe('#ff00ff');
      expect(res.sanitizedConfig?.overlayOpacity).toBe(0.5);
      expect(res.sanitizedConfig?.outputFormat).toBe('png');
      expect(res.sanitizedConfig?.generateDiff).toBe(true);
      expect(res.sanitizedConfig?.generateOverlay).toBe(true);
    });

    it('rejects invalid configurations missing paths', () => {
      const res = validateVisualQAConfig({});
      expect(res.valid).toBe(false);
      expect(res.errors.length).toBeGreaterThan(0);
    });
  });

  describe('2. Identical Images', () => {
    it('returns PASS with 0 changed pixels for identical screenshots', async () => {
      const result = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: pathAIdentical,
      });

      expect(result.status).toBe('completed');
      expect(result.outcome).toBe('pass');
      expect(result.match).toBe(true);
      expect(result.metrics.changedPixels).toBe(0);
      expect(result.metrics.changedPercentage).toBe(0);
      expect(result.metrics.totalPixels).toBe(10000);
      expect(result.baselineDimensions).toEqual({ width: 100, height: 100 });
      expect(result.currentDimensions).toEqual({ width: 100, height: 100 });
      expect(result.diffAsset).toBeDefined();
      expect(result.overlayAsset).toBeDefined();
    });
  });

  describe('3. One-Pixel Difference', () => {
    it('detects 1 pixel change and fails when threshold is 0%', async () => {
      const result = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: path1Pixel,
        thresholdPercent: 0,
      });

      expect(result.status).toBe('completed');
      expect(result.outcome).toBe('fail');
      expect(result.match).toBe(false);
      expect(result.metrics.changedPixels).toBe(1);
      expect(result.metrics.changedPercentage).toBe(0.01);
    });

    it('passes 1 pixel change when threshold is set above 0.01%', async () => {
      const result = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: path1Pixel,
        thresholdPercent: 0.05,
      });

      expect(result.status).toBe('completed');
      expect(result.outcome).toBe('pass');
      expect(result.match).toBe(true);
      expect(result.metrics.changedPixels).toBe(1);
    });
  });

  describe('4. Small Localized Change', () => {
    it('detects 100 changed pixels (1.0%)', async () => {
      const result = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: pathSmallChange,
      });

      expect(result.status).toBe('completed');
      expect(result.outcome).toBe('fail');
      expect(result.match).toBe(false);
      expect(result.metrics.changedPixels).toBe(100);
      expect(result.metrics.changedPercentage).toBe(1.0);
    });
  });

  describe('5. Large Visual Change', () => {
    it('detects 5000 changed pixels (50.0%)', async () => {
      const result = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: pathLargeChange,
      });

      expect(result.status).toBe('completed');
      expect(result.outcome).toBe('fail');
      expect(result.metrics.changedPixels).toBe(5000);
      expect(result.metrics.changedPercentage).toBe(50.0);
    });
  });

  describe('6. Completely Different Images', () => {
    it('detects 100% changed pixels between white and blue square', async () => {
      const result = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: pathBlueSquare,
      });

      expect(result.status).toBe('completed');
      expect(result.outcome).toBe('fail');
      expect(result.metrics.changedPixels).toBe(10000);
      expect(result.metrics.changedPercentage).toBe(100.0);
    });
  });

  describe('7. Anti-Aliasing & Minor Noise Handling', () => {
    it('filters out minor noise when pixelTolerance >= RGB noise shift', async () => {
      // Noise shift is 5. With pixelTolerance = 10, noise is ignored.
      const result = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: pathNoise,
        pixelTolerance: 10,
      });

      expect(result.status).toBe('completed');
      expect(result.outcome).toBe('pass');
      expect(result.metrics.changedPixels).toBe(0);
    });

    it('detects noise when pixelTolerance < RGB noise shift', async () => {
      // Noise shift is 5. With pixelTolerance = 2, noise is counted as changed.
      const result = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: pathNoise,
        pixelTolerance: 2,
      });

      expect(result.status).toBe('completed');
      expect(result.outcome).toBe('fail');
      expect(result.metrics.changedPixels).toBe(50);
    });
  });

  describe('8. Incompatible Dimensions', () => {
    it('fails clearly with error status when image dimensions differ', async () => {
      const result = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: pathDiffDims,
      });

      expect(result.status).toBe('error');
      expect(result.outcome).toBe('error');
      expect(result.match).toBe(false);
      expect(result.error).toContain('Incompatible dimensions');
      expect(result.error).toContain('100x100');
      expect(result.error).toContain('200x150');
    });
  });

  describe('9. Invalid/Corrupt Image & Missing File', () => {
    it('handles missing baseline image cleanly', async () => {
      const result = await service.compare({
        baselineAssetPath: path.join(testDir, 'non_existent.png'),
        currentAssetPath: pathA,
      });

      expect(result.status).toBe('error');
      expect(result.outcome).toBe('error');
      expect(result.error).toContain('Missing baseline asset');
    });

    it('handles corrupt image file cleanly', async () => {
      const result = await service.compare({
        baselineAssetPath: pathCorrupt,
        currentAssetPath: pathA,
      });

      expect(result.status).toBe('error');
      expect(result.outcome).toBe('error');
      expect(result.error).toContain('Invalid or corrupt baseline image');
    });
  });

  describe('10. Generated Asset Validation', () => {
    it('verifies generated diff and overlay images are valid decodable files with correct dimensions', async () => {
      const result = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: pathSmallChange,
        diffColor: '#ff0000',
        overlayOpacity: 0.5,
      });

      expect(result.diffAsset).toBeDefined();
      expect(result.overlayAsset).toBeDefined();

      const diffPath = result.diffAsset!.safePath;
      expect(fs.existsSync(diffPath)).toBe(true);
      const diffMeta = await sharp(diffPath).metadata();
      expect(diffMeta.width).toBe(100);
      expect(diffMeta.height).toBe(100);
      expect(result.diffAsset!.sizeBytes).toBeGreaterThan(0);

      const overlayPath = result.overlayAsset!.safePath;
      expect(fs.existsSync(overlayPath)).toBe(true);
      const overlayMeta = await sharp(overlayPath).metadata();
      expect(overlayMeta.width).toBe(100);
      expect(overlayMeta.height).toBe(100);
      expect(result.overlayAsset!.sizeBytes).toBeGreaterThan(0);
    });
  });

  describe('11. Database Persistence & Retrieval', () => {
    it('persists comparison in SQLite DB and retrieves by ID', async () => {
      const result = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: pathSmallChange,
      });

      const retrieved = service.getComparisonById(result.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(result.id);
      expect(retrieved?.outcome).toBe('fail');
      expect(retrieved?.metrics.changedPixels).toBe(100);
      expect(retrieved?.config.pixelTolerance).toBe(10);
    });

    it('lists past comparisons', () => {
      const all = service.listComparisons();
      expect(all.length).toBeGreaterThan(0);
    });
  });

  describe('12. Security & Path Traversal Safeguards', () => {
    it('prevents path traversal outside application directory', () => {
      expect(() =>
        engine.resolvePhysicalPath('../../../../../etc/passwd')
      ).toThrow(/Security Violation/);
    });
  });

  describe('13. Repeated Identical Comparison', () => {
    it('produces deterministic output on repeated comparisons', async () => {
      const res1 = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: path1Pixel,
      });

      const res2 = await service.compare({
        baselineAssetPath: pathA,
        currentAssetPath: path1Pixel,
      });

      expect(res1.metrics.changedPixels).toBe(res2.metrics.changedPixels);
      expect(res1.metrics.changedPercentage).toBe(res2.metrics.changedPercentage);
      expect(res1.outcome).toBe(res2.outcome);
    });
  });
});
