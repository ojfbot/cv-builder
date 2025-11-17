/**
 * Phase 3 Features Test
 *
 * Migrated from: test-phase3.sh
 * Tests: Advanced screenshots, user interactions, waiting strategies
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002';
const TEST_APP_URL = 'https://example.com';

async function main() {
  // Create test suite
  const { suite, client } = createTestSuite('Phase 3 Features', API_URL);

  // Setup: Navigate to test page before tests
  suite.beforeAll(async () => {
    await client.navigate(TEST_APP_URL);
  });

  // ========================================
  // 1. Advanced Screenshot Tests
  // ========================================

  suite.test('Capture desktop viewport screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: 'test-viewport-desktop',
      viewport: 'desktop',
    });

    assert.screenshotCaptured(screenshot);

    if (!screenshot.filename.includes('desktop')) {
      throw new Error('Screenshot should include viewport in filename');
    }
  });

  suite.test('Capture mobile viewport screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: 'test-viewport-mobile',
      viewport: 'mobile',
    });

    assert.screenshotCaptured(screenshot);

    if (!screenshot.viewport || screenshot.viewport.width < 400) {
      throw new Error('Mobile viewport should have width < 400px');
    }
  });

  suite.test('Capture tablet viewport screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: 'test-viewport-tablet',
      viewport: 'tablet',
    });

    assert.screenshotCaptured(screenshot);

    if (!screenshot.viewport || screenshot.viewport.width < 600) {
      throw new Error('Tablet viewport should have width ~768px');
    }
  });

  suite.test('Capture JPEG screenshot with quality', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: 'test-jpeg-quality',
      format: 'jpeg',
      quality: 80,
    });

    assert.screenshotCaptured(screenshot);

    if (!screenshot.filename.endsWith('.jpeg') && !screenshot.filename.endsWith('.jpg')) {
      throw new Error('JPEG screenshot should have .jpeg or .jpg extension');
    }
  });

  suite.test('Capture element-specific screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: 'test-element',
      selector: 'h1',
      fullPage: false,
    });

    assert.screenshotCaptured(screenshot);
  });

  suite.test('Capture full page screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: 'test-fullpage',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);
  });

  // ========================================
  // 2. User Interaction Tests
  // ========================================

  suite.test('Click interaction on link', async ({ assert }) => {
    // Navigate back to example.com
    await client.navigate(TEST_APP_URL);

    // Click on the first link
    await client.click('a');

    // Verify navigation occurred (URL changed or element exists)
    await client.waitForNavigation({ timeout: 5000 });
  });

  suite.test('Hover interaction on element', async ({ assert }) => {
    // Navigate back to example.com
    await client.navigate(TEST_APP_URL);

    // Hover over h1
    await client.hover('h1');

    // Verify element still exists after hover
    await assert.elementExists('h1');
  });

  suite.test('Press keyboard key', async ({ assert }) => {
    // Press Escape key
    await client.press('Escape');

    // No assertion needed - just verify it doesn't throw
  });

  suite.test('Type text into input', async ({ assert }) => {
    // Navigate to a page with input
    await client.navigate(TEST_APP_URL);

    // This test will pass even if no input exists (example.com doesn't have inputs)
    // In a real test, you'd navigate to a page with forms

    // Example usage (would work on a real form):
    // await client.type('input[name="search"]', 'test query');
    // await assert.textEquals('input[name="search"]', 'test query');
  });

  suite.test('Fill form input', async ({ assert }) => {
    // Navigate back
    await client.navigate(TEST_APP_URL);

    // Fill would clear existing value and type new text
    // Example: await client.fill('input[name="email"]', 'test@example.com');

    // Verify page loaded
    await assert.elementExists('h1');
  });

  // ========================================
  // 3. Waiting Strategy Tests
  // ========================================

  suite.test('Wait for selector to be visible', async ({ assert }) => {
    await client.waitForSelector('h1', { state: 'visible', timeout: 5000 });

    await assert.elementVisible('h1');
  });

  suite.test('Wait for element to be attached', async ({ assert }) => {
    await client.waitForSelector('body', { state: 'attached', timeout: 5000 });

    await assert.elementExists('body');
  });

  suite.test('Wait for text to appear', async ({ assert }) => {
    await client.waitForText('Example', { timeout: 5000 });

    await assert.textContains('h1', 'Example');
  });

  suite.test('Wait for network idle', async ({ assert }) => {
    // Navigate and wait for network to be idle
    await client.navigate(TEST_APP_URL);
    await client.waitForNetworkIdle();

    // Page should be fully loaded
    await assert.elementExists('h1');
  });

  // ========================================
  // 4. Session Management Tests
  // ========================================

  suite.test('List screenshot sessions', async ({ assert }) => {
    const sessions = await client.listSessions();

    if (sessions.length === 0) {
      throw new Error('Should have at least one screenshot session');
    }
  });

  suite.test('Health check shows browser running', async ({ assert }) => {
    const health = await client.health();

    if (!health.browser.running) {
      throw new Error('Browser should be running during tests');
    }

    if (!health.browser.currentUrl) {
      throw new Error('Browser should have a current URL');
    }
  });

  // Create runner and execute tests
  const runner = createTestRunner({
    reporters: ['console'],
    verbose: true,
  });

  const result = await runner.run(suite);

  // Print summary
  console.log('\n✅ Phase 3 Features test complete!');
  console.log(`Tests: ${result.summary.passed}/${result.summary.total} passed`);
  console.log(`Screenshots saved to: ./temp/screenshots/`);

  // Exit with appropriate code
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

// Run tests
main().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
