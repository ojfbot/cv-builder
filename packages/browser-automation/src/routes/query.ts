/**
 * Element Query Routes
 *
 * Endpoints for querying elements on the page.
 */

import { Router, Request, Response } from 'express';
import { browserManager } from '../automation/browser.js';

const router = Router();

/**
 * GET /api/element/exists
 * Check if element exists and is visible
 */
router.get('/element/exists', async (req: Request, res: Response) => {
  try {
    const { selector, text, role } = req.query;

    if (!selector && !text && !role) {
      res.status(400).json({
        success: false,
        error: 'At least one query parameter required: selector, text, or role',
      });
      return;
    }

    const page = await browserManager.getPage();

    let exists = false;
    let visible = false;
    let enabled = false;
    let count = 0;

    // Query by selector
    if (selector && typeof selector === 'string') {
      const elements = await page.locator(selector).all();
      count = elements.length;
      exists = count > 0;

      if (exists) {
        const firstElement = page.locator(selector).first();
        visible = await firstElement.isVisible().catch(() => false);
        enabled = await firstElement.isEnabled().catch(() => false);
      }
    }
    // Query by text
    else if (text && typeof text === 'string') {
      const elements = await page.getByText(text).all();
      count = elements.length;
      exists = count > 0;

      if (exists) {
        const firstElement = page.getByText(text).first();
        visible = await firstElement.isVisible().catch(() => false);
        enabled = await firstElement.isEnabled().catch(() => false);
      }
    }
    // Query by role
    else if (role && typeof role === 'string') {
      const elements = await page.getByRole(role as any).all();
      count = elements.length;
      exists = count > 0;

      if (exists) {
        const firstElement = page.getByRole(role as any).first();
        visible = await firstElement.isVisible().catch(() => false);
        enabled = await firstElement.isEnabled().catch(() => false);
      }
    }

    console.log(`Element query - exists: ${exists}, visible: ${visible}, count: ${count}`);

    res.json({
      success: true,
      exists,
      visible,
      enabled,
      count,
      query: { selector, text, role },
    });
  } catch (error) {
    console.error('Element query error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Element query failed',
    });
  }
});

/**
 * GET /api/element/text
 * Get text content of element
 */
router.get('/element/text', async (req: Request, res: Response) => {
  try {
    const { selector } = req.query;

    if (!selector || typeof selector !== 'string') {
      res.status(400).json({
        success: false,
        error: 'selector query parameter is required',
      });
      return;
    }

    const page = await browserManager.getPage();
    const element = page.locator(selector).first();

    const exists = await element.count() > 0;
    if (!exists) {
      res.status(404).json({
        success: false,
        error: 'Element not found',
      });
      return;
    }

    const text = await element.textContent();

    res.json({
      success: true,
      text: text || '',
      selector,
    });
  } catch (error) {
    console.error('Get text error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get text',
    });
  }
});

/**
 * GET /api/element/attribute
 * Get attribute value of element
 */
router.get('/element/attribute', async (req: Request, res: Response) => {
  try {
    const { selector, attribute } = req.query;

    if (!selector || typeof selector !== 'string') {
      res.status(400).json({
        success: false,
        error: 'selector query parameter is required',
      });
      return;
    }

    if (!attribute || typeof attribute !== 'string') {
      res.status(400).json({
        success: false,
        error: 'attribute query parameter is required',
      });
      return;
    }

    const page = await browserManager.getPage();
    const element = page.locator(selector).first();

    const exists = await element.count() > 0;
    if (!exists) {
      res.status(404).json({
        success: false,
        error: 'Element not found',
      });
      return;
    }

    const value = await element.getAttribute(attribute);

    res.json({
      success: true,
      value,
      selector,
      attribute,
    });
  } catch (error) {
    console.error('Get attribute error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get attribute',
    });
  }
});

export default router;
