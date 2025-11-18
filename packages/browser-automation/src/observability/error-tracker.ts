import { Page } from 'playwright';

/**
 * Configuration constants for error tracking
 */
const DUPLICATE_DETECTION_WINDOW_MS = 500; // Time window for detecting duplicate errors
const DEFAULT_MAX_ERRORS = 100; // Default maximum number of errors to keep in buffer

/**
 * JavaScript error captured from the browser
 */
export interface JavaScriptError {
  /** ISO timestamp when the error occurred */
  timestamp: string;
  /** Error message */
  message: string;
  /** Stack trace if available */
  stack?: string;
  /** Source file where error occurred */
  source?: string;
  /** Line number in source file */
  line?: number;
  /** Column number in source file */
  column?: number;
  /** Error name (e.g., 'TypeError', 'ReferenceError') */
  name?: string;
}

/**
 * ErrorTracker captures JavaScript errors from the browser for debugging.
 *
 * Features:
 * - Captures all uncaught JavaScript errors
 * - Maintains circular buffer (default 100 errors)
 * - Preserves stack traces
 * - Parses source location from stack traces
 * - Groups errors by message for easy analysis
 *
 * @example
 * ```typescript
 * const tracker = new ErrorTracker(page);
 *
 * // Later, retrieve errors
 * const errors = tracker.getErrors(10);
 * console.log('Recent errors:', errors);
 * ```
 */
export class ErrorTracker {
  private errors: JavaScriptError[] = [];
  private readonly maxErrors: number;
  private isAttached = false;
  private pageErrorHandler?: (error: Error) => void;
  private consoleHandler?: (msg: any) => void;

  /**
   * Create a new ErrorTracker
   * @param page Playwright page to monitor
   * @param maxErrors Maximum number of errors to keep (default: 100)
   */
  constructor(private page: Page, maxErrors = DEFAULT_MAX_ERRORS) {
    this.maxErrors = maxErrors;
    this.attachListeners();
  }

  /**
   * Attach error listeners to the page
   */
  private attachListeners(): void {
    if (this.isAttached) {
      return;
    }

    // Capture page errors (uncaught exceptions)
    this.pageErrorHandler = (error: Error) => {
      this.handlePageError(error);
    };
    this.page.on('pageerror', this.pageErrorHandler);

    // Capture console errors as well (some frameworks log errors to console)
    this.consoleHandler = (msg) => {
      if (msg.type() === 'error') {
        // Only track if it looks like an error object
        const text = msg.text();
        if (text.includes('Error:') || text.includes('Exception:')) {
          this.handleConsoleError(text);
        }
      }
    };
    this.page.on('console', this.consoleHandler);

    this.isAttached = true;
  }

  /**
   * Handle a page error event
   */
  private handlePageError(error: Error): void {
    try {
      const jsError: JavaScriptError = {
        timestamp: new Date().toISOString(),
        message: error.message,
        name: error.name,
        stack: error.stack,
        source: this.parseSource(error.stack),
        line: this.parseLine(error.stack),
        column: this.parseColumn(error.stack),
      };

      this.errors.push(jsError);

      // Maintain buffer size - use slice when reaching 2x capacity for better performance
      if (this.errors.length > this.maxErrors * 2) {
        this.errors = this.errors.slice(-this.maxErrors);
      }

      // Log to server stderr for visibility
      process.stderr.write(`[Browser Error] ${error.name}: ${error.message}\n`);
      if (jsError.source) {
        process.stderr.write(`  at ${jsError.source}:${jsError.line}:${jsError.column}\n`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      process.stderr.write(`[ErrorTracker] Error handling page error: ${errorMsg}\n`);
    }
  }

  /**
   * Handle a console error message
   */
  private handleConsoleError(text: string): void {
    try {
      // Extract error info from console error text
      const lines = text.split('\n');
      const firstLine = lines[0];

      const jsError: JavaScriptError = {
        timestamp: new Date().toISOString(),
        message: firstLine,
        stack: text,
        source: this.parseSource(text),
        line: this.parseLine(text),
        column: this.parseColumn(text),
      };

      // Avoid duplicates (page error already captured)
      const isDuplicate = this.errors.some(e => {
        const timeDiff = Math.abs(new Date(e.timestamp).getTime() - new Date(jsError.timestamp).getTime());
        const messageMatch = e.message === jsError.message;
        const stackMatch = e.stack === jsError.stack;

        // Consider it a duplicate if:
        // 1. Same message AND same stack within time window, OR
        // 2. Same message AND stack with very close timestamps
        return (messageMatch && stackMatch && timeDiff < DUPLICATE_DETECTION_WINDOW_MS) ||
               (messageMatch && timeDiff < 50); // Tight window for same-second duplicates
      });

      if (!isDuplicate) {
        this.errors.push(jsError);

        // Maintain buffer size - use slice when reaching 2x capacity for better performance
        if (this.errors.length > this.maxErrors * 2) {
          this.errors = this.errors.slice(-this.maxErrors);
        }
      }
    } catch (err) {
      // Log to stderr to avoid potential recursion
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      process.stderr.write(`[ErrorTracker] Error handling console error: ${errorMsg}\n`);
    }
  }

  /**
   * Get JavaScript errors
   *
   * @param limit Maximum number of errors to return (most recent)
   * @returns Array of JavaScript errors
   *
   * @example
   * ```typescript
   * // Get all errors
   * const allErrors = tracker.getErrors();
   *
   * // Get last 10 errors
   * const recentErrors = tracker.getErrors(10);
   * ```
   */
  getErrors(limit?: number): JavaScriptError[] {
    if (limit && limit > 0) {
      return this.errors.slice(-limit);
    }
    return [...this.errors];
  }

  /**
   * Get the total number of errors captured
   */
  getCount(): number {
    return this.errors.length;
  }

  /**
   * Get errors grouped by message (for identifying common issues)
   *
   * @returns Map of error messages to arrays of matching errors
   *
   * @example
   * ```typescript
   * const grouped = tracker.getGroupedErrors();
   * grouped.forEach((errors, message) => {
   *   console.log(`${message}: ${errors.length} occurrences`);
   * });
   * ```
   */
  getGroupedErrors(): Map<string, JavaScriptError[]> {
    const grouped = new Map<string, JavaScriptError[]>();

    for (const error of this.errors) {
      const key = error.message;
      const existing = grouped.get(key) || [];
      existing.push(error);
      grouped.set(key, existing);
    }

    return grouped;
  }

  /**
   * Get unique error messages with counts (sorted by frequency)
   *
   * @returns Array of error summaries with message, count, and latest timestamp
   *
   * @example
   * ```typescript
   * const summary = tracker.getErrorSummary();
   * console.log('Top errors:');
   * summary.slice(0, 5).forEach(err => {
   *   console.log(`${err.message} (${err.count} times)`);
   * });
   * ```
   */
  getErrorSummary(): Array<{ message: string; count: number; latestTimestamp: string }> {
    const grouped = this.getGroupedErrors();
    const summary: Array<{ message: string; count: number; latestTimestamp: string }> = [];

    grouped.forEach((errors, message) => {
      summary.push({
        message,
        count: errors.length,
        latestTimestamp: errors[errors.length - 1].timestamp,
      });
    });

    // Sort by count (most frequent first)
    summary.sort((a, b) => b.count - a.count);

    return summary;
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Parse source file URL from stack trace
   */
  private parseSource(stack?: string): string | undefined {
    if (!stack) return undefined;

    // Look for common patterns:
    // - http://localhost:3000/static/js/main.js:245:10
    // - at Object.<anonymous> (http://localhost:3000/app.js:12:5)
    const urlMatch = stack.match(/https?:\/\/[^\s)]+/);
    if (urlMatch) {
      // Remove line:column from URL
      return urlMatch[0].replace(/:\d+:\d+.*$/, '');
    }

    return undefined;
  }

  /**
   * Parse line number from stack trace
   */
  private parseLine(stack?: string): number | undefined {
    if (!stack) return undefined;

    // Look for :line:column pattern
    const match = stack.match(/:(\d+):\d+/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Parse column number from stack trace
   */
  private parseColumn(stack?: string): number | undefined {
    if (!stack) return undefined;

    // Look for :line:column pattern
    const match = stack.match(/:(\d+):(\d+)/);
    return match ? parseInt(match[2], 10) : undefined;
  }

  /**
   * Detach listeners (cleanup)
   */
  detach(): void {
    if (!this.isAttached) {
      return;
    }

    if (this.pageErrorHandler) {
      this.page.off('pageerror', this.pageErrorHandler);
      this.pageErrorHandler = undefined;
    }

    if (this.consoleHandler) {
      this.page.off('console', this.consoleHandler);
      this.consoleHandler = undefined;
    }

    this.isAttached = false;
  }
}
