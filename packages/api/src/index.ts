/**
 * CV Builder API Package
 *
 * This package provides a secure REST API for the CV Builder application.
 * All agent operations are handled server-side with proper authentication
 * and security measures.
 *
 * Key features:
 * - Secure API key management via env.json
 * - RESTful endpoints for all agent operations
 * - Streaming support for real-time responses
 * - Rate limiting and security middleware
 * - Proper error handling and validation
 *
 * Usage:
 *   npm run dev    - Start development server with hot reload
 *   npm run build  - Build for production
 *   npm start      - Start production server
 */

export * from './services/agent-manager.js';
export * from './middleware/auth.js';
export * from './middleware/error-handler.js';
export * from './middleware/validation.js';
