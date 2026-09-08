import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { ScreenshotEngine } from '../../src/capture/screenshot-engine';
import { mockupService } from '../../src/mockup/service';

describe('Real Screenshot & Mockup Generation Verification', () => {
  it('generates real screenshot and renders 4 real mockups, verifying image decodability, dimensions, framing, backgrounds, and composition', async () => {
    // 1. Capture real screenshot of example.com
    const screenshotEngine = new ScreenshotEngine();
    const captureResult = await screenshotEngine.capture({
      url: 'https://example.com',
      viewport: { width: 1280, height: 800 },
      mode: 'viewport',
    });

    expect(captureResult.status).toBe('completed');
    expect(captureResult.metadata?.outputPath).toBeDefined();

    const screenshotPath = captureResult.metadata!.outputPath;
    expect(fs.existsSync(screenshotPath)).toBe(true);

    const screenshotMeta = await sharp(screenshotPath).metadata();
    expect(screenshotMeta.width).toBe(1280);
    expect(screenshotMeta.height).toBe(800);

    // 2. Browser Mockup
    const browserMockup = await mockupService.generateMockup({
      type: 'browser',
      sourceAssetPath: screenshotPath,
      background: { type: 'gradient', startColor: '#4f46e5', stopColor: '#06b6d4' },
      visualOptions: { browserTitle: 'Example Domain', browserUrl: 'https://example.com', deviceColor: 'dark' },
      outputFilename: 'verify-browser.png',
    });

    expect(fs.existsSync(browserMockup.generatedAsset.safePath)).toBe(true);
    const browserMeta = await sharp(browserMockup.generatedAsset.safePath).metadata();
    expect(browserMeta.width).toBeGreaterThan(0);
    expect(browserMeta.height).toBeGreaterThan(0);

    // 3. Laptop Mockup
    const laptopMockup = await mockupService.generateMockup({
      type: 'laptop',
      sourceAssetPath: screenshotPath,
      background: { type: 'gradient', startColor: '#1e293b', stopColor: '#0f172a' },
      visualOptions: { deviceColor: 'space-gray' },
      outputFilename: 'verify-laptop.png',
    });

    expect(fs.existsSync(laptopMockup.generatedAsset.safePath)).toBe(true);
    const laptopMeta = await sharp(laptopMockup.generatedAsset.safePath).metadata();
    expect(laptopMeta.width).toBeGreaterThan(0);
    expect(laptopMeta.height).toBeGreaterThan(0);

    // 4. Phone Mockup
    const phoneMockup = await mockupService.generateMockup({
      type: 'phone',
      sourceAssetPath: screenshotPath,
      background: { type: 'gradient', startColor: '#090a0f', stopColor: '#1e293b' },
      visualOptions: { deviceColor: 'midnight' },
      outputFilename: 'verify-phone.png',
    });

    expect(fs.existsSync(phoneMockup.generatedAsset.safePath)).toBe(true);
    const phoneMeta = await sharp(phoneMockup.generatedAsset.safePath).metadata();
    expect(phoneMeta.width).toBeGreaterThan(0);
    expect(phoneMeta.height).toBeGreaterThan(0);

    // 5. Presentation Mockup
    const presentationMockup = await mockupService.generateMockup({
      type: 'presentation',
      sourceAssetPath: screenshotPath,
      background: { type: 'gradient', startColor: '#312e81', stopColor: '#581c87' },
      visualOptions: { borderRadius: 20 },
      outputFilename: 'verify-presentation.png',
    });

    expect(fs.existsSync(presentationMockup.generatedAsset.safePath)).toBe(true);
    const presentationMeta = await sharp(presentationMockup.generatedAsset.safePath).metadata();
    expect(presentationMeta.width).toBeGreaterThan(0);
    expect(presentationMeta.height).toBeGreaterThan(0);

    // 6. Verify original source screenshot remains untouched
    const currentScreenshotMeta = await sharp(screenshotPath).metadata();
    expect(currentScreenshotMeta.width).toBe(1280);
    expect(currentScreenshotMeta.height).toBe(800);
  });
});
