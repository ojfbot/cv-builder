/**
 * Navigation Routes
 *
 * Endpoints for browser navigation and page control.
 */

import { Router, Request, Response } from 'express';
import { browserManager } from '../automation/browser.js';

const router = Router();

interface NavigateRequest {
  url: string;
  waitFor?: 'load' | 'networkidle' | 'domcontentloaded';
  timeout?: number;
}

/**
 * POST /api/navigate
 * Navigate to a URL
 */
router.post('/navigate', async (req: Request, res: Response) => {
  try {
    const { url, waitFor = 'load', timeout = 30000 }: NavigateRequest = req.body;

    if (!url) {
      res.status(400).json({
        success: false,
        error: 'URL is required',
      });
      return;
    }

    console.log(`Navigating to: ${url} (waitFor: ${waitFor})`);

    const page = await browserManager.getPage();

    await page.goto(url, {
      waitUntil: waitFor,
      timeout,
    });

    const currentUrl = page.url();
    console.log(`Navigation successful: ${currentUrl}`);

    res.json({
      success: true,
      currentUrl,
      title: await page.title(),
    });
  } catch (error) {
    console.error('Navigation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Navigation failed',
    });
  }
});

/**
 * GET /api/navigate/current
 * Get current URL
 */
router.get('/navigate/current', async (_req: Request, res: Response) => {
  try {
    const status = browserManager.getStatus();

    if (!status.running) {
      res.status(400).json({
        success: false,
        error: 'Browser not running',
      });
      return;
    }

    const page = await browserManager.getPage();

    res.json({
      success: true,
      currentUrl: page.url(),
      title: await page.title(),
    });
  } catch (error) {
    console.error('Error getting current URL:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get current URL',
    });
  }
});

/**
 * POST /api/navigate/back
 * Navigate back in history
 */
router.post('/navigate/back', async (_req: Request, res: Response) => {
  try {
    const page = await browserManager.getPage();
    await page.goBack({ waitUntil: 'load' });

    res.json({
      success: true,
      currentUrl: page.url(),
    });
  } catch (error) {
    console.error('Error navigating back:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to navigate back',
    });
  }
});

/**
 * POST /api/navigate/reload
 * Reload current page
 */
router.post('/navigate/reload', async (_req: Request, res: Response) => {
  try {
    const page = await browserManager.getPage();
    await page.reload({ waitUntil: 'load' });

    res.json({
      success: true,
      currentUrl: page.url(),
    });
  } catch (error) {
    console.error('Error reloading page:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reload page',
    });
  }
});

export default router;
