/**
 * Basic Workflow Test
 *
 * Migrated from: test-workflow.sh
 * Tests: navigate → query → screenshot
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002';
const TEST_URL = 'https://example.com';

async function main() {
  // Create test suite
  const { suite, client } = createTestSuite('Basic Workflow', API_URL);

  // Test 1: Health Check
  suite.test('Health check returns browser status', async ({ assert }) => {
    const health = await client.health();

    if (!health.browser || health.browser.running === undefined) {
      throw new Error('Health check did not return expected browser status');
    }
  });

  // Test 2: Navigate
  suite.test('Navigate to Example.com', async ({ assert }) => {
    const result = await client.navigate(TEST_URL, { waitFor: 'networkidle' });

    await assert.urlContains('example.com');

    if (!result.title) {
      throw new Error('Navigation did not return page title');
    }
  });

  // Test 3: Query for H1 Element
  suite.test('Query for H1 element', async ({ assert }) => {
    await assert.elementExists('h1');
    await assert.elementVisible('h1');

    const count = await client.elementCount('h1');
    if (count < 1) {
      throw new Error('Expected at least one H1 element');
    }
  });

  // Test 4: Get H1 Text
  suite.test('Get H1 text content', async ({ assert }) => {
    await assert.textContains('h1', 'Example');
  });

  // Test 5: Capture Full Page Screenshot
  suite.test('Capture full page screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: 'example-homepage',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);

    if (!screenshot.filename.includes('example-homepage')) {
      throw new Error('Screenshot filename does not match expected name');
    }
  });

  // Test 6: Capture H1 Element Screenshot
  suite.test('Capture H1 element screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: 'example-h1',
      selector: 'h1',
    });

    assert.screenshotCaptured(screenshot);
  });

  // Test 7: List Screenshot Sessions
  suite.test('List screenshot sessions', async ({ assert }) => {
    const sessions = await client.listSessions();

    if (sessions.length === 0) {
      throw new Error('Expected at least one screenshot session');
    }
  });

  // Create runner and execute tests
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
  console.log('\n✅ Test workflow complete!');
  console.log(`Screenshots saved to: ./temp/screenshots/`);

  // Exit with appropriate code
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

// Run tests
main().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
