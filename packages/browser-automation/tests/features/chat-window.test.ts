/**
 * Chat Window Tests
 *
 * Tests chat window expand/collapse functionality with screenshot capture
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002';
const CV_BUILDER_URL = process.env.CV_BUILDER_URL || 'http://localhost:3000';

// Parse command line arguments
const args = process.argv.slice(2);
const filterArg = args.find(arg => arg.startsWith('--filter='));
const TEST_FILTER = filterArg ? filterArg.split('=')[1] : undefined;

// Helper function for delays
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  // Create test suite
  const { suite, client } = createTestSuite('Chat Window Tests', API_URL);

  // Setup: Navigate to CV Builder before tests
  suite.beforeAll(async () => {
    console.log('Navigating to CV Builder app...');
    await client.navigate(CV_BUILDER_URL, { waitFor: 'networkidle' });
    await client.waitForSelector('.app-container', { state: 'attached', timeout: 10000 });
    await wait(300);

    // Navigate to Bio tab where chat window is visible
    console.log('Navigating to Bio tab for chat testing...');
    await client.click('[data-element="bio-tab"]');
    await wait(300);
  });

  // ========================================
  // Chat Window Tests
  // ========================================

  suite.test('Chat initially collapsed state', async () => {
    // Wait for chat to be present
    await client.waitForSelector('[data-element="chat-window"]', { state: 'attached' });

    const screenshot = await client.screenshot({
      name: 'chat-collapsed',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Chat input with text visible', async () => {
    const chatExists = await client.elementExists('[data-element="chat-send-button"]');

    if (chatExists) {
      // Click the input to focus it first
      await client.click('[data-element="chat-input"]');
      await wait(300);

      // Type text using keyboard simulation
      await client.type('[data-element="chat-input"]', 'Test message for screenshot');

      // Wait for text to fully render in the input
      await wait(1500);

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
      await wait(300);

      const screenshot = await client.screenshot({
        name: 'chat-closed',
        fullPage: false,
      });
      console.log(`✓ Screenshot saved: ${screenshot.path}`);
    }
  });

  // Run tests
  const runner = createTestRunner({
    reporters: ['console'],
    verbose: true,
    filter: TEST_FILTER,
  });

  if (TEST_FILTER) {
    console.log(`\n🔍 Running filtered tests: "${TEST_FILTER}"\n`);
  }

  const result = await runner.run(suite);

  // Cleanup
  console.log('\n🧹 Closing browser...');
  await client.close();
  console.log('✅ Browser closed successfully');

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Chat Window Tests Complete`);
  console.log(`Tests: ${result.summary.passed}/${result.summary.total} passed`);
  console.log('Screenshots saved to: ./temp/screenshots/');
  console.log('═'.repeat(60) + '\n');

  if (result.summary.failed > 0) {
    console.log(`\n⚠️  ${result.summary.failed} test(s) failed`);
  }

  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
