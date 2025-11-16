/**
 * Browser Instance Manager
 *
 * Manages Playwright browser lifecycle with singleton pattern.
 * Handles browser launch, page creation, and cleanup.
 */

import { Browser, BrowserContext, Page, chromium } from 'playwright';

const HEADLESS = process.env.HEADLESS === 'true';
const BROWSER_APP_URL = process.env.BROWSER_APP_URL || 'http://localhost:3000';
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface Session {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  url: string;
}

class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private currentSession: Session | null = null;
  private sessionCleanupTimer: NodeJS.Timeout | null = null;

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
      this.startSession();
    }
    this.updateSessionActivity();
    return this.page!;
  }

  /**
   * Start a new session
   */
  private startSession(): void {
    const sessionId = `session-${Date.now()}`;
    this.currentSession = {
      id: sessionId,
      createdAt: new Date(),
      lastActivity: new Date(),
      url: this.page?.url() || 'about:blank',
    };

    console.log(`Started session: ${sessionId}`);
    this.scheduleSessionCleanup();
  }

  /**
   * Update session activity timestamp
   */
  private updateSessionActivity(): void {
    if (this.currentSession) {
      this.currentSession.lastActivity = new Date();
      this.currentSession.url = this.page?.url() || 'about:blank';
      this.scheduleSessionCleanup();
    }
  }

  /**
   * Schedule session cleanup after timeout
   */
  private scheduleSessionCleanup(): void {
    if (this.sessionCleanupTimer) {
      clearTimeout(this.sessionCleanupTimer);
    }

    this.sessionCleanupTimer = setTimeout(async () => {
      if (this.currentSession) {
        const inactiveTime = Date.now() - this.currentSession.lastActivity.getTime();
        if (inactiveTime >= SESSION_TIMEOUT_MS) {
          console.log(`Session ${this.currentSession.id} timed out after ${inactiveTime}ms of inactivity`);
          await this.endSession();
        }
      }
    }, SESSION_TIMEOUT_MS);
  }

  /**
   * End current session
   */
  private async endSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    console.log(`Ending session: ${this.currentSession.id}`);

    if (this.sessionCleanupTimer) {
      clearTimeout(this.sessionCleanupTimer);
      this.sessionCleanupTimer = null;
    }

    this.currentSession = null;

    // Close browser to free resources
    await this.close();
  }

  /**
   * Get current session info
   */
  getSession(): Session | null {
    return this.currentSession;
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
    session: Session | null;
  } {
    return {
      running: this.isRunning(),
      currentUrl: this.getCurrentUrl(),
      connected: this.browser?.isConnected() || false,
      session: this.currentSession,
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
