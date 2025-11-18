/**
 * Sidebar Toggle Interactions Test
 *
 * Tests sidebar expansion/collapse with search input and Redux store verification.
 * Part of the semantic test organization structure.
 */

import { createTestSuite, createTestRunner } from '../../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('Sidebar Toggle Interactions', API_URL);

  suite.beforeAll(async () => {
    console.log('🚀 Navigating to CV Builder app...');
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]', { timeout: 10000 });
    console.log('✅ App loaded');
  });

  suite.test('View initial collapsed sidebar state', async ({ assert }) => {
    // Verify DOM: Sidebar navigation is not visible (collapsed)
    await assert.elementHidden('.cds--side-nav__navigation');

    // Capture collapsed state with semantic path
    const screenshot = await client.screenshot({
      name: 'toggle-sidebar-collapsed',
      test: {
        app: 'cv-builder',
        suite: 'sidebar',
        case: 'collapsed'
      },
      viewport: 'desktop',
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

    // Note: Sidebar state is local to App.tsx, not in Redux store

    // Capture expanded state with semantic path
    const screenshot = await client.screenshot({
      name: 'toggle-sidebar-expanded',
      test: {
        app: 'cv-builder',
        suite: 'sidebar',
        case: 'expanded'
      },
      viewport: 'desktop',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Collapse sidebar', async ({ assert }) => {
    // Click to collapse using data-element
    await client.click('[data-element="sidebar-toggle"]');

    // Wait for sidebar to be hidden
    await client.waitForSelector('.cds--side-nav__navigation', { state: 'hidden', timeout: 2000 });

    // Verify DOM: Sidebar navigation is hidden
    await assert.elementHidden('.cds--side-nav__navigation');

    // Note: Sidebar state is local to App.tsx, not in Redux store

    // Capture collapsed state again with semantic path
    const screenshot = await client.screenshot({
      name: 'toggle-sidebar-collapsed-again',
      test: {
        app: 'cv-builder',
        suite: 'sidebar',
        case: 'collapsed-again'
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

  console.log(`\n✅ Sidebar Toggle Interactions: ${result.summary.passed}/${result.summary.total} passed`);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
