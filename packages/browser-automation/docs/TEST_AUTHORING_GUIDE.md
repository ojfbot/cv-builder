# Test Authoring Guide

**Version:** 1.0
**Date:** 2025-11-16
**Framework:** Browser Automation TypeScript Test Framework

---

## Quick Start

### Basic Test Template

```typescript
import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';

async function main() {
  const { suite, client } = createTestSuite('My Test Suite', API_URL);

  suite.test('My first test', async ({ assert }) => {
    // Your test code here
    await client.navigate('https://example.com');
    await assert.elementExists('h1');
  });

  const runner = createTestRunner({ reporters: ['console'], verbose: true });
  const result = await runner.run(suite);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
```

---

## Test Structure

### Test Suites

Group related tests together:

```typescript
const { suite, client } = createTestSuite('Feature Name', API_URL, {
  timeout: 30000,      // Default timeout for all tests
  baseUrl: APP_URL,    // Base URL for navigation
  screenshotDir: 'my-feature-screenshots'
});
```

### Individual Tests

```typescript
suite.test('Test description', async ({ assert, skip, timeout }) => {
  // Test code
});
```

### Lifecycle Hooks

```typescript
// Run once before all tests
suite.beforeAll(async () => {
  await client.navigate(APP_URL);
});

// Run before each test
suite.beforeEach(async () => {
  // Reset state
});

// Run after each test
suite.afterEach(async () => {
  // Cleanup
});

// Run once after all tests
suite.afterAll(async () => {
  // Final cleanup
});
```

---

## Browser Automation Client

### Navigation

```typescript
// Navigate to URL
await client.navigate('https://example.com');

// With options
await client.navigate('https://example.com', {
  waitFor: 'networkidle',  // 'load' | 'domcontentloaded' | 'networkidle'
  timeout: 30000
});

// Navigate back
await client.back();

// Reload page
await client.reload();

// Get current URL
const url = await client.currentUrl();
```

### Element Queries

```typescript
// Check if element exists
const exists = await client.elementExists('h1');

// Check if element is visible
const visible = await client.elementVisible('.header');

// Get element text
const text = await client.elementText('h1');

// Get element attribute
const href = await client.elementAttribute('a', 'href');

// Count elements
const count = await client.elementCount('li');
```

### Interactions

```typescript
// Click element
await client.click('button');

// With options
await client.click('button', {
  button: 'left',      // 'left' | 'right' | 'middle'
  clickCount: 1,
  delay: 100,
  timeout: 5000
});

// Type text (appends to existing)
await client.type('input', 'Hello');

// Fill input (clears first, then types)
await client.fill('input[name="email"]', 'test@example.com');

// Hover over element
await client.hover('.menu-item');

// Press keyboard key
await client.press('Enter');
await client.press('Escape');

// Select dropdown option
await client.select('select[name="country"]', 'US');

// Check/uncheck checkbox
await client.check('input[type="checkbox"]', true);
```

### Waiting

```typescript
// Wait for element to be visible
await client.waitForSelector('h1', {
  state: 'visible',    // 'attached' | 'detached' | 'visible' | 'hidden'
  timeout: 5000
});

// Wait for text to appear
await client.waitForText('Example', { timeout: 5000 });

// Wait for navigation
await client.waitForNavigation({ timeout: 10000 });

// Wait for network to be idle
await client.waitForNetworkIdle();
```

### Screenshots

```typescript
// Basic screenshot
await client.screenshot({
  name: 'my-screenshot'
});

// Full page screenshot
await client.screenshot({
  name: 'full-page',
  fullPage: true
});

// Element screenshot
await client.screenshot({
  name: 'header',
  selector: 'header'
});

// Different viewport
await client.screenshot({
  name: 'mobile-view',
  viewport: 'mobile'    // 'desktop' | 'tablet' | 'mobile'
});

// Custom viewport
await client.screenshot({
  name: 'custom',
  viewport: { width: 1024, height: 768 }
});

// JPEG with quality
await client.screenshot({
  name: 'compressed',
  format: 'jpeg',
  quality: 80
});
```

---

## Assertions

### Element Assertions

```typescript
// Element exists in DOM
await assert.elementExists('h1');

// Element is visible to user
await assert.elementVisible('.header');

// Element is hidden
await assert.elementHidden('.modal');

// Element is enabled (not disabled)
await assert.elementEnabled('button');

// Element is disabled
await assert.elementDisabled('button[disabled]');

// Exact element count
await assert.elementCount('li', 5);
```

### Text Assertions

```typescript
// Element contains text
await assert.textContains('h1', 'Welcome');

// Element text matches exactly
await assert.textEquals('h1', 'Welcome to Example');
```

### Attribute Assertions

```typescript
// Attribute equals value
await assert.attributeEquals('a', 'href', 'https://example.com');
```

### Screenshot Assertions

```typescript
const screenshot = await client.screenshot({ name: 'test' });

// Screenshot was successful
assert.screenshotCaptured(screenshot);

// Screenshot meets minimum size
assert.screenshotSize(screenshot, 1000);

// Screenshot path contains string
assert.screenshotPath(screenshot, 'test');
```

### Navigation Assertions

```typescript
// URL matches exactly
await assert.urlEquals('https://example.com');

// URL contains fragment
await assert.urlContains('example');
```

---

## Best Practices

### 1. Use Descriptive Test Names

```typescript
// ❌ Bad
suite.test('test1', async ({ assert }) => { ... });

// ✅ Good
suite.test('Dashboard loads with header visible', async ({ assert }) => { ... });
```

### 2. One Logical Assertion Per Test

```typescript
// ❌ Bad - Multiple concerns
suite.test('Everything works', async ({ assert }) => {
  await assert.elementExists('h1');
  await assert.elementExists('.sidebar');
  await assert.elementExists('footer');
});

// ✅ Good - Focused tests
suite.test('Header is present', async ({ assert }) => {
  await assert.elementExists('h1');
});

suite.test('Sidebar is present', async ({ assert }) => {
  await assert.elementExists('.sidebar');
});
```

### 3. Use Explicit Waits

```typescript
// ❌ Bad - Might fail on slow connections
suite.test('Check element', async ({ assert }) => {
  await client.navigate('https://example.com');
  await assert.elementVisible('h1'); // Might not be loaded yet
});

// ✅ Good - Explicit wait
suite.test('Check element', async ({ assert }) => {
  await client.navigate('https://example.com');
  await client.waitForSelector('h1', { state: 'visible' });
  await assert.elementVisible('h1');
});
```

### 4. Handle Dynamic Content

```typescript
// ❌ Bad - Hardcoded selectors might break
await client.click('.button-123');

// ✅ Good - Flexible selectors
await client.click('button:has-text("Submit")');
await client.click('[data-testid="submit-button"]');
await client.click('button[type="submit"]');
```

### 5. Use Setup/Teardown

```typescript
// ✅ Good - Shared setup
suite.beforeAll(async () => {
  await client.navigate(APP_URL);
});

suite.test('Test 1', async ({ assert }) => {
  // Already on the right page
});

suite.test('Test 2', async ({ assert }) => {
  // Already on the right page
});
```

### 6. Add Helpful Console Logs

```typescript
suite.test('Complex operation', async ({ assert }) => {
  console.log('  Step 1: Navigating...');
  await client.navigate(url);

  console.log('  Step 2: Clicking button...');
  await client.click('button');

  console.log('  Step 3: Verifying result...');
  await assert.elementVisible('.success-message');
});
```

### 7. Handle Missing Elements Gracefully

```typescript
suite.test('Check optional element', async ({ assert }) => {
  try {
    await client.click('[data-testid="optional-button"]');
  } catch (error) {
    console.warn('  ⚠️  Optional button not found - continuing');
  }
});
```

---

## Common Patterns

### Testing Tab Navigation

```typescript
suite.test('Navigate between tabs', async ({ assert }) => {
  // Click Bio tab
  await client.click('[data-testid="bio-tab"]');
  await client.waitForSelector('.bio-content', { state: 'visible' });
  await assert.elementVisible('.bio-content');

  // Click Jobs tab
  await client.click('[data-testid="jobs-tab"]');
  await client.waitForSelector('.jobs-content', { state: 'visible' });
  await assert.elementVisible('.jobs-content');
});
```

### Testing Forms

```typescript
suite.test('Submit form with validation', async ({ assert }) => {
  // Fill form fields
  await client.fill('input[name="name"]', 'John Doe');
  await client.fill('input[name="email"]', 'john@example.com');
  await client.select('select[name="country"]', 'US');
  await client.check('input[name="terms"]', true);

  // Submit
  await client.click('button[type="submit"]');

  // Wait for success
  await client.waitForSelector('.success-message', { state: 'visible' });
  await assert.textContains('.success-message', 'Success');
});
```

### Testing Responsive Design

```typescript
suite.test('Mobile viewport', async ({ assert }) => {
  const screenshot = await client.screenshot({
    name: 'mobile-view',
    viewport: 'mobile',
    fullPage: true
  });

  assert.screenshotCaptured(screenshot);
});

suite.test('Tablet viewport', async ({ assert }) => {
  const screenshot = await client.screenshot({
    name: 'tablet-view',
    viewport: 'tablet',
    fullPage: true
  });

  assert.screenshotCaptured(screenshot);
});

suite.test('Desktop viewport', async ({ assert }) => {
  const screenshot = await client.screenshot({
    name: 'desktop-view',
    viewport: 'desktop',
    fullPage: true
  });

  assert.screenshotCaptured(screenshot);
});
```

### Testing Modals/Dialogs

```typescript
suite.test('Open and close modal', async ({ assert }) => {
  // Open modal
  await client.click('[data-testid="open-modal"]');
  await client.waitForSelector('.modal', { state: 'visible' });
  await assert.elementVisible('.modal');

  // Close modal
  await client.click('.modal .close-button');
  await client.waitForSelector('.modal', { state: 'hidden' });
  await assert.elementHidden('.modal');
});
```

---

## Running Tests

```bash
# Run single test
npm test

# Run specific test suite
npm run test:phase3
npm run test:cv-builder
npm run test:ui-nav

# Run all tests
npm run test:all

# Watch mode (development)
npm run test:watch

# With environment variables
API_URL=http://localhost:3002 npm test
```

---

## Debugging Tests

### Enable Verbose Output

```typescript
const runner = createTestRunner({
  reporters: ['console'],
  verbose: true    // More detailed output
});
```

### Add Breakpoints

Since tests are TypeScript, you can use debugger tools:

```typescript
suite.test('Debug this test', async ({ assert }) => {
  debugger;  // Stops here if running with --inspect
  await client.navigate(url);
});
```

### Increase Timeouts

```typescript
suite.test('Slow operation', async ({ assert, timeout }) => {
  timeout(60000);  // 60 seconds
  await someLongRunningOperation();
});
```

### Screenshot on Failure

```typescript
suite.test('Check element', async ({ assert }) => {
  try {
    await assert.elementVisible('.important-element');
  } catch (error) {
    // Capture screenshot for debugging
    await client.screenshot({ name: 'failure-debug' });
    throw error;
  }
});
```

---

## Examples

See these files for complete examples:
- `tests/integration/basic-workflow.test.ts` - Basic workflow
- `tests/features/phase3-features.test.ts` - Advanced features
- `tests/apps/cv-builder-integration.test.ts` - App integration
- `tests/ui/cv-builder-navigation.test.ts` - Complex UI testing

---

## Troubleshooting

**Test times out:**
- Increase timeout with `timeout(ms)` function
- Add explicit waits before assertions
- Check if element selectors are correct

**Element not found:**
- Add `waitForSelector()` before interacting
- Try alternative selectors (data-testid, text, role)
- Verify element exists in browser DevTools

**Screenshot fails:**
- Check that page is fully loaded
- Verify screenshot directory exists
- Ensure element selector is valid (for element screenshots)

**Tests pass locally but fail in CI:**
- Increase timeouts for slower environments
- Use `waitFor: 'networkidle'` on navigation
- Ensure all resources are loaded

---

**For more help:**
- See Migration Guide for converting shell scripts
- Check issue #27 for Phase 1 details
- Review API client documentation in types.ts

Happy testing! 🎉
