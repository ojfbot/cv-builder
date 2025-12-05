/**
 * Rate Limiting Middleware
 *
 * Provides configurable rate limiting for different endpoint types.
 * V2 endpoints (LangGraph) are more resource-intensive and have stricter limits.
 */

import rateLimit from 'express-rate-limit';

/**
 * Standard API rate limit
 * Applied to general API endpoints (V1)
 */
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

/**
 * V2 Chat rate limit
 * Stricter limit for resource-intensive LangGraph operations
 *
 * Rationale:
 * - LangGraph executions are computationally expensive
 * - Each request involves multiple LLM calls
 * - Streaming adds overhead
 * - Prevents abuse and ensures fair usage
 */
export const v2ChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 minutes (2 requests/minute)
  message: {
    success: false,
    error: 'Rate limit exceeded for V2 chat. Please try again later.',
    retryAfter: 'See Retry-After header',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests that completed quickly
  // (prevents counting health checks or quick errors against limit)
  skipSuccessfulRequests: false,
});

/**
 * V2 Thread management rate limit
 * Moderate limit for thread CRUD operations
 */
export const v2ThreadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes
  message: {
    success: false,
    error: 'Rate limit exceeded for thread operations. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * V2 Streaming rate limit
 * Stricter limit for streaming endpoints (most resource-intensive)
 *
 * Rationale:
 * - Streaming keeps connections open longer
 * - Uses server resources throughout entire conversation
 * - Multiple LLM API calls with streaming overhead
 * - Prevents connection exhaustion
 */
export const v2StreamLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // 15 stream requests per 10 minutes
  message: {
    success: false,
    error: 'Rate limit exceeded for streaming. Limit: 15 streams per 10 minutes',
    message: 'Streaming operations are resource-intensive. Please wait before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Streaming rate limit exceeded',
      retryAfter: res.getHeader('RateLimit-Reset'),
      limit: res.getHeader('RateLimit-Limit'),
      message: 'Streaming keeps connections open and is resource-intensive',
    });
  },
});

/**
 * Aggressive rate limit for unauthenticated endpoints
 * Use this for public endpoints that don't require authentication
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  message: 'Rate limit exceeded. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Development-friendly rate limit
 * More permissive for development environments
 *
 * Note: Only use in development! Set NODE_ENV=production for stricter limits
 */
export const devLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // Very permissive for dev
  message: 'Rate limit exceeded (dev mode)',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Helper to select appropriate limiter based on environment and endpoint type
 */
export function getRateLimiter(type: 'standard' | 'v2-chat' | 'v2-thread' | 'v2-stream' | 'strict') {
  // In development, use permissive limits
  if (process.env.NODE_ENV === 'development') {
    return devLimiter;
  }

  // In production, use strict limits based on endpoint type
  switch (type) {
    case 'v2-chat':
      return v2ChatLimiter;
    case 'v2-thread':
      return v2ThreadLimiter;
    case 'v2-stream':
      return v2StreamLimiter;
    case 'strict':
      return strictLimiter;
    case 'standard':
    default:
      return standardLimiter;
  }
}
