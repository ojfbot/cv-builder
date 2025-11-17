/**
 * Type-safe Browser Automation API Client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
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
      timeout: this.config.timeout || 30000,
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
  async elementAttribute(selector: string, attribute: string): Promise<string> {
    try {
      const response = await this.axios.get<AttributeResult>('/api/element/attribute', {
        params: { selector, attribute },
      });

      return response.data.value || '';
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
        throw new TimeoutError(`waitForSelector(${selector})`, options.timeout || 30000);
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
        throw new TimeoutError(`waitForText("${text}")`, options.timeout || 30000);
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
   * Close the browser
   */
  async close(): Promise<void> {
    try {
      await this.axios.post('/api/close');
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Query Redux store state
   */
  async storeQuery(queryName: string, app: string = 'cv-builder'): Promise<any> {
    try {
      const response = await this.axios.post('/api/store/query', {
        app,
        query: queryName,
      });
      return response.data.result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Wait for store state to match expected value
   */
  async storeWait(
    queryName: string,
    expectedValue: any,
    options: {
      app?: string;
      timeout?: number;
      pollInterval?: number;
    } = {}
  ): Promise<void> {
    try {
      await this.axios.post('/api/store/wait', {
        app: options.app || 'cv-builder',
        query: queryName,
        value: expectedValue,
        timeout: options.timeout || 30000,
        pollInterval: options.pollInterval || 100,
      });
    } catch (error) {
      throw this.handleError(error);
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
