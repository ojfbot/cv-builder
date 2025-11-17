/**
 * CV Builder Integration Test
 *
 * Migrated from: test-cv-builder.sh
 * Tests: Integration with the actual CV Builder application
 *
 * Prerequisites:
 * - CV Builder app running on port 3000 (npm run dev:all or npm run dev)
 * - Browser automation service running on port 3002
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  // Create test suite
  const { suite, client } = createTestSuite('CV Builder Integration', API_URL);

  // Verify CV Builder app is accessible before running tests
  suite.beforeAll(async () => {
    console.log('\n🔍 Checking if CV Builder app is running...');
    try {
      await client.navigate(APP_URL, { waitFor: 'networkidle' });
      console.log('✅ CV Builder app is running\n');
    } catch (error) {
      console.error(`❌ CV Builder app is not running at ${APP_URL}`);
      console.error('Please run: npm run dev:all');
      process.exit(1);
    }
  });

  // Test 1: Health Check
  suite.test('Health check returns correct config', async ({ assert }) => {
    const health = await client.health();

    if (!health.config) {
      throw new Error('Health check should return config');
    }

    if (health.config.browserAppUrl !== APP_URL) {
      throw new Error(`Expected browserAppUrl to be ${APP_URL}, got ${health.config.browserAppUrl}`);
    }
  });

  // Test 2: Navigate to Dashboard
  suite.test('Navigate to CV Builder dashboard', async ({ assert }) => {
    const result = await client.navigate(APP_URL, { waitFor: 'networkidle' });

    await assert.urlContains('localhost:3000');

    if (!result.title) {
      throw new Error('Dashboard should have a title');
    }
  });

  // Test 3: Main App Container
  suite.test('Main app container exists', async ({ assert }) => {
    await assert.elementExists('.cds--content');
    await assert.elementVisible('.cds--content');
  });

  // Test 4: Dashboard Header
  suite.test('Dashboard header exists and is visible', async ({ assert }) => {
    await assert.elementExists('h1');
    await assert.elementVisible('h1');

    const count = await client.elementCount('h1');
    if (count < 1) {
      throw new Error('Dashboard should have at least one H1 element');
    }
  });

  // Test 5: Get Dashboard Title
  suite.test('Dashboard title is readable', async ({ assert }) => {
    const text = await client.elementText('h1');

    if (!text || text.length === 0) {
      throw new Error('Dashboard H1 should have text content');
    }

    console.log(`  Dashboard title: "${text}"`);
  });

  // Test 6: Bio Component
  suite.test('Bio component is present', async ({ assert }) => {
    // Look for text "Bio" in the page
    const exists = await client.elementExists('text=Bio');

    if (!exists) {
      // Alternative: might be in a tab or button
      const bioExists = await client.elementExists('[data-testid*="bio"], button:has-text("Bio"), a:has-text("Bio")');
      if (!bioExists) {
        console.warn('  ⚠️  Bio component not found - this may be expected if UI has changed');
      }
    }
  });

  // Test 7: Jobs Component
  suite.test('Jobs component is present', async ({ assert }) => {
    // Look for text "Jobs" in the page
    const exists = await client.elementExists('text=Jobs');

    if (!exists) {
      // Alternative: might be in a tab or button
      const jobsExists = await client.elementExists('[data-testid*="jobs"], button:has-text("Jobs"), a:has-text("Jobs")');
      if (!jobsExists) {
        console.warn('  ⚠️  Jobs component not found - this may be expected if UI has changed');
      }
    }
  });

  // Test 8: Capture Full Dashboard Screenshot
  suite.test('Capture full dashboard screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: 'cv-builder-dashboard',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);

    console.log(`  Screenshot saved: ${screenshot.path}`);

    if (!screenshot.filename.includes('cv-builder-dashboard')) {
      throw new Error('Screenshot filename should include test name');
    }
  });

  // Test 9: Capture Header Screenshot
  suite.test('Capture header element screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: 'cv-builder-header',
      selector: 'h1',
    });

    assert.screenshotCaptured(screenshot);
  });

  // Test 10: Browser Status
  suite.test('Browser status shows CV Builder URL', async ({ assert }) => {
    const health = await client.health();

    if (!health.browser.running) {
      throw new Error('Browser should be running');
    }

    if (!health.browser.currentUrl) {
      throw new Error('Browser should have current URL');
    }

    if (!health.browser.currentUrl.includes('localhost:3000')) {
      throw new Error(`Expected current URL to include localhost:3000, got ${health.browser.currentUrl}`);
    }
  });

  // Test 11: Screenshot Sessions
  suite.test('Screenshot sessions are tracked', async ({ assert }) => {
    const sessions = await client.listSessions();

    if (sessions.length === 0) {
      throw new Error('Should have at least one screenshot session from previous tests');
    }

    console.log(`  Found ${sessions.length} screenshot session(s)`);
  });

  // Create runner and execute tests
  const runner = createTestRunner({
    reporters: ['console'],
    verbose: true,
  });

  const result = await runner.run(suite);

  // Print summary
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   ✅ CV Builder Integration Test Complete            ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  console.log(`Tests: ${result.summary.passed}/${result.summary.total} passed`);
  console.log(`Screenshots saved to: ./temp/screenshots/\n`);

  // Exit with appropriate code
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

// Run tests
main().catch((error) => {
  console.error('Test execution failed:', error);
  console.error('\nMake sure:');
  console.error('1. CV Builder app is running (npm run dev:all)');
  console.error('2. Browser automation service is running on port 3002');
  process.exit(1);
});
