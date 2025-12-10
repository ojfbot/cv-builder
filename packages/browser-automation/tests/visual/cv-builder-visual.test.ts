/**
 * Visual Regression Tests for CV Builder
 *
 * Tests for visual consistency across UI components using baseline comparison.
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';
import { VisualDiffReporter } from '../../src/test-runner/reporters/VisualDiffReporter.js';
import { createVisualAssertions } from '../../src/test-runner/assertions/visual.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.BROWSER_APP_URL || 'http://localhost:3000';
const UPDATE_BASELINES = process.env.UPDATE_BASELINES === 'true';

async function main() {
  const { suite, client } = createTestSuite(
    'CV Builder Visual Regression',
    API_URL
  );

  // Initialize visual reporter
  const visualReporter = new VisualDiffReporter('./temp/test-results');
  const visual = createVisualAssertions('cv-builder-visual', visualReporter);

  // Suite setup
  suite.beforeAll(async () => {
    await client.navigate(APP_URL);
    await client.wait({ type: 'selector', selector: '.cds--content', timeout: 5000 });
    console.log('✅ CV Builder loaded');
  });

  // Test: Dashboard initial state
  suite.test('Dashboard - Initial Load', async ({ assert }) => {
    // Navigate to dashboard
    await client.navigate(APP_URL);
    await client.wait({ type: 'selector', selector: '.cds--content' });

    // Wait for dashboard to stabilize
    await client.wait({ type: 'timeout', timeout: 1000 });

    // Capture screenshot at desktop viewport
    const result = await client.screenshot({
      name: 'dashboard-initial',
      viewport: 'desktop',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    // Compare against baseline
    await visual.matchesBaseline(
      result.path,
      'dashboard-initial-desktop',
      {
        threshold: 0.1,
        updateBaseline: UPDATE_BASELINES,
      }
    );
  });

  // Test: Bio tab
  suite.test('Bio Tab - Layout', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.wait({ type: 'selector', selector: '.cds--content' });

    // Click Bio tab
    await client.interact({
      type: 'click',
      selector: '[data-testid="bio-tab"]',
    });

    await client.wait({ type: 'timeout', timeout: 500 });

    // Capture Bio tab
    const result = await client.screenshot({
      name: 'bio-tab-layout',
      viewport: 'desktop',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'bio-tab-desktop', {
      threshold: 0.1,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // Test: Jobs tab
  suite.test('Jobs Tab - Layout', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.wait({ type: 'selector', selector: '.cds--content' });

    // Click Jobs tab
    await client.interact({
      type: 'click',
      selector: '[data-testid="jobs-tab"]',
    });

    await client.wait({ type: 'timeout', timeout: 500 });

    // Capture Jobs tab
    const result = await client.screenshot({
      name: 'jobs-tab-layout',
      viewport: 'desktop',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'jobs-tab-desktop', {
      threshold: 0.1,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // Test: Responsive - Mobile viewport
  suite.test('Dashboard - Mobile Responsive', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.wait({ type: 'selector', selector: '.cds--content' });
    await client.wait({ type: 'timeout', timeout: 1000 });

    // Capture at mobile viewport
    const result = await client.screenshot({
      name: 'dashboard-mobile',
      viewport: 'mobile',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'dashboard-mobile', {
      threshold: 0.1,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // Test: Responsive - Tablet viewport
  suite.test('Dashboard - Tablet Responsive', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.wait({ type: 'selector', selector: '.cds--content' });
    await client.wait({ type: 'timeout', timeout: 1000 });

    // Capture at tablet viewport
    const result = await client.screenshot({
      name: 'dashboard-tablet',
      viewport: 'tablet',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'dashboard-tablet', {
      threshold: 0.1,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // Test: Sidebar toggle
  suite.test('Sidebar - Collapsed State', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.wait({ type: 'selector', selector: '.cds--content' });

    // Toggle sidebar
    const toggleButton = '[data-testid="sidebar-toggle"]';
    const exists = await client.elementExists(toggleButton);

    if (exists) {
      await client.interact({
        type: 'click',
        selector: toggleButton,
      });

      await client.wait({ type: 'timeout', timeout: 500 });

      // Capture collapsed state
      const result = await client.screenshot({
        name: 'sidebar-collapsed',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'sidebar-collapsed-desktop', {
        threshold: 0.1,
        updateBaseline: UPDATE_BASELINES,
      });
    } else {
      console.log('⏭️  Sidebar toggle not found, skipping test');
    }
  });

  // Test: Chat component
  suite.test('Chat Component - Initial State', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.wait({ type: 'selector', selector: '.cds--content' });

    // Click Chat tab
    await client.interact({
      type: 'click',
      selector: '[data-testid="chat-tab"]',
    });

    await client.wait({ type: 'timeout', timeout: 500 });

    // Capture chat component
    const result = await client.screenshot({
      name: 'chat-component',
      viewport: 'desktop',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'chat-component-desktop', {
      threshold: 0.1,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // Run tests
  const runner = createTestRunner({
    reporters: ['console', visualReporter],
    verbose: true,
    stopOnFailure: false,
  });

  const result = await runner.run(suite);

  // Exit with appropriate code
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Visual regression test suite failed:', error);
  process.exit(1);
});
