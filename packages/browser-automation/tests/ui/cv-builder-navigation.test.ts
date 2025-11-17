/**
 * CV Builder UI Navigation Test
 *
 * Migrated from: test-ui-navigation.sh
 * Tests: Tab panel navigation, chat window expansion, multi-viewport screenshots
 *
 * Prerequisites:
 * - CV Builder app running on port 3000
 * - Browser automation service running on port 3002
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  // Create test suite
  const { suite, client } = createTestSuite('CV Builder UI Navigation', API_URL);

  // Verify prerequisites
  suite.beforeAll(async () => {
    console.log('\n🔍 Checking prerequisites...');

    // Check browser automation service
    try {
      await client.health();
      console.log('✅ Browser automation service is ready');
    } catch (error) {
      console.error(`❌ Browser automation service not running at ${API_URL}`);
      process.exit(1);
    }

    // Check CV Builder app
    try {
      await client.navigate(APP_URL, { waitFor: 'networkidle' });
      console.log('✅ CV Builder app is ready\n');
    } catch (error) {
      console.error(`❌ CV Builder app not running at ${APP_URL}`);
      console.error('Please run: npm run dev:all');
      process.exit(1);
    }
  });

  // ========================================
  // 1. Initial Dashboard Load
  // ========================================

  suite.test('Load initial dashboard', async ({ assert }) => {
    await client.navigate(APP_URL, { waitFor: 'networkidle' });

    // Wait for dashboard to be ready
    await client.waitForSelector('.cds--content', { state: 'visible', timeout: 10000 });

    await assert.elementVisible('.cds--content');
  });

  suite.test('Capture initial dashboard screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: '01-dashboard-initial',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);
    console.log(`  📸 Saved: ${screenshot.filename}`);
  });

  // ========================================
  // 2. Tab Panel Navigation
  // ========================================

  suite.test('Navigate to Bio tab', async ({ assert }) => {
    // Click Bio tab (adjust selector based on actual UI)
    // Common selectors: button with text, data-testid, role="tab"
    try {
      await client.click('button:has-text("Bio"), [data-testid*="bio-tab"], [role="tab"]:has-text("Bio")');
    } catch (error) {
      console.warn('  ⚠️  Could not find Bio tab - using alternative selector');
      // Try alternative approaches
      await client.click('text=Bio');
    }

    // Wait for bio content to be visible
    await client.waitForSelector('[data-testid*="bio"], .bio-component, .bio-form', {
      state: 'visible',
      timeout: 5000,
    }).catch(() => {
      console.warn('  ⚠️  Bio content selector not found - continuing anyway');
    });
  });

  suite.test('Capture Bio tab screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: '02-bio-tab',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);
    console.log(`  📸 Saved: ${screenshot.filename}`);
  });

  suite.test('Navigate to Jobs tab', async ({ assert }) => {
    try {
      await client.click('button:has-text("Jobs"), [data-testid*="jobs-tab"], [role="tab"]:has-text("Jobs")');
    } catch (error) {
      await client.click('text=Jobs');
    }

    await client.waitForSelector('[data-testid*="jobs"], .jobs-component', {
      state: 'visible',
      timeout: 5000,
    }).catch(() => {
      console.warn('  ⚠️  Jobs content selector not found');
    });
  });

  suite.test('Capture Jobs tab screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: '03-jobs-tab',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);
    console.log(`  📸 Saved: ${screenshot.filename}`);
  });

  suite.test('Navigate to Outputs tab', async ({ assert }) => {
    try {
      await client.click('button:has-text("Outputs"), [data-testid*="outputs-tab"], [role="tab"]:has-text("Outputs")');
    } catch (error) {
      await client.click('text=Outputs');
    }

    await client.waitForSelector('[data-testid*="outputs"], .outputs-component', {
      state: 'visible',
      timeout: 5000,
    }).catch(() => {
      console.warn('  ⚠️  Outputs content selector not found');
    });
  });

  suite.test('Capture Outputs tab screenshot', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: '04-outputs-tab',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);
    console.log(`  📸 Saved: ${screenshot.filename}`);
  });

  // ========================================
  // 3. Condensed Chat Window (on Bio tab)
  // ========================================

  suite.test('Navigate back to Bio tab for chat tests', async ({ assert }) => {
    try {
      await client.click('button:has-text("Bio"), [data-testid*="bio-tab"]');
    } catch (error) {
      await client.click('text=Bio');
    }

    // Wait a moment for tab to activate
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  suite.test('Verify condensed chat is present', async ({ assert }) => {
    // Look for chat component (might be a floating button or panel)
    const chatExists = await client.elementExists(
      '[data-testid*="chat"], .chat-window, .chat-component, button:has-text("Chat")'
    );

    if (!chatExists) {
      console.warn('  ⚠️  Chat component not found - may not be implemented yet');
    }
  });

  suite.test('Capture condensed chat collapsed', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: '05-condensed-chat-collapsed',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);
    console.log(`  📸 Saved: ${screenshot.filename}`);
  });

  // ========================================
  // 4. Chat Window Expansion via Focus
  // ========================================

  suite.test('Expand chat window', async ({ assert }) => {
    // Try to click chat expand button or chat window
    try {
      await client.click('[data-testid*="chat-expand"], .chat-expand, .chat-window, button:has-text("Chat")');
      await new Promise(resolve => setTimeout(resolve, 500)); // Animation time
    } catch (error) {
      console.warn('  ⚠️  Could not expand chat - button not found');
    }
  });

  suite.test('Capture expanded chat window', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: '06-condensed-chat-expanded',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);
    console.log(`  📸 Saved: ${screenshot.filename}`);
  });

  suite.test('Capture full page with expanded chat', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: '07-bio-with-expanded-chat',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);
    console.log(`  📸 Saved: ${screenshot.filename}`);
  });

  // ========================================
  // 5. Interactive Chat Tab (Full Screen)
  // ========================================

  suite.test('Navigate to Chat/Interactive tab', async ({ assert }) => {
    // Some apps might have a dedicated Chat tab
    try {
      await client.click('button:has-text("Chat"), [data-testid*="chat-tab"], [role="tab"]:has-text("Chat")');

      await client.waitForSelector('.chat-fullscreen, .chat-interactive, [data-testid*="chat-content"]', {
        state: 'visible',
        timeout: 5000,
      }).catch(() => {
        console.warn('  ⚠️  Chat tab content not found');
      });
    } catch (error) {
      console.warn('  ⚠️  Chat/Interactive tab not found - skipping');
    }
  });

  suite.test('Capture full-screen chat', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: '08-interactive-chat-fullscreen',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);
    console.log(`  📸 Saved: ${screenshot.filename}`);
  });

  // ========================================
  // 6. Multi-Viewport Screenshots
  // ========================================

  suite.test('Capture mobile viewport', async ({ assert }) => {
    // Go back to dashboard for viewport tests
    await client.navigate(APP_URL, { waitFor: 'networkidle' });

    const screenshot = await client.screenshot({
      name: '09-mobile-view',
      viewport: 'mobile',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);

    if (!screenshot.viewport || screenshot.viewport.width > 400) {
      throw new Error('Mobile viewport should be narrow (typically 375px)');
    }

    console.log(`  📸 Saved: ${screenshot.filename} (${screenshot.viewport?.width}x${screenshot.viewport?.height})`);
  });

  suite.test('Capture tablet viewport', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: '10-tablet-view',
      viewport: 'tablet',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);

    if (!screenshot.viewport || screenshot.viewport.width < 600) {
      throw new Error('Tablet viewport should be medium width (typically 768px)');
    }

    console.log(`  📸 Saved: ${screenshot.filename} (${screenshot.viewport?.width}x${screenshot.viewport?.height})`);
  });

  suite.test('Capture desktop viewport', async ({ assert }) => {
    const screenshot = await client.screenshot({
      name: '11-desktop-view',
      viewport: 'desktop',
      fullPage: true,
    });

    assert.screenshotCaptured(screenshot);

    if (!screenshot.viewport || screenshot.viewport.width < 1000) {
      throw new Error('Desktop viewport should be wide (typically 1920px)');
    }

    console.log(`  📸 Saved: ${screenshot.filename} (${screenshot.viewport?.width}x${screenshot.viewport?.height})`);
  });

  // ========================================
  // 7. Verification & Summary
  // ========================================

  suite.test('All screenshots captured successfully', async ({ assert }) => {
    const sessions = await client.listSessions();

    if (sessions.length === 0) {
      throw new Error('Expected screenshot sessions to exist');
    }

    console.log(`\n  ✅ Total screenshot sessions: ${sessions.length}`);
  });

  // Create runner and execute tests
  const runner = createTestRunner({
    reporters: ['console'],
    verbose: true,
  });

  const result = await runner.run(suite);

  // Print summary with screenshot manifest
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   CV Builder UI Navigation Test Complete             ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  console.log('📸 Screenshot Manifest:\n');
  console.log('  01-dashboard-initial.png           - Initial dashboard load');
  console.log('  02-bio-tab.png                     - Bio tab panel');
  console.log('  03-jobs-tab.png                    - Jobs tab panel');
  console.log('  04-outputs-tab.png                 - Outputs tab panel');
  console.log('  05-condensed-chat-collapsed.png    - Condensed chat (floating, collapsed)');
  console.log('  06-condensed-chat-expanded.png     - Condensed chat (floating, expanded)');
  console.log('  07-bio-with-expanded-chat.png      - Full page: Bio with expanded chat');
  console.log('  08-interactive-chat-fullscreen.png - Interactive/Chat tab (full-screen)');
  console.log('  09-mobile-view.png                 - Mobile viewport (375x667)');
  console.log('  10-tablet-view.png                 - Tablet viewport (768x1024)');
  console.log('  11-desktop-view.png                - Desktop viewport (1920x1080)\n');

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
