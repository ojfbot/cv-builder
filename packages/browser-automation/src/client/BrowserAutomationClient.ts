/**
 * Type-safe Browser Automation API Client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { RETRY_CONFIG, TEST_TIMEOUTS, POLLING_CONFIG } from '../test-runner/constants.js';
import {
  ClientConfig,
  NavigateOptions,
  NavigateResult,
  ClickOptions,
  TypeOptions,
  WaitOptions,
  ScreenshotOptions,
  ScreenshotResult,
  ElementQueryResult,
  AttributeResult,
  HealthResponse,
} from './types.js';
import {
  NetworkError,
  APIError,
  ElementNotFoundError,
  TimeoutError,
  ScreenshotError,
} from './errors.js';

export class BrowserAutomationClient {
  private axios: AxiosInstance;
  private config: ClientConfig;

  constructor(config: ClientConfig | string) {
    if (typeof config === 'string') {
      this.config = { baseUrl: config };
    } else {
      this.config = config;
    }

    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout || TEST_TIMEOUTS.DEFAULT,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
      },
    });
  }

  /**
   * Health check
   */
  async health(): Promise<HealthResponse> {
    try {
      const response = await this.axios.get<HealthResponse>('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string, options: NavigateOptions = {}): Promise<NavigateResult> {
    try {
      const response = await this.axios.post<NavigateResult>('/api/navigate', {
        url,
        ...options,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Navigate back
   */
  async back(): Promise<void> {
    try {
      await this.axios.post('/api/navigate/back');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Reload current page
   */
  async reload(options: NavigateOptions = {}): Promise<void> {
    try {
      await this.axios.post('/api/navigate/reload', options);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get current URL
   */
  async currentUrl(): Promise<string> {
    try {
      const health = await this.health();
      return health.browser.currentUrl || '';
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      const response = await this.axios.get<ElementQueryResult>('/api/element/exists', {
        params: { selector },
      });
      return response.data.exists;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if element is visible
   */
  async elementVisible(selector: string): Promise<boolean> {
    try {
      const response = await this.axios.get<ElementQueryResult>('/api/element/exists', {
        params: { selector },
      });
      return response.data.visible || false;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get element text content
   */
  async elementText(selector: string): Promise<string> {
    try {
      const response = await this.axios.get<ElementQueryResult>('/api/element/text', {
        params: { selector },
      });

      if (!response.data.success) {
        throw new ElementNotFoundError(selector);
      }

      return response.data.text || '';
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get element attribute value
   */
  async elementAttribute(selector: string, attribute: string): Promise<string | null> {
    try {
      const response = await this.axios.get<AttributeResult>('/api/element/attribute', {
        params: { selector, attribute },
      });

      return response.data.value || null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get page title
   */
  async pageTitle(): Promise<string> {
    try {
      const response = await this.axios.get<{ success: boolean; title: string }>('/api/page/title');
      return response.data.title || '';
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if element has focus
   */
  async elementHasFocus(selector: string): Promise<boolean> {
    try {
      const response = await this.axios.get<{ success: boolean; hasFocus: boolean }>(
        '/api/element/has-focus',
        {
          params: { selector },
        }
      );
      return response.data.hasFocus;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Count matching elements
   */
  async elementCount(selector: string): Promise<number> {
    try {
      const response = await this.axios.get<ElementQueryResult>('/api/element/exists', {
        params: { selector },
      });
      return response.data.count || 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Click an element
   */
  async click(selector: string, options: ClickOptions = {}): Promise<void> {
    try {
      await this.axios.post('/api/interact/click', {
        selector,
        ...options,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Type text into an element
   */
  async type(selector: string, text: string, options: TypeOptions = {}): Promise<void> {
    try {
      await this.axios.post('/api/interact/type', {
        selector,
        text,
        ...options,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Fill an input element (clears first, then types)
   */
  async fill(selector: string, text: string): Promise<void> {
    try {
      await this.axios.post('/api/interact/fill', {
        selector,
        text,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Hover over an element
   */
  async hover(selector: string): Promise<void> {
    try {
      await this.axios.post('/api/interact/hover', {
        selector,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Press a keyboard key
   */
  async press(key: string): Promise<void> {
    try {
      await this.axios.post('/api/interact/press', {
        key,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Select option in a dropdown
   */
  async select(selector: string, value: string): Promise<void> {
    try {
      await this.axios.post('/api/interact/select', {
        selector,
        value,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check or uncheck a checkbox
   */
  async check(selector: string, checked: boolean = true): Promise<void> {
    try {
      await this.axios.post('/api/interact/check', {
        selector,
        checked,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Wait for a selector to appear
   */
  async waitForSelector(selector: string, options: WaitOptions = {}): Promise<void> {
    try {
      await this.axios.post('/api/wait/element', {
        selector,
        ...options,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new TimeoutError(
          `waitForSelector(${selector})`,
          options.timeout || TEST_TIMEOUTS.DEFAULT
        );
      }
      throw this.handleError(error);
    }
  }

  /**
   * Wait for text to appear
   */
  async waitForText(text: string, options: WaitOptions = {}): Promise<void> {
    try {
      await this.axios.post('/api/wait/text', {
        text,
        ...options,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
        throw new TimeoutError(`waitForText("${text}")`, options.timeout || TEST_TIMEOUTS.DEFAULT);
      }
      throw this.handleError(error);
    }
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(options: WaitOptions = {}): Promise<void> {
    try {
      await this.axios.post('/api/wait/navigation', options);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(): Promise<void> {
    try {
      await this.axios.post('/api/wait/networkidle');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Capture a screenshot
   */
  async screenshot(options: ScreenshotOptions): Promise<ScreenshotResult> {
    try {
      const response = await this.axios.post<ScreenshotResult>('/api/screenshot', options);

      if (!response.data.success) {
        throw new ScreenshotError('Screenshot capture failed');
      }

      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * List screenshot sessions
   */
  async listSessions(): Promise<string[]> {
    try {
      const response = await this.axios.get<{ success: boolean; sessions: string[] }>(
        '/api/screenshot/sessions'
      );
      return response.data.sessions || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Close the browser with retry for reliability
   */
  async close(options: { force?: boolean; maxRetries?: number } = {}): Promise<void> {
    const maxRetries = options.maxRetries ?? RETRY_CONFIG.MAX_RETRIES;
    const baseDelay = RETRY_CONFIG.CLOSE_BASE_DELAY;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.axios.post('/api/close', { force: options.force });
        return; // Success
      } catch (error) {
        // If this is the last attempt or a critical error, handle it
        if (attempt === maxRetries) {
          // Log error but don't throw - we want cleanup to always succeed
          console.warn(
            `Failed to close browser after ${maxRetries + 1} attempts:`,
            error instanceof Error ? error.message : String(error)
          );
          return; // Return gracefully instead of throwing
        }

        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Clear browser storage (localStorage, sessionStorage, cookies, indexedDB)
   * Call this between tests to ensure complete isolation
   */
  async clearStorage(): Promise<void> {
    try {
      await this.axios.post('/api/storage/clear');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Reset browser context (creates new context with clean state)
   * This is more aggressive than clearStorage and ensures complete isolation
   * Use this between test suites for maximum separation
   */
  async resetContext(): Promise<void> {
    try {
      await this.axios.post('/api/context/reset');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Query Redux store state with retry mechanism
   */
  async storeQuery(
    queryName: string,
    app: string = 'cv-builder',
    options: { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<any> {
    const maxRetries = options.maxRetries ?? RETRY_CONFIG.MAX_RETRIES;
    const baseDelay = options.retryDelay ?? RETRY_CONFIG.BASE_DELAY;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.axios.post('/api/store/query', {
          app,
          query: queryName,
        });
        return response.data.result;
      } catch (error) {
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          throw this.handleError(error);
        }

        // Exponential backoff: 100ms, 200ms, 400ms, etc.
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Wait for store state to match expected value with retry mechanism
   */
  async storeWait(
    queryName: string,
    expectedValue: any,
    options: {
      app?: string;
      timeout?: number;
      pollInterval?: number;
      maxRetries?: number;
      retryDelay?: number;
    } = {}
  ): Promise<void> {
    const maxRetries = options.maxRetries ?? RETRY_CONFIG.MAX_RETRIES;
    const baseDelay = options.retryDelay ?? RETRY_CONFIG.BASE_DELAY;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.axios.post('/api/store/wait', {
          app: options.app || 'cv-builder',
          query: queryName,
          value: expectedValue,
          timeout: options.timeout || TEST_TIMEOUTS.API_RESPONSE,
          pollInterval: options.pollInterval || POLLING_CONFIG.DEFAULT_INTERVAL,
        });
        return; // Success, exit early
      } catch (error) {
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          throw this.handleError(error);
        }

        // Exponential backoff: 100ms, 200ms, 400ms, etc.
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Get Redux store snapshot (dev mode only)
   */
  async storeSnapshot(app: string = 'cv-builder'): Promise<any> {
    try {
      const response = await this.axios.get('/api/store/snapshot', {
        params: { app },
      });
      return response.data.snapshot;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle errors and convert to appropriate error types
   */
  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      // Network errors (connection refused, timeout, etc.)
      if (!axiosError.response) {
        return new NetworkError(
          axiosError.message || 'Network error occurred',
          axiosError
        );
      }

      // API errors (4xx, 5xx responses)
      const statusCode = axiosError.response.status;
      const data: any = axiosError.response.data;
      const message = data?.error || axiosError.message;

      return new APIError(message, statusCode, data);
    }

    // Unknown errors
    if (error instanceof Error) {
      return error;
    }

    return new Error(String(error));
  }
}
