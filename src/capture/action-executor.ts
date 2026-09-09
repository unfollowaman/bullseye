import { Page } from 'playwright';
import {
  CaptureAction,
  ActionDiagnostic,
  ActionExecutionResult,
  ActionExecutorOptions,
  WaitAction,
  ScrollAction,
  SmoothScrollAction,
  MouseMoveAction,
  ClickAction,
  HoverAction,
  TypeTextAction,
  KeyPressAction,
  SetCursorVisibilityAction,
  MovementEasing,
} from './action-types';
import { validateActions } from './action-validator';

const DEFAULT_ACTION_TIMEOUT_MS = 15000;

export class ActionExecutor {
  async execute(
    page: Page,
    actions: CaptureAction[],
    options: ActionExecutorOptions = {}
  ): Promise<ActionExecutionResult> {
    const startTime = Date.now();
    const diagnostics: ActionDiagnostic[] = [];

    // Pre-execution validation check
    const validation = validateActions(actions);
    if (!validation.valid) {
      return {
        success: false,
        diagnostics: [],
        totalDurationMs: 0,
        error: `Action validation failed: ${validation.errors.join('; ')}`,
      };
    }

    if (!actions || actions.length === 0) {
      return {
        success: true,
        diagnostics: [],
        totalDurationMs: 0,
      };
    }

    let hasFailed = false;
    let globalError: string | undefined;

    const actionPacingMs = options.advancedRecordingOptions?.actionPacingMs || 0;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      // Check cancellation or prior failure prior to starting action
      const isCancelledNow = !!options.cancellationToken?.cancelled;
      if (isCancelledNow || hasFailed) {
        const nowIso = new Date().toISOString();
        diagnostics.push({
          index: i,
          actionType: action.type,
          action,
          status: isCancelledNow ? 'cancelled' : 'skipped',
          startTime: nowIso,
          completionTime: nowIso,
          durationMs: 0,
          error: isCancelledNow ? 'Execution cancelled' : 'Skipped due to previous action failure',
        });
        continue;
      }

      // Inter-action pacing delay if configured
      if (i > 0 && actionPacingMs > 0) {
        await this.executeWait({ type: 'wait', durationMs: actionPacingMs }, options.cancellationToken, page);
      }

      const actStartMs = Date.now();
      const actStartIso = new Date(actStartMs).toISOString();
      const timeoutMs = action.actionTimeoutMs ?? options.defaultTimeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS;

      try {
        await this.executeWithTimeout(
          page,
          action,
          options,
          timeoutMs
        );

        // Execute post-action pause if specified
        const postPause = action.postPauseMs ?? action.pauseMs;
        if (postPause && postPause > 0) {
          await this.executeWait({ type: 'wait', durationMs: postPause }, options.cancellationToken, page);
        }

        const actEndMs = Date.now();
        diagnostics.push({
          index: i,
          actionType: action.type,
          action,
          status: 'completed',
          startTime: actStartIso,
          completionTime: new Date(actEndMs).toISOString(),
          durationMs: actEndMs - actStartMs,
        });
      } catch (err: unknown) {
        const actEndMs = Date.now();
        const errorMessage = err instanceof Error ? err.message : 'Unknown action execution error';
        const isCancelled = options.cancellationToken?.cancelled || errorMessage.toLowerCase().includes('cancelled');

        diagnostics.push({
          index: i,
          actionType: action.type,
          action,
          status: isCancelled ? 'cancelled' : 'failed',
          startTime: actStartIso,
          completionTime: new Date(actEndMs).toISOString(),
          durationMs: actEndMs - actStartMs,
          error: errorMessage,
        });

        hasFailed = true;
        if (!globalError) {
          globalError = isCancelled ? `Action[${i}] (${action.type}) cancelled` : `Action[${i}] (${action.type}) failed: ${errorMessage}`;
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;
    return {
      success: !hasFailed,
      diagnostics,
      totalDurationMs,
      error: globalError,
    };
  }

  private async executeWithTimeout(
    page: Page,
    action: CaptureAction,
    options: ActionExecutorOptions,
    timeoutMs: number = DEFAULT_ACTION_TIMEOUT_MS
  ): Promise<void> {
    let timeoutId: NodeJS.Timeout | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Action '${action.type}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      await Promise.race([
        this.runSingleAction(page, action, options),
        timeoutPromise,
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async runSingleAction(
    page: Page,
    action: CaptureAction,
    options: ActionExecutorOptions
  ): Promise<void> {
    const cancellationToken = options.cancellationToken;
    if (cancellationToken?.cancelled) {
      throw new Error('Action execution cancelled');
    }

    switch (action.type) {
      case 'wait':
      case 'pause':
        await this.executeWait(action, cancellationToken, page);
        break;

      case 'scroll':
        await this.executeScroll(page, action, cancellationToken);
        break;

      case 'smooth_scroll':
      case 'smoothScroll':
        await this.executeSmoothScroll(page, action, cancellationToken);
        break;

      case 'mouse_move':
      case 'mouseMove':
        await this.executeMouseMove(page, action, cancellationToken);
        break;

      case 'click':
        await this.executeClick(page, action, cancellationToken);
        break;

      case 'hover':
        await this.executeHover(page, action, cancellationToken);
        break;

      case 'type_text':
      case 'typeText':
      case 'type':
        await this.executeTypeText(page, action, cancellationToken);
        break;

      case 'key_press':
      case 'keyPress':
      case 'keyboard_press':
        await this.executeKeyPress(page, action, cancellationToken);
        break;

      case 'set_cursor_visibility':
      case 'setCursorVisibility':
        await this.executeSetCursorVisibility(page, action, cancellationToken);
        break;

      default:
        throw new Error(`Unsupported action type: ${(action as { type: string }).type}`);
    }
  }

  // 1. Wait / Pause Action
  private async executeWait(
    action: WaitAction | { type: string; durationMs?: number; pauseMs?: number },
    cancellationToken?: { cancelled: boolean },
    page?: Page
  ): Promise<void> {
    const durationMs = action.durationMs ?? action.pauseMs ?? 1000;
    const sliceMs = 50;
    let elapsed = 0;

    while (elapsed < durationMs) {
      if (cancellationToken?.cancelled) {
        throw new Error('Action cancelled during wait');
      }
      const remaining = durationMs - elapsed;
      const currentWait = Math.min(sliceMs, remaining);
      if (page) {
        await page.waitForTimeout(currentWait);
      } else {
        await new Promise((res) => setTimeout(res, currentWait));
      }
      elapsed += currentWait;
    }
  }

  // 2. Scroll Action
  private async executeScroll(
    page: Page,
    action: ScrollAction,
    cancellationToken?: { cancelled: boolean }
  ): Promise<void> {
    const x = action.x || 0;
    const y = action.y;
    const durationMs = action.durationMs || 0;

    if (durationMs > 0 || action.smooth) {
      await this.executeSmoothScroll(
        page,
        { type: 'smooth_scroll', x, y, durationMs: durationMs || 800, easing: action.easing },
        cancellationToken
      );
    } else {
      if (cancellationToken?.cancelled) throw new Error('Action cancelled');
      await page.evaluate(
        ({ dx, dy }) => {
          window.scrollBy({ left: dx, top: dy, behavior: 'auto' });
        },
        { dx: x, dy: y }
      );
    }
  }

  // 3. Smooth Scroll Action
  private async executeSmoothScroll(
    page: Page,
    action: SmoothScrollAction | ScrollAction,
    cancellationToken?: { cancelled: boolean }
  ): Promise<void> {
    if (cancellationToken?.cancelled) throw new Error('Action cancelled');

    const x = action.x || 0;
    const y = action.y;
    const durationMs = action.durationMs || 1000;
    const easing = action.easing || 'ease-in-out';

    await page.evaluate(
      async ({ dx, dy, duration, easeName }) => {
        const startX = window.scrollX;
        const startY = window.scrollY;
        const targetX = startX + dx;
        const targetY = startY + dy;
        const startTime = performance.now();

        return new Promise<void>((resolve) => {
          function step(now: number) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            let ease = progress;
            if (easeName === 'ease-in-out') {
              ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            } else if (easeName === 'ease-in') {
              ease = progress * progress;
            } else if (easeName === 'ease-out') {
              ease = 1 - (1 - progress) * (1 - progress);
            }

            const currX = startX + (targetX - startX) * ease;
            const currY = startY + (targetY - startY) * ease;

            window.scrollTo(currX, currY);

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              resolve();
            }
          }
          requestAnimationFrame(step);
        });
      },
      { dx: x, dy: y, duration: durationMs, easeName: easing }
    );
  }

  // 4. Mouse Move Action
  private async executeMouseMove(
    page: Page,
    action: MouseMoveAction,
    cancellationToken?: { cancelled: boolean }
  ): Promise<void> {
    if (cancellationToken?.cancelled) throw new Error('Action cancelled');

    const { x, y, durationMs, easing } = action;
    const duration = durationMs || 0;

    // First trigger smooth movement in browser overlay if present
    const hasOverlay = await page.evaluate(() => !!window.__bullseyeOverlay);
    if (hasOverlay) {
      await page.evaluate(
        async ({ targetX, targetY, dur, ease }) => {
          if (window.__bullseyeOverlay) {
            await window.__bullseyeOverlay.moveCursorSmooth(
              targetX,
              targetY,
              dur,
              ease as MovementEasing
            );
          }
        },
        { targetX: x, targetY: y, dur: duration, ease: easing || 'ease-in-out' }
      );
    }

    // Also move Playwright actual mouse cursor to trigger website hover events
    const steps = duration > 0 ? Math.max(1, Math.floor(duration / 16)) : 1;
    await page.mouse.move(x, y, { steps });
  }

  // 5. Click Action
  private async executeClick(
    page: Page,
    action: ClickAction,
    cancellationToken?: { cancelled: boolean }
  ): Promise<void> {
    if (cancellationToken?.cancelled) throw new Error('Action cancelled');

    const button = action.button || 'left';
    const clickCount = action.clickCount || 1;
    let targetX: number | undefined = action.x;
    let targetY: number | undefined = action.y;

    if (action.selector) {
      // Find element center coordinates
      const box = await page.locator(action.selector).first().boundingBox().catch(() => null);
      if (box) {
        targetX = box.x + box.width / 2;
        targetY = box.y + box.height / 2;
      }
    }

    // Smooth move to target if durationMs set
    if (typeof targetX === 'number' && typeof targetY === 'number') {
      const moveDuration = action.durationMs || 0;
      await this.executeMouseMove(
        page,
        { type: 'mouse_move', x: targetX, y: targetY, durationMs: moveDuration, easing: 'ease-in-out' },
        cancellationToken
      );

      // Trigger click indicator on overlay
      if (action.showIndicator !== false) {
        await page.evaluate(
          ({ cx, cy, btn }) => {
            if (window.__bullseyeOverlay) {
              window.__bullseyeOverlay.showClickIndicator(cx, cy, btn);
            }
          },
          { cx: targetX, cy: targetY, btn: button }
        );
      }
    }

    if (action.selector) {
      await page.click(action.selector, {
        button,
        clickCount,
      });
    } else if (typeof targetX === 'number' && typeof targetY === 'number') {
      await page.mouse.click(targetX, targetY, {
        button,
        clickCount,
      });
    } else {
      throw new Error("Click action requires either 'selector' or 'x' and 'y' coordinates");
    }
  }

  // 6. Hover Action
  private async executeHover(
    page: Page,
    action: HoverAction,
    cancellationToken?: { cancelled: boolean }
  ): Promise<void> {
    if (cancellationToken?.cancelled) throw new Error('Action cancelled');

    let targetX: number | undefined = action.x;
    let targetY: number | undefined = action.y;

    if (action.selector) {
      const box = await page.locator(action.selector).first().boundingBox().catch(() => null);
      if (box) {
        targetX = box.x + box.width / 2;
        targetY = box.y + box.height / 2;
      }
    }

    if (typeof targetX === 'number' && typeof targetY === 'number') {
      await this.executeMouseMove(
        page,
        { type: 'mouse_move', x: targetX, y: targetY, durationMs: action.durationMs || 300, easing: 'ease-in-out' },
        cancellationToken
      );
    } else if (action.selector) {
      await page.hover(action.selector);
    } else {
      throw new Error("Hover action requires either 'selector' or 'x' and 'y' coordinates");
    }

    if (action.durationMs && action.durationMs > 0) {
      await this.executeWait({ type: 'wait', durationMs: action.durationMs }, cancellationToken, page);
    }
  }

  // 7. Type Text Action
  private async executeTypeText(
    page: Page,
    action: TypeTextAction,
    cancellationToken?: { cancelled: boolean }
  ): Promise<void> {
    if (cancellationToken?.cancelled) throw new Error('Action cancelled');

    if (action.selector) {
      await page.focus(action.selector);
      await page.click(action.selector);
    }

    const delay = action.delayMs || 0;
    await page.keyboard.type(action.text, { delay });
  }

  // 8. Keyboard Key Press Action
  private async executeKeyPress(
    page: Page,
    action: KeyPressAction,
    cancellationToken?: { cancelled: boolean }
  ): Promise<void> {
    if (cancellationToken?.cancelled) throw new Error('Action cancelled');

    let keyCombo = action.key;
    if (action.modifiers && action.modifiers.length > 0) {
      keyCombo = [...action.modifiers, action.key].join('+');
    }

    const delay = action.delayMs || 0;
    await page.keyboard.press(keyCombo, { delay });
  }

  // 9. Set Cursor Visibility Action
  private async executeSetCursorVisibility(
    page: Page,
    action: SetCursorVisibilityAction,
    cancellationToken?: { cancelled: boolean }
  ): Promise<void> {
    if (cancellationToken?.cancelled) throw new Error('Action cancelled');

    await page.evaluate((vis) => {
      if (window.__bullseyeOverlay) {
        window.__bullseyeOverlay.setCursorVisible(vis);
      }
    }, action.visible);
  }
}

export const actionExecutor = new ActionExecutor();
