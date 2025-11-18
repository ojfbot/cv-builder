/**
 * Settings Modal Interactions Test
 *
 * Tests settings modal open/close behavior and connection status display.
 * Part of the semantic test organization structure.
 */

import { createTestSuite, createTestRunner } from '../../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('Settings Modal Interactions', API_URL);

  suite.beforeAll(async () => {
    console.log('🚀 Navigating to CV Builder app...');
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]', { timeout: 10000 });
    console.log('✅ App loaded');
  });

  suite.test('Click settings button and verify modal opens', async ({ assert }) => {
    const settingsButton = '[data-element="settings-button"]';

    // Click settings
    await client.click(settingsButton);

    // Wait for modal
    await client.waitForSelector('[data-element="settings-modal"]', { state: 'visible', timeout: 2000 });

    // Verify modal visible
    await assert.elementVisible('[data-element="settings-modal"]');

    // Capture screenshot with semantic path
    const screenshot = await client.screenshot({
      name: 'open-settings-modal',
      test: {
        app: 'cv-builder',
        suite: 'settings',
        case: 'modal-open'
      },
      viewport: 'desktop',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Verify connection status notification displayed', async ({ assert }) => {
    // Check for notification (success, error, or info)
    const notification = '[data-element="settings-modal"] .cds--inline-notification';

    await assert.elementExists(notification);

    // Capture screenshot showing status with semantic path
    const screenshot = await client.screenshot({
      name: 'open-settings-status',
      test: {
        app: 'cv-builder',
        suite: 'settings',
        case: 'connection-status'
      },
      viewport: 'desktop',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Close settings modal and verify hidden', async ({ assert }) => {
    const closeButton = '[data-element="settings-modal"] button.cds--btn--primary';

    // Click close
    await client.click(closeButton);

    // Wait for modal to close
    await client.waitForSelector('[data-element="settings-modal"]', { state: 'hidden', timeout: 2000 });

    // Verify hidden
    await assert.elementHidden('[data-element="settings-modal"]');

    // Capture screenshot with semantic path
    const screenshot = await client.screenshot({
      name: 'open-settings-closed',
      test: {
        app: 'cv-builder',
        suite: 'settings',
        case: 'modal-closed'
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

  console.log(`\n✅ Settings Modal Interactions: ${result.summary.passed}/${result.summary.total} passed`);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
