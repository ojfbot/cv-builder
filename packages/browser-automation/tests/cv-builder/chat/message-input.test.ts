/**
 * Chat Message Input Test
 *
 * Tests chat input, message typing, and Redux store synchronization.
 * Part of the semantic test organization structure.
 */

import { createTestSuite, createTestRunner } from '../../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('Chat Message Input', API_URL);

  suite.beforeAll(async () => {
    console.log('🚀 Navigating to CV Builder app...');
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]', { timeout: 10000 });

    // Navigate to Interactive tab
    await client.click('[role="tab"]:has-text("Interactive")');
    await client.waitForSelector('[role="tabpanel"]:visible', { timeout: 3000 });
    console.log('✅ Chat interface loaded');
  });

  suite.test('View empty chat input state', async ({ assert }) => {
    // Verify DOM: Chat input element exists
    await assert.elementExists('[data-element="chat-input"]');

    // Verify Redux store: draftInput is empty string
    await assert.storeEquals('draftInput', '');

    // Capture screenshot with semantic path
    const screenshot = await client.screenshot({
      name: 'engage-chat-empty-input',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'empty-input'
      },
      viewport: 'desktop',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Type message into chat input', async ({ assert }) => {
    const testMessage = 'What can you help me with?';

    // Type message using data-element selector
    await client.fill('[data-element="chat-input"]', testMessage);

    // Verify Redux store: draftInput matches (storeEventuallyEquals has built-in polling)
    await assert.storeEventuallyEquals('draftInput', testMessage, { timeout: 2000 });

    // Capture screenshot with semantic path
    const screenshot = await client.screenshot({
      name: 'engage-chat-with-text',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'with-text'
      },
      viewport: 'desktop',
      fullPage: false,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Clear input', async ({ assert }) => {
    // Clear input using data-element selector
    await client.fill('[data-element="chat-input"]', '');

    // Verify Redux store: draftInput is empty (storeEventuallyEquals has built-in polling)
    await assert.storeEventuallyEquals('draftInput', '', { timeout: 2000 });
  });

  suite.afterAll(async () => {
    await client.close();
  });

  const runner = createTestRunner({ reporters: ['console'], verbose: true });
  const result = await runner.run(suite);

  console.log(`\n✅ Chat Message Input: ${result.summary.passed}/${result.summary.total} passed`);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
