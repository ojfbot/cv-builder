import { Page, ConsoleMessage } from 'playwright';

/**
 * Console entry captured from the browser
 */
export interface ConsoleEntry {
  /** ISO timestamp when the message was logged */
  timestamp: string;
  /** Console message level */
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  /** The console message text */
  message: string;
  /** Arguments passed to console method (stringified) */
  args: string[];
  /** Source location if available */
  location?: {
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
}

/**
 * Options for filtering console logs
 */
export interface GetLogsOptions {
  /** Filter by log level */
  level?: 'log' | 'info' | 'warn' | 'error' | 'debug';
  /** Maximum number of logs to return (most recent) */
  limit?: number;
  /** Only return logs after this timestamp */
  since?: string;
}

/**
 * ConsoleLogger captures browser console messages for debugging and monitoring.
 *
 * Features:
 * - Captures all console.log, .info, .warn, .error, .debug messages
 * - Maintains circular buffer (default 1000 entries)
 * - Provides filtering by level, time, and limit
 * - Includes source location information when available
 *
 * @example
 * ```typescript
 * const logger = new ConsoleLogger(page);
 *
 * // Later, retrieve logs
 * const errors = logger.getLogs({ level: 'error', limit: 10 });
 * console.log('Recent errors:', errors);
 * ```
 */
export class ConsoleLogger {
  private entries: ConsoleEntry[] = [];
  private readonly maxEntries: number;
  private isAttached = false;

  /**
   * Create a new ConsoleLogger
   * @param page Playwright page to monitor
   * @param maxEntries Maximum number of entries to keep (default: 1000)
   */
  constructor(private page: Page, maxEntries = 1000) {
    this.maxEntries = maxEntries;
    this.attachListeners();
  }

  /**
   * Attach console listeners to the page
   */
  private attachListeners(): void {
    if (this.isAttached) {
      return;
    }

    this.page.on('console', (msg: ConsoleMessage) => {
      this.handleConsoleMessage(msg);
    });

    this.isAttached = true;
  }

  /**
   * Handle a console message from the browser
   */
  private async handleConsoleMessage(msg: ConsoleMessage): Promise<void> {
    try {
      const level = msg.type() as ConsoleEntry['level'];

      // Get string representations of all arguments
      const args: string[] = [];
      for (const arg of msg.args()) {
        try {
          const value = await arg.jsonValue();
          args.push(JSON.stringify(value));
        } catch {
          // Fallback to toString for non-JSON-serializable values
          args.push(arg.toString());
        }
      }

      const location = msg.location();

      const entry: ConsoleEntry = {
        timestamp: new Date().toISOString(),
        level,
        message: msg.text(),
        args,
        location: location.url ? {
          url: location.url,
          lineNumber: location.lineNumber,
          columnNumber: location.columnNumber,
        } : undefined,
      };

      this.entries.push(entry);

      // Maintain buffer size
      if (this.entries.length > this.maxEntries) {
        this.entries.shift();
      }
    } catch (error) {
      // Silently ignore errors in console handler to avoid recursion
      console.error('Error handling console message:', error);
    }
  }

  /**
   * Get console logs with optional filtering
   *
   * @param options Filtering options
   * @returns Array of console entries matching the filters
   *
   * @example
   * ```typescript
   * // Get all error logs
   * const errors = logger.getLogs({ level: 'error' });
   *
   * // Get last 50 logs
   * const recent = logger.getLogs({ limit: 50 });
   *
   * // Get logs since a specific time
   * const newLogs = logger.getLogs({ since: '2025-11-17T12:00:00Z' });
   * ```
   */
  getLogs(options?: GetLogsOptions): ConsoleEntry[] {
    let filtered = [...this.entries];

    // Filter by level
    if (options?.level) {
      filtered = filtered.filter(e => e.level === options.level);
    }

    // Filter by time
    if (options?.since) {
      const sinceDate = new Date(options.since);
      filtered = filtered.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    // Apply limit (most recent entries)
    if (options?.limit && options.limit > 0) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Get the total number of console entries captured
   */
  getCount(): number {
    return this.entries.length;
  }

  /**
   * Get count by level
   */
  getCountByLevel(): Record<ConsoleEntry['level'], number> {
    const counts: Record<ConsoleEntry['level'], number> = {
      log: 0,
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
    };

    for (const entry of this.entries) {
      counts[entry.level]++;
    }

    return counts;
  }

  /**
   * Clear all console entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Detach listeners (cleanup)
   */
  detach(): void {
    if (!this.isAttached) {
      return;
    }

    // Note: Playwright doesn't provide removeListener for 'console' event
    // The listener will be cleaned up when the page is closed
    this.isAttached = false;
  }
}
