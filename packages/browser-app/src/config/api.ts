/**
 * API Configuration
 *
 * Centralized configuration for API endpoints and URLs.
 * Uses environment variables with sensible defaults for development.
 */

/**
 * Default API base URL. Loopback only in dev — a production bundle must never
 * reach for localhost (it triggers the browser's Local Network Access prompt
 * for every visitor). Empty means "no API configured".
 */
export const DEFAULT_API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : ''

/**
 * Default V2 API base URL — same dev-only rule as DEFAULT_API_BASE_URL
 */
export const DEFAULT_API_V2_BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api/v2' : ''

/**
 * Get the API base URL from environment or use default
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL
}

/**
 * Get the V2 API base URL from environment or use default
 */
export function getApiV2BaseUrl(): string {
  return import.meta.env.VITE_API_V2_URL || DEFAULT_API_V2_BASE_URL
}

/**
 * API timeout in milliseconds
 */
export const DEFAULT_API_TIMEOUT = 30000

/**
 * File upload limits
 */
export const FILE_UPLOAD_LIMITS = {
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  allowedTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/png',
    'image/jpeg',
  ],
}
