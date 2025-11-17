/**
 * Test timeout and timing constants
 * Centralized configuration for test timing to improve maintainability
 */

export const TEST_TIMEOUTS = {
  /** Default timeout for test suite and individual tests (30s) */
  DEFAULT: 30000,

  /** Short timeout for quick operations (2s) */
  SHORT: 2000,

  /** Medium timeout for moderate operations (5s) */
  MEDIUM: 5000,

  /** Long timeout for API responses and async operations (30s) */
  API_RESPONSE: 30000,

  /** Element visibility wait timeout (3s) */
  ELEMENT_VISIBLE: 3000,

  /** Page load timeout (10s) */
  PAGE_LOAD: 10000,

  /** Screenshot capture timeout (5s) */
  SCREENSHOT: 5000,
} as const;

export const RETRY_CONFIG = {
  /** Maximum number of retries for failed queries */
  MAX_RETRIES: 3,

  /** Base delay for exponential backoff (ms) */
  BASE_DELAY: 100,

  /** Base delay for browser close retries (ms) */
  CLOSE_BASE_DELAY: 500,
} as const;

export const POLLING_CONFIG = {
  /** Default polling interval for store state checks (ms) */
  DEFAULT_INTERVAL: 100,

  /** Fast polling for critical operations (ms) */
  FAST_INTERVAL: 50,

  /** Slow polling for non-critical background checks (ms) */
  SLOW_INTERVAL: 200,
} as const;
