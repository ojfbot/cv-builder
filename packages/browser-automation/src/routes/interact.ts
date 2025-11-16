/**
 * Interaction Routes
 *
 * Endpoints for user interactions (click, type, hover, etc.)
 */

import { Router, Request, Response } from 'express';
import { browserManager } from '../automation/browser.js';
import {
  clickElement,
  typeIntoElement,
  hoverOverElement,
  fillElement,
  pressKey,
  selectOption,
  setChecked,
  ClickOptions,
  TypeOptions,
  HoverOptions,
} from '../automation/actions.js';

const router = Router();

interface ClickRequest {
  selector: string;
  options?: ClickOptions;
}

interface TypeRequest {
  selector: string;
  text: string;
  options?: TypeOptions;
}

interface FillRequest {
  selector: string;
  text: string;
  timeout?: number;
}

interface HoverRequest {
  selector: string;
  options?: HoverOptions;
}

interface KeyPressRequest {
  key: string;
  delay?: number;
}

interface SelectRequest {
  selector: string;
  value: string | string[];
  timeout?: number;
}

interface CheckedRequest {
  selector: string;
  checked: boolean;
  timeout?: number;
  force?: boolean;
}

/**
 * POST /api/interact/click
 * Click on an element
 */
router.post('/interact/click', async (req: Request, res: Response) => {
  try {
    const { selector, options }: ClickRequest = req.body;

    if (!selector) {
      res.status(400).json({
        success: false,
        error: 'Selector is required',
      });
      return;
    }

    const page = await browserManager.getPage();
    const result = await clickElement(page, selector, options);

    if (!result.success) {
      res.status(result.elementFound ? 500 : 404).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Click endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Click operation failed',
    });
  }
});

/**
 * POST /api/interact/type
 * Type text into an element
 */
router.post('/interact/type', async (req: Request, res: Response) => {
  try {
    const { selector, text, options }: TypeRequest = req.body;

    if (!selector || text === undefined) {
      res.status(400).json({
        success: false,
        error: 'Selector and text are required',
      });
      return;
    }

    const page = await browserManager.getPage();
    const result = await typeIntoElement(page, selector, text, options);

    if (!result.success) {
      res.status(result.elementFound ? 500 : 404).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Type endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Type operation failed',
    });
  }
});

/**
 * POST /api/interact/fill
 * Fill input element (faster than typing)
 */
router.post('/interact/fill', async (req: Request, res: Response) => {
  try {
    const { selector, text, timeout }: FillRequest = req.body;

    if (!selector || text === undefined) {
      res.status(400).json({
        success: false,
        error: 'Selector and text are required',
      });
      return;
    }

    const page = await browserManager.getPage();
    const result = await fillElement(page, selector, text, { timeout });

    if (!result.success) {
      res.status(result.elementFound ? 500 : 404).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Fill endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Fill operation failed',
    });
  }
});

/**
 * POST /api/interact/hover
 * Hover over an element
 */
router.post('/interact/hover', async (req: Request, res: Response) => {
  try {
    const { selector, options }: HoverRequest = req.body;

    if (!selector) {
      res.status(400).json({
        success: false,
        error: 'Selector is required',
      });
      return;
    }

    const page = await browserManager.getPage();
    const result = await hoverOverElement(page, selector, options);

    if (!result.success) {
      res.status(result.elementFound ? 500 : 404).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Hover endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Hover operation failed',
    });
  }
});

/**
 * POST /api/interact/press
 * Press a key or key combination
 */
router.post('/interact/press', async (req: Request, res: Response) => {
  try {
    const { key, delay }: KeyPressRequest = req.body;

    if (!key) {
      res.status(400).json({
        success: false,
        error: 'Key is required',
      });
      return;
    }

    const page = await browserManager.getPage();
    const result = await pressKey(page, key, { delay });

    res.json(result);
  } catch (error) {
    console.error('Press key endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Press key operation failed',
    });
  }
});

/**
 * POST /api/interact/select
 * Select option from dropdown
 */
router.post('/interact/select', async (req: Request, res: Response) => {
  try {
    const { selector, value, timeout }: SelectRequest = req.body;

    if (!selector || value === undefined) {
      res.status(400).json({
        success: false,
        error: 'Selector and value are required',
      });
      return;
    }

    const page = await browserManager.getPage();
    const result = await selectOption(page, selector, value, { timeout });

    if (!result.success) {
      res.status(result.elementFound ? 500 : 404).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Select endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Select operation failed',
    });
  }
});

/**
 * POST /api/interact/check
 * Check or uncheck checkbox/radio
 */
router.post('/interact/check', async (req: Request, res: Response) => {
  try {
    const { selector, checked, timeout, force }: CheckedRequest = req.body;

    if (!selector || checked === undefined) {
      res.status(400).json({
        success: false,
        error: 'Selector and checked state are required',
      });
      return;
    }

    const page = await browserManager.getPage();
    const result = await setChecked(page, selector, checked, { timeout, force });

    if (!result.success) {
      res.status(result.elementFound ? 500 : 404).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('Check endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Check operation failed',
    });
  }
});

export default router;
