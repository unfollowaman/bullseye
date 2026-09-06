import { Page } from 'playwright';

export interface StabilizationOptions {
  disableAnimations?: boolean;
  additionalWaitMs?: number;
  timeout?: number;
  fullPage?: boolean;
}

export class PageStabilizer {
  /**
   * Main page stabilization runner to ensure page readiness before capture.
   */
  static async stabilize(page: Page, options: StabilizationOptions = {}): Promise<void> {
    const timeout = options.timeout ?? 30000;
    const disableAnimations = options.disableAnimations ?? false;
    const additionalWaitMs = options.additionalWaitMs ?? 0;
    const fullPage = options.fullPage ?? false;

    // 1. Network Settling (attempt networkidle with fallback)
    try {
      await page.waitForLoadState('networkidle', {
        timeout: Math.min(timeout, 2500),
      });
    } catch {
      // Ignore networkidle timeout on pages with active long-polling or open streams
    }

    // 2. Wait for document.fonts.ready
    try {
      await page.evaluate(async () => {
        if ('fonts' in document && document.fonts && typeof document.fonts.ready === 'object') {
          await Promise.race([
            document.fonts.ready,
            new Promise((resolve) => setTimeout(resolve, 2000)),
          ]);
        }
      });
    } catch {
      // Ignore font loading wait errors
    }

    // 3. Auto-scroll for fullPage screenshots / lazy loaded content
    if (fullPage) {
      try {
        await page.evaluate(async () => {
          await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 400;
            const timer = setInterval(() => {
              const scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;

              if (totalHeight >= scrollHeight || totalHeight >= 15000) {
                clearInterval(timer);
                window.scrollTo(0, 0);
                resolve();
              }
            }, 50);

            // Safety limit 3s for scrolling
            setTimeout(() => {
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve();
            }, 3000);
          });
        });
      } catch {
        // Ignore scrolling errors
      }
    }

    // 4. Wait for existing and dynamic images to load
    try {
      await page.evaluate(async () => {
        const checkImages = () => {
          const images = Array.from(document.images);
          return Promise.all(
            images.map((img) => {
              if (img.complete) return Promise.resolve();
              return new Promise((res) => {
                const onDone = () => res(true);
                img.addEventListener('load', onDone, { once: true });
                img.addEventListener('error', onDone, { once: true });
                // 1.5s individual image timeout
                setTimeout(onDone, 1500);
              });
            })
          );
        };

        await Promise.race([
          checkImages(),
          new Promise((resolve) => setTimeout(resolve, 2500)),
        ]);
      });
    } catch {
      // Ignore image loading wait errors
    }

    // 5. Disable animations if requested
    if (disableAnimations) {
      try {
        await page.addStyleTag({
          content: `
            *, *::before, *::after {
              -webkit-transition: none !important;
              -moz-transition: none !important;
              -o-transition: none !important;
              transition: none !important;
              -webkit-animation: none !important;
              -moz-animation: none !important;
              -o-animation: none !important;
              animation: none !important;
              scroll-behavior: auto !important;
            }
          `,
        });

        await page.evaluate(() => {
          if ('getAnimations' in document && typeof document.getAnimations === 'function') {
            try {
              document.getAnimations().forEach((anim) => {
                try {
                  anim.finish();
                } catch {
                  anim.pause();
                }
              });
            } catch {
              // Ignore individual animation finish errors
            }
          }
        });
      } catch {
        // Ignore animation override failures
      }
    }

    // 6. Additional wait time
    if (additionalWaitMs > 0) {
      await page.waitForTimeout(additionalWaitMs);
    }
  }

  /**
   * Converts low-level Playwright/Chromium exceptions into user-friendly application errors.
   */
  static normalizeError(err: unknown, url: string = '', timeoutMs?: number): Error {
    if (err instanceof Error && !('_normalized' in err)) {
      const msg = err.message || '';
      const name = err.name || '';

      let cleanMsg = msg;

      if (msg.includes('net::ERR_NAME_NOT_RESOLVED')) {
        cleanMsg = `DNS lookup failed for host at ${url || 'target URL'}. Ensure domain is correct and accessible.`;
      } else if (msg.includes('net::ERR_CONNECTION_REFUSED')) {
        cleanMsg = `Connection refused when attempting to connect to ${url || 'target URL'}.`;
      } else if (msg.includes('net::ERR_TOO_MANY_REDIRECTS')) {
        cleanMsg = `Too many redirects encountered while attempting to load ${url || 'target URL'}.`;
      } else if (name === 'TimeoutError' || msg.includes('timeout') || msg.includes('Timeout')) {
        cleanMsg = `Navigation timeout of ${timeoutMs ?? 30000}ms exceeded while loading ${url || 'target URL'}.`;
      } else if (msg.includes('Target closed') || msg.includes('Target crashed') || msg.includes('Page crashed')) {
        cleanMsg = `Browser page or process crashed unexpectedly while rendering ${url || 'target URL'}.`;
      } else if (msg.includes('Cannot navigate to invalid URL')) {
        cleanMsg = `Invalid URL provided: ${url}. Must be a valid http:// or https:// URL.`;
      }

      const normalized = new Error(cleanMsg);
      Object.assign(normalized, { _normalized: true });
      return normalized;
    }

    if (err instanceof Error) {
      return err;
    }

    return new Error(typeof err === 'string' ? err : 'Unknown browser error');
  }
}
