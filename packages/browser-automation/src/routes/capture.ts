/**
 * Screenshot Capture Routes
 *
 * Endpoints for capturing screenshots.
 */

import { Router, Request, Response } from 'express';
import { browserManager } from '../automation/browser.js';
import { captureScreenshot, listSessions, listScreenshotsInSession, ImageFormat } from '../automation/screenshots.js';
import { ViewportPreset, ViewportSize } from '../automation/viewport.js';

const router = Router();

interface CaptureRequest {
  name: string;
  fullPage?: boolean;
  selector?: string;
  sessionDir?: string;
  viewport?: ViewportPreset | ViewportSize;
  format?: ImageFormat;
  quality?: number;
}

/**
 * POST /api/screenshot
 * Capture screenshot
 */
router.post('/screenshot', async (req: Request, res: Response) => {
  try {
    const { name, fullPage = true, selector, sessionDir, viewport, format, quality }: CaptureRequest = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        error: 'Screenshot name is required',
      });
      return;
    }

    // Validate quality if provided
    if (quality !== undefined && (quality < 0 || quality > 100)) {
      res.status(400).json({
        success: false,
        error: 'Quality must be between 0 and 100',
      });
      return;
    }

    const page = await browserManager.getPage();
    const currentUrl = page.url();

    if (!currentUrl || currentUrl === 'about:blank') {
      res.status(400).json({
        success: false,
        error: 'Navigate to a page first before capturing screenshot',
      });
      return;
    }

    console.log(`Capturing screenshot: ${name}`);
    if (selector) {
      console.log(`  Element: ${selector}`);
    }
    console.log(`  Full page: ${fullPage}`);
    if (viewport) {
      console.log(`  Viewport: ${typeof viewport === 'string' ? viewport : `${viewport.width}x${viewport.height}`}`);
    }
    if (format) {
      console.log(`  Format: ${format}`);
    }
    console.log(`  Current URL: ${currentUrl}`);

    const result = await captureScreenshot(page, {
      name,
      fullPage,
      selector,
      path: sessionDir,
      viewport,
      format,
      quality,
    });

    res.json(result);
  } catch (error) {
    console.error('Screenshot capture error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Screenshot capture failed',
    });
  }
});

/**
 * GET /api/screenshot/sessions
 * List all screenshot sessions
 */
router.get('/screenshot/sessions', async (_req: Request, res: Response) => {
  try {
    const sessions = await listSessions();

    res.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list sessions',
    });
  }
});

/**
 * GET /api/screenshot/sessions/:sessionId
 * List screenshots in a session
 */
router.get('/screenshot/sessions/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const screenshots = await listScreenshotsInSession(sessionId);

    res.json({
      success: true,
      sessionId,
      screenshots,
      count: screenshots.length,
    });
  } catch (error) {
    console.error('Error listing screenshots:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list screenshots',
    });
  }
});

export default router;
