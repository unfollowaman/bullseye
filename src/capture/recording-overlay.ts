import { Page } from 'playwright';
import { AdvancedRecordingConfig, MovementEasing } from './action-types';

export interface OverlayOptions extends AdvancedRecordingConfig {
  hoverIndicatorEnabled?: boolean;
}

export const DEFAULT_OVERLAY_OPTIONS: OverlayOptions = {
  cursorEnabled: true,
  cursorSize: 24,
  cursorStyle: 'default',
  cursorSmoothing: true,
  clickIndicatorEnabled: true,
  clickIndicatorSize: 40,
  clickIndicatorDurationMs: 500,
  clickIndicatorColor: '#3b82f6',
  hoverIndicatorEnabled: true,
};

declare global {
  interface Window {
    __bullseyeOverlay?: {
      moveCursor: (x: number, y: number) => void;
      moveCursorSmooth: (x: number, y: number, durationMs?: number, easing?: MovementEasing) => Promise<void>;
      showClickIndicator: (x: number, y: number, button?: string, durationMs?: number) => void;
      setCursorVisible: (visible: boolean) => void;
      setHovering: (hovering: boolean) => void;
      cleanup: () => void;
      isInitialized: boolean;
    };
  }
}

/**
 * Injects Bullseye's isolated browser-side recording overlay into the target Playwright Page.
 * Renders SVG cursor, animated click indicators, and hover effects without modifying website layout.
 */
export async function injectRecordingOverlay(
  page: Page,
  options: OverlayOptions = {}
): Promise<void> {
  const mergedOptions = { ...DEFAULT_OVERLAY_OPTIONS, ...options };

  // Skip injection if explicitly disabled
  if (mergedOptions.cursorEnabled === false && mergedOptions.clickIndicatorEnabled === false) {
    return;
  }

  await page.evaluate((opts) => {
    // Prevent duplicate injection
    if (window.__bullseyeOverlay && window.__bullseyeOverlay.isInitialized) {
      return;
    }

    const OVERLAY_ROOT_ID = 'bullseye-recording-overlay-root';
    const STYLE_ID = 'bullseye-recording-overlay-style';

    // Remove existing if any orphaned nodes exist
    const existingRoot = document.getElementById(OVERLAY_ROOT_ID);
    if (existingRoot) existingRoot.remove();
    const existingStyle = document.getElementById(STYLE_ID);
    if (existingStyle) existingStyle.remove();

    // 1. Inject Overlay CSS
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      #${OVERLAY_ROOT_ID} {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      }

      .bullseye-cursor-el {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: ${opts.cursorSize || 24}px !important;
        height: ${opts.cursorSize || 24}px !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
        transform: translate3d(-100px, -100px, 0);
        will-change: transform;
        transition: opacity 0.15s ease;
        filter: drop-shadow(0px 2px 5px rgba(0,0,0,0.35));
      }

      .bullseye-cursor-el.hidden {
        opacity: 0 !important;
      }

      .bullseye-click-indicator-el {
        position: absolute !important;
        width: ${opts.clickIndicatorSize || 40}px !important;
        height: ${opts.clickIndicatorSize || 40}px !important;
        margin-left: -${(opts.clickIndicatorSize || 40) / 2}px !important;
        margin-top: -${(opts.clickIndicatorSize || 40) / 2}px !important;
        border-radius: 50% !important;
        pointer-events: none !important;
        z-index: 2147483646 !important;
        box-sizing: border-box !important;
        animation: bullseye-ripple-anim ${opts.clickIndicatorDurationMs || 500}ms cubic-bezier(0.1, 0.8, 0.3, 1) forwards !important;
      }

      @keyframes bullseye-ripple-anim {
        0% {
          transform: scale(0.2);
          opacity: 0.9;
          border: 3px solid ${opts.clickIndicatorColor || '#3b82f6'};
          background: rgba(59, 130, 246, 0.25);
        }
        50% {
          opacity: 0.7;
          border: 2px solid ${opts.clickIndicatorColor || '#3b82f6'};
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
          border: 1px solid ${opts.clickIndicatorColor || '#3b82f6'};
          background: transparent;
        }
      }

      .bullseye-click-indicator-el.right-click {
        animation-name: bullseye-ripple-right !important;
      }

      @keyframes bullseye-ripple-right {
        0% {
          transform: scale(0.2);
          opacity: 0.9;
          border: 3px solid #f59e0b;
          background: rgba(245, 158, 11, 0.25);
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
          border: 1px solid #f59e0b;
          background: transparent;
        }
      }
    `;
    (document.head || document.documentElement).appendChild(styleEl);

    // 2. Create Overlay Container
    const rootEl = document.createElement('div');
    rootEl.id = OVERLAY_ROOT_ID;
    (document.body || document.documentElement).appendChild(rootEl);

    // 3. Create SVG Cursor Element
    const cursorEl = document.createElement('div');
    cursorEl.className = 'bullseye-cursor-el';

    let cursorSvgHtml = '';
    const size = opts.cursorSize || 24;

    if (opts.cursorStyle === 'dot') {
      cursorSvgHtml = `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="#2563eb" stroke="#ffffff" stroke-width="2"/>
        </svg>
      `;
    } else if (opts.cursorStyle === 'brand') {
      cursorSvgHtml = `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      `;
    } else {
      // Default sleek arrow pointer
      cursorSvgHtml = `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" fill="#2563eb" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
      `;
    }

    cursorEl.innerHTML = cursorSvgHtml;
    rootEl.appendChild(cursorEl);

    // Internal Cursor State
    let currentX = -100;
    let currentY = -100;
    let isCursorVisible = opts.cursorEnabled !== false;
    let activeAnimFrame: number | null = null;

    if (!isCursorVisible) {
      cursorEl.classList.add('hidden');
    }

    function setCursorPos(x: number, y: number) {
      currentX = x;
      currentY = y;
      cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    // Interactive Hover Detector
    function checkHoverState(x: number, y: number) {
      if (!opts.hoverIndicatorEnabled) return;
      try {
        const el = document.elementFromPoint(x, y);
        if (!el) return;
        const tagName = el.tagName.toLowerCase();
        const isInteractive =
          tagName === 'a' ||
          tagName === 'button' ||
          tagName === 'input' ||
          tagName === 'select' ||
          tagName === 'textarea' ||
          el.getAttribute('role') === 'button' ||
          window.getComputedStyle(el).cursor === 'pointer';

        if (isInteractive) {
          cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.15)`;
        } else {
          cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.0)`;
        }
      } catch {}
    }

    // 4. Global Browser Event Listeners
    function onMouseMove(e: MouseEvent) {
      if (!isCursorVisible) return;
      setCursorPos(e.clientX, e.clientY);
      checkHoverState(e.clientX, e.clientY);
    }

    function onMouseDown(e: MouseEvent) {
      if (!opts.clickIndicatorEnabled) return;
      const btn = e.button === 2 ? 'right' : 'left';
      window.__bullseyeOverlay?.showClickIndicator(e.clientX, e.clientY, btn);
    }

    window.addEventListener('mousemove', onMouseMove, { capture: true, passive: true });
    window.addEventListener('mousedown', onMouseDown, { capture: true, passive: true });

    // 5. Expose Control Interface on Window
    window.__bullseyeOverlay = {
      isInitialized: true,

      moveCursor(x: number, y: number) {
        if (activeAnimFrame) {
          cancelAnimationFrame(activeAnimFrame);
          activeAnimFrame = null;
        }
        setCursorPos(x, y);
        checkHoverState(x, y);
      },

      moveCursorSmooth(x: number, y: number, durationMs = 300, easing: MovementEasing = 'ease-in-out') {
        return new Promise<void>((resolve) => {
          if (activeAnimFrame) {
            cancelAnimationFrame(activeAnimFrame);
            activeAnimFrame = null;
          }

          const startX = currentX < 0 ? x : currentX;
          const startY = currentY < 0 ? y : currentY;
          const targetX = x;
          const targetY = y;
          const startTime = performance.now();

          function animate(now: number) {
            const elapsed = now - startTime;
            const progress = Math.min(1, Math.max(0, elapsed / durationMs));

            // Easing functions
            let ease = progress;
            if (easing === 'ease-in-out') {
              ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            } else if (easing === 'ease-in') {
              ease = progress * progress;
            } else if (easing === 'ease-out') {
              ease = 1 - (1 - progress) * (1 - progress);
            }

            const currX = startX + (targetX - startX) * ease;
            const currY = startY + (targetY - startY) * ease;

            setCursorPos(currX, currY);
            if (progress >= 0.5) {
              checkHoverState(currX, currY);
            }

            if (progress < 1) {
              activeAnimFrame = requestAnimationFrame(animate);
            } else {
              activeAnimFrame = null;
              checkHoverState(targetX, targetY);
              resolve();
            }
          }

          if (durationMs <= 0) {
            setCursorPos(targetX, targetY);
            checkHoverState(targetX, targetY);
            resolve();
          } else {
            activeAnimFrame = requestAnimationFrame(animate);
          }
        });
      },

      showClickIndicator(x: number, y: number, button = 'left', durationMs) {
        if (!opts.clickIndicatorEnabled) return;
        const clickEl = document.createElement('div');
        clickEl.className = `bullseye-click-indicator-el ${button === 'right' ? 'right-click' : ''}`;
        clickEl.style.left = `${x}px`;
        clickEl.style.top = `${y}px`;

        if (durationMs && durationMs > 0) {
          clickEl.style.animationDuration = `${durationMs}ms`;
        }

        rootEl.appendChild(clickEl);

        const animTimeout = durationMs || opts.clickIndicatorDurationMs || 500;
        setTimeout(() => {
          if (clickEl.parentNode) {
            clickEl.parentNode.removeChild(clickEl);
          }
        }, animTimeout + 50);
      },

      setCursorVisible(visible: boolean) {
        isCursorVisible = visible;
        if (visible) {
          cursorEl.classList.remove('hidden');
        } else {
          cursorEl.classList.add('hidden');
        }
      },

      setHovering(hovering: boolean) {
        if (hovering) {
          cursorEl.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(1.15)`;
        } else {
          cursorEl.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(1.0)`;
        }
      },

      cleanup() {
        window.removeEventListener('mousemove', onMouseMove, { capture: true });
        window.removeEventListener('mousedown', onMouseDown, { capture: true });
        if (activeAnimFrame) {
          cancelAnimationFrame(activeAnimFrame);
          activeAnimFrame = null;
        }
        if (rootEl.parentNode) rootEl.parentNode.removeChild(rootEl);
        if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
        delete window.__bullseyeOverlay;
      },
    };
  }, mergedOptions);
}

/**
 * Safely removes the Bullseye recording overlay from the page.
 */
export async function cleanupRecordingOverlay(page: Page | null): Promise<void> {
  if (!page) return;
  try {
    await page.evaluate(() => {
      if (window.__bullseyeOverlay && typeof window.__bullseyeOverlay.cleanup === 'function') {
        window.__bullseyeOverlay.cleanup();
      }
      const OVERLAY_ROOT_ID = 'bullseye-recording-overlay-root';
      const STYLE_ID = 'bullseye-recording-overlay-style';
      const root = document.getElementById(OVERLAY_ROOT_ID);
      if (root) root.remove();
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
    });
  } catch {
    // Ignore cleanup errors if page/context is already closed
  }
}
