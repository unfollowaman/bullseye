import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseManager } from '../../src/db/index';
import { MockupEngine } from '../../src/mockup/engine';
import { MockupRepository } from '../../src/mockup/repository';
import { MockupService } from '../../src/mockup/service';
import { validateMockupConfig } from '../../src/mockup/validator';

describe('Phase 12 — Mockup Engine Unit & Integration Tests', () => {
  const testDir = path.join(process.cwd(), 'public', 'captures', 'test-mockup-fixtures');
  const dbPath = path.join(process.cwd(), 'data', 'test-mockups.db');

  let dbMgr: DatabaseManager;
  let mockupEngine: MockupEngine;
  let mockupRepo: MockupRepository;
  let mockupService: MockupService;

  // Sample screenshot fixture paths
  let landscapeFixture: string;
  let portraitFixture: string;
  let squareFixture: string;
  let longFullPageFixture: string;
  let invalidCorruptFixture: string;

  beforeAll(async () => {
    // 1. Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // 2. Initialize test DB
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
      } catch {}
    }
    dbMgr = new DatabaseManager(dbPath);
    dbMgr.init();

    mockupEngine = new MockupEngine();
    mockupRepo = new MockupRepository(dbMgr);
    mockupService = new MockupService(mockupEngine, mockupRepo);

    // 3. Create deterministic image fixtures
    landscapeFixture = path.join(testDir, 'landscape-1920x1080.png');
    portraitFixture = path.join(testDir, 'portrait-1080x1920.png');
    squareFixture = path.join(testDir, 'square-800x800.png');
    longFullPageFixture = path.join(testDir, 'long-1280x4000.png');
    invalidCorruptFixture = path.join(testDir, 'corrupt-file.png');

    await sharp({
      create: {
        width: 1920,
        height: 1080,
        channels: 4,
        background: { r: 50, g: 100, b: 200, alpha: 1 },
      },
    })
      .png()
      .toFile(landscapeFixture);

    await sharp({
      create: {
        width: 1080,
        height: 1920,
        channels: 4,
        background: { r: 200, g: 50, b: 100, alpha: 1 },
      },
    })
      .png()
      .toFile(portraitFixture);

    await sharp({
      create: {
        width: 800,
        height: 800,
        channels: 4,
        background: { r: 100, g: 200, b: 50, alpha: 1 },
      },
    })
      .png()
      .toFile(squareFixture);

    await sharp({
      create: {
        width: 1280,
        height: 4000,
        channels: 4,
        background: { r: 150, g: 150, b: 150, alpha: 1 },
      },
    })
      .png()
      .toFile(longFullPageFixture);

    fs.writeFileSync(invalidCorruptFixture, 'THIS IS NOT A VALID PNG IMAGE DATA CONTENT');
  });

  afterAll(() => {
    dbMgr.close();
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
    } catch {}
  });

  describe('1. Configuration Validation', () => {
    it('validates a correct configuration', () => {
      const res = validateMockupConfig({
        type: 'browser',
        sourceAssetPath: landscapeFixture,
        width: 1600,
        height: 1200,
        background: { type: 'solid', color: '#1e293b' },
      });

      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.sanitizedConfig?.type).toBe('browser');
    });

    it('rejects missing or invalid mockup type', () => {
      const res = validateMockupConfig({
        type: 'non-existent-type',
        sourceAssetPath: landscapeFixture,
      });

      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('Invalid mockup type');
    });

    it('rejects missing sourceAssetPath', () => {
      const res = validateMockupConfig({
        type: 'browser',
        sourceAssetPath: '',
      });

      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('Missing or invalid sourceAssetPath');
    });

    it('rejects invalid dimensions', () => {
      const res = validateMockupConfig({
        type: 'browser',
        sourceAssetPath: landscapeFixture,
        width: -100,
      });

      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('Width must be a positive integer');
    });
  });

  describe('2. Every Initial Mockup Type Generation', () => {
    it('generates a valid Browser mockup image', async () => {
      const result = await mockupService.generateMockup({
        type: 'browser',
        sourceAssetPath: landscapeFixture,
        outputDir: testDir,
        background: { type: 'solid', color: '#0f172a' },
        visualOptions: { browserTitle: 'Test App', browserUrl: 'https://test.local' },
      });

      expect(result.id).toBeDefined();
      expect(result.mockupType).toBe('browser');
      expect(fs.existsSync(result.generatedAsset.safePath)).toBe(true);

      // Verify decodability & validity
      const meta = await sharp(result.generatedAsset.safePath).metadata();
      expect(meta.format).toBe('png');
      expect(meta.width).toBeGreaterThan(0);
      expect(meta.height).toBeGreaterThan(0);
    });

    it('generates a valid Laptop mockup image', async () => {
      const result = await mockupService.generateMockup({
        type: 'laptop',
        sourceAssetPath: landscapeFixture,
        outputDir: testDir,
        background: { type: 'gradient', startColor: '#4f46e5', stopColor: '#06b6d4' },
        visualOptions: { deviceColor: 'space-gray' },
      });

      expect(result.mockupType).toBe('laptop');
      expect(fs.existsSync(result.generatedAsset.safePath)).toBe(true);

      const meta = await sharp(result.generatedAsset.safePath).metadata();
      expect(meta.width).toBeGreaterThan(0);
    });

    it('generates a valid Phone mockup image', async () => {
      const result = await mockupService.generateMockup({
        type: 'phone',
        sourceAssetPath: portraitFixture,
        outputDir: testDir,
        background: { type: 'gradient', startColor: '#1e1e1e', stopColor: '#383838' },
        visualOptions: { deviceColor: 'midnight' },
      });

      expect(result.mockupType).toBe('phone');
      expect(fs.existsSync(result.generatedAsset.safePath)).toBe(true);

      const meta = await sharp(result.generatedAsset.safePath).metadata();
      expect(meta.width).toBeGreaterThan(0);
    });

    it('generates a valid Presentation/Card mockup image', async () => {
      const result = await mockupService.generateMockup({
        type: 'presentation',
        sourceAssetPath: squareFixture,
        outputDir: testDir,
        background: { type: 'gradient', startColor: '#1e293b', stopColor: '#0f172a' },
      });

      expect(result.mockupType).toBe('presentation');
      expect(fs.existsSync(result.generatedAsset.safePath)).toBe(true);

      const meta = await sharp(result.generatedAsset.safePath).metadata();
      expect(meta.width).toBeGreaterThan(0);
    });
  });

  describe('3. Screenshot Dimensions & Aspect-Ratio Handling', () => {
    it('handles long full-page screenshot assets cleanly', async () => {
      const result = await mockupService.generateMockup({
        type: 'browser',
        sourceAssetPath: longFullPageFixture,
        outputDir: testDir,
        fitMode: 'cover',
      });

      expect(fs.existsSync(result.generatedAsset.safePath)).toBe(true);
      const meta = await sharp(result.generatedAsset.safePath).metadata();
      expect(meta.width).toBeGreaterThan(0);
    });

    it('preserves source screenshot asset untouched permanently', async () => {
      const originalStat = fs.statSync(landscapeFixture);

      await mockupService.generateMockup({
        type: 'laptop',
        sourceAssetPath: landscapeFixture,
        outputDir: testDir,
      });

      const currentStat = fs.statSync(landscapeFixture);
      expect(currentStat.size).toBe(originalStat.size);
      expect(currentStat.mtimeMs).toBe(originalStat.mtimeMs);
    });
  });

  describe('4. Error Handling & Edge Cases', () => {
    it('handles missing source asset path cleanly', async () => {
      await expect(
        mockupEngine.generateMockup({
          type: 'browser',
          sourceAssetPath: path.join(testDir, 'does-not-exist.png'),
        })
      ).rejects.toThrow('Missing source asset');
    });

    it('handles corrupt / non-image source asset file cleanly', async () => {
      await expect(
        mockupEngine.generateMockup({
          type: 'browser',
          sourceAssetPath: invalidCorruptFixture,
        })
      ).rejects.toThrow('Invalid or corrupt source image file');
    });

    it('prevents path traversal attacks in sourceAssetPath', () => {
      expect(() =>
        mockupEngine.resolvePhysicalPath('../../../etc/passwd')
      ).toThrow('Security Violation');
    });
  });

  describe('5. Service & Database Tracking', () => {
    it('persists mockup record in repository and retrieves by ID', async () => {
      const result = await mockupService.generateMockup({
        type: 'browser',
        sourceAssetPath: landscapeFixture,
        outputDir: testDir,
      });

      const fetched = mockupService.getMockupById(result.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.id).toBe(result.id);
      expect(fetched?.generatedAsset.webPath).toBe(result.generatedAsset.webPath);
    });

    it('lists supported mockup capabilities', () => {
      const caps = mockupService.getCapabilities();
      expect(caps.supportedTypes).toHaveLength(4);
      expect(caps.supportedFormats).toContain('png');
    });
  });
});
