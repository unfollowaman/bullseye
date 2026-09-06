import { chromium, Browser, BrowserContext } from 'playwright';

export interface BrowserManagerOptions {
  headless?: boolean;
}

export class BrowserManager {
  private browser: Browser | null = null;

  async getBrowser(options: BrowserManagerOptions = {}): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    const headless = options.headless ?? process.env.HEADLESS !== 'false';
    this.browser = await chromium.launch({
      headless,
    });

    return this.browser;
  }

  async createContext(options: BrowserManagerOptions = {}): Promise<BrowserContext> {
    const browser = await this.getBrowser(options);
    return browser.newContext();
  }

  async isHealthy(): Promise<boolean> {
    try {
      const browser = await this.getBrowser();
      const isConnected = browser.isConnected();
      return isConnected;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const browserManager = new BrowserManager();
