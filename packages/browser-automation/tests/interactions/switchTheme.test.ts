/**
 * Switch Theme - User Interaction Flow
 *
 * Tests theme toggle between light and dark modes with visual verification.
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('Switch Theme', API_URL);

  suite.beforeAll(async () => {
    console.log('🚀 Navigating to CV Builder app...');
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]', { timeout: 10000 });
    console.log('✅ App loaded');
  });

  suite.test('View initial dark theme', async ({ assert }) => {
    // Verify Redux store: theme is dark
    await assert.storeEquals('theme', 'dark');

    // Capture initial theme state
    const screenshot = await client.screenshot({
      name: 'switch-theme-initial-dark',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Toggle to light theme and verify', async ({ assert }) => {
    // Toggle theme using data-element
    await client.click('[data-element="theme-toggle"]');

    // Wait for theme to apply
    await new Promise(resolve => setTimeout(resolve, 600));

    // Verify Redux store: theme is light
    await assert.storeEventuallyEquals('theme', 'light', { timeout: 2000 });

    // Capture light theme
    const screenshot = await client.screenshot({
      name: 'switch-theme-light',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Toggle back to dark theme and verify', async ({ assert }) => {
    // Toggle back using data-element
    await client.click('[data-element="theme-toggle"]');

    // Wait for theme to apply
    await new Promise(resolve => setTimeout(resolve, 600));

    // Verify Redux store: theme is dark
    await assert.storeEventuallyEquals('theme', 'dark', { timeout: 2000 });

    // Capture dark theme again
    const screenshot = await client.screenshot({
      name: 'switch-theme-dark',
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

  console.log(`\n✅ Switch Theme: ${result.summary.passed}/${result.summary.total} passed`);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
