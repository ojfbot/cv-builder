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
 * Helper to select appropriate limiter based on environment
 */
export function getRateLimiter(type: 'standard' | 'v2-chat' | 'v2-thread' | 'strict') {
  // In development, use permissive limits
  if (process.env.NODE_ENV === 'development') {
    return devLimiter;
  }

  // In production, use strict limits
  switch (type) {
    case 'v2-chat':
      return v2ChatLimiter;
    case 'v2-thread':
      return v2ThreadLimiter;
    case 'strict':
      return strictLimiter;
    case 'standard':
    default:
      return standardLimiter;
  }
}
