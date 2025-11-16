/**
 * Browser Instance Manager
 *
 * Manages Playwright browser lifecycle with singleton pattern.
 * Handles browser launch, page creation, and cleanup.
 */

import { Browser, BrowserContext, Page, chromium } from 'playwright';

const HEADLESS = process.env.HEADLESS === 'true';
const BROWSER_APP_URL = process.env.BROWSER_APP_URL || 'http://localhost:3000';

class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  /**
   * Launch browser instance if not already running
   */
  async launch(): Promise<void> {
    if (this.browser) {
      console.log('Browser already running');
      return;
    }

    console.log('Launching browser...');
    console.log(`  Headless: ${HEADLESS}`);
    console.log(`  Target: ${BROWSER_APP_URL}`);

    this.browser = await chromium.launch({
      headless: HEADLESS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) CV-Builder-Automation',
    });

    this.page = await this.context.newPage();

    console.log('Browser launched successfully');
  }

  /**
   * Get current page instance (launches browser if needed)
   */
  async getPage(): Promise<Page> {
    if (!this.page) {
      await this.launch();
    }
    return this.page!;
  }

  /**
   * Get browser instance
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * Check if browser is running
   */
  isRunning(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }

  /**
   * Restart browser (useful for recovering from errors)
   */
  async restart(): Promise<void> {
    console.log('Restarting browser...');
    await this.close();
    await this.launch();
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (!this.browser) {
      return;
    }

    console.log('Closing browser...');

    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      if (this.context) {
        await this.context.close();
        this.context = null;
      }

      await this.browser.close();
      this.browser = null;

      console.log('Browser closed successfully');
    } catch (error) {
      console.error('Error closing browser:', error);
      // Force cleanup
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string | null {
    return this.page?.url() || null;
  }

  /**
   * Get browser status
   */
  getStatus(): {
    running: boolean;
    currentUrl: string | null;
    connected: boolean;
  } {
    return {
      running: this.isRunning(),
      currentUrl: this.getCurrentUrl(),
      connected: this.browser?.isConnected() || false,
    };
  }
}

// Singleton instance
export const browserManager = new BrowserManager();

// Cleanup on process termination
process.on('SIGTERM', async () => {
  await browserManager.close();
});

process.on('SIGINT', async () => {
  await browserManager.close();
});
