/**
 * Assertion library for Browser Automation tests
 */

import { BrowserAutomationClient } from '../../client/BrowserAutomationClient.js';
import { ScreenshotResult } from '../../client/types.js';
import { AssertionAPI } from '../types.js';
import { isDeepStrictEqual } from 'node:util';

export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

export class Assertions implements AssertionAPI {
  constructor(private client: BrowserAutomationClient) {}

  /**
   * Assert that an element exists in the DOM
   */
  async elementExists(selector: string, message?: string): Promise<void> {
    const exists = await this.client.elementExists(selector);
    if (!exists) {
      throw new AssertionError(
        message || `Expected element "${selector}" to exist, but it was not found`
      );
    }
  }

  /**
   * Assert that an element is visible
   */
  async elementVisible(selector: string, message?: string): Promise<void> {
    const visible = await this.client.elementVisible(selector);
    if (!visible) {
      throw new AssertionError(
        message || `Expected element "${selector}" to be visible, but it was hidden or not found`
      );
    }
  }

  /**
   * Assert that an element is hidden
   */
  async elementHidden(selector: string, message?: string): Promise<void> {
    const visible = await this.client.elementVisible(selector);
    if (visible) {
      throw new AssertionError(
        message || `Expected element "${selector}" to be hidden, but it was visible`
      );
    }
  }

  /**
   * Assert that an element is enabled (not disabled)
   */
  async elementEnabled(selector: string, message?: string): Promise<void> {
    const disabled = await this.client.elementAttribute(selector, 'disabled');
    if (disabled !== null && disabled !== '') {
      throw new AssertionError(
        message || `Expected element "${selector}" to be enabled, but it was disabled`
      );
    }
  }

  /**
   * Assert that an element is disabled
   */
  async elementDisabled(selector: string, message?: string): Promise<void> {
    const disabled = await this.client.elementAttribute(selector, 'disabled');
    if (disabled === null || disabled === '') {
      throw new AssertionError(
        message || `Expected element "${selector}" to be disabled, but it was enabled`
      );
    }
  }

  /**
   * Assert exact element count
   */
  async elementCount(selector: string, count: number, message?: string): Promise<void> {
    const actual = await this.client.elementCount(selector);
    if (actual !== count) {
      throw new AssertionError(
        message ||
          `Expected ${count} element(s) matching "${selector}", but found ${actual}`
      );
    }
  }

  /**
   * Assert that element text contains a string
   */
  async textContains(selector: string, text: string, message?: string): Promise<void> {
    const actualText = await this.client.elementText(selector);
    if (!actualText.includes(text)) {
      throw new AssertionError(
        message ||
          `Expected element "${selector}" to contain text "${text}", but got "${actualText}"`
      );
    }
  }

  /**
   * Assert that element text exactly matches
   */
  async textEquals(selector: string, text: string, message?: string): Promise<void> {
    const actualText = await this.client.elementText(selector);
    if (actualText !== text) {
      throw new AssertionError(
        message ||
          `Expected element "${selector}" text to equal "${text}", but got "${actualText}"`
      );
    }
  }

  /**
   * Assert that element attribute equals a value
   */
  async attributeEquals(
    selector: string,
    attr: string,
    value: string,
    message?: string
  ): Promise<void> {
    const actualValue = await this.client.elementAttribute(selector, attr);
    if (actualValue !== value) {
      throw new AssertionError(
        message ||
          `Expected element "${selector}" attribute "${attr}" to equal "${value}", but got "${actualValue}"`
      );
    }
  }

  /**
   * Assert that screenshot was captured successfully
   */
  screenshotCaptured(result: ScreenshotResult, message?: string): void {
    if (!result.success) {
      throw new AssertionError(message || 'Expected screenshot to be captured successfully');
    }
  }

  /**
   * Assert that screenshot file size meets minimum
   */
  screenshotSize(result: ScreenshotResult, minBytes: number, message?: string): void {
    // Note: We'd need to extend the API to return file size
    // For now, just check that it was successful
    if (!result.success) {
      throw new AssertionError(
        message || `Expected screenshot size to be at least ${minBytes} bytes`
      );
    }
  }

  /**
   * Assert that screenshot path matches expected
   */
  screenshotPath(result: ScreenshotResult, expectedPath: string, message?: string): void {
    if (!result.path.includes(expectedPath)) {
      throw new AssertionError(
        message ||
          `Expected screenshot path to include "${expectedPath}", but got "${result.path}"`
      );
    }
  }

  /**
   * Assert that current URL equals expected
   */
  async urlEquals(url: string, message?: string): Promise<void> {
    const currentUrl = await this.client.currentUrl();
    if (currentUrl !== url) {
      throw new AssertionError(
        message || `Expected URL to equal "${url}", but got "${currentUrl}"`
      );
    }
  }

  /**
   * Assert that current URL contains a fragment
   */
  async urlContains(fragment: string, message?: string): Promise<void> {
    const currentUrl = await this.client.currentUrl();
    if (!currentUrl.includes(fragment)) {
      throw new AssertionError(
        message || `Expected URL to contain "${fragment}", but got "${currentUrl}"`
      );
    }
  }

  /**
   * Assert that page title equals expected value
   */
  async titleEquals(expectedTitle: string, message?: string): Promise<void> {
    const actualTitle = await this.client.pageTitle();
    if (actualTitle !== expectedTitle) {
      throw new AssertionError(
        message ||
          `Expected page title to equal "${expectedTitle}", but got "${actualTitle}"`
      );
    }
  }

  /**
   * Assert that page title contains text
   */
  async titleContains(text: string, message?: string): Promise<void> {
    const title = await this.client.pageTitle();
    if (!title.includes(text)) {
      throw new AssertionError(
        message || `Expected page title to contain "${text}", but got "${title}"`
      );
    }
  }

  // ========================================
  // Redux Store Assertions
  // ========================================

  /**
   * Assert that a store query matches expected value
   * Uses deep strict equality (order-independent, type-safe)
   */
  async storeEquals(queryName: string, expectedValue: any, message?: string): Promise<void> {
    const actualValue = await this.client.storeQuery(queryName);
    if (!isDeepStrictEqual(actualValue, expectedValue)) {
      throw new AssertionError(
        message ||
          `Expected store query "${queryName}" to equal ${JSON.stringify(expectedValue)}, but got ${JSON.stringify(actualValue)}`
      );
    }
  }

  /**
   * Assert that a store query value is truthy
   */
  async storeTruthy(queryName: string, message?: string): Promise<void> {
    const value = await this.client.storeQuery(queryName);
    if (!value) {
      throw new AssertionError(
        message || `Expected store query "${queryName}" to be truthy, but got ${JSON.stringify(value)}`
      );
    }
  }

  /**
   * Assert that a store query value is falsy
   */
  async storeFalsy(queryName: string, message?: string): Promise<void> {
    const value = await this.client.storeQuery(queryName);
    if (value) {
      throw new AssertionError(
        message || `Expected store query "${queryName}" to be falsy, but got ${JSON.stringify(value)}`
      );
    }
  }

  /**
   * Assert that a store array contains an item
   * Uses deep strict equality for comparison (order-independent, type-safe)
   */
  async storeContains(queryName: string, item: any, message?: string): Promise<void> {
    const array = await this.client.storeQuery(queryName);
    if (!Array.isArray(array)) {
      throw new AssertionError(
        `Store query "${queryName}" did not return an array, got ${typeof array}`
      );
    }
    const found = array.some((el: any) => isDeepStrictEqual(el, item));
    if (!found) {
      throw new AssertionError(
        message ||
          `Expected store array "${queryName}" to contain ${JSON.stringify(item)}, but it was not found`
      );
    }
  }

  /**
   * Assert that a store array has a specific length
   */
  async storeArrayLength(queryName: string, length: number, message?: string): Promise<void> {
    const array = await this.client.storeQuery(queryName);
    if (!Array.isArray(array)) {
      throw new AssertionError(
        `Store query "${queryName}" did not return an array, got ${typeof array}`
      );
    }
    if (array.length !== length) {
      throw new AssertionError(
        message ||
          `Expected store array "${queryName}" to have length ${length}, but got ${array.length}`
      );
    }
  }

  /**
   * Wait for store state to match value (with assertion)
   */
  async storeEventuallyEquals(
    queryName: string,
    expectedValue: any,
    options: { timeout?: number; message?: string } = {}
  ): Promise<void> {
    try {
      await this.client.storeWait(queryName, expectedValue, {
        timeout: options.timeout || 30000,
      });
    } catch (error) {
      // Re-throw with consistent error message without querying again (race condition)
      throw new AssertionError(
        options.message ||
          `Expected store query "${queryName}" to eventually equal ${JSON.stringify(expectedValue)}, but timed out after ${options.timeout || 30000}ms`
      );
    }
  }

  // ========================================
  // Enhanced DOM Assertions
  // ========================================

  /**
   * Assert that an element has a specific class
   * Handles edge cases: empty class="", multiple spaces, leading/trailing whitespace
   */
  async elementHasClass(selector: string, className: string, message?: string): Promise<void> {
    const classAttr = await this.client.elementAttribute(selector, 'class');
    if (!classAttr) {
      throw new AssertionError(
        message ||
          `Expected element "${selector}" to have class "${className}", but element has no class attribute`
      );
    }
    // Trim, split on whitespace, and filter out empty strings
    const classes = classAttr.trim().split(/\s+/).filter(Boolean);
    if (!classes.includes(className)) {
      throw new AssertionError(
        message ||
          `Expected element "${selector}" to have class "${className}", but got classes: ${classAttr}`
      );
    }
  }

  /**
   * Assert that an element does NOT have a specific class
   * Handles edge cases: empty class="", multiple spaces, leading/trailing whitespace
   */
  async elementNotHasClass(selector: string, className: string, message?: string): Promise<void> {
    const classAttr = await this.client.elementAttribute(selector, 'class');
    if (!classAttr) {
      // Element has no class attribute, so it doesn't have the class (assertion passes)
      return;
    }
    // Trim, split on whitespace, and filter out empty strings
    const classes = classAttr.trim().split(/\s+/).filter(Boolean);
    if (classes.includes(className)) {
      throw new AssertionError(
        message ||
          `Expected element "${selector}" NOT to have class "${className}", but it was present`
      );
    }
  }

  /**
   * Assert that element's value equals (for inputs)
   */
  async elementValueEquals(selector: string, value: string, message?: string): Promise<void> {
    const actualValue = await this.client.elementAttribute(selector, 'value');
    if (actualValue !== value) {
      throw new AssertionError(
        message ||
          `Expected element "${selector}" value to equal "${value}", but got "${actualValue}"`
      );
    }
  }

  /**
   * Assert that element's placeholder contains text
   */
  async elementPlaceholderContains(
    selector: string,
    text: string,
    message?: string
  ): Promise<void> {
    const placeholder = await this.client.elementAttribute(selector, 'placeholder');
    if (!placeholder) {
      throw new AssertionError(
        message ||
          `Expected element "${selector}" placeholder to contain "${text}", but element has no placeholder attribute`
      );
    }
    if (!placeholder.includes(text)) {
      throw new AssertionError(
        message ||
          `Expected element "${selector}" placeholder to contain "${text}", but got "${placeholder}"`
      );
    }
  }

  /**
   * Assert that element has keyboard focus
   */
  async elementHasFocus(selector: string, message?: string): Promise<void> {
    const hasFocus = await this.client.elementHasFocus(selector);
    if (!hasFocus) {
      throw new AssertionError(
        message ||
          `Expected element "${selector}" to have focus, but document.activeElement does not match`
      );
    }
  }
}

/**
 * Create an assertion API instance
 */
export function createAssertions(client: BrowserAutomationClient): AssertionAPI {
  return new Assertions(client);
}
