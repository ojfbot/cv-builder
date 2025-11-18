/**
 * Jobs Navigation Test
 *
 * Tests navigation to the Jobs tab with DOM and Redux store verification.
 * Part of the semantic test organization structure.
 */

import { createTestSuite, createTestRunner } from '../../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('Jobs Navigation', API_URL);

  suite.beforeAll(async () => {
    console.log('🚀 Navigating to CV Builder app...');
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]', { timeout: 10000 });
    console.log('✅ App loaded');
  });

  suite.test('Navigate to Jobs tab', async ({ assert }) => {
    // Click Jobs tab using data-element
    await client.click('[data-element="jobs-tab"]');
    await client.waitForSelector('[data-element="jobs-panel"]', { state: 'visible', timeout: 3000 });

    // Verify DOM: Jobs tab panel is visible
    await assert.elementVisible('[data-element="jobs-panel"]');

    // Verify Redux store: currentTab is "jobs"
    await assert.storeEventuallyEquals('currentTab', 'jobs', { timeout: 2000 });

    // Capture screenshot with semantic path
    const screenshot = await client.screenshot({
      name: 'navigate-tabs-jobs',
      test: {
        app: 'cv-builder',
        suite: 'jobs',
        case: 'navigate-tabs-jobs'
      },
      viewport: 'desktop',
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

  console.log(`\n✅ Jobs Navigation: ${result.summary.passed}/${result.summary.total} passed`);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
