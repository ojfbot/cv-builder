# Browser Automation Test Assertions

Comprehensive guide to the assertion API for testing UI interactions, DOM state, and Redux store state.

## Table of Contents

- [Basic Element Assertions](#basic-element-assertions)
- [Enhanced DOM Assertions](#enhanced-dom-assertions)
- [Redux Store Assertions](#redux-store-assertions)
- [Screenshot Assertions](#screenshot-assertions)
- [Usage Examples](#usage-examples)

## Basic Element Assertions

### Element Existence and Visibility

```typescript
// Check if element exists in DOM
await assert.elementExists(selector: string, message?: string)

// Check if element is visible
await assert.elementVisible(selector: string, message?: string)

// Check if element is hidden
await assert.elementHidden(selector: string, message?: string)

// Count elements matching selector
await assert.elementCount(selector: string, count: number, message?: string)
```

### Element State

```typescript
// Check if element is enabled
await assert.elementEnabled(selector: string, message?: string)

// Check if element is disabled
await assert.elementDisabled(selector: string, message?: string)
```

### Text Content

```typescript
// Check if element text contains a string
await assert.textContains(selector: string, text: string, message?: string)

// Check if element text exactly matches
await assert.textEquals(selector: string, text: string, message?: string)
```

### Attributes

```typescript
// Check if attribute equals a value
await assert.attributeEquals(
  selector: string,
  attr: string,
  value: string,
  message?: string
)
```

## Enhanced DOM Assertions

### CSS Classes

```typescript
// Check if element has a specific class
await assert.elementHasClass(selector: string, className: string, message?: string)

// Check if element does NOT have a specific class
await assert.elementNotHasClass(selector: string, className: string, message?: string)
```

### Input Values

```typescript
// Check input value (for form inputs)
await assert.elementValueEquals(selector: string, value: string, message?: string)

// Check placeholder text contains string
await assert.elementPlaceholderContains(selector: string, text: string, message?: string)
```

### Focus State

```typescript
// Check if element has focus
await assert.elementHasFocus(selector: string, message?: string)
```

## Redux Store Assertions

The assertion API includes powerful Redux store query capabilities using the store map system.

### Basic Store Queries

```typescript
// Assert store value equals expected
await assert.storeEquals(
  queryName: string,
  expectedValue: any,
  message?: string
)

// Examples:
await assert.storeEquals('currentTab', 0) // Bio tab
await assert.storeEquals('chatInput', 'Hello world')
await assert.storeEquals('sidebarOpen', true)
```

### Truthy/Falsy Checks

```typescript
// Check if store value is truthy
await assert.storeTruthy(queryName: string, message?: string)

// Check if store value is falsy
await assert.storeFalsy(queryName: string, message?: string)

// Examples:
await assert.storeTruthy('isAuthenticated')
await assert.storeFalsy('chatLoading')
```

### Array Assertions

```typescript
// Check if array contains an item
await assert.storeContains(
  queryName: string,
  item: any,
  message?: string
)

// Check array length
await assert.storeArrayLength(
  queryName: string,
  length: number,
  message?: string
)

// Examples:
await assert.storeArrayLength('chatMessages', 5)
await assert.storeContains('bioSkills', 'TypeScript')
```

### Asynchronous State Changes

```typescript
// Wait for store value to eventually match (with timeout)
await assert.storeEventuallyEquals(
  queryName: string,
  expectedValue: any,
  options?: { timeout?: number; message?: string }
)

// Examples:
await assert.storeEventuallyEquals('chatLoading', false, { timeout: 30000 })
await assert.storeEventuallyEquals('currentTab', 1, { timeout: 2000 })
```

## Screenshot Assertions

```typescript
// Check if screenshot was captured successfully
assert.screenshotCaptured(result: ScreenshotResult, message?: string)

// Check screenshot file size
assert.screenshotSize(result: ScreenshotResult, minBytes: number, message?: string)

// Check screenshot path
assert.screenshotPath(result: ScreenshotResult, expectedPath: string, message?: string)
```

## Usage Examples

### Complete Test Example

```typescript
import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

const { suite, client } = createTestSuite('My Test Suite', 'http://localhost:3002');

suite.test('Chat input interactions', async ({ assert }) => {
  // Navigate to app
  await client.navigate('http://localhost:3000');

  // Click chat tab
  await client.click('[data-element="chat-tab"]');

  // Wait for chat panel
  await client.waitForSelector('[data-element="chat-panel"]', { state: 'visible' });

  // Check placeholder text
  await assert.elementPlaceholderContains(
    '[data-element="chat-input"]',
    'Ask about'
  );

  // Type message
  await client.fill('[data-element="chat-input"]', 'Generate resume');

  // Assert DOM value
  await assert.elementValueEquals('[data-element="chat-input"]', 'Generate resume');

  // Assert Redux store updated
  await assert.storeEquals('chatInput', 'Generate resume');

  // Click send
  await client.click('[data-element="chat-send-button"]');

  // Wait for input to clear
  await assert.storeEventuallyEquals('chatInput', '', { timeout: 2000 });

  // Wait for loading to finish
  await assert.storeEventuallyEquals('chatLoading', false, { timeout: 30000 });

  // Check message was added
  const initialCount = await client.storeQuery('chatMessageCount');
  await assert.storeArrayLength('chatMessages', initialCount + 1);
});

suite.test('Settings modal', async ({ assert }) => {
  // Click settings button
  await client.click('[data-element="settings-button"]');

  // Modal should be visible
  await assert.elementVisible('[data-element="settings-modal"]');

  // Check heading
  await assert.textContains('[data-element="settings-modal"] h3', 'API Connection');

  // Close modal
  await client.click('[data-element="settings-modal"] button.cds--btn--primary');

  // Modal should be hidden
  await client.waitForSelector('[data-element="settings-modal"]', { state: 'hidden' });
  await assert.elementHidden('[data-element="settings-modal"]');
});
```

### Available Store Queries

The CV Builder app provides the following store queries (see `tests/store-maps/cv-builder.json`):

**UI State:**
- `currentTab` - Active tab index
- `sidebarOpen` - Sidebar visibility
- `chatExpanded` - Chat expansion state
- `modalOpen` - Modal open state
- `theme` - Current theme ('light' | 'dark')

**Chat State:**
- `chatMessages` - Array of messages
- `chatMessageCount` - Number of messages
- `chatLoading` - Loading state
- `chatInput` - Current input text
- `chatSessionId` - Session identifier

**Bio Data:**
- `bioFullName` - User's full name
- `bioEmail` - User's email
- `bioPhone` - User's phone number
- `bioExperiences` - Work experience array
- `bioSkills` - Skills array
- `bioLoading` - Loading state

**Jobs Data:**
- `jobs` - List of jobs
- `jobCount` - Number of jobs
- `selectedJobId` - Currently selected job ID
- `jobsLoading` - Loading state

**Outputs Data:**
- `outputs` - List of generated outputs
- `outputCount` - Number of outputs
- `selectedOutputId` - Currently selected output ID
- `outputsLoading` - Loading state

## Best Practices

1. **Use data-element attributes** for stable selectors:
   ```typescript
   // Good
   await client.click('[data-element="chat-send-button"]');

   // Avoid (CSS classes can change)
   await client.click('.send-button');
   ```

2. **Wait for asynchronous operations**:
   ```typescript
   // Wait for loading to finish
   await assert.storeEventuallyEquals('chatLoading', false, { timeout: 30000 });
   ```

3. **Combine DOM and store assertions**:
   ```typescript
   // Check both DOM and Redux are in sync
   await assert.elementValueEquals(input, 'test');
   await assert.storeEquals('chatInput', 'test');
   ```

4. **Use meaningful assertion messages**:
   ```typescript
   await assert.elementVisible(
     '[data-element="chat-panel"]',
     'Chat panel should be visible after clicking chat tab'
   );
   ```

5. **Clean up after tests**:
   ```typescript
   suite.afterAll(async () => {
     await client.close();
   });
   ```

## Running Tests

```bash
# Run comprehensive UI assertion tests
npm run test:comprehensive

# Run specific phase tests
npm run test:phase4

# Run all tests
npm run test:all
```

## Troubleshooting

### Element Not Found

If assertions fail with "element not found":
1. Check if element has the correct `data-element` attribute
2. Verify element is in the DOM (use browser DevTools)
3. Add wait before assertion: `await client.waitForSelector(...)`

### Store Query Failed

If store assertions fail:
1. Check store map definition in `tests/store-maps/cv-builder.json`
2. Verify Redux DevTools shows the expected path
3. Use `client.storeSnapshot()` to debug full store state

### Timeout Errors

If tests timeout:
1. Increase timeout: `{ timeout: 60000 }`
2. Check if app/API is running on correct port
3. Verify browser automation server is running (`http://localhost:3002/health`)
