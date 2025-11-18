/**
 * Outputs Navigation Test
 *
 * Tests navigation to the Outputs tab with DOM and Redux store verification.
 * Part of the semantic test organization structure.
 */

import { createTestSuite, createTestRunner } from '../../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('Outputs Navigation', API_URL);

  suite.beforeAll(async () => {
    console.log('🚀 Navigating to CV Builder app...');
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]', { timeout: 10000 });
    console.log('✅ App loaded');
  });

  suite.test('Navigate to Outputs tab', async ({ assert }) => {
    // Click Outputs tab using data-element
    await client.click('[data-element="outputs-tab"]');
    await client.waitForSelector('[data-element="outputs-panel"]', { state: 'visible', timeout: 3000 });

    // Verify DOM: Outputs tab panel is visible
    await assert.elementVisible('[data-element="outputs-panel"]');

    // Verify Redux store: currentTab is "outputs"
    await assert.storeEventuallyEquals('currentTab', 'outputs', { timeout: 2000 });

    // Capture screenshot with semantic path
    const screenshot = await client.screenshot({
      name: 'navigate-tabs-outputs',
      test: {
        app: 'cv-builder',
        suite: 'outputs',
        case: 'navigate-tabs-outputs'
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

  console.log(`\n✅ Outputs Navigation: ${result.summary.passed}/${result.summary.total} passed`);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
