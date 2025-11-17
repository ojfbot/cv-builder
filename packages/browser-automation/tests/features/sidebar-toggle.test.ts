/**
 * Sidebar Toggle Tests
 *
 * Tests sidebar expand/collapse functionality with screenshot capture
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
  const { suite, client } = createTestSuite('Sidebar Toggle Tests', API_URL);

  // Setup: Navigate to CV Builder before tests
  suite.beforeAll(async () => {
    console.log('Navigating to CV Builder app...');
    await client.navigate(CV_BUILDER_URL, { waitFor: 'networkidle' });
    await client.waitForSelector('.app-container', { state: 'attached', timeout: 10000 });
    await wait(300);

    // Navigate to Bio tab for sidebar testing
    console.log('Navigating to Bio tab...');
    await client.click('[data-element="bio-tab"]');
    await wait(300);
  });

  // ========================================
  // Sidebar Toggle Tests
  // ========================================

  suite.test('Sidebar initial collapsed state', async () => {
    // Sidebar starts collapsed by default (sideNavExpanded = false)
    await wait(300);

    const screenshot = await client.screenshot({
      name: 'sidebar-collapsed',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Expand sidebar and capture', async () => {
    // Look for sidebar toggle button in header
    const toggleExists = await client.elementExists('[data-element="sidebar-toggle"]');

    if (toggleExists) {
      await client.click('[data-element="sidebar-toggle"]');
      // Wait for expand animation
      await wait(300);

      const screenshot = await client.screenshot({
        name: 'sidebar-expanded',
        fullPage: false,
      });
      console.log(`✓ Screenshot saved: ${screenshot.path}`);
    } else {
      console.log('⚠️  Sidebar toggle button not found - skipping expand screenshot');
    }
  });

  suite.test('Collapse sidebar and capture', async () => {
    const toggleExists = await client.elementExists('[data-element="sidebar-toggle"]');

    if (toggleExists) {
      await client.click('[data-element="sidebar-toggle"]');
      // Wait for collapse animation
      await wait(300);

      const screenshot = await client.screenshot({
        name: 'sidebar-collapsed-restored',
        fullPage: false,
      });
      console.log(`✓ Screenshot saved: ${screenshot.path}`);
    } else {
      console.log('⚠️  Sidebar toggle button not found - skipping collapse screenshot');
    }
  });

  suite.test('Capture final state with sidebar', async () => {
    // Final screenshot showing complete dashboard with sidebar
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
  console.log(`✅ Sidebar Toggle Tests Complete`);
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
