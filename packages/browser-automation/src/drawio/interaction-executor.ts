/**
 * Interaction Executor
 *
 * Executes user interactions defined in Draw.io diagrams using Playwright.
 */

import { Page } from 'playwright';
import {
  DrawioNode,
  DrawioUISchema,
  InteractionType,
  StateAssertion,
  ViewportConfig,
  VIEWPORT_PRESETS,
} from './schema.js';
import { CapturedState } from './metadata.js';

/**
 * Wait strategies
 */
export type WaitStrategy = 'networkIdle' | 'load' | 'domContentLoaded' | 'timeout';

/**
 * Execution options
 */
export interface ExecutionOptions {
  /**
   * Default wait strategy
   */
  waitStrategy?: WaitStrategy;

  /**
   * Default timeout (ms)
   */
  timeout?: number;

  /**
   * Whether to wait for animations to complete
   */
  waitForAnimations?: boolean;

  /**
   * Animation settle time (ms)
   */
  animationSettleTime?: number;

  /**
   * Whether to capture network activity
   */
  captureNetwork?: boolean;
}

/**
 * Interaction Executor
 */
export class InteractionExecutor {
  private page: Page;
  private options: Required<ExecutionOptions>;

  constructor(page: Page, options: ExecutionOptions = {}) {
    this.page = page;
    this.options = {
      waitStrategy: options.waitStrategy || 'networkIdle',
      timeout: options.timeout || 30000,
      waitForAnimations: options.waitForAnimations ?? true,
      animationSettleTime: options.animationSettleTime || 300,
      captureNetwork: options.captureNetwork ?? false,
    };
  }

  /**
   * Execute a sequence of interactions from schema
   */
  async executeFlow(schema: DrawioUISchema): Promise<void> {
    const actionNodes = this.getExecutionOrder(schema);

    for (const node of actionNodes) {
      await this.executeNode(node);
    }
  }

  /**
   * Execute a single node's interaction
   */
  async executeNode(node: DrawioNode): Promise<void> {
    if (!node.interaction) {
      console.warn(`Node ${node.id} has no interaction defined, skipping`);
      return;
    }

    console.log(`Executing: ${node.label}`);

    switch (node.interaction.type) {
      case 'navigation':
        await this.executeNavigation(node);
        break;
      case 'click':
        await this.executeClick(node);
        break;
      case 'type':
        await this.executeType(node);
        break;
      case 'hover':
        await this.executeHover(node);
        break;
      case 'focus':
        await this.executeFocus(node);
        break;
      case 'scroll':
        await this.executeScroll(node);
        break;
      case 'drag':
        await this.executeDrag(node);
        break;
      default:
        console.warn(`Unknown interaction type: ${node.interaction.type}`);
    }

    // Wait for animations if enabled
    if (this.options.waitForAnimations) {
      await this.page.waitForTimeout(this.options.animationSettleTime);
    }

    // Verify state assertions if defined
    if (node.assertions) {
      await this.verifyAssertions(node.assertions);
    }
  }

  /**
   * Execute navigation
   */
  private async executeNavigation(node: DrawioNode): Promise<void> {
    const target = node.interaction!.target;

    if (!target) {
      throw new Error(`Navigation node ${node.id} missing target URL`);
    }

    // Check if target is a URL or a selector
    if (target.startsWith('/') || target.startsWith('http')) {
      // Navigate to URL
      await this.page.goto(target, {
        waitUntil: this.options.waitStrategy,
        timeout: this.options.timeout,
      });
    } else {
      // Click on navigation element
      await this.page.click(target, { timeout: this.options.timeout });
      await this.waitForNavigation();
    }
  }

  /**
   * Execute click interaction
   */
  private async executeClick(node: DrawioNode): Promise<void> {
    const target = node.interaction!.target;

    if (!target) {
      throw new Error(`Click node ${node.id} missing target selector`);
    }

    // Wait for element to be visible and enabled
    await this.page.waitForSelector(target, {
      state: 'visible',
      timeout: this.options.timeout,
    });

    // Click the element
    await this.page.click(target, { timeout: this.options.timeout });
  }

  /**
   * Execute type interaction
   */
  private async executeType(node: DrawioNode): Promise<void> {
    const target = node.interaction!.target;
    const value = node.interaction!.value;

    if (!target) {
      throw new Error(`Type node ${node.id} missing target selector`);
    }

    if (!value) {
      throw new Error(`Type node ${node.id} missing value`);
    }

    // Wait for input field
    await this.page.waitForSelector(target, {
      state: 'visible',
      timeout: this.options.timeout,
    });

    // Clear existing value
    await this.page.fill(target, '');

    // Type new value
    await this.page.type(target, value, { delay: 50 });
  }

  /**
   * Execute hover interaction
   */
  private async executeHover(node: DrawioNode): Promise<void> {
    const target = node.interaction!.target;

    if (!target) {
      throw new Error(`Hover node ${node.id} missing target selector`);
    }

    await this.page.waitForSelector(target, {
      state: 'visible',
      timeout: this.options.timeout,
    });

    await this.page.hover(target);
  }

  /**
   * Execute focus interaction
   */
  private async executeFocus(node: DrawioNode): Promise<void> {
    const target = node.interaction!.target;

    if (!target) {
      throw new Error(`Focus node ${node.id} missing target selector`);
    }

    await this.page.waitForSelector(target, {
      state: 'visible',
      timeout: this.options.timeout,
    });

    await this.page.focus(target);
  }

  /**
   * Execute scroll interaction
   */
  private async executeScroll(node: DrawioNode): Promise<void> {
    const target = node.interaction!.target;

    if (target) {
      // Scroll to element
      await this.page.locator(target).scrollIntoViewIfNeeded();
    } else {
      // Scroll page
      await this.page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      });
    }
  }

  /**
   * Execute drag interaction
   */
  private async executeDrag(node: DrawioNode): Promise<void> {
    // Drag interaction requires source and target
    // For now, log a warning (to be implemented)
    console.warn(`Drag interaction not yet implemented for node ${node.id}`);
  }

  /**
   * Capture current page state
   */
  async captureState(selectors?: string[]): Promise<CapturedState> {
    const defaultSelectors = [
      '[data-testid]',
      'button',
      'input',
      'a',
      '.modal',
      '.error',
      '.success',
    ];

    const selectorsToCheck = selectors || defaultSelectors;

    return await this.page.evaluate((sels) => {
      const state: CapturedState = {
        visibleElements: [],
        textContent: {},
        attributes: {},
      };

      sels.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, idx) => {
          const key = `${selector}[${idx}]`;

          // Check visibility
          if (el instanceof HTMLElement && el.offsetParent !== null) {
            state.visibleElements.push(key);
          }

          // Capture text content
          if (el.textContent) {
            state.textContent[key] = el.textContent.trim();
          }

          // Capture attributes
          const attrs: Record<string, string> = {};
          Array.from(el.attributes).forEach((attr) => {
            attrs[attr.name] = attr.value;
          });
          state.attributes[key] = attrs;
        });
      });

      return state;
    }, selectorsToCheck);
  }

  /**
   * Verify state assertions
   */
  private async verifyAssertions(assertions: StateAssertion[]): Promise<void> {
    for (const assertion of assertions) {
      const element = this.page.locator(assertion.selector);

      // Check visibility
      if (assertion.expected.visible !== undefined) {
        const isVisible = await element.isVisible().catch(() => false);
        if (isVisible !== assertion.expected.visible) {
          console.warn(
            `Assertion failed: ${assertion.selector} visibility expected ${assertion.expected.visible}, got ${isVisible}`
          );
        }
      }

      // Check text content
      if (assertion.expected.text !== undefined) {
        const text = await element.textContent().catch(() => null);
        if (text !== assertion.expected.text) {
          console.warn(
            `Assertion failed: ${assertion.selector} text expected "${assertion.expected.text}", got "${text}"`
          );
        }
      }

      // Check attributes
      if (assertion.expected.attribute) {
        for (const [attr, value] of Object.entries(assertion.expected.attribute)) {
          const actualValue = await element.getAttribute(attr).catch(() => null);
          if (actualValue !== value) {
            console.warn(
              `Assertion failed: ${assertion.selector} attribute ${attr} expected "${value}", got "${actualValue}"`
            );
          }
        }
      }

      // Check count
      if (assertion.expected.count !== undefined) {
        const count = await element.count();
        if (count !== assertion.expected.count) {
          console.warn(
            `Assertion failed: ${assertion.selector} count expected ${assertion.expected.count}, got ${count}`
          );
        }
      }
    }
  }

  /**
   * Set viewport size
   */
  async setViewport(viewport: ViewportConfig): Promise<void> {
    await this.page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    if (viewport.deviceScaleFactor) {
      // This requires creating a new context with device scale factor
      console.warn('Device scale factor change requires new browser context');
    }
  }

  /**
   * Get execution order of nodes
   */
  private getExecutionOrder(schema: DrawioUISchema): DrawioNode[] {
    // For now, return action nodes in order
    // Future: Build dependency graph from edges
    return schema.nodes.filter((n) => n.type === 'action' && n.interaction);
  }

  /**
   * Wait for navigation to complete
   */
  private async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState(this.options.waitStrategy, {
      timeout: this.options.timeout,
    });
  }
}

/**
 * Utility function to execute a flow
 */
export async function executeFlow(
  page: Page,
  schema: DrawioUISchema,
  options?: ExecutionOptions
): Promise<void> {
  const executor = new InteractionExecutor(page, options);
  await executor.executeFlow(schema);
}
