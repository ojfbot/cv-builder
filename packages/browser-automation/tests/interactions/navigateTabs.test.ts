/**
 * Navigate Tabs - User Interaction Flow
 *
 * Tests tab navigation across all dashboard sections with DOM and Redux store verification.
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('Navigate Tabs', API_URL);

  suite.beforeAll(async () => {
    console.log('🚀 Navigating to CV Builder app...');
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]', { timeout: 10000 });
    console.log('✅ App loaded');
  });

  suite.test('Navigate to Bio tab', async ({ assert }) => {
    // Click Bio tab using data-element
    await client.click('[data-element="bio-tab"]');
    await client.waitForSelector('[data-element="bio-panel"]', { state: 'visible', timeout: 3000 });

    // Verify DOM: Bio tab panel is visible
    await assert.elementVisible('[data-element="bio-panel"]');

    // Verify Redux store: currentTab is 0 (Bio)
    await assert.storeEventuallyEquals('currentTab', 0, { timeout: 2000 });

    // Capture screenshot
    const screenshot = await client.screenshot({
      name: 'navigate-tabs-bio',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Navigate to Jobs tab', async ({ assert }) => {
    // Click Jobs tab using data-element
    await client.click('[data-element="jobs-tab"]');
    await client.waitForSelector('[data-element="jobs-panel"]', { state: 'visible', timeout: 3000 });

    // Verify DOM: Jobs tab panel is visible
    await assert.elementVisible('[data-element="jobs-panel"]');

    // Verify Redux store: currentTab is 1 (Jobs)
    await assert.storeEventuallyEquals('currentTab', 1, { timeout: 2000 });

    // Capture screenshot
    const screenshot = await client.screenshot({
      name: 'navigate-tabs-jobs',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Navigate to Outputs tab', async ({ assert }) => {
    // Click Outputs tab using data-element
    await client.click('[data-element="outputs-tab"]');
    await client.waitForSelector('[data-element="outputs-panel"]', { state: 'visible', timeout: 3000 });

    // Verify DOM: Outputs tab panel is visible
    await assert.elementVisible('[data-element="outputs-panel"]');

    // Verify Redux store: currentTab is 2 (Outputs)
    await assert.storeEventuallyEquals('currentTab', 2, { timeout: 2000 });

    // Capture screenshot
    const screenshot = await client.screenshot({
      name: 'navigate-tabs-outputs',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Navigate to Interactive tab', async ({ assert }) => {
    // Click Interactive tab using data-element
    await client.click('[data-element="interactive-tab"]');
    await client.waitForSelector('[data-element="interactive-panel"]', { state: 'visible', timeout: 3000 });

    // Verify DOM: Interactive tab panel is visible
    await assert.elementVisible('[data-element="interactive-panel"]');

    // Verify Redux store: currentTab is 3 (Interactive)
    await assert.storeEventuallyEquals('currentTab', 3, { timeout: 2000 });

    // Capture screenshot
    const screenshot = await client.screenshot({
      name: 'navigate-tabs-interactive',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.afterAll(async () => {
    await client.close();
  });

  const runner = createTestRunner({ reporters: ['console'], verbose: true });
  const result = await runner.run(suite);

  console.log(`\n✅ Navigate Tabs: ${result.summary.passed}/${result.summary.total} passed`);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
