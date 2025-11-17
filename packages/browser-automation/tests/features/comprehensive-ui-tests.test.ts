/**
 * Comprehensive UI Screenshot Tests
 *
 * Tests navigation between all tabs, chat expand/collapse, and theme toggling
 * with screenshot capture at each step
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002';
const CV_BUILDER_URL = process.env.CV_BUILDER_URL || 'http://localhost:3001';

async function main() {
  // Create test suite
  const { suite, client } = createTestSuite('Comprehensive UI Tests', API_URL);

  // Setup: Navigate to CV Builder before tests
  suite.beforeAll(async () => {
    console.log('Navigating to CV Builder app...');
    await client.navigate(CV_BUILDER_URL);
    // Wait for app to load
    await client.waitForSelector('[data-element="app-container"]', { state: 'attached', timeout: 10000 });
    await client.wait(1000); // Give UI time to settle
  });

  // ========================================
  // 1. Tab Navigation Tests
  // ========================================

  suite.test('Navigate to Interactive tab and capture', async () => {
    console.log('Clicking Interactive tab...');
    await client.click('[data-element="interactive-tab"]');
    await client.wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-interactive',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Navigate to Bio tab and capture', async () => {
    console.log('Clicking Bio tab...');
    await client.click('[data-element="bio-tab"]');
    await client.wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-bio',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Navigate to Jobs tab and capture', async () => {
    console.log('Clicking Jobs tab...');
    await client.click('[data-element="jobs-tab"]');
    await client.wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-jobs',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Navigate to Outputs tab and capture', async () => {
    console.log('Clicking Outputs tab...');
    await client.click('[data-element="outputs-tab"]');
    await client.wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-outputs',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Navigate to Research tab and capture', async () => {
    console.log('Clicking Research tab...');
    await client.click('[data-element="research-tab"]');
    await client.wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-research',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Navigate to Pipelines tab and capture', async () => {
    console.log('Clicking Pipelines tab...');
    await client.click('[data-element="pipelines-tab"]');
    await client.wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-pipelines',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Navigate to Toolbox tab and capture', async () => {
    console.log('Clicking Toolbox tab...');
    await client.click('[data-element="toolbox-tab"]');
    await client.wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-toolbox',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  // ========================================
  // 2. Chat Expand/Collapse Tests
  // ========================================

  suite.test('Navigate to Bio tab for chat testing', async () => {
    // Go to Bio tab where condensed chat will be visible
    await client.click('[data-element="bio-tab"]');
    await client.wait(500);
  });

  suite.test('Chat initially collapsed state', async () => {
    // Wait for chat to be present
    await client.waitForSelector('[data-element="chat-window"]', { state: 'attached' });

    const screenshot = await client.screenshot({
      name: 'chat-collapsed',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Expand chat window and capture', async () => {
    // Click send button area to trigger chat expansion (send button expands chat when clicked)
    const chatExists = await client.elementExists('[data-element="chat-send-button"]');

    if (chatExists) {
      // Type something to make chat more visible
      await client.fill('[data-element="chat-input"]', 'Test message for screenshot');
      await client.wait(500);

      const screenshot = await client.screenshot({
        name: 'chat-with-input',
        fullPage: false,
      });
      console.log(`✓ Screenshot saved: ${screenshot.path}`);

      // Clear input
      await client.fill('[data-element="chat-input"]', '');
    }
  });

  suite.test('Close chat window and capture', async () => {
    // If close button exists, click it
    const closeExists = await client.elementExists('[data-element="chat-close-button"]');

    if (closeExists) {
      await client.click('[data-element="chat-close-button"]');
      await client.wait(500);

      const screenshot = await client.screenshot({
        name: 'chat-closed',
        fullPage: false,
      });
      console.log(`✓ Screenshot saved: ${screenshot.path}`);
    }
  });

  // ========================================
  // 3. Theme Toggle Tests
  // ========================================

  suite.test('Capture current theme (light mode)', async () => {
    // Navigate back to Interactive tab for theme testing
    await client.click('[data-element="interactive-tab"]');
    await client.wait(500);

    const screenshot = await client.screenshot({
      name: 'theme-light',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Toggle to dark theme and capture', async () => {
    // Try to find and click theme toggle button
    // Note: CV Builder may not have theme toggle implemented yet
    // This test will check for the button and skip if not found

    const themeToggleExists = await client.elementExists('[data-element="theme-toggle"]');

    if (themeToggleExists) {
      await client.click('[data-element="theme-toggle"]');
      await client.wait(500);

      const screenshot = await client.screenshot({
        name: 'theme-dark',
        fullPage: false,
      });
      console.log(`✓ Screenshot saved: ${screenshot.path}`);

      // Toggle back to light
      await client.click('[data-element="theme-toggle"]');
      await client.wait(500);
    } else {
      console.log('⚠️  Theme toggle not implemented - skipping dark theme screenshot');
    }
  });

  // ========================================
  // 4. Final State Capture
  // ========================================

  suite.test('Capture final dashboard state', async () => {
    // Return to Bio tab for final screenshot
    await client.click('[data-element="bio-tab"]');
    await client.wait(500);

    const screenshot = await client.screenshot({
      name: 'final-state',
      fullPage: true,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  // Run tests
  const runner = createTestRunner({
    reporters: ['console'],
    verbose: true,
  });

  const result = await runner.run(suite);

  // Cleanup: Close browser after all tests
  console.log('\n🧹 Closing browser...');
  await client.close();
  console.log('✅ Browser closed successfully');

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Comprehensive UI Tests Complete`);
  console.log(`Tests: ${result.summary.passed}/${result.summary.total} passed`);
  console.log('Screenshots saved to: ./temp/screenshots/');
  console.log('═'.repeat(60) + '\n');

  if (result.summary.failed > 0) {
    console.log(`\n⚠️  ${result.summary.failed} test(s) failed`);
  }

  // Exit with appropriate code
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
