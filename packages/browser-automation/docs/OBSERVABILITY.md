# Browser Observability & Console Access

**Phase 4 Documentation**
**Version:** 0.4.0
**Status:** Production-ready with strict security controls

---

## Overview

The Browser Automation Service now includes **observability features** for debugging and monitoring browser-based tests. These features provide access to browser console logs, JavaScript errors, and safe state evaluation.

**⚠️ SECURITY NOTICE**: All observability endpoints are **dev mode only** and strictly enforced. They are automatically disabled in production environments.

---

## Features

### 1. Console Log Capture
- Captures all `console.log`, `.info`, `.warn`, `.error`, `.debug` messages
- Maintains circular buffer (1000 entries)
- Filtering by level, time range, and limit
- Source location tracking

### 2. JavaScript Error Tracking
- Captures uncaught exceptions and errors
- Preserves stack traces
- Groups errors by message
- Source file and line number extraction

### 3. State Evaluation (Advanced)
- Execute arbitrary JavaScript in browser context
- Sandboxed execution (Playwright isolation)
- Rate limited to prevent abuse
- Timeout protection

### 4. Console Statistics
- Summary view of logs and errors
- Count by log level
- Top errors by frequency

---

## Security Model

### Multi-Layer Protection

#### 1. Dev Mode Enforcement
All observability endpoints check `process.env.NODE_ENV`:

```typescript
// Middleware: requireDevMode
if (process.env.NODE_ENV !== 'development') {
  return res.status(403).json({
    error: 'This endpoint is only available in development mode',
    hint: 'Set NODE_ENV=development to enable observability features'
  });
}
```

**Result**: `403 Forbidden` in production, test, or any non-dev environment.

#### 2. Rate Limiting

**Console Endpoints**: 30 requests/minute
```typescript
// /api/console/logs, /api/console/errors, /api/console/stats
consoleLimiter: 30 req/min
```

**Evaluation Endpoint**: 10 requests/minute (more restrictive)
```typescript
// /api/store/evaluate
evaluateLimiter: 10 req/min
```

**Result**: `429 Too Many Requests` if limits exceeded.

#### 3. Sandboxed Execution
JavaScript evaluation runs in **browser context only**:
- ✅ Can access: DOM, window object, Redux store
- ❌ Cannot access: Node.js APIs, file system, process, require()

**Playwright's built-in isolation** prevents access to server-side resources.

#### 4. Timeout Protection
All evaluation calls have timeout limits:
- Default: 5 seconds
- Maximum: 30 seconds
- Server enforces safe bounds

---

## API Reference

### Console Logs

#### GET /api/console/logs

Retrieve browser console logs with optional filtering.

**Query Parameters:**
- `level` (optional): Filter by level (`log`, `info`, `warn`, `error`, `debug`)
- `limit` (optional): Maximum number of logs to return
- `since` (optional): ISO timestamp - only return logs after this time

**Example Request:**
```bash
curl "http://localhost:3002/api/console/logs?level=error&limit=10"
```

**Example Response:**
```json
{
  "logs": [
    {
      "timestamp": "2025-11-17T20:45:32.123Z",
      "level": "error",
      "message": "TypeError: Cannot read property 'map' of undefined",
      "args": ["TypeError: Cannot read property 'map' of undefined"],
      "location": {
        "url": "http://localhost:3000/static/js/main.js",
        "lineNumber": 245,
        "columnNumber": 10
      }
    }
  ],
  "count": 1,
  "totalCount": 156,
  "countsByLevel": {
    "log": 120,
    "info": 25,
    "warn": 10,
    "error": 1,
    "debug": 0
  },
  "filters": {
    "level": "error",
    "limit": 10,
    "since": "none"
  },
  "devModeOnly": true,
  "timestamp": "2025-11-17T20:46:00.000Z"
}
```

---

### JavaScript Errors

#### GET /api/console/errors

Retrieve JavaScript errors captured from the browser.

**Query Parameters:**
- `limit` (optional): Maximum number of errors to return
- `summary` (optional): If `true`, return grouped summary instead of full errors

**Example Request (Full Errors):**
```bash
curl "http://localhost:3002/api/console/errors?limit=5"
```

**Example Response:**
```json
{
  "errors": [
    {
      "timestamp": "2025-11-17T20:45:32.123Z",
      "message": "TypeError: Cannot read property 'map' of undefined",
      "name": "TypeError",
      "stack": "TypeError: Cannot read property 'map' of undefined\n  at ProductList.render (main.js:245:10)\n  at...",
      "source": "http://localhost:3000/static/js/main.js",
      "line": 245,
      "column": 10
    }
  ],
  "count": 1,
  "totalCount": 3,
  "filters": {
    "limit": 5
  },
  "devModeOnly": true,
  "timestamp": "2025-11-17T20:46:00.000Z"
}
```

**Example Request (Summary):**
```bash
curl "http://localhost:3002/api/console/errors?summary=true"
```

**Example Response:**
```json
{
  "summary": [
    {
      "message": "TypeError: Cannot read property 'map' of undefined",
      "count": 5,
      "latestTimestamp": "2025-11-17T20:45:32.123Z"
    },
    {
      "message": "ReferenceError: foo is not defined",
      "count": 2,
      "latestTimestamp": "2025-11-17T20:44:15.456Z"
    }
  ],
  "totalErrors": 7,
  "uniqueErrors": 2,
  "devModeOnly": true,
  "timestamp": "2025-11-17T20:46:00.000Z"
}
```

---

### Console Statistics

#### GET /api/console/stats

Get statistics about console logs and errors without retrieving full data.

**Example Request:**
```bash
curl "http://localhost:3002/api/console/stats"
```

**Example Response:**
```json
{
  "console": {
    "totalLogs": 156,
    "byLevel": {
      "log": 120,
      "info": 25,
      "warn": 10,
      "error": 1,
      "debug": 0
    }
  },
  "errors": {
    "totalErrors": 7,
    "uniqueErrors": 2,
    "topErrors": [
      {
        "message": "TypeError: Cannot read property 'map' of undefined",
        "count": 5,
        "latestTimestamp": "2025-11-17T20:45:32.123Z"
      }
    ]
  },
  "devModeOnly": true,
  "timestamp": "2025-11-17T20:46:00.000Z"
}
```

---

### Clear Console

#### POST /api/console/clear

Clear all console logs and error buffers.

**Example Request:**
```bash
curl -X POST "http://localhost:3002/api/console/clear"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Console and error buffers cleared",
  "cleared": {
    "logs": 156,
    "errors": 7
  },
  "timestamp": "2025-11-17T20:47:00.000Z"
}
```

---

### State Evaluation (Advanced)

#### POST /api/store/evaluate

Execute arbitrary JavaScript in the browser context.

**⚠️ USE WITH CAUTION**: This endpoint allows code execution. Use structured queries (`/api/store/query`) whenever possible.

**Request Body:**
- `expression` (required): JavaScript expression to evaluate
- `timeout` (optional): Timeout in milliseconds (default: 5000, max: 30000)

**Example Request:**
```bash
curl -X POST "http://localhost:3002/api/store/evaluate" \
  -H "Content-Type: application/json" \
  -d '{
    "expression": "document.querySelectorAll(\".active-tab\").length",
    "timeout": 5000
  }'
```

**Example Response (Success):**
```json
{
  "success": true,
  "result": 3,
  "type": "number",
  "executionTime": 12,
  "expression": "document.querySelectorAll(\".active-tab\").length",
  "devModeOnly": true,
  "securityNote": "This endpoint is restricted to development mode and rate limited",
  "timestamp": "2025-11-17T20:48:00.000Z"
}
```

**Example Response (Error):**
```json
{
  "success": false,
  "error": "Evaluation failed in browser context",
  "details": "foo is not defined",
  "errorName": "ReferenceError",
  "expression": "foo.bar",
  "executionTime": 5,
  "timestamp": "2025-11-17T20:48:00.000Z"
}
```

---

## Usage Examples

### Example 1: Monitor Console Errors

```typescript
import { BrowserAutomationClient } from '@cv-builder/browser-automation';

const client = new BrowserAutomationClient('http://localhost:3002');

// Navigate to page
await client.navigate('http://localhost:3000');

// Perform some interactions
await client.click('.submit-button');

// Check for console errors
const response = await fetch('http://localhost:3002/api/console/errors');
const { errors } = await response.json();

if (errors.length > 0) {
  console.error('JavaScript errors detected:', errors);
  throw new Error('Page has JavaScript errors');
}
```

### Example 2: Debug Test Failures

```typescript
// In your test suite
test('Dashboard loads without errors', async ({ client }) => {
  await client.navigate('/');

  // Wait for page to load
  await client.waitForElement('.dashboard', { state: 'visible' });

  // Check console logs for errors
  const statsResponse = await fetch('http://localhost:3002/api/console/stats');
  const { console, errors } = await statsResponse.json();

  // Assert no errors
  assert.equal(errors.totalErrors, 0, 'No JavaScript errors should occur');
  assert.equal(console.byLevel.error, 0, 'No console.error calls should occur');
});
```

### Example 3: Inspect Application State

```typescript
// Preferred: Use structured store query
const storeResponse = await fetch('http://localhost:3002/api/store/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    app: 'cv-builder',
    query: 'currentTab'
  })
});
const { result } = await storeResponse.json();
console.log('Current tab:', result);

// Alternative: Use evaluate for custom queries
const evalResponse = await fetch('http://localhost:3002/api/store/evaluate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    expression: 'window.__REDUX_STORE__.getState().ui.activeTab'
  })
});
const { result: activeTab } = await evalResponse.json();
console.log('Active tab:', activeTab);
```

---

## Best Practices

### 1. Prefer Structured Queries
Use `/api/store/query` instead of `/api/store/evaluate` when possible:
- ✅ Type-safe
- ✅ Validated against store map
- ✅ Better error messages
- ❌ Evaluate should be last resort

### 2. Monitor Console Stats
Check `/api/console/stats` periodically during test runs:
```typescript
setInterval(async () => {
  const response = await fetch('http://localhost:3002/api/console/stats');
  const stats = await response.json();
  if (stats.errors.totalErrors > 0) {
    console.warn('New errors detected:', stats.errors.topErrors);
  }
}, 5000); // Every 5 seconds
```

### 3. Clear Buffers Between Tests
Avoid cross-test contamination:
```typescript
beforeEach(async () => {
  await fetch('http://localhost:3002/api/console/clear', { method: 'POST' });
});
```

### 4. Use Error Summaries for Common Issues
Identify patterns in failures:
```bash
curl "http://localhost:3002/api/console/errors?summary=true"
```

### 5. Never Enable in Production
Ensure `NODE_ENV=production` in deployment:
```bash
# .env.production
NODE_ENV=production  # Disables all observability endpoints
```

---

## Troubleshooting

### 503 Service Unavailable
**Cause**: Observability not initialized (browser not launched).

**Solution**: Navigate to a page first to initialize the browser:
```typescript
await client.navigate('http://localhost:3000');
```

### 403 Forbidden
**Cause**: Running in production or non-dev environment.

**Solution**: Set `NODE_ENV=development`:
```bash
export NODE_ENV=development
npm run dev:api
```

### 429 Too Many Requests
**Cause**: Rate limit exceeded.

**Solution**: Reduce request frequency or wait 60 seconds:
- Console endpoints: Max 30 req/min
- Evaluate endpoint: Max 10 req/min

### Empty Logs/Errors
**Cause**: No activity has occurred yet, or buffers were cleared.

**Solution**: Ensure you've interacted with the page after browser launch.

---

## Security Checklist

Before deploying observability features:

- [ ] Confirmed `NODE_ENV=production` in production environment
- [ ] Tested that observability endpoints return 403 in production
- [ ] Verified rate limiting is functional (test with rapid requests)
- [ ] Confirmed evaluate endpoint cannot access Node.js APIs
- [ ] Documented observability usage for team
- [ ] Added monitoring alerts for production 403s (should never happen)

---

## Performance Impact

### Console Logging
- **Memory**: ~100KB per 1000 log entries
- **CPU**: Negligible (async event handlers)
- **Network**: None (local capture only)

### Error Tracking
- **Memory**: ~50KB per 100 errors
- **CPU**: Negligible
- **Network**: None

### State Evaluation
- **CPU**: Depends on expression complexity
- **Timeout**: Max 30 seconds per evaluation
- **Network**: None (browser context execution)

**Recommendation**: No significant performance impact in development. Observability is disabled in production, so zero impact on production performance.

---

## Integration with Phase 2 (Store Queries)

Observability features complement Phase 2's store introspection:

### Phase 2: Structured Store Access
```typescript
POST /api/store/query
{
  "app": "cv-builder",
  "query": "currentTab"  // Uses store-map.json
}
```

### Phase 4: Ad-Hoc Evaluation
```typescript
POST /api/store/evaluate
{
  "expression": "window.__REDUX_STORE__.getState().ui.activeTab"
}
```

**When to use each:**
- **Store Query**: Predefined queries, type-safe, recommended
- **Evaluate**: Custom debugging, one-off investigations, last resort

---

## Future Enhancements

Potential additions for future phases:
- WebSocket live monitoring (real-time log streaming)
- Log persistence to file
- Network request/response logging
- Performance metrics (page load times, render times)
- Screenshot on error (automatic capture when errors occur)

---

**Version**: 0.4.0
**Last Updated**: 2025-11-17
**Status**: Production-ready (dev mode only)
**Feedback**: https://github.com/ojfbot/cv-builder/issues
