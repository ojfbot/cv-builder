/**
 * User Interaction Actions
 *
 * Provides methods for simulating user interactions with the browser.
 */

import { Page } from 'playwright';

export interface ClickOptions {
  timeout?: number;
  force?: boolean;
  position?: { x: number; y: number };
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
}

export interface TypeOptions {
  timeout?: number;
  delay?: number; // Delay between keystrokes in ms
  clear?: boolean; // Clear existing text before typing
}

export interface HoverOptions {
  timeout?: number;
  force?: boolean;
  position?: { x: number; y: number };
}

export interface InteractionResult {
  success: boolean;
  elementFound: boolean;
  error?: string;
}

/**
 * Click on an element
 */
export async function clickElement(
  page: Page,
  selector: string,
  options: ClickOptions = {}
): Promise<InteractionResult> {
  try {
    const element = page.locator(selector).first();
    const exists = await element.count() > 0;

    if (!exists) {
      return {
        success: false,
        elementFound: false,
        error: `Element not found: ${selector}`,
      };
    }

    // Wait for element to be visible and enabled
    await element.waitFor({
      state: 'visible',
      timeout: options.timeout || 30000,
    });

    await element.click({
      force: options.force,
      position: options.position,
      button: options.button,
      clickCount: options.clickCount,
      delay: options.delay,
      timeout: options.timeout || 30000,
    });

    console.log(`Clicked element: ${selector}`);

    return {
      success: true,
      elementFound: true,
    };
  } catch (error) {
    console.error('Click error:', error);
    return {
      success: false,
      elementFound: true,
      error: error instanceof Error ? error.message : 'Click failed',
    };
  }
}

/**
 * Type text into an element
 */
export async function typeIntoElement(
  page: Page,
  selector: string,
  text: string,
  options: TypeOptions = {}
): Promise<InteractionResult> {
  try {
    const element = page.locator(selector).first();
    const exists = await element.count() > 0;

    if (!exists) {
      return {
        success: false,
        elementFound: false,
        error: `Element not found: ${selector}`,
      };
    }

    // Wait for element to be visible and enabled
    await element.waitFor({
      state: 'visible',
      timeout: options.timeout || 30000,
    });

    // Clear existing text if requested
    if (options.clear) {
      await element.clear();
    }

    // Type text using pressSequentially (replaces deprecated type method)
    await element.pressSequentially(text, {
      delay: options.delay,
      timeout: options.timeout || 30000,
    });

    console.log(`Typed text into element: ${selector}`);

    return {
      success: true,
      elementFound: true,
    };
  } catch (error) {
    console.error('Type error:', error);
    return {
      success: false,
      elementFound: true,
      error: error instanceof Error ? error.message : 'Type failed',
    };
  }
}

/**
 * Hover over an element
 */
export async function hoverOverElement(
  page: Page,
  selector: string,
  options: HoverOptions = {}
): Promise<InteractionResult> {
  try {
    const element = page.locator(selector).first();
    const exists = await element.count() > 0;

    if (!exists) {
      return {
        success: false,
        elementFound: false,
        error: `Element not found: ${selector}`,
      };
    }

    // Wait for element to be visible
    await element.waitFor({
      state: 'visible',
      timeout: options.timeout || 30000,
    });

    await element.hover({
      force: options.force,
      position: options.position,
      timeout: options.timeout || 30000,
    });

    console.log(`Hovered over element: ${selector}`);

    return {
      success: true,
      elementFound: true,
    };
  } catch (error) {
    console.error('Hover error:', error);
    return {
      success: false,
      elementFound: true,
      error: error instanceof Error ? error.message : 'Hover failed',
    };
  }
}

/**
 * Fill input element (faster than typing)
 */
export async function fillElement(
  page: Page,
  selector: string,
  text: string,
  options: { timeout?: number } = {}
): Promise<InteractionResult> {
  try {
    const element = page.locator(selector).first();
    const exists = await element.count() > 0;

    if (!exists) {
      return {
        success: false,
        elementFound: false,
        error: `Element not found: ${selector}`,
      };
    }

    await element.fill(text, {
      timeout: options.timeout || 30000,
    });

    console.log(`Filled element: ${selector}`);

    return {
      success: true,
      elementFound: true,
    };
  } catch (error) {
    console.error('Fill error:', error);
    return {
      success: false,
      elementFound: true,
      error: error instanceof Error ? error.message : 'Fill failed',
    };
  }
}

/**
 * Press a key or key combination
 */
export async function pressKey(
  page: Page,
  key: string,
  options: { delay?: number; timeout?: number } = {}
): Promise<InteractionResult> {
  try {
    await page.keyboard.press(key, {
      delay: options.delay,
    });

    console.log(`Pressed key: ${key}`);

    return {
      success: true,
      elementFound: true,
    };
  } catch (error) {
    console.error('Press key error:', error);
    return {
      success: false,
      elementFound: true,
      error: error instanceof Error ? error.message : 'Press key failed',
    };
  }
}

/**
 * Select option from dropdown
 */
export async function selectOption(
  page: Page,
  selector: string,
  value: string | string[],
  options: { timeout?: number } = {}
): Promise<InteractionResult> {
  try {
    const element = page.locator(selector).first();
    const exists = await element.count() > 0;

    if (!exists) {
      return {
        success: false,
        elementFound: false,
        error: `Element not found: ${selector}`,
      };
    }

    await element.selectOption(value, {
      timeout: options.timeout || 30000,
    });

    console.log(`Selected option in: ${selector}`);

    return {
      success: true,
      elementFound: true,
    };
  } catch (error) {
    console.error('Select option error:', error);
    return {
      success: false,
      elementFound: true,
      error: error instanceof Error ? error.message : 'Select option failed',
    };
  }
}

/**
 * Check or uncheck checkbox/radio
 */
export async function setChecked(
  page: Page,
  selector: string,
  checked: boolean,
  options: { timeout?: number; force?: boolean } = {}
): Promise<InteractionResult> {
  try {
    const element = page.locator(selector).first();
    const exists = await element.count() > 0;

    if (!exists) {
      return {
        success: false,
        elementFound: false,
        error: `Element not found: ${selector}`,
      };
    }

    await element.setChecked(checked, {
      timeout: options.timeout || 30000,
      force: options.force,
    });

    console.log(`Set checked=${checked} for: ${selector}`);

    return {
      success: true,
      elementFound: true,
    };
  } catch (error) {
    console.error('Set checked error:', error);
    return {
      success: false,
      elementFound: true,
      error: error instanceof Error ? error.message : 'Set checked failed',
    };
  }
}
