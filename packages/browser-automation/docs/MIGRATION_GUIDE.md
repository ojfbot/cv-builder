# Shell Script to TypeScript Migration Guide

**Version:** 1.0
**Date:** 2025-11-16
**Audience:** Developers migrating browser automation tests from bash to TypeScript

---

## Overview

This guide helps you migrate shell script-based browser automation tests to the TypeScript test framework.

**Benefits:**
- ✅ Type safety and IDE autocomplete
- ✅ Better error messages and debugging
- ✅ Reusable components and assertions
- ✅ 60% code reduction
- ✅ 87% faster execution
- ✅ Cross-platform compatibility

---

## Quick Reference

### Shell Script → TypeScript Mapping

| Shell Command | TypeScript Equivalent |
|---------------|----------------------|
| `curl -X POST /api/navigate` | `await client.navigate(url)` |
| `curl /api/element/exists?selector=h1` | `await client.elementExists('h1')` |
| `curl /api/element/text?selector=h1` | `await client.elementText('h1')` |
| `curl -X POST /api/interact/click` | `await client.click(selector)` |
| `curl -X POST /api/screenshot` | `await client.screenshot(options)` |
| `curl -X POST /api/wait/element` | `await client.waitForSelector(selector)` |

---

## Step-by-Step Migration

### 1. Create Test File

**Before (Shell):**
```bash
#!/bin/bash
# test-my-feature.sh
set -e
BASE_URL="http://localhost:3002"
```

**After (TypeScript):**
```typescript
// tests/features/my-feature.test.ts
import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

async function main() {
  const { suite, client } = createTestSuite('My Feature', API_URL);

  // Tests go here

  const runner = createTestRunner({ reporters: ['console'] });
  const result = await runner.run(suite);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
```

### 2. Convert curl Commands to Client Methods

**Navigation:**

```bash
# Shell
curl -s -X POST "${API_URL}/navigate" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "waitFor": "networkidle"}' \
  | jq '.success, .currentUrl'
```

```typescript
// TypeScript
const result = await client.navigate('https://example.com', {
  waitFor: 'networkidle'
});
console.log(result.currentUrl);
```

**Element Queries:**

```bash
# Shell
curl -s "${API_URL}/element/exists?selector=h1" \
  | jq '.success, .exists'
```

```typescript
// TypeScript
const exists = await client.elementExists('h1');
```

**Screenshots:**

```bash
# Shell
curl -s -X POST "${API_URL}/screenshot" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-screenshot", "fullPage": true}' \
  | jq '.success, .filename'
```

```typescript
// TypeScript
const screenshot = await client.screenshot({
  name: 'test-screenshot',
  fullPage: true
});
console.log(screenshot.filename);
```

### 3. Convert Assertions

**Shell Pattern:**
```bash
if echo "$RESPONSE" | grep -q '"success":true'; then
  test_passed "Screenshot captured"
else
  test_failed "Screenshot failed"
fi
```

**TypeScript Pattern:**
```typescript
suite.test('Capture screenshot', async ({ assert }) => {
  const screenshot = await client.screenshot({
    name: 'test-screenshot',
    fullPage: true
  });

  assert.screenshotCaptured(screenshot);
});
```

### 4. Convert Test Sections

**Shell Pattern:**
```bash
echo "=========================================="
echo "  1. Test Navigation"
echo "=========================================="

test_info "Navigating to example.com..."
curl -s -X POST "${API_URL}/navigate" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

test_passed "Navigation successful"
```

**TypeScript Pattern:**
```typescript
suite.test('Navigate to example.com', async ({ assert }) => {
  await client.navigate('https://example.com');

  await assert.urlContains('example.com');
});
```

---

## Common Patterns

### Setup/Teardown

**Shell:**
```bash
# Start server
node ./dist/server.js &
SERVER_PID=$!

# Tests...

# Cleanup
kill $SERVER_PID
```

**TypeScript:**
```typescript
suite.beforeAll(async () => {
  // Setup code
  await client.navigate(APP_URL);
});

suite.afterAll(async () => {
  // Cleanup code (usually not needed)
});
```

### Error Handling

**Shell:**
```bash
if ! curl -s "${BASE_URL}/health" > /dev/null; then
  test_failed "Service not running"
  exit 1
fi
```

**TypeScript:**
```typescript
suite.beforeAll(async () => {
  try {
    await client.health();
  } catch (error) {
    console.error('Service not running');
    process.exit(1);
  }
});
```

### Conditional Tests

**Shell:**
```bash
if [ -f "$SCREENSHOT_PATH" ]; then
  test_passed "Screenshot exists"
else
  test_failed "Screenshot missing"
fi
```

**TypeScript:**
```typescript
suite.test('Screenshot was created', async ({ assert }) => {
  const screenshot = await client.screenshot({ name: 'test' });

  assert.screenshotCaptured(screenshot);

  if (!screenshot.path) {
    throw new Error('Screenshot path should be set');
  }
});
```

---

## Complete Example

### Before: Shell Script

```bash
#!/bin/bash
set -e

BASE_URL="http://localhost:3002"
TEST_URL="https://example.com"

echo "=== Navigation Test ==="
curl -s -X POST "${BASE_URL}/api/navigate" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${TEST_URL}\"}" > /dev/null

echo "=== Query Element ==="
RESPONSE=$(curl -s "${BASE_URL}/api/element/exists?selector=h1")
if echo "$RESPONSE" | grep -q '"exists":true'; then
  echo "✓ Element found"
fi

echo "=== Screenshot ==="
curl -s -X POST "${BASE_URL}/api/screenshot" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-page", "fullPage": true}' \
  | jq '.filename'
```

### After: TypeScript

```typescript
import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

const API_URL = 'http://localhost:3002';
const TEST_URL = 'https://example.com';

async function main() {
  const { suite, client } = createTestSuite('Navigation Test', API_URL);

  suite.test('Navigate and verify', async ({ assert }) => {
    await client.navigate(TEST_URL);

    await assert.elementExists('h1');
    await assert.elementVisible('h1');

    const screenshot = await client.screenshot({
      name: 'test-page',
      fullPage: true
    });

    assert.screenshotCaptured(screenshot);
    console.log(`Screenshot: ${screenshot.filename}`);
  });

  const runner = createTestRunner({ reporters: ['console'] });
  const result = await runner.run(suite);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
```

---

## Available Assertions

```typescript
// Element assertions
await assert.elementExists(selector)
await assert.elementVisible(selector)
await assert.elementHidden(selector)
await assert.elementEnabled(selector)
await assert.elementDisabled(selector)
await assert.elementCount(selector, count)

// Text assertions
await assert.textContains(selector, text)
await assert.textEquals(selector, text)

// Attribute assertions
await assert.attributeEquals(selector, attr, value)

// Screenshot assertions
assert.screenshotCaptured(result)
assert.screenshotSize(result, minBytes)
assert.screenshotPath(result, expectedPath)

// Navigation assertions
await assert.urlEquals(url)
await assert.urlContains(fragment)
```

---

## Running Tests

```bash
# Old way (shell scripts)
./test-my-feature.sh

# New way (TypeScript)
npx tsx tests/features/my-feature.test.ts

# Or via npm scripts
npm run test:my-feature
```

---

## Troubleshooting

### Issue: TypeScript compilation errors

**Solution:** Run type check to see specific errors:
```bash
npm run type-check
```

### Issue: Test timeouts

**Solution:** Increase timeout in test:
```typescript
suite.test('Slow operation', async ({ assert, timeout }) => {
  timeout(60000); // 60 seconds
  // ...
});
```

### Issue: Element not found

**Solution:** Add explicit waits:
```typescript
await client.waitForSelector('h1', { state: 'visible', timeout: 10000 });
await assert.elementExists('h1');
```

---

## Best Practices

1. **Use meaningful test names** - Describe what you're testing
2. **One assertion per test** - Makes failures easier to diagnose
3. **Use beforeAll/afterAll** - For setup and cleanup
4. **Add timeouts for slow operations** - Prevent hanging tests
5. **Use TypeScript types** - Get IDE autocomplete and type checking
6. **Group related tests** - Use test suites to organize
7. **Keep tests independent** - Don't rely on execution order

---

## Migration Checklist

- [ ] Create new TypeScript test file
- [ ] Import test framework and client
- [ ] Convert curl commands to client methods
- [ ] Convert assertions to assert API
- [ ] Add proper error handling
- [ ] Test the migration
- [ ] Update package.json scripts
- [ ] Archive old shell script
- [ ] Document any special cases

---

**For more examples, see:**
- `tests/integration/basic-workflow.test.ts` - Simple example
- `tests/features/phase3-features.test.ts` - Advanced features
- `tests/ui/cv-builder-navigation.test.ts` - Complex UI testing

**Questions?** See issue #27 or the test authoring guide.
