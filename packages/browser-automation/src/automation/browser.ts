/**
 * Browser Instance Manager
 *
 * Manages Playwright browser lifecycle with singleton pattern.
 * Handles browser launch, page creation, and cleanup.
 * Includes observability features (console logging, error tracking) in dev mode.
 */

import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { ConsoleLogger } from '../observability/console-logger.js';
import { ErrorTracker } from '../observability/error-tracker.js';

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

  // Observability features (dev mode only)
  private consoleLogger: ConsoleLogger | null = null;
  private errorTracker: ErrorTracker | null = null;

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

    // Inject Redux DevTools emulation for automated testing
    // This provides a secure interface similar to Redux DevTools extension
    // The app's store will register itself with this emulated extension
    await this.context.addInitScript(() => {
      (window as any).__REDUX_DEVTOOLS_EXTENSION__ = {
        stores: [], // Store will push itself here during initialization
      };
    });

    this.page = await this.context.newPage();

    // Initialize observability in dev mode
    if (process.env.NODE_ENV === 'development') {
      this.initializeObservability();
      console.log('Browser launched successfully (observability enabled)');
    } else {
      console.log('Browser launched successfully');
    }
  }

  /**
   * Initialize observability features (console logging, error tracking)
   * Only called in development mode for security
   */
  private initializeObservability(): void {
    if (!this.page) {
      console.warn('[OBSERVABILITY] Cannot initialize - no page available');
      return;
    }

    try {
      this.consoleLogger = new ConsoleLogger(this.page);
      this.errorTracker = new ErrorTracker(this.page);
      console.log('[OBSERVABILITY] Console logging and error tracking enabled');
    } catch (error) {
      console.error('[OBSERVABILITY] Failed to initialize:', error);
    }
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
      // Cleanup observability
      if (this.consoleLogger) {
        this.consoleLogger.detach();
        this.consoleLogger = null;
      }

      if (this.errorTracker) {
        this.errorTracker.detach();
        this.errorTracker = null;
      }

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
      this.consoleLogger = null;
      this.errorTracker = null;
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

  /**
   * Get console logger (dev mode only)
   */
  getConsoleLogger(): ConsoleLogger | null {
    return this.consoleLogger;
  }

  /**
   * Get error tracker (dev mode only)
   */
  getErrorTracker(): ErrorTracker | null {
    return this.errorTracker;
  }

  /**
   * Check if observability is enabled
   */
  isObservabilityEnabled(): boolean {
    return this.consoleLogger !== null && this.errorTracker !== null;
  }

  /**
   * Clear browser storage (localStorage, sessionStorage, cookies, indexedDB)
   * This provides complete isolation between test runs
   */
  async clearStorage(): Promise<void> {
    if (!this.context) {
      throw new Error('Cannot clear storage - no browser context available');
    }

    if (!this.page) {
      throw new Error('Cannot clear storage - no page available');
    }

    console.log('Clearing browser storage...');

    try {
      // Clear cookies
      await this.context.clearCookies();

      // Clear localStorage, sessionStorage, and indexedDB using evaluate
      if (this.page) {
        await this.page.evaluate(async () => {
          // Clear localStorage
          localStorage.clear();

          // Clear sessionStorage
          sessionStorage.clear();

          // Clear indexedDB (all databases) - await completion
          if (window.indexedDB) {
            const databases = await indexedDB.databases();
            const blockedDatabases: string[] = [];

            await Promise.all(
              databases
                .filter((db) => db.name)
                .map((db) => {
                  return new Promise<void>((resolve, reject) => {
                    const request = indexedDB.deleteDatabase(db.name!);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                    request.onblocked = () => {
                      blockedDatabases.push(db.name!);
                      console.warn(`IndexedDB deletion blocked for ${db.name}`);
                      resolve(); // Resolve anyway to not block cleanup
                    };
                  });
                })
            );

            // Log warning if any databases were blocked
            if (blockedDatabases.length > 0) {
              console.warn(
                `Warning: ${blockedDatabases.length} IndexedDB database(s) blocked during deletion: ${blockedDatabases.join(', ')}. ` +
                `Storage may not be fully cleared. Consider closing all browser tabs and retrying.`
              );
            }
          }
        });

        // Allow storage events to propagate before verification (prevent race conditions)
        await this.page.waitForTimeout(50);

        // Verify storage is actually cleared (prevent race conditions)
        const verificationResult = await this.page.evaluate(() => {
          const localStorageEmpty = localStorage.length === 0;
          const sessionStorageEmpty = sessionStorage.length === 0;
          return {
            localStorageEmpty,
            sessionStorageEmpty,
            success: localStorageEmpty && sessionStorageEmpty,
          };
        });

        if (!verificationResult.success) {
          throw new Error(
            `Storage clearing verification failed: localStorage=${verificationResult.localStorageEmpty}, sessionStorage=${verificationResult.sessionStorageEmpty}`
          );
        }
      }

      console.log('Browser storage cleared and verified successfully');
    } catch (error) {
      console.error('Error clearing browser storage:', error);
      throw error;
    }
  }

  /**
   * Reset browser context completely (creates new context with clean state)
   * This is more aggressive than clearStorage and ensures complete isolation
   */
  async resetContext(): Promise<void> {
    if (!this.browser) {
      throw new Error('Cannot reset context - no browser available');
    }

    console.log('Resetting browser context...');

    try {
      // Cleanup observability from old context
      if (this.consoleLogger) {
        this.consoleLogger.detach();
        this.consoleLogger = null;
      }

      if (this.errorTracker) {
        this.errorTracker.detach();
        this.errorTracker = null;
      }

      // Close old page
      if (this.page) {
        await this.page.close();
        this.page = null;
      }

      // Close old context
      if (this.context) {
        await this.context.close();
        this.context = null;
      }

      // Create new context
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) CV-Builder-Automation',
      });

      // Inject Redux DevTools emulation
      await this.context.addInitScript(() => {
        (window as any).__REDUX_DEVTOOLS_EXTENSION__ = {
          stores: [],
        };
      });

      // Create new page
      this.page = await this.context.newPage();

      // Re-initialize observability
      if (process.env.NODE_ENV === 'development') {
        this.initializeObservability();
      }

      console.log('Browser context reset successfully');
    } catch (error) {
      console.error('Error resetting browser context:', error);
      throw error;
    }
  }
}

// Singleton instance
export const browserManager = new BrowserManager();

/**
 * Get the singleton BrowserManager instance
 * (for use in route handlers that need observability access)
 */
export function getBrowserManager(): BrowserManager {
  return browserManager;
}

// Cleanup on process termination
process.on('SIGTERM', async () => {
  await browserManager.close();
});

process.on('SIGINT', async () => {
  await browserManager.close();
});
