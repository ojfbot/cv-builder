/**
 * Browser Automation Service
 *
 * Provides REST API for browser automation using Playwright.
 * Enables AI dev tools to interact with the UI, capture screenshots,
 * and test component presence.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import navigateRoutes from './routes/navigate.js';
import queryRoutes from './routes/query.js';
import captureRoutes from './routes/capture.js';
import interactRoutes from './routes/interact.js';
import waitRoutes from './routes/wait.js';
import docsRoutes from './routes/docs.js';
import githubRoutes from './routes/github.js';
import { browserManager } from './automation/browser.js';
import { scheduleCleanup } from './automation/cleanup.js';

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

// API Documentation Routes
app.use('/', docsRoutes); // Swagger UI at /api-docs

// API Routes
app.use('/api', navigateRoutes);
app.use('/api', queryRoutes);
app.use('/api', captureRoutes);
app.use('/api', interactRoutes);
app.use('/api', waitRoutes);
app.use('/api/github', githubRoutes);

/**
 * Health check endpoint
 * Returns service status and configuration
 */
app.get('/health', async (_req: Request, res: Response) => {
  const browserStatus = browserManager.getStatus();
  res.status(200).json({
    status: browserStatus.running ? 'ready' : 'idle',
    service: 'browser-automation',
    version: '0.2.0',
    environment: NODE_ENV,
    browser: browserStatus,
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
    version: '0.3.0',
    description: 'Playwright-based browser automation for UI testing and screenshot capture',
    endpoints: {
      health: 'GET /health',
      navigate: 'POST /api/navigate',
      query: 'GET /api/element/exists',
      screenshot: 'POST /api/screenshot',
      sessions: 'GET /api/screenshot/sessions',
      interactions: {
        click: 'POST /api/interact/click',
        type: 'POST /api/interact/type',
        fill: 'POST /api/interact/fill',
        hover: 'POST /api/interact/hover',
        press: 'POST /api/interact/press',
        select: 'POST /api/interact/select',
        check: 'POST /api/interact/check',
      },
      waiting: {
        wait: 'POST /api/wait',
        waitLoad: 'POST /api/wait/load',
        waitElement: 'POST /api/wait/element',
      },
      docs: 'GET /api-docs (Swagger UI)',
      openapi: 'GET /openapi.yaml, GET /openapi.json',
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

  // Start cleanup scheduler
  scheduleCleanup();
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
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await browserManager.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  await browserManager.close();
  process.exit(0);
});
