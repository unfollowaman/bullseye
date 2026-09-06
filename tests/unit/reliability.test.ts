import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { startTestServer, TestServer } from '../fixtures/fixture-server';
import { screenshotEngine } from '@/capture/screenshot-engine';
import { recordingEngine } from '@/capture/recording-engine';
import { captureController } from '@/capture/controller';
import { browserManager } from '@/browser/browser-manager';
import { validateWebM } from '@/utils';

describe('Phase 6: Comprehensive Reliability & Stress Tests', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
    await browserManager.close();
  });

  describe('Page Readiness & Edge Case Fixtures', () => {
    it('handles slow loading pages within timeout', async () => {
      const result = await screenshotEngine.capture({
        url: `${server.url}/slow`,
        timeout: 2000,
      });

      expect(result.status).toBe('failed');
      expect(result.error).toContain('timeout');
    });

    it('handles pages with delayed images and waits appropriately', async () => {
      const result = await screenshotEngine.capture({
        url: `${server.url}/delayed-images`,
        additionalWaitMs: 1600,
      });

      expect(result.status).toBe('completed');
      expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);
    });

    it('handles pages with delayed fonts', async () => {
      const result = await screenshotEngine.capture({
        url: `${server.url}/delayed-fonts`,
      });

      expect(result.status).toBe('completed');
      expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);
    });

    it('handles lazy-loaded content in fullPage screenshot mode', async () => {
      const result = await screenshotEngine.capture({
        url: `${server.url}/lazy-loaded`,
        mode: 'fullPage',
      });

      expect(result.status).toBe('completed');
      expect(result.metadata?.mode).toBe('fullPage');
      expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);
    });

    it('handles animated elements with animation disabling', async () => {
      const result = await screenshotEngine.capture({
        url: `${server.url}/animated`,
        disableAnimations: true,
      });

      expect(result.status).toBe('completed');
      expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);
    });

    it('handles dynamic DOM SPA-style client updates', async () => {
      const result = await screenshotEngine.capture({
        url: `${server.url}/dynamic-dom`,
        additionalWaitMs: 1300,
      });

      expect(result.status).toBe('completed');
      expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);
    });

    it('handles SPA route changes', async () => {
      const result = await screenshotEngine.capture({
        url: `${server.url}/spa`,
        additionalWaitMs: 1000,
      });

      expect(result.status).toBe('completed');
      expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);
    });

    it('handles 500 server error responses gracefully', async () => {
      const result = await screenshotEngine.capture({
        url: `${server.url}/failing-500`,
      });

      // HTTP 500 page still renders the body; capture completes successfully
      expect(result.status).toBe('completed');
      expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);
    });

    it('handles hanging network requests with navigation timeout', async () => {
      const result = await screenshotEngine.capture({
        url: `${server.url}/hanging-request`,
        timeout: 2000,
      });

      expect(result.status).toBe('failed');
      expect(result.error).toContain('timeout');
    });

    it('handles very long pages in fullPage mode', async () => {
      const result = await screenshotEngine.capture({
        url: `${server.url}/very-long-page`,
        mode: 'fullPage',
      });

      expect(result.status).toBe('completed');
      expect(result.metadata?.mode).toBe('fullPage');
      expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);
    });
  });

  describe('Recording Engine Reliability', () => {
    it('records continuous animations correctly and produces valid WebM', async () => {
      const result = await recordingEngine.record({
        url: `${server.url}/animated`,
        recordingDurationMs: 2000,
      });

      expect(result.status).toBe('completed');
      expect(result.metadata?.format).toBe('webm');

      const validation = validateWebM(result.metadata!.outputPath);
      expect(validation.valid).toBe(true);
    });

    it('handles recording timeouts on slow/hanging pages', async () => {
      const result = await recordingEngine.record({
        url: `${server.url}/slow`,
        timeout: 2000,
      });

      expect(result.status).toBe('failed');
      expect(result.error).toContain('timeout');
    });
  });

  describe('Path Traversal & Security Validation', () => {
    it('prevents path traversal outside designated output directory', async () => {
      const result = await screenshotEngine.capture({
        url: server.url,
        outputDir: '/etc',
        filename: 'malicious.png',
      });

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Security Violation');
    });

    it('sanitizes unsafe filename path traversal characters', async () => {
      const result = await screenshotEngine.capture({
        url: server.url,
        filename: '../../../tmp/hack.png',
      });

      expect(result.status).toBe('completed');
      // Filename should be stripped to hack.png inside default captures dir
      expect(path.basename(result.metadata!.outputPath)).toBe('hack.png');
      expect(result.metadata!.outputPath).toContain(path.join('public', 'captures'));
    });
  });

  describe('Process Cleanup & Stress Test', () => {
    it('runs repeated captures without leaking processes or memory', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await captureController.executeJob({
          url: server.url,
          captureType: 'screenshot',
        });
        expect(result.status).toBe('completed');
      }

      const isHealthy = await browserManager.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });
});
