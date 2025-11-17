/**
 * Toggle Sidebar - User Interaction Flow
 *
 * Tests sidebar expansion/collapse with search input and Redux store verification.
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('Toggle Sidebar', API_URL);

  suite.beforeAll(async () => {
    console.log('🚀 Navigating to CV Builder app...');
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]', { timeout: 10000 });
    console.log('✅ App loaded');
  });

  suite.test('View initial collapsed sidebar state', async ({ assert }) => {
    // Verify Redux store: sidebar is closed (false)
    await assert.storeEquals('sidebarOpen', false);

    // Capture collapsed state
    const screenshot = await client.screenshot({
      name: 'toggle-sidebar-collapsed',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Expand sidebar', async ({ assert }) => {
    // Click to expand using data-element
    await client.click('[data-element="sidebar-toggle"]');

    // Wait for sidebar to be visible
    await client.waitForSelector('.cds--side-nav__navigation', { state: 'visible', timeout: 2000 });

    // Verify DOM: Sidebar navigation is visible
    await assert.elementVisible('.cds--side-nav__navigation');

    // Verify Redux store: sidebar is open (true)
    await assert.storeEventuallyEquals('sidebarOpen', true, { timeout: 2000 });

    // Capture expanded state
    const screenshot = await client.screenshot({
      name: 'toggle-sidebar-expanded',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Collapse sidebar', async ({ assert }) => {
    // Click to collapse using data-element
    await client.click('[data-element="sidebar-toggle"]');

    // Wait a moment for animation
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify Redux store: sidebar is closed (false)
    await assert.storeEventuallyEquals('sidebarOpen', false, { timeout: 2000 });

    // Capture collapsed state again
    const screenshot = await client.screenshot({
      name: 'toggle-sidebar-collapsed-again',
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

  console.log(`\n✅ Toggle Sidebar: ${result.summary.passed}/${result.summary.total} passed`);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
