/**
 * Type definitions for the Browser Automation API client
 */

/**
 * Navigation options
 */
export interface NavigateOptions {
  waitFor?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}

/**
 * Navigation result
 */
export interface NavigateResult {
  success: boolean;
  currentUrl: string;
  title: string;
  timestamp: string;
}

/**
 * Click options
 */
export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
  timeout?: number;
}

/**
 * Type/Fill options
 */
export interface TypeOptions {
  delay?: number;
  timeout?: number;
}

/**
 * Wait options
 */
export interface WaitOptions {
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
  timeout?: number;
}

/**
 * Screenshot viewport preset
 */
export type ViewportPreset = 'desktop' | 'tablet' | 'mobile';

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
  name: string;
  selector?: string;
  fullPage?: boolean;
  viewport?: ViewportPreset | { width: number; height: number };
  sessionDir?: string;
  format?: 'png' | 'jpeg';
  quality?: number;
}

/**
 * Screenshot result
 */
export interface ScreenshotResult {
  success: boolean;
  filename: string;
  path: string;
  timestamp: string;
  viewport?: {
    width: number;
    height: number;
  };
}

/**
 * Element query result
 */
export interface ElementQueryResult {
  success: boolean;
  exists: boolean;
  visible?: boolean;
  count?: number;
  text?: string;
}

/**
 * Element attribute result
 */
export interface AttributeResult {
  success: boolean;
  value: string | null;
}

/**
 * Client configuration
 */
export interface ClientConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

/**
 * API error response
 */
export interface APIError {
  error: string;
  details?: any;
  timestamp: string;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: string;
  service?: string;
  version?: string;
  environment?: string;
  browser: {
    running: boolean;
    currentUrl: string | null;
    connected: boolean;
    session: string | null;
  };
  config?: {
    browserAppUrl: string;
    headless: boolean;
    port: string;
  };
  timestamp: string;
}
