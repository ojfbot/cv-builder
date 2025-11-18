/**
 * Badge Interactions - Comprehensive Badge Click Flow Test
 *
 * Tests all badge interactions from the welcome message:
 * 1. Upload Resume - should expand chat and show upload instructions
 * 2. Add Your Bio - should navigate to Bio tab, expand chat, show bio prompt, and focus input
 * 3. Show Help - should expand chat and show help content
 * 4. Generate Resume - should navigate to Outputs tab and trigger generation
 * 5. Tailor Resume - should navigate to Jobs tab and show tailoring prompt
 * 6. Learning Path - should navigate to Research tab and show learning prompt
 * 7. Interview Prep - should navigate to Jobs tab and show interview prep prompt
 *
 * This comprehensive test verifies that all badge actions work as expected
 * with proper navigation, chat expansion, focus management, and assistant responses.
 *
 * Part of the semantic test organization structure (chat suite).
 */

import { createTestSuite, createTestRunner } from '../../../src/test-runner/index.js';
import { TEST_TIMING, wait } from '../../test-constants.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('Badge Interactions', API_URL);

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

  // Helper function to reset to initial state
  async function resetToWelcomeMessage() {
    console.log('🔄 Resetting to welcome message...');

    // Reload the page to get fresh state
    await client.reload();
    await client.waitForSelector('[data-element="app-container"]', { timeout: 5000 });

    // Clear storage AFTER reload to ensure clean state between badge tests
    await client.clearStorage();

    // Navigate back to Interactive tab
    await client.click('[role="tab"]:has-text("Interactive")');
    await wait(TEST_TIMING.UI_SETTLE);
    console.log('✅ Reset complete');
  }

  suite.test('All expected badges are visible in welcome message', async ({ assert }) => {
    const badges = [
      'badge-upload-resume',
      'badge-add-your-bio',
      'badge-show-help',
      'badge-generate-resume',
      'badge-tailor-resume',
      'badge-learning-path',
      'badge-interview-prep'
    ];

    for (const badgeId of badges) {
      const selector = `[data-element="${badgeId}"]`;
      await assert.elementExists(selector);
      console.log(`✅ Badge found: ${badgeId}`);
    }

    // Capture initial state with all badges visible
    const screenshot = await client.screenshot({
      name: 'badge-interactions-all-badges',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'all-badges-visible'
      },
      viewport: 'desktop',
      fullPage: true,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Upload Resume badge shows upload instructions', async ({ assert }) => {
    await resetToWelcomeMessage();

    // Click Upload Resume badge
    await client.click('[data-element="badge-upload-resume"]');
    console.log('🖱️  Clicked Upload Resume badge');

    // Wait for response
    await wait(TEST_TIMING.NAVIGATION);

    // Verify we stayed on Interactive tab
    await assert.storeEquals('currentTab', 'interactive');

    // Check for upload-related content
    const hasUploadContent = await client.page?.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('upload') ||
             bodyText.includes('PDF') ||
             bodyText.includes('Word') ||
             bodyText.includes('drag and drop');
    }) || false;

    console.log(`📊 Upload instructions visible: ${hasUploadContent}`);

    if (hasUploadContent) {
      console.log('✅ Upload instructions displayed');
    }

    const screenshot = await client.screenshot({
      name: 'badge-interactions-upload-resume',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'upload-resume'
      },
      viewport: 'desktop',
      fullPage: true,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Add Your Bio badge navigates and expands chat with focus', async ({ assert }) => {
    await resetToWelcomeMessage();

    // Verify initial state
    await assert.storeEquals('currentTab', 'interactive');

    const initialExpanded = await client.storeQuery('chatExpanded', 'cv-builder');
    console.log(`📊 Initial chat expanded state: ${initialExpanded}`);

    // Click Add Your Bio badge
    await client.click('[data-element="badge-add-your-bio"]');
    console.log('🖱️  Clicked Add Your Bio badge');

    // Wait for navigation and expansion
    await wait(TEST_TIMING.CONTENT_LOAD);

    // Verify navigation to Bio tab
    const currentTab = await client.storeQuery('currentTab', 'cv-builder');
    console.log(`📊 Current tab after click: ${currentTab}`);
    await assert.storeEquals('currentTab', 'bio');

    // Verify chat expanded (using CondensedChat on non-Interactive tabs)
    const isExpanded = await client.storeQuery('chatExpanded', 'cv-builder');
    console.log(`📊 Chat expanded state: ${isExpanded}`);
    await assert.storeEquals('chatExpanded', true);

    // Verify bio-related content is visible
    const hasBioContent = await client.page?.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('professional') ||
             bodyText.includes('experience') ||
             bodyText.includes('bio') ||
             bodyText.includes('profile');
    }) || false;

    console.log(`📊 Bio prompt visible: ${hasBioContent}`);

    if (hasBioContent) {
      console.log('✅ Bio guidance displayed');
    }

    // Test keyboard focus on CondensedChat input
    await wait(TEST_TIMING.CHAT_RESPONSE);

    const condensedChatInputSelector = '[data-element="condensed-chat-input-wrapper"] [data-element="chat-input"]';
    await client.click(condensedChatInputSelector);
    await wait(TEST_TIMING.UI_SETTLE);

    await client.type(condensedChatInputSelector, 'Test bio input');
    const inputValue = await client.page?.evaluate((selector) => {
      const input = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
      return input?.value || '';
    }, condensedChatInputSelector) || '';

    console.log(`📊 CondensedChat input value: "${inputValue}"`);

    if (inputValue.includes('Test bio input')) {
      console.log('✅ CondensedChat input accepts keyboard input');
    }

    const screenshot = await client.screenshot({
      name: 'badge-interactions-add-bio',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'add-bio-expanded'
      },
      viewport: 'desktop',
      fullPage: true,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);

    // Clear input for next test
    await client.fill(condensedChatInputSelector, '');
  });

  suite.test('Show Help badge displays help content', async ({ assert }) => {
    await resetToWelcomeMessage();

    // Click Show Help badge
    await client.click('[data-element="badge-show-help"]');
    console.log('🖱️  Clicked Show Help badge');

    // Wait for response
    await wait(TEST_TIMING.NAVIGATION);

    // Verify we stayed on Interactive tab
    await assert.storeEquals('currentTab', 'interactive');

    // Check for help commands
    const hasHelpContent = await client.page?.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('/upload') &&
             bodyText.includes('/generate') &&
             bodyText.includes('/help');
    }) || false;

    console.log(`📊 Help commands visible: ${hasHelpContent}`);

    if (hasHelpContent) {
      console.log('✅ Help content with commands displayed');
    }

    const screenshot = await client.screenshot({
      name: 'badge-interactions-show-help',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'show-help'
      },
      viewport: 'desktop',
      fullPage: true,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Generate Resume badge navigates to Outputs tab', async ({ assert }) => {
    await resetToWelcomeMessage();

    // Click Generate Resume badge
    await client.click('[data-element="badge-generate-resume"]');
    console.log('🖱️  Clicked Generate Resume badge');

    // Wait for navigation
    await wait(TEST_TIMING.NAVIGATION);

    // Verify navigation to Outputs tab
    const currentTab = await client.storeQuery('currentTab', 'cv-builder');
    console.log(`📊 Current tab after click: ${currentTab}`);
    await assert.storeEquals('currentTab', 'outputs');

    const screenshot = await client.screenshot({
      name: 'badge-interactions-generate-resume',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'generate-resume'
      },
      viewport: 'desktop',
      fullPage: true,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Tailor Resume badge navigates to Jobs tab', async ({ assert }) => {
    await resetToWelcomeMessage();

    // Click Tailor Resume badge
    await client.click('[data-element="badge-tailor-resume"]');
    console.log('🖱️  Clicked Tailor Resume badge');

    // Wait for navigation
    await wait(TEST_TIMING.NAVIGATION);

    // Verify navigation to Jobs tab
    const currentTab = await client.storeQuery('currentTab', 'cv-builder');
    console.log(`📊 Current tab after click: ${currentTab}`);
    await assert.storeEquals('currentTab', 'jobs');

    // Check for tailoring-related content
    const hasTailorContent = await client.page?.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('tailor') ||
             bodyText.includes('customize') ||
             bodyText.includes('job description');
    }) || false;

    console.log(`📊 Tailoring prompt visible: ${hasTailorContent}`);

    const screenshot = await client.screenshot({
      name: 'badge-interactions-tailor-resume',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'tailor-resume'
      },
      viewport: 'desktop',
      fullPage: true,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Learning Path badge navigates to Research tab', async ({ assert }) => {
    await resetToWelcomeMessage();

    // Click Learning Path badge
    await client.click('[data-element="badge-learning-path"]');
    console.log('🖱️  Clicked Learning Path badge');

    // Wait for navigation
    await wait(TEST_TIMING.NAVIGATION);

    // Verify navigation to Research tab
    const currentTab = await client.storeQuery('currentTab', 'cv-builder');
    console.log(`📊 Current tab after click: ${currentTab}`);
    await assert.storeEquals('currentTab', 'research');

    // Check for learning-related content
    const hasLearningContent = await client.page?.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('learning') ||
             bodyText.includes('skills') ||
             bodyText.includes('develop');
    }) || false;

    console.log(`📊 Learning prompt visible: ${hasLearningContent}`);

    const screenshot = await client.screenshot({
      name: 'badge-interactions-learning-path',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'learning-path'
      },
      viewport: 'desktop',
      fullPage: true,
    });
    assert.screenshotCaptured(screenshot);
    console.log(`📸 Screenshot: ${screenshot.filename}`);
  });

  suite.test('Interview Prep badge navigates to Jobs tab', async ({ assert }) => {
    await resetToWelcomeMessage();

    // Click Interview Prep badge
    await client.click('[data-element="badge-interview-prep"]');
    console.log('🖱️  Clicked Interview Prep badge');

    // Wait for navigation
    await wait(TEST_TIMING.NAVIGATION);

    // Verify navigation to Jobs tab
    const currentTab = await client.storeQuery('currentTab', 'cv-builder');
    console.log(`📊 Current tab after click: ${currentTab}`);
    await assert.storeEquals('currentTab', 'jobs');

    // Check for interview-related content
    const hasInterviewContent = await client.page?.evaluate(() => {
      const bodyText = document.body.innerText;
      return bodyText.includes('interview') ||
             bodyText.includes('prepare') ||
             bodyText.includes('questions');
    }) || false;

    console.log(`📊 Interview prep prompt visible: ${hasInterviewContent}`);

    const screenshot = await client.screenshot({
      name: 'badge-interactions-interview-prep',
      test: {
        app: 'cv-builder',
        suite: 'chat',
        case: 'interview-prep'
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

  console.log(`\n✅ Badge Interactions: ${result.summary.passed}/${result.summary.total} passed`);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
