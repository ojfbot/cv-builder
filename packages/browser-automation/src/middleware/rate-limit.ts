import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for console access endpoints
 *
 * Limits: 30 requests per minute
 * Use case: Prevent abuse of console log retrieval
 */
export const consoleLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    error: 'Too many console requests',
    hint: 'Maximum 30 requests per minute',
    retryAfter: '60 seconds',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    console.warn(`[RATE LIMIT] Console endpoint ${req.path} exceeded rate limit`);
    res.status(429).json({
      error: 'Too many console requests',
      endpoint: req.path,
      limit: 30,
      window: '1 minute',
      hint: 'Please reduce request frequency',
    });
  },
});

/**
 * Rate limiter for state evaluation endpoint
 *
 * Limits: 10 requests per minute
 * Use case: Prevent abuse of JavaScript evaluation (more restrictive)
 */
export const evaluateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too many evaluation requests',
    hint: 'Maximum 10 evaluations per minute',
    retryAfter: '60 seconds',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[RATE LIMIT] Evaluation endpoint exceeded rate limit`);
    res.status(429).json({
      error: 'Too many evaluation requests',
      endpoint: req.path,
      limit: 10,
      window: '1 minute',
      hint: 'JavaScript evaluation is rate-limited for security. Please reduce frequency.',
      suggestion: 'Consider using store queries instead of evaluate for state inspection',
    });
  },
});

/**
 * Rate limiter for error tracking endpoints
 *
 * Limits: 20 requests per minute
 * Use case: Prevent abuse of error retrieval
 */
export const errorLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    error: 'Too many error tracking requests',
    retryAfter: '60 seconds',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[RATE LIMIT] Error tracking endpoint ${req.path} exceeded rate limit`);
    res.status(429).json({
      error: 'Too many error tracking requests',
      endpoint: req.path,
      limit: 20,
      window: '1 minute',
    });
  },
});
