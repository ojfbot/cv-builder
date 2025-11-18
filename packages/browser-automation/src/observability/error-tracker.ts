import { Page } from 'playwright';

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

  /**
   * Create a new ErrorTracker
   * @param page Playwright page to monitor
   * @param maxErrors Maximum number of errors to keep (default: 100)
   */
  constructor(private page: Page, maxErrors = 100) {
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
    this.page.on('pageerror', (error: Error) => {
      this.handlePageError(error);
    });

    // Capture console errors as well (some frameworks log errors to console)
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Only track if it looks like an error object
        const text = msg.text();
        if (text.includes('Error:') || text.includes('Exception:')) {
          this.handleConsoleError(text);
        }
      }
    });

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

      // Maintain buffer size
      if (this.errors.length > this.maxErrors) {
        this.errors.shift();
      }

      // Log to server console for visibility
      console.error(`[Browser Error] ${error.name}: ${error.message}`);
      if (jsError.source) {
        console.error(`  at ${jsError.source}:${jsError.line}:${jsError.column}`);
      }
    } catch (err) {
      console.error('Error handling page error:', err);
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
      const isDuplicate = this.errors.some(
        e => e.message === jsError.message &&
             Math.abs(new Date(e.timestamp).getTime() - new Date(jsError.timestamp).getTime()) < 100
      );

      if (!isDuplicate) {
        this.errors.push(jsError);

        if (this.errors.length > this.maxErrors) {
          this.errors.shift();
        }
      }
    } catch (err) {
      console.error('Error handling console error:', err);
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
   * Get unique error messages with counts
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

    // Note: Playwright doesn't provide removeListener
    // The listener will be cleaned up when the page is closed
    this.isAttached = false;
  }
}
