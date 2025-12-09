/**
 * API Configuration
 *
 * Centralized configuration for API endpoints and URLs.
 * Uses environment variables with sensible defaults for development.
 */

/**
 * Default API base URL for development
 */
export const DEFAULT_API_BASE_URL = 'http://localhost:3001/api'

/**
 * Get the API base URL from environment or use default
 */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL
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
