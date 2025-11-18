import express, { Request, Response } from 'express';
import { requireDevMode, addDevModeHeaders, consoleLimiter, errorLimiter } from '../middleware';
import { getBrowserManager } from '../automation/browser';

const router = express.Router();

// Apply dev mode check and headers to all console routes
router.use(requireDevMode);
router.use(addDevModeHeaders);

/**
 * GET /api/console/logs
 *
 * Retrieve browser console logs with optional filtering.
 *
 * Query parameters:
 * - level: Filter by log level (log, info, warn, error, debug)
 * - limit: Maximum number of logs to return (default: all)
 * - since: ISO timestamp - only return logs after this time
 *
 * @example
 * GET /api/console/logs?level=error&limit=10
 * GET /api/console/logs?since=2025-11-17T12:00:00Z
 */
router.get('/logs', consoleLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const browserManager = getBrowserManager();
    const consoleLogger = browserManager.getConsoleLogger();

    if (!consoleLogger) {
      res.status(503).json({
        error: 'Console logger not initialized',
        hint: 'Ensure the browser is launched and observability is enabled',
      });
      return;
    }

    const { level, limit, since } = req.query;

    // Validate log level if provided
    const validLevels = ['log', 'info', 'warn', 'error', 'debug'] as const;
    if (level && !validLevels.includes(level as any)) {
      res.status(400).json({
        error: 'Invalid log level',
        providedLevel: level,
        validLevels,
        hint: `Level must be one of: ${validLevels.join(', ')}`,
      });
      return;
    }

    const logs = consoleLogger.getLogs({
      level: level as any,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      since: since as string,
    });

    const counts = consoleLogger.getCountByLevel();

    res.json({
      logs,
      count: logs.length,
      totalCount: consoleLogger.getCount(),
      countsByLevel: counts,
      filters: {
        level: level || 'all',
        limit: limit || 'none',
        since: since || 'none',
      },
      devModeOnly: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    process.stderr.write(`[Console API] Error retrieving logs: ${error}\n`);
    res.status(500).json({
      error: 'Failed to retrieve console logs',
      hint: 'Check server logs for details',
    });
  }
});

/**
 * GET /api/console/errors
 *
 * Retrieve JavaScript errors captured from the browser.
 *
 * Query parameters:
 * - limit: Maximum number of errors to return (default: all)
 * - summary: If 'true', return grouped summary instead of full errors
 *
 * @example
 * GET /api/console/errors?limit=20
 * GET /api/console/errors?summary=true
 */
router.get('/errors', errorLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const browserManager = getBrowserManager();
    const errorTracker = browserManager.getErrorTracker();

    if (!errorTracker) {
      res.status(503).json({
        error: 'Error tracker not initialized',
        hint: 'Ensure the browser is launched and observability is enabled',
      });
      return;
    }

    const { limit, summary } = req.query;

    if (summary === 'true') {
      // Return grouped summary
      const errorSummary = errorTracker.getErrorSummary();

      res.json({
        summary: errorSummary,
        totalErrors: errorTracker.getCount(),
        uniqueErrors: errorSummary.length,
        devModeOnly: true,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Return full errors
      const errors = errorTracker.getErrors(
        limit ? parseInt(limit as string, 10) : undefined
      );

      res.json({
        errors,
        count: errors.length,
        totalCount: errorTracker.getCount(),
        filters: {
          limit: limit || 'none',
        },
        devModeOnly: true,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    process.stderr.write(`[Console API] Error retrieving errors: ${error}\n`);
    res.status(500).json({
      error: 'Failed to retrieve errors',
      hint: 'Check server logs for details',
    });
  }
});

/**
 * POST /api/console/clear
 *
 * Clear all console logs and error buffers.
 *
 * @example
 * POST /api/console/clear
 */
router.post('/clear', consoleLimiter, async (_req: Request, res: Response): Promise<void> => {
  try {
    const browserManager = getBrowserManager();
    const consoleLogger = browserManager.getConsoleLogger();
    const errorTracker = browserManager.getErrorTracker();

    if (!consoleLogger || !errorTracker) {
      res.status(503).json({
        error: 'Observability not initialized',
        hint: 'Ensure the browser is launched and observability is enabled',
      });
      return;
    }

    const logCountBefore = consoleLogger.getCount();
    const errorCountBefore = errorTracker.getCount();

    consoleLogger.clear();
    errorTracker.clear();

    res.json({
      success: true,
      message: 'Console and error buffers cleared',
      cleared: {
        logs: logCountBefore,
        errors: errorCountBefore,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    process.stderr.write(`[Console API] Error clearing console: ${error}\n`);
    res.status(500).json({
      error: 'Failed to clear console',
      hint: 'Check server logs for details',
    });
  }
});

/**
 * GET /api/console/stats
 *
 * Get statistics about console logs and errors without retrieving full data.
 *
 * @example
 * GET /api/console/stats
 */
router.get('/stats', consoleLimiter, async (_req: Request, res: Response): Promise<void> => {
  try {
    const browserManager = getBrowserManager();
    const consoleLogger = browserManager.getConsoleLogger();
    const errorTracker = browserManager.getErrorTracker();

    if (!consoleLogger || !errorTracker) {
      res.status(503).json({
        error: 'Observability not initialized',
      });
      return;
    }

    const logCounts = consoleLogger.getCountByLevel();
    const errorSummary = errorTracker.getErrorSummary();

    res.json({
      console: {
        totalLogs: consoleLogger.getCount(),
        byLevel: logCounts,
      },
      errors: {
        totalErrors: errorTracker.getCount(),
        uniqueErrors: errorSummary.length,
        topErrors: errorSummary.slice(0, 5), // Top 5 most common
      },
      devModeOnly: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    process.stderr.write(`[Console API] Error retrieving stats: ${error}\n`);
    res.status(500).json({
      error: 'Failed to retrieve stats',
      hint: 'Check server logs for details',
    });
  }
});

export default router;
