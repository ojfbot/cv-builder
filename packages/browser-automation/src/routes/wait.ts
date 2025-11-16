/**
 * Waiting Strategy Routes
 *
 * Endpoints for waiting on various conditions
 */

import { Router, Request, Response } from 'express';
import { browserManager } from '../automation/browser.js';

const router = Router();

type WaitCondition = 'selector' | 'text' | 'network' | 'timeout' | 'url' | 'function';

interface WaitRequest {
  condition: WaitCondition;
  value?: string;
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
}

interface WaitResult {
  success: boolean;
  timeElapsed: number;
  error?: string;
}

/**
 * POST /api/wait
 * Wait for a specific condition
 */
router.post('/wait', async (req: Request, res: Response) => {
  try {
    const { condition, value, timeout = 30000, state = 'visible' }: WaitRequest = req.body;

    if (!condition) {
      res.status(400).json({
        success: false,
        error: 'Condition is required',
      });
      return;
    }

    const page = await browserManager.getPage();
    const startTime = Date.now();

    console.log(`Waiting for condition: ${condition}${value ? ` (${value})` : ''}`);

    try {
      switch (condition) {
        case 'selector':
          if (!value) {
            res.status(400).json({
              success: false,
              error: 'Selector value is required for "selector" condition',
            });
            return;
          }
          await page.waitForSelector(value, { state, timeout });
          break;

        case 'text':
          if (!value) {
            res.status(400).json({
              success: false,
              error: 'Text value is required for "text" condition',
            });
            return;
          }
          await page.locator(`text=${value}`).waitFor({ state, timeout });
          break;

        case 'network':
          // Wait for network to be idle (no more than 0 network connections for at least 500ms)
          await page.waitForLoadState('networkidle', { timeout });
          break;

        case 'timeout':
          // Simple timeout wait
          const waitTime = value ? parseInt(value, 10) : timeout;
          await page.waitForTimeout(waitTime);
          break;

        case 'url':
          if (!value) {
            res.status(400).json({
              success: false,
              error: 'URL pattern is required for "url" condition',
            });
            return;
          }
          await page.waitForURL(value, { timeout });
          break;

        case 'function':
          if (!value) {
            res.status(400).json({
              success: false,
              error: 'Function expression is required for "function" condition',
            });
            return;
          }
          // Wait for a custom function to return true
          // Note: This is evaluated in the browser context
          await page.waitForFunction(value, { timeout });
          break;

        default:
          res.status(400).json({
            success: false,
            error: `Unknown condition: ${condition}`,
          });
          return;
      }

      const timeElapsed = Date.now() - startTime;

      console.log(`Wait completed in ${timeElapsed}ms`);

      const result: WaitResult = {
        success: true,
        timeElapsed,
      };

      res.json(result);
    } catch (waitError) {
      const timeElapsed = Date.now() - startTime;
      console.error('Wait timeout or error:', waitError);

      const result: WaitResult = {
        success: false,
        timeElapsed,
        error: waitError instanceof Error ? waitError.message : 'Wait condition failed',
      };

      res.status(408).json(result);
    }
  } catch (error) {
    console.error('Wait endpoint error:', error);
    res.status(500).json({
      success: false,
      timeElapsed: 0,
      error: error instanceof Error ? error.message : 'Wait operation failed',
    });
  }
});

/**
 * POST /api/wait/load
 * Wait for page load state
 */
router.post('/wait/load', async (req: Request, res: Response) => {
  try {
    const { state = 'load', timeout = 30000 }: { state?: 'load' | 'domcontentloaded' | 'networkidle'; timeout?: number } = req.body;

    const page = await browserManager.getPage();
    const startTime = Date.now();

    console.log(`Waiting for load state: ${state}`);

    await page.waitForLoadState(state, { timeout });

    const timeElapsed = Date.now() - startTime;

    console.log(`Load state reached in ${timeElapsed}ms`);

    res.json({
      success: true,
      timeElapsed,
      state,
    });
  } catch (error) {
    const startTime = Date.now();
    const timeElapsed = Date.now() - startTime;

    console.error('Wait load error:', error);
    res.status(408).json({
      success: false,
      timeElapsed,
      error: error instanceof Error ? error.message : 'Wait for load state failed',
    });
  }
});

/**
 * POST /api/wait/element
 * Wait for element with specific attributes
 */
router.post('/wait/element', async (req: Request, res: Response) => {
  try {
    const {
      selector,
      state = 'visible',
      timeout = 30000,
    }: {
      selector: string;
      state?: 'attached' | 'detached' | 'visible' | 'hidden';
      timeout?: number;
    } = req.body;

    if (!selector) {
      res.status(400).json({
        success: false,
        error: 'Selector is required',
      });
      return;
    }

    const page = await browserManager.getPage();
    const startTime = Date.now();

    console.log(`Waiting for element: ${selector} (state: ${state})`);

    const element = page.locator(selector).first();
    await element.waitFor({ state, timeout });

    const timeElapsed = Date.now() - startTime;

    console.log(`Element found in ${timeElapsed}ms`);

    res.json({
      success: true,
      timeElapsed,
      selector,
      state,
    });
  } catch (error) {
    const startTime = Date.now();
    const timeElapsed = Date.now() - startTime;

    console.error('Wait element error:', error);
    res.status(408).json({
      success: false,
      timeElapsed,
      error: error instanceof Error ? error.message : 'Element wait failed',
    });
  }
});

export default router;
