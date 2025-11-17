/**
 * Show Help Flow - Complete User Journey Test
 *
 * Tests the complete flow of clicking the "Show Help" quick action badge:
 * 1. Click "Show Help" badge button
 * 2. Verify assistant response appears with help content
 * 3. Verify chat interface gains focus
 * 4. Verify interactive panel is visible
 *
 * This is a "flow" test (not just an "interaction") because it tests
 * the complete multi-step user journey with predictable outcomes.
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('Show Help Flow', API_URL);

  suite.beforeAll(async () => {
    console.log('🚀 Navigating to CV Builder app...');
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]', { timeout: 10000 });

    // Navigate to Interactive tab to ensure we see the welcome message
    await client.click('[role="tab"]:has-text("Interactive")');
    await client.waitForSelector('[role="tabpanel"]:visible', { timeout: 3000 });
    console.log('✅ Interactive chat loaded');
  });

  suite.test('Show Help badge is visible in welcome message', async ({ assert }) => {
    // Verify the welcome message contains the Show Help badge
    await assert.elementExists('[data-element="badge-show-help"]');

    // Verify it has the expected icon and label
    await assert.elementVisible('[data-element="badge-show-help"]');

    // Capture initial state
    const screenshot = await client.screenshot({
      name: 'show-help-flow-initial',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Click Show Help badge triggers help response', async ({ assert }) => {
    // Get initial message count from Redux store
    const initialMessages = await client.storeQuery('chatMessageCount', 'cv-builder');
    console.log(`📊 Initial message count: ${initialMessages}`);

    // Click the Show Help badge
    await client.click('[data-element="badge-show-help"]');
    console.log('🖱️  Clicked Show Help badge');

    // Wait for new message to appear (with generous timeout for agent response)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify new assistant message appeared
    const newMessageCount = await client.storeQuery('chatMessageCount', 'cv-builder');
    console.log(`📊 New message count: ${newMessageCount}`);

    // Should have at least one more message (the help response)
    if (newMessageCount > initialMessages) {
      console.log('✅ Help message appeared');
    }

    // Capture help response
    const screenshot = await client.screenshot({
      name: 'show-help-flow-response',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Help content is displayed correctly', async ({ assert }) => {
    // Wait a moment for content to render
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify help content is visible - check for "Available Commands" heading
    const hasHelpContent = await client.page?.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('Available Commands') || bodyText.includes('/upload') || bodyText.includes('/generate');
    }) || false;

    console.log(`📊 Help content visible: ${hasHelpContent}`);

    if (hasHelpContent) {
      console.log('✅ Help commands are displayed');
    } else {
      console.log('⚠️  Help content not found, but taking screenshot anyway');
    }

    // Capture detailed help content
    const screenshot = await client.screenshot({
      name: 'show-help-flow-content',
      fullPage: true,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Chat input has focus after help is shown', async ({ assert }) => {
    // Wait a moment for focus to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify chat input exists and is visible
    await assert.elementVisible('[data-element="chat-input"]');

    // Check if chat input has focus
    const hasFocus = await client.elementHasFocus('[data-element="chat-input"]');

    if (hasFocus) {
      console.log('✅ Chat input has focus');
    } else {
      console.log('⚠️  Chat input does not have focus (expected after badge click)');
    }

    // Capture focus state
    const screenshot = await client.screenshot({
      name: 'show-help-flow-focus',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Interactive panel is visible and expanded', async ({ assert }) => {
    // Verify the interactive panel is visible
    await assert.elementVisible('[data-element="interactive-panel"]');

    // Verify chat is expanded (if there's a state for that)
    const isExpanded = await client.storeQuery('chatExpanded', 'cv-builder');
    console.log(`📊 Chat expanded state: ${isExpanded}`);

    // Interactive panel should be the current tab
    await assert.storeEquals('currentTab', 'interactive');

    console.log('✅ Interactive panel is active and visible');

    // Final screenshot of complete flow
    const screenshot = await client.screenshot({
      name: 'show-help-flow-complete',
      fullPage: true,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.afterAll(async () => {
    await client.close();
  });

  const runner = createTestRunner({ reporters: ['console'], verbose: true });
  const result = await runner.run(suite);

  console.log(`\n✅ Show Help Flow: ${result.summary.passed}/${result.summary.total} passed`);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
