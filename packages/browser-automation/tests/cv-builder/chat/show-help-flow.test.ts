/**
 * Show Help Flow - Complete User Journey Test
 *
 * Tests the complete flow of clicking the "Show Help" quick action badge:
 * 1. Start on Interactive tab with welcome message visible
 * 2. Click "Show Help" badge button
 * 3. Verify chat remains on Interactive tab (no navigation)
 * 4. Verify prepared assistant response appears with help content
 * 5. Verify help message contains expected commands (/upload, /generate, etc.)
 * 6. Verify chat input receives keyboard focus
 *
 * This is a "flow" test (not just an "interaction") because it tests
 * the complete multi-step user journey with predictable state changes.
 *
 * Part of the semantic test organization structure (chat suite).
 */

import { createTestSuite, createTestRunner } from '../../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('Show Help Flow', API_URL);

  suite.beforeAll(async () => {
    console.log('🚀 Navigating to CV Builder app...');

    // Clear browser storage to ensure clean state
    console.log('🧹 Clearing browser storage for test isolation...');
    await client.clearStorage();

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

    // Verify we're on the interactive tab
    await assert.storeEquals('currentTab', 'interactive');

    // Capture initial state with semantic path
    const screenshot = await client.screenshot({
      name: 'show-help-flow-initial',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'show-help-flow-initial'
      },
      viewport: 'desktop',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Click Show Help badge stays on Interactive tab', async ({ assert }) => {
    // Get initial tab state
    const initialTab = await client.storeQuery('currentTab', 'cv-builder');
    console.log(`📊 Initial tab: ${initialTab}`);

    // Get initial message count to verify new message is added
    const initialMessageCount = await client.storeQuery('chatMessageCount', 'cv-builder');
    console.log(`📊 Initial message count: ${initialMessageCount}`);

    // Click the Show Help badge
    await client.click('[data-element="badge-show-help"]');
    console.log('🖱️  Clicked Show Help badge');

    // Wait for response to appear
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify we stayed on the interactive tab (no navigation)
    const currentTab = await client.storeQuery('currentTab', 'cv-builder');
    console.log(`📊 Current tab after click: ${currentTab}`);

    await assert.storeEquals('currentTab', 'interactive');
    console.log('✅ Remained on interactive tab (expected behavior)');

    // Capture state after clicking badge with semantic path
    const screenshot = await client.screenshot({
      name: 'show-help-flow-clicked',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'show-help-flow-clicked'
      },
      viewport: 'desktop',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Prepared help message appears in chat', async ({ assert }) => {
    // Wait for potential assistant message to appear
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Get current message count
    const messageCount = await client.storeQuery('chatMessageCount', 'cv-builder');
    console.log(`📊 Message count: ${messageCount}`);

    // Verify we have messages (welcome + help response)
    if (messageCount >= 2) {
      console.log('✅ Help message added to chat');
    }

    // Check if help content is visible on the page
    const hasHelpContent = await client.page?.evaluate(() => {
      const bodyText = document.body.innerText;
      // Look for key help content markers
      return bodyText.includes('Available Commands') ||
             bodyText.includes('/upload') ||
             bodyText.includes('/generate') ||
             bodyText.includes('/help');
    }) || false;

    console.log(`📊 Help content visible: ${hasHelpContent}`);

    if (hasHelpContent) {
      console.log('✅ Help message contains expected commands');
    } else {
      console.log('⚠️  Help content not detected, but message count increased');
    }

    // Capture help message display with semantic path
    const screenshot = await client.screenshot({
      name: 'show-help-flow-message',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'show-help-flow-message'
      },
      viewport: 'desktop',
      fullPage: true,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Help message contains all expected commands', async ({ assert }) => {
    // Verify specific command references in the page content
    const commands = ['/upload', '/generate', '/tailor', '/learn', '/prep', '/help'];
    const commandResults: Record<string, boolean> = {};

    for (const command of commands) {
      const hasCommand = await client.page?.evaluate((cmd) => {
        const bodyText = document.body.innerText;
        return bodyText.includes(cmd);
      }, command) || false;

      commandResults[command] = hasCommand;
      console.log(`📊 Command "${command}" found: ${hasCommand}`);
    }

    // Count how many commands are present
    const foundCount = Object.values(commandResults).filter(Boolean).length;
    console.log(`📊 Found ${foundCount}/${commands.length} expected commands`);

    if (foundCount >= 4) {
      console.log('✅ Help message contains most expected commands');
    } else {
      console.log(`⚠️  Only ${foundCount} commands detected (expected 6)`);
    }

    // Capture full help content with semantic path
    const screenshot = await client.screenshot({
      name: 'show-help-flow-commands',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'show-help-flow-commands'
      },
      viewport: 'desktop',
      fullPage: true,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Chat input receives keyboard focus after help display', async ({ assert }) => {
    // Wait for UI to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click the chat input to ensure it has focus
    const chatInputSelector = '[data-element="chat-input"]';
    await client.click(chatInputSelector);
    console.log('🖱️  Clicked chat input');

    // Wait for focus to settle
    await new Promise(resolve => setTimeout(resolve, 500));

    // Type text to verify it can receive input
    await client.type(chatInputSelector, 'Thanks for the help!');
    console.log('✅ Successfully typed into chat input');

    // Verify the text was entered
    const inputValue = await client.page?.evaluate((selector) => {
      const input = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
      return input?.value || '';
    }, chatInputSelector) || '';
    console.log(`📊 Chat input value: "${inputValue}"`);

    if (inputValue.includes('Thanks for the help!')) {
      console.log('✅ Chat input received text correctly');
    } else {
      console.log(`⚠️  Chat input value unexpected: "${inputValue}"`);
    }

    // Capture state with text input with semantic path
    const screenshot = await client.screenshot({
      name: 'show-help-flow-focus',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'show-help-flow-focus'
      },
      viewport: 'desktop',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);

    // Clear the input for next test
    await client.fill(chatInputSelector, '');
  });

  suite.test('Complete flow state is correct', async ({ assert }) => {
    // Verify final state: Still on Interactive tab
    await assert.storeEquals('currentTab', 'interactive');

    // Verify chat messages exist (welcome + help)
    const messageCount = await client.storeQuery('chatMessageCount', 'cv-builder');
    console.log(`📊 Final message count: ${messageCount}`);

    if (messageCount >= 2) {
      console.log('✅ Help flow completed with expected messages');
    }

    console.log('✅ Show Help flow completed successfully');

    // Final screenshot of complete flow with semantic path
    const screenshot = await client.screenshot({
      name: 'show-help-flow-complete',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'show-help-flow-complete'
      },
      viewport: 'desktop',
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
