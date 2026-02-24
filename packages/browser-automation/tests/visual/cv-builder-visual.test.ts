/**
 * Visual Regression Tests for CV Builder
 *
 * Tests for visual consistency across UI components using baseline comparison.
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';
import { VisualDiffReporter } from '../../src/test-runner/reporters/VisualDiffReporter.js';
import { GitHubPRReporter } from '../../src/test-runner/reporters/GitHubPRReporter.js';
import { createVisualAssertions } from '../../src/test-runner/assertions/visual.js';
import { VISUAL_THRESHOLDS } from '../../src/visual/constants.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.BROWSER_APP_URL || 'http://localhost:3000';
const UPDATE_BASELINES = process.env.UPDATE_BASELINES === 'true';
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID;
const GITHUB_RUN_NUMBER = process.env.GITHUB_RUN_NUMBER;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

// Display startup warning if UPDATE_BASELINES is enabled
if (UPDATE_BASELINES) {
  console.log('');
  console.log('🔄 UPDATE_BASELINES=true - All baselines will be updated');
  console.log('⚠️  WARNING: This will overwrite existing baselines!');
  console.log('   Make sure you review the changes before committing.');
  console.log('');
}

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
    // Retry logic for flaky CI environments where containers may not be fully ready
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`🔄 Retry attempt ${attempt}/${maxRetries}...`);
        }

        // Warmup navigation to give React app time to initialize
        await client.navigate(APP_URL);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Increased timeout to 30s for Docker environment
        await client.waitForSelector('.app-container', { timeout: 30000 });
        console.log('✅ CV Builder loaded');
        return; // Success - exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.log(`❌ Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);

        if (attempt < maxRetries) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    // All retries failed
    throw new Error(`Failed to load CV Builder after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  });

  // Test: Dashboard initial state
  suite.test('Dashboard - Initial Load', async ({ assert }) => {
    // Navigate to dashboard
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Wait for dashboard to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

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
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      }
    );
  });

  // Test: Bio tab
  suite.test('Bio Tab - Layout', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Click Bio tab
    await client.click('[data-element="bio-tab"]');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture Bio tab
    const result = await client.screenshot({
      name: 'bio-tab-layout',
      viewport: 'desktop',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'bio-tab-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // Test: Jobs tab
  suite.test('Jobs Tab - Layout', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Click Jobs tab
    await client.click('[data-element="jobs-tab"]');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture Jobs tab
    const result = await client.screenshot({
      name: 'jobs-tab-layout',
      viewport: 'desktop',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'jobs-tab-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // Test: Responsive - Mobile viewport
  suite.test('Dashboard - Mobile Responsive', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Capture at mobile viewport
    const result = await client.screenshot({
      name: 'dashboard-mobile',
      viewport: 'mobile',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'dashboard-mobile', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // Test: Responsive - Tablet viewport
  suite.test('Dashboard - Tablet Responsive', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Capture at tablet viewport
    const result = await client.screenshot({
      name: 'dashboard-tablet',
      viewport: 'tablet',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'dashboard-tablet', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // Test: Sidebar toggle
  suite.test('Sidebar - Collapsed State', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Toggle sidebar
    const toggleButton = '[data-element="sidebar-toggle"]';
    const exists = await client.elementExists(toggleButton);

    if (exists) {
      await client.click(toggleButton);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture collapsed state
      const result = await client.screenshot({
        name: 'sidebar-collapsed',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'sidebar-collapsed-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });
    } else {
      console.log('⏭️  Sidebar toggle not found, skipping test');
    }
  });

  // Test: Chat component
  suite.test('Chat Component - Initial State', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Click Interactive tab
    await client.click('[data-element="interactive-tab"]');

    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture chat component
    const result = await client.screenshot({
      name: 'chat-component',
      viewport: 'desktop',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'chat-component-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // Test: Theme Switching - Light Mode
  suite.test('Theme - Light Mode', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Toggle to light theme
    const themeToggle = '[data-element="theme-toggle"]';
    const exists = await client.elementExists(themeToggle);

    if (exists) {
      await client.click(themeToggle);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Capture light theme
      const result = await client.screenshot({
        name: 'theme-light',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'theme-light-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });

      // Toggle back to dark for subsequent tests
      await client.click(themeToggle);
      await new Promise(resolve => setTimeout(resolve, 600));
    } else {
      console.log('⏭️  Theme toggle not found, skipping test');
    }
  });

  // Test: Settings Modal - Open State
  suite.test('Settings Modal - Open', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Open settings modal
    const settingsButton = '[data-element="settings-button"]';
    const exists = await client.elementExists(settingsButton);

    if (exists) {
      await client.click(settingsButton);
      await client.waitForSelector('[data-element="settings-modal"]', {
        state: 'visible',
        timeout: 2000,
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture modal open state
      const result = await client.screenshot({
        name: 'settings-modal-open',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'settings-modal-open-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });

      // Close modal for subsequent tests
      const closeButton = '[data-element="settings-modal"] button.cds--btn--primary';
      await client.click(closeButton);
      await client.waitForSelector('[data-element="settings-modal"]', {
        state: 'hidden',
        timeout: 2000,
      });
    } else {
      console.log('⏭️  Settings button not found, skipping test');
    }
  });

  // Test: Outputs Tab - Layout
  suite.test('Outputs Tab - Layout', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Click Outputs tab
    const outputsTab = '[data-element="outputs-tab"]';
    const exists = await client.elementExists(outputsTab);

    if (exists) {
      await client.click(outputsTab);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture Outputs tab
      const result = await client.screenshot({
        name: 'outputs-tab-layout',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'outputs-tab-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });
    } else {
      console.log('⏭️  Outputs tab not found, skipping test');
    }
  });

  // Test: Chat Component - Help Badge Visible
  suite.test('Chat - Help Badge Interaction', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Navigate to Interactive tab
    await client.click('[data-element="interactive-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if help badge exists
    const helpBadge = '[data-element="help-badge"]';
    const exists = await client.elementExists(helpBadge);

    if (exists) {
      // Capture with help badge visible
      const result = await client.screenshot({
        name: 'chat-help-badge',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'chat-help-badge-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });
    } else {
      console.log('⏭️  Help badge not found, skipping test');
    }
  });

  // Test: Bio Form - Empty State
  suite.test('Bio Form - Empty State', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Navigate to Bio tab
    await client.click('[data-element="bio-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if add bio button exists
    const addBioButton = '[data-element="add-bio-button"]';
    const exists = await client.elementExists(addBioButton);

    if (exists) {
      await client.click(addBioButton);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Capture empty bio form
      const result = await client.screenshot({
        name: 'bio-form-empty',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'bio-form-empty-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });

      // Close form by pressing Escape or clicking cancel
      const cancelButton = 'button:has-text("Cancel")';
      const cancelExists = await client.elementExists(cancelButton);
      if (cancelExists) {
        await client.click(cancelButton);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } else {
      console.log('⏭️  Add bio button not found, skipping test');
    }
  });

  // Test: Sidebar - Both States Comparison
  suite.test('Sidebar - Expanded State', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Expand the application sidebar
    const toggleButton = '[data-element="sidebar-toggle"]';
    const exists = await client.elementExists(toggleButton);

    if (exists) {
      await client.click(toggleButton);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Capture expanded state
    const result = await client.screenshot({
      name: 'sidebar-expanded',
      viewport: 'desktop',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'sidebar-expanded-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });

    // Collapse sidebar for subsequent tests
    if (exists) {
      await client.click(toggleButton);
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  });

  // Test: Chat Input - Focus State
  suite.test('Chat Input - Focus State', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Navigate to Interactive tab
    await client.click('[data-element="interactive-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Focus on chat input
    const chatInput = '[data-element="chat-input"]';
    const exists = await client.elementExists(chatInput);

    if (exists) {
      await client.click(chatInput);
      await new Promise(resolve => setTimeout(resolve, 300));

      // Capture focused input state
      const result = await client.screenshot({
        name: 'chat-input-focused',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'chat-input-focused-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });
    } else {
      console.log('⏭️  Chat input not found, skipping test');
    }
  });

  // Test: Mobile - Bio Tab
  suite.test('Bio Tab - Mobile Responsive', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Click Bio tab
    await client.click('[data-element="bio-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture at mobile viewport
    const result = await client.screenshot({
      name: 'bio-tab-mobile',
      viewport: 'mobile',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'bio-tab-mobile', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // Test: Mobile - Jobs Tab
  suite.test('Jobs Tab - Mobile Responsive', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Click Jobs tab
    await client.click('[data-element="jobs-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture at mobile viewport
    const result = await client.screenshot({
      name: 'jobs-tab-mobile',
      viewport: 'mobile',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'jobs-tab-mobile', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // Test: Tablet - Interactive Tab
  suite.test('Interactive Tab - Tablet Responsive', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Click Interactive tab
    await client.click('[data-element="interactive-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture at tablet viewport
    const result = await client.screenshot({
      name: 'interactive-tab-tablet',
      viewport: 'tablet',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'interactive-tab-tablet', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // ── New tests: remaining draw.io canvas cells ─────────────────────────────

  // Test: Research Tab
  suite.test('Research Tab - Layout', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    const tab = '[data-element="research-tab"]';
    const exists = await client.elementExists(tab);

    if (exists) {
      await client.click(tab);
      await new Promise(resolve => setTimeout(resolve, 800));

      const result = await client.screenshot({
        name: 'research-tab-layout',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'research-tab-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });
    } else {
      console.log('⏭️  Research tab not found, skipping');
    }
  });

  // Test: Pipelines Tab
  suite.test('Pipelines Tab - Layout', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    const tab = '[data-element="pipelines-tab"]';
    const exists = await client.elementExists(tab);

    if (exists) {
      await client.click(tab);
      await new Promise(resolve => setTimeout(resolve, 800));

      const result = await client.screenshot({
        name: 'pipelines-tab-layout',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'pipelines-tab-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });
    } else {
      console.log('⏭️  Pipelines tab not found, skipping');
    }
  });

  // Test: Toolbox Tab
  suite.test('Toolbox Tab - Layout', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    const tab = '[data-element="toolbox-tab"]';
    const exists = await client.elementExists(tab);

    if (exists) {
      await client.click(tab);
      await new Promise(resolve => setTimeout(resolve, 800));

      const result = await client.screenshot({
        name: 'toolbox-tab-layout',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'toolbox-tab-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });
    } else {
      console.log('⏭️  Toolbox tab not found, skipping');
    }
  });

  // Test: Bio Tab - Chat Window Open
  suite.test('Bio Tab - Chat Open', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    // Navigate to Bio tab (CondensedChat appears on non-Interactive tabs)
    await client.click('[data-element="bio-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Expand the chat window by clicking its header
    const chatWindow = '[data-element="chat-window"]';
    const chatExists = await client.elementExists(chatWindow);

    if (chatExists) {
      await client.click(chatWindow);
      await new Promise(resolve => setTimeout(resolve, 600));

      const result = await client.screenshot({
        name: 'bio-chat-open',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'bio-chat-open-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });
    } else {
      console.log('⏭️  Chat window not found on Bio tab, skipping');
    }
  });

  // Test: Bio Tab - File Browser View
  suite.test('Bio - File Browser', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    await client.click('[data-element="bio-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click the Files button to switch to file browser view
    const filesButton = '[data-element="bio-files-button"]';
    const exists = await client.elementExists(filesButton);

    if (exists) {
      await client.click(filesButton);
      await new Promise(resolve => setTimeout(resolve, 600));

      const result = await client.screenshot({
        name: 'bio-file-browser',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'bio-file-browser-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });
    } else {
      console.log('⏭️  Bio files button not found, skipping');
    }
  });

  // Test: Jobs Tab - Chat Window Open
  suite.test('Jobs - Chat Open', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    await client.click('[data-element="jobs-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    const chatWindow = '[data-element="chat-window"]';
    const chatExists = await client.elementExists(chatWindow);

    if (chatExists) {
      await client.click(chatWindow);
      await new Promise(resolve => setTimeout(resolve, 600));

      const result = await client.screenshot({
        name: 'jobs-chat-open',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'jobs-chat-open-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });
    } else {
      console.log('⏭️  Chat window not found on Jobs tab, skipping');
    }
  });

  // Test: Jobs Tab - Sidebar Expanded + Chat Open
  suite.test('Jobs - Sidebar and Chat Open', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    await client.click('[data-element="jobs-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    const sidebarToggle = '[data-element="sidebar-toggle"]';
    const chatWindow = '[data-element="chat-window"]';
    const sidebarExists = await client.elementExists(sidebarToggle);
    const chatExists = await client.elementExists(chatWindow);

    if (sidebarExists) {
      await client.click(sidebarToggle);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (chatExists) {
      await client.click(chatWindow);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    const result = await client.screenshot({
      name: 'jobs-sidebar-chat',
      viewport: 'desktop',
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    assert.screenshotCaptured(result);

    await visual.matchesBaseline(result.path, 'jobs-sidebar-chat-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });

    // Restore state
    if (sidebarExists) {
      await client.click(sidebarToggle);
      await new Promise(resolve => setTimeout(resolve, 400));
    }
  });

  // Test: Outputs Tab - Sidebar Expanded
  suite.test('Outputs - Sidebar Expanded', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('.app-container');

    const outputsTab = '[data-element="outputs-tab"]';
    const tabExists = await client.elementExists(outputsTab);

    if (tabExists) {
      await client.click(outputsTab);
      await new Promise(resolve => setTimeout(resolve, 500));

      const sidebarToggle = '[data-element="sidebar-toggle"]';
      const sidebarExists = await client.elementExists(sidebarToggle);

      if (sidebarExists) {
        await client.click(sidebarToggle);
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      const result = await client.screenshot({
        name: 'outputs-sidebar',
        viewport: 'desktop',
        fullPage: true,
        path: 'temp/screenshots/visual-test',
      });

      assert.screenshotCaptured(result);

      await visual.matchesBaseline(result.path, 'outputs-sidebar-desktop', {
        threshold: VISUAL_THRESHOLDS.STANDARD,
        updateBaseline: UPDATE_BASELINES,
      });

      // Collapse sidebar
      if (sidebarExists) {
        await client.click(sidebarToggle);
        await new Promise(resolve => setTimeout(resolve, 400));
      }
    } else {
      console.log('⏭️  Outputs tab not found, skipping');
    }
  });

  // ── End of draw.io baseline tests ─────────────────────────────────────────

  // Run tests
  const reporters: any[] = ['console', visualReporter];

  // Add GitHub PR reporter in CI
  if (GITHUB_RUN_ID && GITHUB_REPOSITORY) {
    const prReporter = new GitHubPRReporter({
      outputPath: './temp/test-results/pr-comment.md',
      runId: GITHUB_RUN_ID,
      runNumber: GITHUB_RUN_NUMBER,
      repository: GITHUB_REPOSITORY,
      includeVisualDiffs: true,
    });
    reporters.push(prReporter);
  }

  const runner = createTestRunner({
    reporters,
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
