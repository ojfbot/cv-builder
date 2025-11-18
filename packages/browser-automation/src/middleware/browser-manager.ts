import { Request, Response, NextFunction } from 'express';
import { getBrowserManager } from '../automation/browser';

/**
 * Middleware to ensure console logger is available
 *
 * Responds with 503 if console logger is not initialized.
 * Use this middleware on routes that require ConsoleLogger access.
 *
 * @example
 * ```typescript
 * router.get('/logs', requireConsoleLogger, (req, res) => {
 *   const logger = getBrowserManager().getConsoleLogger()!;
 *   // logger is guaranteed to exist here
 * });
 * ```
 */
export function requireConsoleLogger(req: Request, res: Response, next: NextFunction): void {
  const browserManager = getBrowserManager();
  const consoleLogger = browserManager.getConsoleLogger();

  if (!consoleLogger) {
    res.status(503).json({
      error: 'Console logger not initialized',
      hint: 'Ensure the browser is launched and observability is enabled',
      endpoint: req.path,
    });
    return;
  }

  next();
}

/**
 * Middleware to ensure error tracker is available
 *
 * Responds with 503 if error tracker is not initialized.
 * Use this middleware on routes that require ErrorTracker access.
 *
 * @example
 * ```typescript
 * router.get('/errors', requireErrorTracker, (req, res) => {
 *   const tracker = getBrowserManager().getErrorTracker()!;
 *   // tracker is guaranteed to exist here
 * });
 * ```
 */
export function requireErrorTracker(req: Request, res: Response, next: NextFunction): void {
  const browserManager = getBrowserManager();
  const errorTracker = browserManager.getErrorTracker();

  if (!errorTracker) {
    res.status(503).json({
      error: 'Error tracker not initialized',
      hint: 'Ensure the browser is launched and observability is enabled',
      endpoint: req.path,
    });
    return;
  }

  next();
}

/**
 * Middleware to ensure both console logger and error tracker are available
 *
 * Responds with 503 if either service is not initialized.
 * Use this middleware on routes that require both services.
 *
 * @example
 * ```typescript
 * router.post('/clear', requireObservability, (req, res) => {
 *   const logger = getBrowserManager().getConsoleLogger()!;
 *   const tracker = getBrowserManager().getErrorTracker()!;
 *   // Both are guaranteed to exist here
 * });
 * ```
 */
export function requireObservability(req: Request, res: Response, next: NextFunction): void {
  const browserManager = getBrowserManager();
  const consoleLogger = browserManager.getConsoleLogger();
  const errorTracker = browserManager.getErrorTracker();

  if (!consoleLogger || !errorTracker) {
    res.status(503).json({
      error: 'Observability not initialized',
      hint: 'Ensure the browser is launched and observability is enabled',
      endpoint: req.path,
    });
    return;
  }

  next();
}
