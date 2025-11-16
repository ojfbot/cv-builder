/**
 * Browser Automation Service
 *
 * Provides REST API for browser automation using Playwright.
 * Enables AI dev tools to interact with the UI, capture screenshots,
 * and test component presence.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const BROWSER_APP_URL = process.env.BROWSER_APP_URL || 'http://localhost:3000';
const HEADLESS = process.env.HEADLESS === 'true';

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint
 * Returns service status and configuration
 */
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ready',
    service: 'browser-automation',
    version: '0.1.0',
    environment: NODE_ENV,
    config: {
      browserAppUrl: BROWSER_APP_URL,
      headless: HEADLESS,
      port: PORT,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Root endpoint
 * Provides API information
 */
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'CV Builder Browser Automation Service',
    version: '0.1.0',
    description: 'Playwright-based browser automation for UI testing and screenshot capture',
    endpoints: {
      health: 'GET /health',
      docs: 'Coming in Phase 4',
    },
    playwright: {
      version: '1.40.0',
      browsers: ['chromium'],
    },
  });
});

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
  });
});

/**
 * Error handler
 */
app.use((err: Error, _req: Request, res: Response) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Browser Automation Service');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Environment:     ${NODE_ENV}`);
  console.log(`  Port:            ${PORT}`);
  console.log(`  Browser App:     ${BROWSER_APP_URL}`);
  console.log(`  Headless Mode:   ${HEADLESS}`);
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Server ready at: http://localhost:${PORT}`);
  console.log(`  Health check:    http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
