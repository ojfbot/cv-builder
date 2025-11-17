/**
 * Element Discovery API Routes
 *
 * Endpoints for element map operations, semantic search, and validation.
 */

import express, { Request, Response } from 'express';
import {
  loadElementMap,
  searchElements,
  validateElementMap,
  updateElementMap,
  countElements,
  getCategories,
  getElementsInCategory,
  getElementByPath,
} from '../maps/index.js';
import { browserManager } from '../automation/browser.js';

const router = express.Router();

/**
 * GET /api/elements/map
 *
 * Returns the full element map for an application
 *
 * Query params:
 * - app: Application name (default: 'cv-builder')
 */
router.get('/elements/map', async (req: Request, res: Response) => {
  try {
    const app = (req.query.app as string) || 'cv-builder';

    const map = await loadElementMap(app);

    return res.status(200).json({
      success: true,
      map,
      stats: {
        totalElements: countElements(map),
        categories: getCategories(map),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load element map',
    });
  }
});

/**
 * GET /api/elements/search
 *
 * Search for elements using fuzzy matching
 *
 * Query params:
 * - q: Search query (required)
 * - app: Application name (default: 'cv-builder')
 * - limit: Max results to return (default: 10)
 */
router.get('/elements/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const app = (req.query.app as string) || 'cv-builder';
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const map = await loadElementMap(app);
    const results = searchElements(map, query);

    // Limit results
    const limitedResults = results.slice(0, limit);

    return res.status(200).json({
      success: true,
      query,
      results: limitedResults,
      totalResults: results.length,
      limit,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    });
  }
});

/**
 * GET /api/elements/categories
 *
 * Get all element categories
 *
 * Query params:
 * - app: Application name (default: 'cv-builder')
 */
router.get('/elements/categories', async (req: Request, res: Response) => {
  try {
    const app = (req.query.app as string) || 'cv-builder';

    const map = await loadElementMap(app);
    const categories = getCategories(map);

    return res.status(200).json({
      success: true,
      categories,
      count: categories.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get categories',
    });
  }
});

/**
 * GET /api/elements/category/:name
 *
 * Get all elements in a specific category
 *
 * URL params:
 * - name: Category name
 *
 * Query params:
 * - app: Application name (default: 'cv-builder')
 */
router.get('/elements/category/:name', async (req: Request, res: Response) => {
  try {
    const categoryName = req.params.name;
    const app = (req.query.app as string) || 'cv-builder';

    const map = await loadElementMap(app);
    const elements = getElementsInCategory(map, categoryName);

    return res.status(200).json({
      success: true,
      category: categoryName,
      elements,
      count: elements.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get category elements',
    });
  }
});

/**
 * GET /api/elements/get/:path
 *
 * Get a specific element by its path
 *
 * URL params:
 * - path: Element path (e.g., "navigation.tabs.bio")
 *
 * Query params:
 * - app: Application name (default: 'cv-builder')
 */
router.get('/elements/get/:path(*)', async (req: Request, res: Response) => {
  try {
    const elementPath = req.params.path;
    const app = (req.query.app as string) || 'cv-builder';

    const map = await loadElementMap(app);
    const element = getElementByPath(map, elementPath);

    if (!element) {
      return res.status(404).json({
        success: false,
        error: `Element not found at path: ${elementPath}`,
      });
    }

    return res.status(200).json({
      success: true,
      path: elementPath,
      element,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get element',
    });
  }
});

/**
 * POST /api/elements/validate
 *
 * Validate element map selectors against current page
 *
 * Body:
 * - app: Application name (default: 'cv-builder')
 * - strict: Fail on warnings (default: false)
 */
router.post('/elements/validate', async (req: Request, res: Response) => {
  try {
    const { app = 'cv-builder', strict = false } = req.body;

    // Get current page
    const page = await browserManager.getPage();

    if (!page) {
      return res.status(400).json({
        success: false,
        error: 'No browser page available. Navigate to a page first.',
      });
    }

    // Load and validate map
    const map = await loadElementMap(app);
    const validation = await validateElementMap(map, page);

    const success = strict ? validation.valid && validation.warningElements === 0 : validation.valid;

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
 * POST /api/elements/update
 *
 * Update or create an element in the map
 *
 * Body:
 * - app: Application name (default: 'cv-builder')
 * - path: Element path (e.g., "navigation.tabs.settings")
 * - element: Element descriptor object
 */
router.post('/elements/update', async (req: Request, res: Response) => {
  try {
    const { app = 'cv-builder', path: elementPath, element } = req.body;

    if (!elementPath) {
      return res.status(400).json({
        success: false,
        error: 'Element path is required',
      });
    }

    if (!element || !element.selector || !element.description || !element.type) {
      return res.status(400).json({
        success: false,
        error: 'Element must include selector, description, and type',
      });
    }

    await updateElementMap(app, { path: elementPath, element });

    return res.status(200).json({
      success: true,
      message: `Element updated at path: ${elementPath}`,
      path: elementPath,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Update failed',
    });
  }
});

export default router;
