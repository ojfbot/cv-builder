/**
 * Theme Toggle Tests
 *
 * Tests light/dark theme toggle functionality with screenshot capture
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
  const { suite, client } = createTestSuite('Theme Toggle Tests', API_URL);

  // Setup: Navigate to CV Builder before tests
  suite.beforeAll(async () => {
    console.log('Navigating to CV Builder app...');
    await client.navigate(CV_BUILDER_URL, { waitFor: 'networkidle' });
    await client.waitForSelector('.app-container', { state: 'attached', timeout: 10000 });
    await wait(1000);

    // Navigate to Interactive tab for theme testing
    console.log('Navigating to Interactive tab...');
    await client.click('[data-element="interactive-tab"]');
    await wait(500);
  });

  // ========================================
  // Theme Toggle Tests
  // ========================================

  suite.test('Capture initial theme state', async () => {
    const screenshot = await client.screenshot({
      name: 'theme-initial',
      fullPage: false,
    });
    console.log(`✓ Screenshot saved: ${screenshot.path}`);
  });

  suite.test('Toggle to light theme and capture', async () => {
    const themeToggleExists = await client.elementExists('[aria-label="Toggle theme"]');

    if (themeToggleExists) {
      // Click to toggle theme
      await client.click('[aria-label="Toggle theme"]');
      // Wait for theme transition
      await wait(800);

      const screenshot = await client.screenshot({
        name: 'theme-light',
        fullPage: false,
      });
      console.log(`✓ Screenshot saved: ${screenshot.path}`);
    } else {
      console.log('⚠️  Theme toggle button not found - skipping light theme screenshot');
    }
  });

  suite.test('Toggle back to dark theme and capture', async () => {
    const themeToggleExists = await client.elementExists('[aria-label="Toggle theme"]');

    if (themeToggleExists) {
      // Click to toggle theme back
      await client.click('[aria-label="Toggle theme"]');
      // Wait for theme transition
      await wait(800);

      const screenshot = await client.screenshot({
        name: 'theme-dark',
        fullPage: false,
      });
      console.log(`✓ Screenshot saved: ${screenshot.path}`);
    } else {
      console.log('⚠️  Theme toggle button not found - skipping dark theme screenshot');
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
  console.log(`✅ Theme Toggle Tests Complete`);
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
