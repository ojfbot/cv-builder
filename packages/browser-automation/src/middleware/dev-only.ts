import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to restrict endpoints to development mode only.
 *
 * This is a critical security control for observability features that allow
 * access to browser internals and code evaluation.
 *
 * Features:
 * - Blocks all requests when NODE_ENV !== 'development'
 * - Returns clear 403 Forbidden responses
 * - Includes helpful hints in error messages
 * - Logs blocked attempts for security monitoring
 *
 * @example
 * ```typescript
 * // Apply to specific routes
 * router.use('/api/console', requireDevMode);
 *
 * // Or to individual endpoints
 * router.get('/api/state/evaluate', requireDevMode, evaluateLimiter, handler);
 * ```
 */
export function requireDevMode(req: Request, res: Response, next: NextFunction): void {
  const currentEnv = process.env.NODE_ENV || 'production';

  if (currentEnv !== 'development') {
    // Log blocked attempt for security monitoring
    console.warn(
      `[SECURITY] Blocked ${req.method} ${req.path} - Dev-only endpoint accessed in ${currentEnv} mode`
    );

    res.status(403).json({
      error: 'This endpoint is only available in development mode',
      endpoint: req.path,
      currentEnv,
      hint: 'Set NODE_ENV=development to enable observability features',
      securityNote: 'This restriction protects production environments from code evaluation and data exposure',
    });
    return;
  }

  // Dev mode confirmed, proceed
  next();
}

/**
 * Middleware to add dev-mode warning headers to responses
 *
 * Adds custom headers to responses to indicate dev-mode-only features.
 * Useful for client-side detection and warnings.
 *
 * @example
 * ```typescript
 * router.use(addDevModeHeaders);
 * ```
 */
export function addDevModeHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Dev-Mode-Only', 'true');
  res.setHeader('X-Security-Level', 'development');
  next();
}

/**
 * Check if current environment is development
 */
export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development';
}
