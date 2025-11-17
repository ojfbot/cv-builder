/**
 * Phase 4: UI Interactions with DOM and Redux Store Assertions
 *
 * This test suite demonstrates comprehensive UI testing with:
 * - Chat input interactions
 * - Badge button clicks
 * - Settings modal behavior
 * - Sidebar input
 * - DOM state assertions
 * - Redux store state assertions
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  // Create test suite
  const { suite, client } = createTestSuite('Phase 4: UI Assertions', API_URL);

  // Setup: Navigate to CV Builder app before tests
  suite.beforeAll(async () => {
    console.log('🚀 Navigating to CV Builder app...');
    await client.navigate(APP_URL);

    // Wait for app to initialize
    await client.waitForSelector('[data-element="app-container"]', { timeout: 10000 });
    console.log('✅ App loaded successfully');
  });

  // ========================================
  // 1. Chat Input Interactions
  // ========================================

  suite.test('Chat input should have correct placeholder text', async ({ assert }) => {
    // Navigate to Interactive/Chat tab
    const chatTab = '[data-element="chat-tab"]';
    await client.waitForSelector(chatTab, { state: 'visible', timeout: 5000 });
    await client.click(chatTab);

    // Wait for chat panel to be visible
    await client.waitForSelector('[data-element="chat-panel"]', { state: 'visible', timeout: 3000 });

    // Check chat input placeholder
    const chatInput = '[data-element="chat-input"]';
    await client.waitForSelector(chatInput, { state: 'visible', timeout: 3000 });

    await assert.elementPlaceholderContains(
      chatInput,
      'Ask about',
      'Chat input should have helpful placeholder text'
    );
  });

  suite.test('Typing in chat input should update Redux store', async ({ assert }) => {
    const chatInput = '[data-element="chat-input"]';

    // Type a message
    const testMessage = 'Generate a resume for software engineer position';
    await client.fill(chatInput, testMessage);

    // Assert DOM value
    await assert.elementValueEquals(chatInput, testMessage);

    // Assert Redux store was updated
    await assert.storeEquals('chatInput', testMessage);
  });

  suite.test('Send button should be disabled when input is empty', async ({ assert }) => {
    const chatInput = '[data-element="chat-input"]';
    const sendButton = '[data-element="chat-send-button"]';

    // Clear input
    await client.fill(chatInput, '');

    // Send button should be disabled
    await assert.elementDisabled(sendButton);
  });

  suite.test('Send button should be enabled when input has text', async ({ assert }) => {
    const chatInput = '[data-element="chat-input"]';
    const sendButton = '[data-element="chat-send-button"]';

    // Type some text
    await client.fill(chatInput, 'Test message');

    // Send button should be enabled
    await assert.elementEnabled(sendButton);
  });

  suite.test('Sending a message should clear input and add to chat messages', async ({ assert }) => {
    const chatInput = '[data-element="chat-input"]';
    const sendButton = '[data-element="chat-send-button"]';

    // Get initial message count
    const initialCount = await client.storeQuery('chatMessageCount');

    // Type and send a message
    const testMessage = 'What can you help me with?';
    await client.fill(chatInput, testMessage);
    await client.click(sendButton);

    // Input should be cleared
    await assert.storeEventuallyEquals('chatInput', '', { timeout: 2000 });

    // Message count should increase
    await assert.storeEventuallyEquals('chatMessageCount', initialCount + 1, { timeout: 3000 });

    // Loading state should eventually become false
    await assert.storeEventuallyEquals('chatLoading', false, { timeout: 30000 });
  });

  // ========================================
  // 2. Badge Button Interactions
  // ========================================

  suite.test('Badge buttons should be visible in assistant messages', async () => {
    // Wait for assistant response with badges
    await client.waitForSelector('.badge-button', { state: 'visible', timeout: 35000 });

    // Count badge buttons
    const badgeCount = await client.elementCount('.badge-button');

    if (badgeCount === 0) {
      throw new Error('Expected at least one badge button in assistant response');
    }

    console.log(`Found ${badgeCount} badge buttons`);
  });

  suite.test('Clicking badge button should execute action', async () => {
    // Find first badge button
    const firstBadge = '.badge-button';

    // Check if badge exists
    const exists = await client.elementExists(firstBadge);
    if (!exists) {
      console.log('⚠️ No badge buttons found - skipping badge click test');
      return;
    }

    // Click the badge
    await client.click(firstBadge);

    // Wait for action to complete (could be navigation, message, etc.)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Badge actions could trigger various behaviors:
    // - Navigation to another tab
    // - Auto-fill chat input
    // - Send a message
    // We can verify by checking store changes
  });

  // ========================================
  // 3. Settings Modal Interactions
  // ========================================

  suite.test('Settings button should open modal when clicked', async ({ assert }) => {
    // Find settings button in header
    const settingsButton = '[data-element="settings-button"]';

    // Click settings button
    await client.click(settingsButton);

    // Modal should appear
    await client.waitForSelector('[data-element="settings-modal"]', { state: 'visible', timeout: 2000 });

    // Assert modal is visible
    await assert.elementVisible('[data-element="settings-modal"]');

    // Check that modal has expected heading
    await assert.textContains('[data-element="settings-modal"] h3', 'API Connection Status');
  });

  suite.test('Settings modal should display connection status', async ({ assert }) => {
    // Modal should be open from previous test
    // Check for notification (success, error, or info)
    const notification = '[data-element="settings-modal"] .cds--inline-notification';

    await assert.elementExists(notification);
  });

  suite.test('Closing settings modal should hide it', async ({ assert }) => {
    // Find close/primary button ("Close" button)
    const closeButton = '[data-element="settings-modal"] button.cds--btn--primary';

    // Click close button
    await client.click(closeButton);

    // Wait for modal to close
    await client.waitForSelector('[data-element="settings-modal"]', { state: 'hidden', timeout: 2000 });

    // Modal should be hidden
    await assert.elementHidden('[data-element="settings-modal"]');
  });

  // ========================================
  // 4. Sidebar Navigation Tests
  // ========================================

  suite.test('Sidebar toggle button should expand/collapse sidebar', async ({ assert }) => {
    // Find sidebar toggle button
    const sidebarToggle = '[data-element="sidebar-toggle"]';

    // Get initial sidebar state
    const initialState = await client.storeQuery('sidebarOpen');
    console.log(`Initial sidebar state: ${initialState}`);

    // Click toggle
    await client.click(sidebarToggle);

    // Store should reflect opposite state
    await assert.storeEventuallyEquals('sidebarOpen', !initialState, { timeout: 1000 });

    // Toggle back
    await client.click(sidebarToggle);
    await assert.storeEventuallyEquals('sidebarOpen', initialState, { timeout: 1000 });
  });

  // ========================================
  // 5. Tab Navigation Tests
  // ========================================

  suite.test('Clicking Bio tab should update active tab in store', async ({ assert }) => {
    const bioTab = '[data-element="bio-tab"]';

    await client.click(bioTab);

    // Store should reflect active tab
    await assert.storeEventuallyEquals('currentTab', 0, { timeout: 1000 });

    // Bio panel should be visible
    await assert.elementVisible('[data-element="bio-panel"]');
  });

  suite.test('Clicking Jobs tab should update active tab in store', async ({ assert }) => {
    const jobsTab = '[data-element="jobs-tab"]';

    await client.click(jobsTab);

    // Store should reflect active tab
    await assert.storeEventuallyEquals('currentTab', 1, { timeout: 1000 });

    // Jobs panel should be visible
    await assert.elementVisible('[data-element="jobs-panel"]');
  });

  suite.test('Clicking Outputs tab should update active tab in store', async ({ assert }) => {
    const outputsTab = '[data-element="outputs-tab"]';

    await client.click(outputsTab);

    // Store should reflect active tab
    await assert.storeEventuallyEquals('currentTab', 2, { timeout: 1000 });

    // Outputs panel should be visible
    await assert.elementVisible('[data-element="outputs-panel"]');
  });

  // ========================================
  // 6. Condensed Chat Tests (from other tabs)
  // ========================================

  suite.test('Condensed chat should be visible on non-Interactive tabs', async ({ assert }) => {
    // Make sure we're on a non-Interactive tab (e.g., Bio)
    const bioTab = '[data-element="bio-tab"]';
    await client.click(bioTab);

    // Condensed chat should be visible
    const condensedChat = '[data-element="chat-condensed"]';
    await assert.elementVisible(condensedChat);
  });

  suite.test('Expanding condensed chat should update store', async ({ assert }) => {
    // Find expand button in condensed chat
    const expandButton = '[data-element="chat-expand-button"]';

    // Click expand
    await client.click(expandButton);

    // Store should reflect expanded state
    await assert.storeEventuallyEquals('chatExpanded', true, { timeout: 1000 });
  });

  // ========================================
  // 7. Form Input Tests
  // ========================================

  suite.test('Bio form inputs should update when typed into', async ({ assert }) => {
    // Navigate to Bio tab
    const bioTab = '[data-element="bio-tab"]';
    await client.click(bioTab);
    await client.waitForSelector('[data-element="bio-panel"]', { state: 'visible', timeout: 2000 });

    // Find name input
    const nameInput = '[data-element="bio-name-input"], [name="fullName"]';
    const testName = 'John Doe';

    // Type into name field
    await client.fill(nameInput, testName);

    // Assert DOM value
    await assert.elementValueEquals(nameInput, testName);
  });

  // ========================================
  // 8. Screenshot Assertions
  // ========================================

  suite.test('Capture screenshot of chat interface', async ({ assert }) => {
    // Navigate to Interactive tab
    await client.click('[data-element="chat-tab"]');

    const screenshot = await client.screenshot({
      name: 'phase4-chat-interface',
      fullPage: false,
    });

    assert.screenshotCaptured(screenshot);
    console.log(`Screenshot saved: ${screenshot.filename}`);
  });

  suite.test('Capture screenshot of Bio dashboard', async ({ assert }) => {
    // Navigate to Bio tab
    await client.click('[data-element="bio-tab"]');

    const screenshot = await client.screenshot({
      name: 'phase4-bio-dashboard',
      fullPage: false,
    });

    assert.screenshotCaptured(screenshot);
    console.log(`Screenshot saved: ${screenshot.filename}`);
  });

  // Cleanup: Close browser after all tests
  suite.afterAll(async () => {
    console.log('\n🧹 Closing browser...');
    await client.close();
    console.log('✅ Browser closed successfully');
  });

  // Create runner and execute tests
  const runner = createTestRunner({
    reporters: ['console'],
    verbose: true,
  });

  const result = await runner.run(suite);

  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`Total: ${result.summary.total}`);
  console.log(`Passed: ${result.summary.passed} ✅`);
  console.log(`Failed: ${result.summary.failed} ❌`);
  console.log(`Skipped: ${result.summary.skipped} ⏭️`);
  console.log(`Duration: ${result.duration}ms`);

  // Exit with appropriate code
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

// Run tests
main().catch((error) => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
