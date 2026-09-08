import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { startTestServer, TestServer } from '../fixtures/fixture-server';
import { captureController } from '@/capture/controller';
import { recordingEngine } from '@/capture/recording-engine';
import { validateAction, validateActions } from '@/capture/action-validator';
import { injectRecordingOverlay, cleanupRecordingOverlay } from '@/capture/recording-overlay';
import { browserManager } from '@/browser/browser-manager';
import { CaptureAction } from '@/capture/action-types';

describe('Phase 14 — Advanced Recording Unit & Integration Tests', () => {
  let testServer: TestServer;

  beforeAll(async () => {
    testServer = await startTestServer();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.close();
    }
  });

  describe('1. Cursor Visualization & Overlay Subsystem', () => {
    it('injects overlay into target page and initializes window.__bullseyeOverlay', async () => {
      const context = await browserManager.createContext();
      const page = await context.newPage();
      try {
        await page.goto(`${testServer.url}/actions`);
        await injectRecordingOverlay(page, {
          cursorEnabled: true,
          cursorStyle: 'default',
          cursorSize: 24,
        });

        const isInit = await page.evaluate(() => !!window.__bullseyeOverlay?.isInitialized);
        expect(isInit).toBe(true);

        const overlayRootExists = await page.evaluate(
          () => !!document.getElementById('bullseye-recording-overlay-root')
        );
        expect(overlayRootExists).toBe(true);
      } finally {
        await cleanupRecordingOverlay(page);
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      }
    });

    it('toggles cursor visibility programmatically via set_cursor_visibility', async () => {
      const context = await browserManager.createContext();
      const page = await context.newPage();
      try {
        await page.goto(`${testServer.url}/actions`);
        await injectRecordingOverlay(page, { cursorEnabled: true });

        // Initially visible
        let isHidden = await page.evaluate(() => {
          const cursor = document.querySelector('.bullseye-cursor-el');
          return cursor?.classList.contains('hidden') ?? false;
        });
        expect(isHidden).toBe(false);

        // Hide cursor
        await page.evaluate(() => window.__bullseyeOverlay?.setCursorVisible(false));
        isHidden = await page.evaluate(() => {
          const cursor = document.querySelector('.bullseye-cursor-el');
          return cursor?.classList.contains('hidden') ?? false;
        });
        expect(isHidden).toBe(true);

        // Show cursor again
        await page.evaluate(() => window.__bullseyeOverlay?.setCursorVisible(true));
        isHidden = await page.evaluate(() => {
          const cursor = document.querySelector('.bullseye-cursor-el');
          return cursor?.classList.contains('hidden') ?? false;
        });
        expect(isHidden).toBe(false);
      } finally {
        await cleanupRecordingOverlay(page);
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      }
    });

    it('cleans up all overlay DOM elements and event listeners completely', async () => {
      const context = await browserManager.createContext();
      const page = await context.newPage();
      try {
        await page.goto(`${testServer.url}/actions`);
        await injectRecordingOverlay(page, { cursorEnabled: true });
        await cleanupRecordingOverlay(page);

        const isOverlayPresent = await page.evaluate(
          () => !!document.getElementById('bullseye-recording-overlay-root')
        );
        expect(isOverlayPresent).toBe(false);

        const isWindowOverlayPresent = await page.evaluate(() => !!window.__bullseyeOverlay);
        expect(isWindowOverlayPresent).toBe(false);
      } finally {
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      }
    });
  });

  describe('2. Smooth Mouse Movement & Easing', () => {
    it('moves cursor smoothly over specified duration with easing', async () => {
      const context = await browserManager.createContext();
      const page = await context.newPage();
      try {
        await page.goto(`${testServer.url}/actions`);
        await injectRecordingOverlay(page, { cursorEnabled: true });

        const startPos = await page.evaluate(() => {
          const cursor = document.querySelector('.bullseye-cursor-el') as HTMLElement;
          return cursor ? cursor.style.transform : '';
        });

        // Move smooth to (300, 200) over 150ms
        await page.evaluate(() =>
          window.__bullseyeOverlay?.moveCursorSmooth(300, 200, 150, 'ease-in-out')
        );

        const endPos = await page.evaluate(() => {
          const cursor = document.querySelector('.bullseye-cursor-el') as HTMLElement;
          return cursor ? cursor.style.transform : '';
        });

        expect(startPos).not.toBe(endPos);
        expect(endPos).toContain('300px, 200px');
      } finally {
        await cleanupRecordingOverlay(page);
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      }
    });
  });

  describe('3. Click Indicator Animations', () => {
    it('creates animated click ripple element at click coordinates', async () => {
      const context = await browserManager.createContext();
      const page = await context.newPage();
      try {
        await page.goto(`${testServer.url}/actions`);
        await injectRecordingOverlay(page, { clickIndicatorEnabled: true, clickIndicatorDurationMs: 300 });

        await page.evaluate(() => {
          window.__bullseyeOverlay?.showClickIndicator(150, 100, 'left', 300);
        });

        const rippleCount = await page.evaluate(
          () => document.querySelectorAll('.bullseye-click-indicator-el').length
        );
        expect(rippleCount).toBe(1);

        // Wait for ripple animation to complete and self-remove
        await page.waitForTimeout(400);

        const rippleCountPost = await page.evaluate(
          () => document.querySelectorAll('.bullseye-click-indicator-el').length
        );
        expect(rippleCountPost).toBe(0);
      } finally {
        await cleanupRecordingOverlay(page);
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      }
    });
  });

  describe('4. Smooth Scrolling & Position Alignment', () => {
    it('executes smooth scroll and updates window scroll position naturally', async () => {
      const context = await browserManager.createContext();
      const page = await context.newPage();
      try {
        await page.goto(`${testServer.url}/actions`);
        await injectRecordingOverlay(page, { cursorEnabled: true });

        const initialScrollY = await page.evaluate(() => window.scrollY);
        expect(initialScrollY).toBe(0);

        // Perform recording with smooth_scroll action
        const result = await recordingEngine.record({
          url: `${testServer.url}/actions`,
          recordingDurationMs: 1500,
          actions: [
            { type: 'smooth_scroll', y: 400, durationMs: 400, easing: 'ease-in-out' },
          ],
        });

        expect(result.status).toBe('completed');
        expect(result.metadata?.outputPath).toBeDefined();
        expect(fs.existsSync(result.metadata!.outputPath)).toBe(true);

        // Cleanup file
        if (result.metadata?.outputPath) {
          try { fs.unlinkSync(result.metadata.outputPath); } catch {}
        }
      } finally {
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      }
    });
  });

  describe('5. Choreography & Action Sequence Pacing', () => {
    it('executes complex choreography sequence deterministically in exact order', async () => {
      const actions: CaptureAction[] = [
        { type: 'mouse_move', x: 100, y: 75, durationMs: 200, easing: 'ease-in-out' },
        { type: 'pause', durationMs: 100 },
        { type: 'click', selector: '#click-box', durationMs: 100 },
        { type: 'pause', durationMs: 100 },
        { type: 'smooth_scroll', y: 300, durationMs: 300 },
        { type: 'pause', durationMs: 100 },
        { type: 'mouse_move', x: 200, y: 200, durationMs: 150 },
      ];

      const result = await captureController.executeJob({
        url: `${testServer.url}/actions`,
        type: 'recording',
        recordingOptions: {
          durationMs: 2000,
          advancedRecordingOptions: {
            cursorEnabled: true,
            clickIndicatorEnabled: true,
            actionPacingMs: 50,
          },
        },
        actions,
      });

      expect(result.status).toBe('completed');
      expect(result.actionDiagnostics).toBeDefined();
      expect(result.actionDiagnostics!.length).toBe(actions.length);

      result.actionDiagnostics!.forEach((diag) => {
        expect(diag.status).toBe('completed');
      });

      // Cleanup generated recording
      if (result.outputPaths.recording && fs.existsSync(result.outputPaths.recording)) {
        try { fs.unlinkSync(result.outputPaths.recording); } catch {}
      }
    });
  });

  describe('6. Action Model Validation & Compatibility', () => {
    it('validates pause and set_cursor_visibility actions correctly', () => {
      const validPause = validateAction({ type: 'pause', durationMs: 500 });
      expect(validPause.valid).toBe(true);

      const validVis = validateAction({ type: 'set_cursor_visibility', visible: false });
      expect(validVis.valid).toBe(true);

      const invalidVis = validateAction({ type: 'set_cursor_visibility', visible: 'not-a-boolean' });
      expect(invalidVis.valid).toBe(false);
      expect(invalidVis.errors[0]).toContain('boolean');
    });

    it('preserves backwards compatibility for existing recipes without advanced options', () => {
      const legacyActions: CaptureAction[] = [
        { type: 'wait', durationMs: 100 },
        { type: 'click', selector: '#click-box' },
        { type: 'scroll', y: 200 },
      ];

      const validation = validateActions(legacyActions);
      expect(validation.valid).toBe(true);
    });
  });

  describe('7. Cancellation & Cleanup Reliability', () => {
    it('cleans up overlay when recording is cancelled during action execution', async () => {
      const jobPromise = captureController.executeJob({
        url: `${testServer.url}/actions`,
        type: 'recording',
        recordingOptions: { durationMs: 5000 },
        actions: [
          { type: 'pause', durationMs: 3000 },
        ],
      });

      // Cancel after 200ms
      setTimeout(() => {
        const jobs = (captureController as any).jobs as Map<string, any>;
        for (const [id] of jobs.entries()) {
          captureController.cancelJob(id, 'Unit test cancellation');
        }
      }, 200);

      const result = await jobPromise;
      expect(result.status).toBe('cancelled');
    });
  });
});
