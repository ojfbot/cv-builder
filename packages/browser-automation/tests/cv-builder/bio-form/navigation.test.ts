/**
 * Bio Form Navigation Test
 *
 * Tests navigation to the Bio tab with DOM and Redux store verification.
 * Part of the semantic test organization structure.
 */

import { createTestSuite, createTestRunner } from '../../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('Bio Form Navigation', API_URL);

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

    // Verify Redux store: currentTab is "bio"
    await assert.storeEventuallyEquals('currentTab', 'bio', { timeout: 2000 });

    // Capture screenshot with semantic path
    const screenshot = await client.screenshot({
      name: 'navigate-tabs-bio',
      test: {
        app: 'cv-builder',
        suite: 'bio-form',
        case: 'navigate-tabs-bio'
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

  console.log(`\n✅ Bio Form Navigation: ${result.summary.passed}/${result.summary.total} passed`);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
