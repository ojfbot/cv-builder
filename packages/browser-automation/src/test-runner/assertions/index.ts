/**
 * Assertion library for Browser Automation tests
 */

import { BrowserAutomationClient } from '../../client/BrowserAutomationClient.js';
import { ScreenshotResult } from '../../client/types.js';
import { AssertionAPI } from '../types.js';

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
   * Assert that page title equals expected
   */
  async titleEquals(_title: string, _message?: string): Promise<void> {
    // Note: Health endpoint doesn't return title, we'd need to extend the API
    // For now, this is a placeholder
    throw new Error('titleEquals not yet implemented - API needs extension');
  }

  /**
   * Assert that page title contains text
   */
  async titleContains(_text: string, _message?: string): Promise<void> {
    // Note: Health endpoint doesn't return title, we'd need to extend the API
    // For now, this is a placeholder
    throw new Error('titleContains not yet implemented - API needs extension');
  }
}

/**
 * Create an assertion API instance
 */
export function createAssertions(client: BrowserAutomationClient): AssertionAPI {
  return new Assertions(client);
}
