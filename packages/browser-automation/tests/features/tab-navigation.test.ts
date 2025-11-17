/**
 * Tab Navigation Tests
 *
 * Tests navigation between all CV Builder tabs with screenshot capture
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
  const { suite, client } = createTestSuite('Tab Navigation Tests', API_URL);

  // Setup: Navigate to CV Builder before tests
  suite.beforeAll(async () => {
    console.log('Navigating to CV Builder app...');
    await client.navigate(CV_BUILDER_URL, { waitFor: 'networkidle' });
    await client.waitForSelector('.app-container', { state: 'attached', timeout: 10000 });
    await wait(1000);
  });

  // ========================================
  // Tab Navigation Tests
  // ========================================

  suite.test('Navigate to Interactive tab and capture', async () => {
    console.log('Clicking Interactive tab...');
    await client.click('[data-element="interactive-tab"]');
    await wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-interactive',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Navigate to Bio tab and capture', async () => {
    console.log('Clicking Bio tab...');
    await client.click('[data-element="bio-tab"]');
    await wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-bio',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Navigate to Jobs tab and capture', async () => {
    console.log('Clicking Jobs tab...');
    await client.click('[data-element="jobs-tab"]');
    await wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-jobs',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Navigate to Outputs tab and capture', async () => {
    console.log('Clicking Outputs tab...');
    await client.click('[data-element="outputs-tab"]');
    await wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-outputs',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Navigate to Research tab and capture', async () => {
    console.log('Clicking Research tab...');
    await client.click('[data-element="research-tab"]');
    await wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-research',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Navigate to Pipelines tab and capture', async () => {
    console.log('Clicking Pipelines tab...');
    await client.click('[data-element="pipelines-tab"]');
    await wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-pipelines',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Navigate to Toolbox tab and capture', async () => {
    console.log('Clicking Toolbox tab...');
    await client.click('[data-element="toolbox-tab"]');
    await wait(500);

    const screenshot = await client.screenshot({
      name: 'tab-toolbox',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
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
  console.log(`✅ Tab Navigation Tests Complete`);
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
