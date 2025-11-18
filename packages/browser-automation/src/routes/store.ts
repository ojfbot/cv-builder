/**
 * Store Query API Routes
 *
 * Endpoints for querying application state (Redux, MobX, etc.).
 */

import express, { Request, Response } from 'express';
import {
  loadStoreMap,
  queryStore,
  waitForStoreState,
  getStoreSnapshot,
  validateStoreMap,
} from '../maps/index.js';
import { browserManager } from '../automation/browser.js';
import { requireDevMode, evaluateLimiter } from '../middleware/index.js';

/**
 * Configuration constants for state evaluation
 */
const DEFAULT_EVALUATION_TIMEOUT_MS = 5000; // Default timeout for JavaScript evaluation
const MAX_EVALUATION_TIMEOUT_MS = 30000; // Maximum allowed timeout
const MAX_EXPRESSION_LENGTH = 10000; // Maximum length for evaluation expressions

const router = express.Router();

/**
 * GET /api/store/schema
 *
 * Returns the store map schema for an application
 *
 * Query params:
 * - app: Application name (default: 'cv-builder')
 */
router.get('/store/schema', async (req: Request, res: Response) => {
  try {
    const app = (req.query.app as string) || 'cv-builder';

    const storeMap = await loadStoreMap(app);

    return res.status(200).json({
      success: true,
      storeMap,
      queries: Object.keys(storeMap.queries),
      queryCount: Object.keys(storeMap.queries).length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load store map',
    });
  }
});

/**
 * POST /api/store/query
 *
 * Query application state by query name
 *
 * Body:
 * - app: Application name (default: 'cv-builder')
 * - query: Query name from store map (required)
 */
router.post('/store/query', async (req: Request, res: Response) => {
  try {
    const { app = 'cv-builder', query: queryName } = req.body;

    if (!queryName) {
      return res.status(400).json({
        success: false,
        error: 'Query name is required',
      });
    }

    // Get current page
    const page = await browserManager.getPage();

    if (!page) {
      return res.status(400).json({
        success: false,
        error: 'No browser page available. Navigate to a page first.',
      });
    }

    // Load store map and get query definition
    const storeMap = await loadStoreMap(app);
    const queryDef = storeMap.queries[queryName];

    if (!queryDef) {
      return res.status(404).json({
        success: false,
        error: `Query not found: ${queryName}`,
        availableQueries: Object.keys(storeMap.queries),
      });
    }

    // Execute query
    const result = await queryStore(page, storeMap, queryDef);

    return res.status(200).json({
      success: true,
      query: queryName,
      queryPath: queryDef.path,
      result,
      type: typeof result,
      expectedType: queryDef.type,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Query failed',
    });
  }
});

/**
 * POST /api/store/wait
 *
 * Wait for store state to match expected value
 *
 * Body:
 * - app: Application name (default: 'cv-builder')
 * - query: Query name from store map (required)
 * - value: Expected value to wait for (required)
 * - timeout: Timeout in milliseconds (default: 30000)
 * - pollInterval: Polling interval in milliseconds (default: 100)
 */
router.post('/store/wait', async (req: Request, res: Response) => {
  try {
    const { app = 'cv-builder', query: queryName, value, timeout = 30000, pollInterval = 100 } = req.body;

    if (!queryName) {
      return res.status(400).json({
        success: false,
        error: 'Query name is required',
      });
    }

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Expected value is required',
      });
    }

    // Get current page
    const page = await browserManager.getPage();

    if (!page) {
      return res.status(400).json({
        success: false,
        error: 'No browser page available. Navigate to a page first.',
      });
    }

    // Load store map and get query definition
    const storeMap = await loadStoreMap(app);
    const queryDef = storeMap.queries[queryName];

    if (!queryDef) {
      return res.status(404).json({
        success: false,
        error: `Query not found: ${queryName}`,
        availableQueries: Object.keys(storeMap.queries),
      });
    }

    // Wait for state condition
    const result = await waitForStoreState(page, storeMap, queryDef, value, timeout, pollInterval);

    if (!result.success) {
      return res.status(408).json({
        success: false,
        error: 'Timeout waiting for state condition',
        query: queryName,
        expectedValue: value,
        actualValue: result.actualValue,
        timeout,
        elapsed: result.elapsed,
        timestamp: result.timestamp,
      });
    }

    return res.status(200).json({
      success: true,
      query: queryName,
      value,
      elapsed: result.elapsed,
      timestamp: result.timestamp,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Wait failed',
    });
  }
});

/**
 * GET /api/store/snapshot
 *
 * Get full store snapshot (dev mode only for security)
 *
 * Query params:
 * - app: Application name (default: 'cv-builder')
 */
router.get('/store/snapshot', requireDevMode, async (req: Request, res: Response) => {
  try {
    const app = (req.query.app as string) || 'cv-builder';

    // Get current page
    const page = await browserManager.getPage();

    if (!page) {
      return res.status(400).json({
        success: false,
        error: 'No browser page available. Navigate to a page first.',
      });
    }

    // Load store map
    const storeMap = await loadStoreMap(app);

    // Get full snapshot
    const snapshot = await getStoreSnapshot(page, storeMap);

    return res.status(200).json({
      success: true,
      snapshot,
      storeType: storeMap.storeType,
      timestamp: new Date().toISOString(),
      devModeOnly: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Snapshot failed',
    });
  }
});

/**
 * POST /api/store/validate
 *
 * Validate store map against live page
 *
 * Body:
 * - app: Application name (default: 'cv-builder')
 */
router.post('/store/validate', async (req: Request, res: Response) => {
  try {
    const { app = 'cv-builder' } = req.body;

    // Get current page
    const page = await browserManager.getPage();

    if (!page) {
      return res.status(400).json({
        success: false,
        error: 'No browser page available. Navigate to a page first.',
      });
    }

    // Load and validate store map
    const storeMap = await loadStoreMap(app);
    const validation = await validateStoreMap(page, storeMap);

    const success = validation.accessible && validation.queriesValid;

    return res.status(success ? 200 : 400).json({
      success,
      validation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    });
  }
});

/**
 * POST /api/store/evaluate
 *
 * Execute arbitrary JavaScript in the browser context (dev mode only, rate limited)
 *
 * **SECURITY WARNING**: This endpoint allows code execution in the browser context.
 * It is restricted to development mode and rate limited to prevent abuse.
 *
 * Use cases:
 * - Debugging application state
 * - Testing complex state queries
 * - Inspecting non-Redux state
 *
 * Prefer using /api/store/query for structured state access when possible.
 *
 * Body:
 * - expression: JavaScript expression to evaluate (required)
 * - timeout: Timeout in milliseconds (default: 5000, max: 30000)
 *
 * @example
 * POST /api/store/evaluate
 * {
 *   "expression": "document.querySelectorAll('.active-tab').length",
 *   "timeout": 5000
 * }
 */
router.post('/store/evaluate', requireDevMode, evaluateLimiter, async (req: Request, res: Response) => {
  try {
    const { expression, timeout = DEFAULT_EVALUATION_TIMEOUT_MS } = req.body;

    if (!expression || typeof expression !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Expression is required and must be a string',
        example: '{ "expression": "window.location.href" }',
      });
    }

    // Validate expression length to prevent resource exhaustion
    if (expression.length > MAX_EXPRESSION_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Expression exceeds maximum length of ${MAX_EXPRESSION_LENGTH} characters`,
        actualLength: expression.length,
        maxLength: MAX_EXPRESSION_LENGTH,
      });
    }

    // Validate timeout
    const safeTimeout = Math.min(Math.max(timeout, 100), MAX_EVALUATION_TIMEOUT_MS);

    if (safeTimeout !== timeout) {
      console.warn(`[EVALUATE] Timeout adjusted: ${timeout}ms → ${safeTimeout}ms`);
    }

    // Get current page
    const page = await browserManager.getPage();

    if (!page) {
      return res.status(400).json({
        success: false,
        error: 'No browser page available. Navigate to a page first.',
      });
    }

    const startTime = Date.now();

    // Execute expression in browser context (sandboxed by Playwright)
    const result = await page.evaluate(
      (expr) => {
        try {
          // eslint-disable-next-line no-eval
          return { success: true, value: eval(expr) };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Evaluation failed',
            name: error instanceof Error ? error.name : 'Error',
          };
        }
      },
      expression
    );

    const executionTime = Date.now() - startTime;

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Evaluation failed in browser context',
        details: result.error,
        errorName: result.name,
        expression,
        executionTime,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      result: result.value,
      type: typeof result.value,
      executionTime,
      expression,
      devModeOnly: true,
      securityNote: 'This endpoint is restricted to development mode and rate limited',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[EVALUATE] Execution error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Evaluation failed',
      hint: 'Check browser console for details',
    });
  }
});

export default router;
