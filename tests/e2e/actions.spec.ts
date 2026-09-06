import { test, expect } from '@playwright/test';
import { startTestServer, TestServer } from '../fixtures/fixture-server';

test.describe('Phase 7 — Action Engine E2E Tests', () => {
  let server: TestServer;

  test.beforeAll(async () => {
    server = await startTestServer();
  });

  test.afterAll(async () => {
    if (server) {
      await server.close();
    }
  });

  test('1. POST /api/capture performs actions before taking screenshot', async ({ request }) => {
    const response = await request.post('/api/capture', {
      data: {
        url: `${server.url}/actions`,
        captureType: 'screenshot',
        actions: [
          { type: 'click', selector: '#click-box' },
          { type: 'type_text', selector: '#text-input', text: 'E2E Action Test' },
          { type: 'scroll', y: 300 },
        ],
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.status).toBe('completed');
    expect(body.outputPaths.screenshot).toBeDefined();
    expect(body.actionDiagnostics).toHaveLength(3);
    expect(body.actionDiagnostics[0].actionType).toBe('click');
    expect(body.actionDiagnostics[0].status).toBe('completed');
    expect(body.actionDiagnostics[1].actionType).toBe('type_text');
    expect(body.actionDiagnostics[1].status).toBe('completed');
    expect(body.actionDiagnostics[2].actionType).toBe('scroll');
    expect(body.actionDiagnostics[2].status).toBe('completed');
  });

  test('2. POST /api/capture performs actions during screen recording and returns WebM', async ({ request }) => {
    const response = await request.post('/api/capture', {
      data: {
        url: `${server.url}/actions`,
        captureType: 'recording',
        recordingDurationMs: 1500,
        actions: [
          { type: 'mouse_move', x: 100, y: 150, durationMs: 200 },
          { type: 'hover', selector: '#hover-box', durationMs: 200 },
          { type: 'key_press', key: 'Enter' },
        ],
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.status).toBe('completed');
    expect(body.outputPaths.recording).toMatch(/recording-.*\.webm/);
    expect(body.actionDiagnostics).toHaveLength(3);
    expect(body.actionDiagnostics[0].actionType).toBe('mouse_move');
    expect(body.actionDiagnostics[1].actionType).toBe('hover');
    expect(body.actionDiagnostics[2].actionType).toBe('key_press');
  });

  test('3. POST /api/capture executes actions for combined ("both") capture', async ({ request }) => {
    const response = await request.post('/api/capture', {
      data: {
        url: `${server.url}/actions`,
        captureType: 'both',
        recordingDurationMs: 1000,
        actions: [
          { type: 'smooth_scroll', y: 400, durationMs: 300 },
          { type: 'wait', durationMs: 100 },
        ],
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.status).toBe('completed');
    expect(body.outputPaths.screenshot).toMatch(/screenshot-.*\.png/);
    expect(body.outputPaths.recording).toMatch(/recording-.*\.webm/);
    expect(body.actionDiagnostics).toHaveLength(2);
  });

  test('4. POST /api/capture rejects invalid actions with 400 Bad Request', async ({ request }) => {
    const response = await request.post('/api/capture', {
      data: {
        url: `${server.url}/actions`,
        captureType: 'screenshot',
        actions: [
          { type: 'wait', durationMs: -500 }, // Invalid negative duration
        ],
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('cannot be negative');
  });
});
