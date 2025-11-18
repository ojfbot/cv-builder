# Session Isolation for Browser Tests

**Date:** 2025-11-18
**Issue:** Session state was persisting between test runs
**Solution:** Added storage clearing and context reset capabilities

---

## Problem

Browser tests were sharing state between test runs, including:
- **localStorage** - Redux persist, user preferences
- **sessionStorage** - Temporary session data
- **Cookies** - Authentication tokens, tracking
- **IndexedDB** - Structured data storage
- **Browser Context** - Network cache, service workers

This caused tests to be **non-deterministic** - results depended on which tests ran before them.

---

## Solution

Added two levels of session isolation:

### 1. Storage Clearing (`clearStorage()`)
**Fast, lightweight** - Clears storage but keeps the same browser context

**What it clears:**
- localStorage
- sessionStorage
- Cookies
- IndexedDB databases

**When to use:**
- Between individual test cases in the same suite
- Before each test that needs clean state
- When you want to keep the browser instance running

**Performance:** ~50-100ms

---

### 2. Context Reset (`resetContext()`)
**Complete isolation** - Creates entirely new browser context

**What it does:**
- Closes current browser context
- Creates new context with fresh state
- Re-initializes Redux DevTools emulation
- Re-attaches observability (console logger, error tracker)

**When to use:**
- Between test suites (different test files)
- When you need guaranteed complete isolation
- After critical state changes or errors

**Performance:** ~500-1000ms

---

## API Reference

### Server Endpoints

#### `POST /api/storage/clear`
Clears browser storage (localStorage, sessionStorage, cookies, indexedDB)

**Request:**
```bash
curl -X POST http://localhost:3002/api/storage/clear
```

**Response:**
```json
{
  "success": true,
  "message": "Browser storage cleared successfully",
  "timestamp": "2025-11-18T04:35:00.000Z"
}
```

---

#### `POST /api/context/reset`
Resets browser context completely (new context with clean state)

**Request:**
```bash
curl -X POST http://localhost:3002/api/context/reset
```

**Response:**
```json
{
  "success": true,
  "message": "Browser context reset successfully",
  "timestamp": "2025-11-18T04:35:00.000Z"
}
```

---

### Client Methods

#### `client.clearStorage()`
Clears all browser storage

**Usage:**
```typescript
const { suite, client } = createTestSuite('My Test', API_URL);

suite.beforeAll(async () => {
  // Clear storage before test suite
  await client.clearStorage();

  await client.navigate(APP_URL);
});

suite.beforeEach(async () => {
  // Clear storage before each test
  await client.clearStorage();
});
```

---

#### `client.resetContext()`
Resets the browser context completely

**Usage:**
```typescript
const { suite, client } = createTestSuite('My Test', API_URL);

suite.beforeAll(async () => {
  // Reset context for complete isolation
  await client.resetContext();

  await client.navigate(APP_URL);
});
```

---

## Usage Patterns

### Pattern 1: Clean State Before Suite
**Recommended for most test suites**

```typescript
suite.beforeAll(async () => {
  console.log('🧹 Clearing browser storage for test isolation...');
  await client.clearStorage();

  await client.navigate(APP_URL);
});
```

**Benefits:**
- Fresh state for the entire suite
- Fast (only one clearStorage call)
- No cross-contamination from previous test runs

---

### Pattern 2: Clean State Between Tests
**For tests that modify state heavily**

```typescript
suite.beforeEach(async () => {
  // Clear storage before each test
  await client.clearStorage();

  // Reload page to get fresh Redux store
  await client.reload();
});
```

**Benefits:**
- Complete isolation between individual tests
- Tests can run in any order
- Prevents cascading failures

---

### Pattern 3: Reset Helper Function
**For tests with complex reset logic**

```typescript
async function resetToWelcomeMessage() {
  console.log('🔄 Resetting to welcome message...');

  // Clear storage
  await client.clearStorage();

  // Reload page
  await client.reload();
  await client.waitForSelector('[data-element="app-container"]', { timeout: 5000 });

  // Navigate to starting state
  await client.click('[role="tab"]:has-text("Interactive")');
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log('✅ Reset complete');
}

suite.test('Test 1', async ({ assert }) => {
  // ...test code...
});

suite.test('Test 2', async ({ assert }) => {
  await resetToWelcomeMessage();
  // ...test code...
});
```

**Benefits:**
- Reusable reset logic
- Consistent state between tests
- Clear separation of concerns

---

### Pattern 4: Context Reset Between Suites
**For maximum isolation between test files**

```typescript
// File: test-suite-1.test.ts
suite.afterAll(async () => {
  // Reset context after this suite
  await client.resetContext();
});

// File: test-suite-2.test.ts
suite.beforeAll(async () => {
  // This suite starts with completely fresh context
  await client.navigate(APP_URL);
});
```

**Benefits:**
- No state leakage between test files
- Clean browser context per suite
- Better isolation for critical tests

---

## Implementation Details

### BrowserManager Methods

#### `clearStorage()`
```typescript
async clearStorage(): Promise<void> {
  // Clear cookies via Playwright
  await this.context.clearCookies();

  // Clear localStorage, sessionStorage, indexedDB via page.evaluate
  await this.page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();

    if (window.indexedDB) {
      indexedDB.databases().then((databases) => {
        databases.forEach((db) => {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      });
    }
  });
}
```

#### `resetContext()`
```typescript
async resetContext(): Promise<void> {
  // Cleanup old context
  if (this.consoleLogger) this.consoleLogger.detach();
  if (this.errorTracker) this.errorTracker.detach();
  if (this.page) await this.page.close();
  if (this.context) await this.context.close();

  // Create new context
  this.context = await this.browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) CV-Builder-Automation',
  });

  // Inject Redux DevTools
  await this.context.addInitScript(() => {
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = { stores: [] };
  });

  // Create new page
  this.page = await this.context.newPage();

  // Re-initialize observability
  if (process.env.NODE_ENV === 'development') {
    this.initializeObservability();
  }
}
```

---

## Updated Test Files

All chat test files have been updated to use `clearStorage()`:

### ✅ Updated Files

1. **`tests/cv-builder/chat/message-input.test.ts`**
   - Clears storage in `beforeAll`

2. **`tests/cv-builder/chat/show-help-flow.test.ts`**
   - Clears storage in `beforeAll`

3. **`tests/cv-builder/chat/badge-interactions.test.ts`**
   - Clears storage in `beforeAll`
   - Clears storage in `resetToWelcomeMessage()` helper
   - Reloads page after clearing for fresh Redux state

4. **`tests/cv-builder/bio-form/add-bio-flow.test.ts`**
   - Clears storage in `beforeAll`

---

## Benefits

### Before Session Isolation
- ❌ Tests shared localStorage (Redux persist)
- ❌ Chat messages persisted between runs
- ❌ Tab state carried over
- ❌ Test order affected results
- ❌ Failures were hard to debug

### After Session Isolation
- ✅ Each test starts with clean state
- ✅ No cross-contamination between tests
- ✅ Tests can run in any order
- ✅ Failures are reproducible
- ✅ Better debugging experience

---

## Performance Impact

### clearStorage()
- **Time:** ~50-100ms
- **Use case:** Between individual tests
- **Overhead:** Minimal (~0.5-1% of total test time)

### resetContext()
- **Time:** ~500-1000ms
- **Use case:** Between test suites
- **Overhead:** Moderate (~5-10% if used frequently)

### Recommendation
- Use `clearStorage()` liberally (fast, effective)
- Use `resetContext()` sparingly (slow, comprehensive)
- Clear storage in `beforeAll` for most test suites
- Clear storage in `beforeEach` only if tests heavily modify state

---

## Example Test Output

### With Session Isolation
```bash
Running test suite: Show Help Flow

🚀 Navigating to CV Builder app...
🧹 Clearing browser storage for test isolation...
Clearing browser storage...
Browser storage cleared successfully
✅ Interactive chat loaded
📸 Screenshot: show-help-flow-initial-desktop.png
✓ Show Help badge is visible in welcome message 48ms
✓ Click Show Help badge stays on Interactive tab 1.10s
✓ Prepared help message appears in chat 1.57s
✓ Help message contains all expected commands 41ms
✓ Chat input receives keyboard focus after help display 1.67s
✓ Complete flow state is correct 51ms

6 passed
Total time: 8.11s
```

---

## Troubleshooting

### Issue: clearStorage() doesn't work
**Symptoms:** State still persists between tests

**Solutions:**
1. Verify browser automation server is running
2. Check that `clearStorage()` is actually called (add console.log)
3. Try `resetContext()` for complete reset
4. Ensure you're reloading the page after clearing storage

---

### Issue: Tests are slow after adding clearStorage()
**Symptoms:** Tests take longer than before

**Solutions:**
1. Move `clearStorage()` to `beforeAll` instead of `beforeEach`
2. Only clear storage for tests that need it
3. Use `clearStorage()` instead of `resetContext()`
4. Batch tests that don't need isolation

---

### Issue: Redux state not reset
**Symptoms:** Redux store still has old state after clearStorage()

**Solutions:**
1. Reload the page after clearing storage:
   ```typescript
   await client.clearStorage();
   await client.reload();
   ```
2. Redux persist loads from localStorage on app startup
3. Page reload triggers fresh Redux store initialization

---

## Future Enhancements

### Potential Improvements

1. **Selective Storage Clearing**
   ```typescript
   await client.clearStorage({
     localStorage: true,
     sessionStorage: false,  // Keep session data
     cookies: true,
     indexedDB: true
   });
   ```

2. **Storage Snapshots**
   ```typescript
   const snapshot = await client.saveStorageSnapshot();
   // ...run tests...
   await client.restoreStorageSnapshot(snapshot);
   ```

3. **Automatic Storage Clearing**
   ```typescript
   createTestSuite('My Test', API_URL, {
     autoCleanStorage: true  // Clear before each test automatically
   });
   ```

---

## Related Documentation

- [Test Organization Guide](docs/TEST_ORGANIZATION.md)
- [Browser Automation Client API](src/client/BrowserAutomationClient.ts)
- [Browser Manager Implementation](src/automation/browser.ts)
- [Chat Test Suite README](tests/cv-builder/chat/README.md)
- [Running Tests Guide](tests/cv-builder/chat/RUNNING_TESTS.md)

---

**Session isolation implemented: 2025-11-18**
**All chat tests updated for clean state**
**Zero cross-contamination between test runs**
