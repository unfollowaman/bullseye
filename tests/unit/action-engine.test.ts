import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, TestServer } from '../fixtures/fixture-server';
import { validateActions } from '@/capture/action-validator';
import { actionExecutor } from '@/capture/action-executor';
import { captureController } from '@/capture/controller';
import { browserManager } from '@/browser/browser-manager';
import { CaptureAction } from '@/capture/action-types';

describe('Phase 7 — Action Engine Unit & Integration Tests', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('1. Pre-execution Action Validation', () => {
    it('validates valid action configurations successfully', () => {
      const validActions: CaptureAction[] = [
        { type: 'wait', durationMs: 100 },
        { type: 'scroll', y: 300, x: 0 },
        { type: 'smooth_scroll', y: 500, durationMs: 200 },
        { type: 'mouse_move', x: 100, y: 100 },
        { type: 'click', x: 100, y: 100 },
        { type: 'click', selector: '#click-box' },
        { type: 'hover', x: 100, y: 150 },
        { type: 'type_text', text: 'Hello', selector: '#text-input' },
        { type: 'key_press', key: 'Enter', modifiers: ['Control'] },
      ];

      const res = validateActions(validActions);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('rejects invalid action types', () => {
      const invalid = [{ type: 'invalid_type' }];
      const res = validateActions(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('unsupported type');
    });

    it('rejects wait action with negative or excessive duration', () => {
      const negative = [{ type: 'wait', durationMs: -100 }];
      expect(validateActions(negative).valid).toBe(false);

      const excessive = [{ type: 'wait', durationMs: 9999999 }];
      expect(validateActions(excessive).valid).toBe(false);
    });

    it('rejects mouse move with negative coordinates', () => {
      const invalid = [{ type: 'mouse_move', x: -10, y: 100 }];
      const res = validateActions(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('non-negative');
    });

    it('rejects click action missing both coordinates and selector', () => {
      const invalid = [{ type: 'click' }];
      const res = validateActions(invalid);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('requires either');
    });

    it('rejects type_text action with missing or non-string text', () => {
      const invalid = [{ type: 'type_text', text: 123 as unknown as string }];
      const res = validateActions(invalid);
      expect(res.valid).toBe(false);
    });

    it('rejects key_press action with empty key string', () => {
      const invalid = [{ type: 'key_press', key: '  ' }];
      const res = validateActions(invalid);
      expect(res.valid).toBe(false);
    });
  });

  describe('2. Direct Playwright Page Action Execution & State Verification', () => {
    it('executes wait action with verified duration', async () => {
      const context = await browserManager.createContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      await page.goto(`${server.url}/actions`);

      const start = Date.now();
      const res = await actionExecutor.execute(page, [
        { type: 'wait', durationMs: 200 },
      ]);
      const elapsed = Date.now() - start;

      expect(res.success).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(180);
      expect(res.diagnostics).toHaveLength(1);
      expect(res.diagnostics[0].status).toBe('completed');

      await context.close();
    });

    it('executes click action and verifies actual DOM state change', async () => {
      const context = await browserManager.createContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      await page.goto(`${server.url}/actions`);

      // Initial state verify
      let text = await page.textContent('#click-output');
      expect(text).toContain('Not Clicked');

      // Click via selector
      const res = await actionExecutor.execute(page, [
        { type: 'click', selector: '#click-box' },
      ]);

      expect(res.success).toBe(true);
      text = await page.textContent('#click-output');
      expect(text).toContain('Button Clicked 1');

      // Click via coordinates
      const res2 = await actionExecutor.execute(page, [
        { type: 'click', x: 100, y: 75 },
      ]);

      expect(res2.success).toBe(true);
      text = await page.textContent('#click-output');
      expect(text).toContain('Button Clicked 2');

      await context.close();
    });

    it('executes hover action and verifies hover state change', async () => {
      const context = await browserManager.createContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      await page.goto(`${server.url}/actions`);

      const res = await actionExecutor.execute(page, [
        { type: 'hover', selector: '#hover-box', durationMs: 100 },
      ]);

      expect(res.success).toBe(true);
      const text = await page.textContent('#hover-output');
      expect(text).toBe('Hovered!');

      await context.close();
    });

    it('executes mouse move and verifies mouse position tracking', async () => {
      const context = await browserManager.createContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      await page.goto(`${server.url}/actions`);

      const res = await actionExecutor.execute(page, [
        { type: 'mouse_move', x: 120, y: 270, durationMs: 100 },
      ]);

      expect(res.success).toBe(true);
      const posX = await page.textContent('#mouse-x');
      const posY = await page.textContent('#mouse-y');
      expect(Number(posX)).toBe(120);
      expect(Number(posY)).toBe(270);

      await context.close();
    });

    it('executes text input and verifies typed value in DOM', async () => {
      const context = await browserManager.createContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      await page.goto(`${server.url}/actions`);

      const res = await actionExecutor.execute(page, [
        { type: 'type_text', selector: '#text-input', text: 'Bullseye Test', delayMs: 10 },
      ]);

      expect(res.success).toBe(true);
      const val = await page.inputValue('#text-input');
      expect(val).toBe('Bullseye Test');

      const textOut = await page.textContent('#text-output');
      expect(textOut).toBe('Bullseye Test');

      await context.close();
    });

    it('executes keyboard key press with modifiers and verifies listener output', async () => {
      const context = await browserManager.createContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      await page.goto(`${server.url}/actions`);

      await page.focus('#key-input');

      const res = await actionExecutor.execute(page, [
        { type: 'key_press', key: 'Enter' },
        { type: 'key_press', key: 'a', modifiers: ['Control', 'Shift'] },
      ]);

      expect(res.success).toBe(true);
      const lastKey = await page.textContent('#key-output');
      const modifiers = await page.textContent('#key-modifiers');

      expect(lastKey?.toLowerCase()).toBe('a');
      expect(modifiers).toContain('Control');
      expect(modifiers).toContain('Shift');

      await context.close();
    });

    it('executes scroll and smooth scroll and verifies scroll position in DOM', async () => {
      const context = await browserManager.createContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      await page.goto(`${server.url}/actions`);

      // 1. Instant Scroll
      const res1 = await actionExecutor.execute(page, [
        { type: 'scroll', y: 400 },
      ]);

      expect(res1.success).toBe(true);
      let scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBe(400);

      // 2. Smooth Scroll
      const res2 = await actionExecutor.execute(page, [
        { type: 'smooth_scroll', y: 300, durationMs: 200 },
      ]);

      expect(res2.success).toBe(true);
      scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBe(700);

      await context.close();
    });
  });

  describe('3. Sequential Ordering, Cancellation, Timeout & Diagnostics', () => {
    it('executes complex sequence in deterministic order recording accurate diagnostics', async () => {
      const context = await browserManager.createContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      await page.goto(`${server.url}/actions`);

      const actions: CaptureAction[] = [
        { type: 'click', selector: '#click-box' },
        { type: 'hover', selector: '#hover-box' },
        { type: 'type_text', selector: '#text-input', text: 'Sequence Test' },
        { type: 'scroll', y: 250 },
        { type: 'wait', durationMs: 100 },
      ];

      const res = await actionExecutor.execute(page, actions);

      expect(res.success).toBe(true);
      expect(res.diagnostics).toHaveLength(5);

      expect(res.diagnostics[0].actionType).toBe('click');
      expect(res.diagnostics[0].status).toBe('completed');

      expect(res.diagnostics[1].actionType).toBe('hover');
      expect(res.diagnostics[1].status).toBe('completed');

      expect(res.diagnostics[2].actionType).toBe('type_text');
      expect(res.diagnostics[2].status).toBe('completed');

      expect(res.diagnostics[3].actionType).toBe('scroll');
      expect(res.diagnostics[3].status).toBe('completed');

      expect(res.diagnostics[4].actionType).toBe('wait');
      expect(res.diagnostics[4].status).toBe('completed');

      await context.close();
    });

    it('handles cancellation mid-sequence cleanly', async () => {
      const context = await browserManager.createContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      await page.goto(`${server.url}/actions`);

      const cancellationToken = { cancelled: false };

      const actions: CaptureAction[] = [
        { type: 'click', selector: '#click-box' },
        { type: 'wait', durationMs: 1000 },
        { type: 'scroll', y: 500 },
      ];

      // Trigger cancellation after 150ms during the wait
      setTimeout(() => {
        cancellationToken.cancelled = true;
      }, 150);

      const res = await actionExecutor.execute(page, actions, { cancellationToken });

      expect(res.success).toBe(false);
      expect(res.diagnostics[0].status).toBe('completed');
      expect(res.diagnostics[1].status).toBe('cancelled');
      expect(res.diagnostics[2].status).toBe('cancelled');

      await context.close();
    });

    it('handles action timeouts gracefully', async () => {
      const context = await browserManager.createContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();
      await page.goto(`${server.url}/actions`);

      const actions: CaptureAction[] = [
        { type: 'click', selector: '#non-existent-element', actionTimeoutMs: 500 },
        { type: 'scroll', y: 100 },
      ];

      const res = await actionExecutor.execute(page, actions);

      expect(res.success).toBe(false);
      expect(res.diagnostics[0].status).toBe('failed');
      expect(res.diagnostics[0].error).toContain('timed out after 500ms');
      expect(res.diagnostics[1].status).toBe('skipped');

      await context.close();
    });
  });

  describe('4. CaptureController Integration with Actions', () => {
    it('executes screenshot capture with actions and includes diagnostics', async () => {
      const job = await captureController.executeJob({
        url: `${server.url}/actions`,
        captureType: 'screenshot',
        actions: [
          { type: 'click', selector: '#click-box' },
          { type: 'type_text', selector: '#text-input', text: 'Capture Test' },
        ],
      });

      expect(job.status).toBe('completed');
      expect(job.outputPaths.screenshot).toBeDefined();
      expect(job.actionDiagnostics).toBeDefined();
      expect(job.actionDiagnostics).toHaveLength(2);
      expect(job.actionDiagnostics?.[0].status).toBe('completed');
      expect(job.actionDiagnostics?.[1].status).toBe('completed');
    });

    it('executes recording capture with actions and produces valid WebM', async () => {
      const job = await captureController.executeJob({
        url: `${server.url}/actions`,
        captureType: 'recording',
        recordingDurationMs: 1500,
        actions: [
          { type: 'mouse_move', x: 100, y: 100, durationMs: 200 },
          { type: 'click', x: 100, y: 100 },
          { type: 'smooth_scroll', y: 300, durationMs: 300 },
        ],
      });

      expect(job.status).toBe('completed');
      expect(job.outputPaths.recording).toBeDefined();
      expect(job.actionDiagnostics).toHaveLength(3);
    });

    it('executes combined (both) capture with actions', async () => {
      const job = await captureController.executeJob({
        url: `${server.url}/actions`,
        captureType: 'both',
        recordingDurationMs: 1000,
        actions: [
          { type: 'type_text', selector: '#text-input', text: 'Both Capture' },
          { type: 'key_press', key: 'Enter' },
        ],
      });

      expect(job.status).toBe('completed');
      expect(job.outputPaths.screenshot).toBeDefined();
      expect(job.outputPaths.recording).toBeDefined();
      expect(job.actionDiagnostics).toHaveLength(2);
    });

    it('preserves existing capture behavior with 0 actions (empty array or undefined)', async () => {
      const jobNoActions = await captureController.executeJob({
        url: `${server.url}/actions`,
        captureType: 'screenshot',
      });

      expect(jobNoActions.status).toBe('completed');
      expect(jobNoActions.outputPaths.screenshot).toBeDefined();
      expect(jobNoActions.actionDiagnostics).toBeUndefined();
    });
  });
});
