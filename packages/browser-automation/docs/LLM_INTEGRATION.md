# LLM Integration Guide

**Phase 2: Element & Store Mapping for AI Agents**

This guide explains how LLM agents (like Claude Code) can use the browser automation system's element and store mapping APIs to discover UI elements, query application state, and create executable tests from natural language.

**Selector Strategy**: CV Builder uses `data-element` attributes for stable, semantic element selection. This avoids CSS class fragility and provides a clear contract between components and tests. See `docs/DATA_ELEMENT_GUIDE.md` for implementation details.

---

## Table of Contents

1. [Overview](#overview)
2. [Element Discovery](#element-discovery)
3. [Store Queries](#store-queries)
4. [Common Workflows](#common-workflows)
5. [Best Practices](#best-practices)
6. [API Reference](#api-reference)
7. [Example Prompts](#example-prompts)

---

## Overview

The Phase 2 browser automation system provides **semantic element mapping** and **state introspection** to enable LLM agents to:

- **Discover UI elements** via natural language search ("bio tab", "chat expand button")
- **Query application state** (Redux, MobX, etc.) without manual path construction
- **Wait for state changes** ("wait until chat is expanded")
- **Generate executable tests** from plain English descriptions
- **Update element maps** dynamically as the UI evolves

### Architecture

```
LLM Agent (Claude Code)
    ↓
Element/Store Mapping APIs
    ↓
Browser Automation Server
    ↓
Live Application (CV Builder)
```

---

## Element Discovery

### 1. Search for Elements

**Use Case:** "I need to click the bio tab"

**API Call:**
```bash
GET /api/elements/search?q=bio tab&app=cv-builder
```

**Response:**
```json
{
  "success": true,
  "query": "bio tab",
  "results": [
    {
      "path": "navigation.tabs.bio",
      "selector": "[data-testid='bio-tab']",
      "description": "Bio information tab in dashboard navigation",
      "type": "tab",
      "score": 0.95,
      "alternatives": [".tab-bio", "button:has-text('Bio')"]
    }
  ]
}
```

**LLM Workflow:**
1. Search for "bio tab"
2. Get top result's `selector`: `[data-testid='bio-tab']`
3. Use selector in test: `await client.click("[data-testid='bio-tab']")`

### 2. Get All Element Categories

**API Call:**
```bash
GET /api/elements/categories?app=cv-builder
```

**Response:**
```json
{
  "success": true,
  "categories": ["root", "navigation", "bio", "jobs", "outputs", "chat", "modals", "common"],
  "count": 8
}
```

**Use Case:** Understand application structure before creating tests

### 3. Browse Elements by Category

**API Call:**
```bash
GET /api/elements/category/navigation?app=cv-builder
```

**Response:**
```json
{
  "success": true,
  "category": "navigation",
  "elements": [
    {
      "path": "navigation.tabs.bio",
      "name": "bio",
      "selector": "[data-testid='bio-tab']",
      "description": "Bio information tab",
      "type": "tab"
    },
    // ... more elements
  ],
  "count": 8
}
```

### 4. Get Specific Element by Path

**API Call:**
```bash
GET /api/elements/get/navigation.tabs.bio?app=cv-builder
```

**Response:**
```json
{
  "success": true,
  "path": "navigation.tabs.bio",
  "element": {
    "selector": "[data-testid='bio-tab']",
    "alternatives": [".tab-bio", "button:has-text('Bio')"],
    "description": "Bio information tab in dashboard navigation",
    "type": "tab",
    "role": "tab",
    "testId": "bio-tab",
    "states": {
      "active": "[data-testid='bio-tab'][aria-selected='true']",
      "inactive": "[data-testid='bio-tab'][aria-selected='false']"
    }
  }
}
```

**Use Case:** Get detailed element information including state selectors

### 5. Validate Element Map

**API Call:**
```bash
POST /api/elements/validate
Content-Type: application/json

{
  "app": "cv-builder",
  "strict": false
}
```

**Response:**
```json
{
  "success": true,
  "validation": {
    "valid": true,
    "issues": [],
    "totalElements": 70,
    "passedElements": 68,
    "warningElements": 2,
    "errorElements": 0
  }
}
```

**Use Case:** Check if element map is up-to-date with current UI

---

## Store Queries

### 1. Get Store Schema

**API Call:**
```bash
GET /api/store/schema?app=cv-builder
```

**Response:**
```json
{
  "success": true,
  "storeMap": {
    "app": "cv-builder",
    "storeType": "redux",
    "accessPath": "window.__REDUX_DEVTOOLS_EXTENSION__?.getState?.()",
    "queries": {
      "currentTab": {
        "path": "state.ui.activeTab",
        "type": "string",
        "values": ["bio", "jobs", "outputs", "chat"],
        "description": "Currently active dashboard tab"
      },
      "chatExpanded": {
        "path": "state.ui.chatExpanded",
        "type": "boolean",
        "description": "Whether chat window is expanded"
      }
      // ... 50+ more queries
    }
  },
  "queryCount": 52
}
```

### 2. Query Current State

**API Call:**
```bash
POST /api/store/query
Content-Type: application/json

{
  "app": "cv-builder",
  "query": "currentTab"
}
```

**Response:**
```json
{
  "success": true,
  "query": "currentTab",
  "queryPath": "state.ui.activeTab",
  "result": "bio",
  "type": "string",
  "expectedType": "string"
}
```

### 3. Wait for State Change

**API Call:**
```bash
POST /api/store/wait
Content-Type: application/json

{
  "app": "cv-builder",
  "query": "chatExpanded",
  "value": true,
  "timeout": 5000
}
```

**Response (Success):**
```json
{
  "success": true,
  "query": "chatExpanded",
  "value": true,
  "elapsed": 1234
}
```

**Response (Timeout):**
```json
{
  "success": false,
  "error": "Timeout waiting for state condition",
  "query": "chatExpanded",
  "expectedValue": true,
  "actualValue": false,
  "timeout": 5000,
  "elapsed": 5002
}
```

### 4. Get Full State Snapshot (Dev Mode Only)

**API Call:**
```bash
GET /api/store/snapshot?app=cv-builder
```

**Response:**
```json
{
  "success": true,
  "snapshot": {
    "ui": { "activeTab": "bio", "chatExpanded": false },
    "auth": { "isAuthenticated": true, "user": { /* ... */ } },
    "bio": { "data": { /* ... */ }, "loading": false },
    // ... full Redux state
  },
  "storeType": "redux",
  "devModeOnly": true
}
```

**Security Note:** This endpoint only works when `NODE_ENV=development`

---

## Common Workflows

### Workflow 1: Click Element from Natural Language

**User Prompt:** "Click the bio tab"

**LLM Steps:**
1. Search for element:
   ```
   GET /api/elements/search?q=bio tab
   ```
2. Extract selector from top result: `[data-testid='bio-tab']`
3. Use selector in automation:
   ```
   POST /api/interact/click
   { "selector": "[data-testid='bio-tab']" }
   ```

**Generated Test:**
```typescript
test('Navigate to Bio tab', async ({ client }) => {
  // LLM discovers selector via element map
  await client.click("[data-testid='bio-tab']");
});
```

### Workflow 2: Wait for State and Verify

**User Prompt:** "Click the chat expand button and verify the chat is expanded"

**LLM Steps:**
1. Search for expand button:
   ```
   GET /api/elements/search?q=chat expand
   → selector: ".chat-expand-button"
   ```
2. Click button:
   ```
   POST /api/interact/click
   { "selector": ".chat-expand-button" }
   ```
3. Wait for state change:
   ```
   POST /api/store/wait
   { "query": "chatExpanded", "value": true, "timeout": 5000 }
   ```
4. Capture screenshot:
   ```
   POST /api/screenshot
   { "name": "chat-expanded", "viewport": "desktop" }
   ```

**Generated Test:**
```typescript
test('Chat expansion', async ({ client, store }) => {
  // Click expand button
  await client.click('.chat-expand-button');

  // Wait for Redux state to update
  await store.wait('chatExpanded', true, { timeout: 5000 });

  // Verify visually
  await client.screenshot({ name: 'chat-expanded' });
});
```

### Workflow 3: Validate Current UI State

**User Prompt:** "Check if all navigation tabs are present"

**LLM Steps:**
1. Get navigation elements:
   ```
   GET /api/elements/category/navigation
   ```
2. For each tab, check if element exists:
   ```typescript
   for (const tab of ['bio', 'jobs', 'outputs', 'chat']) {
     const exists = await client.elementExists(`[data-testid='${tab}-tab']`);
     if (!exists) throw new Error(`${tab} tab missing`);
   }
   ```

**Generated Test:**
```typescript
test('All navigation tabs present', async ({ client }) => {
  const tabs = ['bio', 'jobs', 'outputs', 'chat'];

  for (const tab of tabs) {
    await assert.elementExists(`[data-testid='${tab}-tab']`);
  }
});
```

### Workflow 4: Create Multi-Step User Flow

**User Prompt:** "Test the resume generation workflow: navigate to Jobs tab, select first job, click generate resume, verify output appears"

**LLM Steps:**
1. Search for elements:
   - Jobs tab: `[data-testid='jobs-tab']`
   - First job card: `.job-card:first-child`
   - Generate button: `[data-testid='generate-resume-button']`
   - Outputs panel: `[data-testid='outputs-panel']`

2. Query state paths:
   - Current tab: `currentTab`
   - Output count: `outputCount`

3. Generate test flow:

**Generated Test:**
```typescript
test('Resume generation workflow', async ({ client, store }) => {
  // Navigate to Jobs tab
  await client.click('[data-testid="jobs-tab"]');
  await store.wait('currentTab', 'jobs');

  // Select first job
  await client.click('.job-card:first-child');
  await client.waitForSelector('[data-testid="generate-resume-button"]', { state: 'visible' });

  // Get current output count
  const initialCount = await store.query('outputCount');

  // Click generate
  await client.click('[data-testid="generate-resume-button"]');

  // Wait for new output to appear
  await store.wait('outputCount', initialCount + 1, { timeout: 10000 });

  // Verify in Outputs tab
  await client.click('[data-testid="outputs-tab"]');
  await assert.elementVisible('[data-testid="output-card"]');

  // Screenshot
  await client.screenshot({ name: 'resume-generated' });
});
```

---

## Best Practices

### 1. Always Search First

Don't hardcode selectors. Use element search to discover current selectors:

**❌ Bad:**
```typescript
await client.click('.bio-tab'); // Fragile
```

**✅ Good:**
```typescript
// Search first
const response = await fetch('/api/elements/search?q=bio tab');
const selector = response.results[0].selector;
await client.click(selector);
```

### 2. Use State Queries for Reliability

Don't rely on timing. Wait for actual state changes:

**❌ Bad:**
```typescript
await client.click('.chat-expand');
await new Promise(r => setTimeout(r, 1000)); // Arbitrary wait
```

**✅ Good:**
```typescript
await client.click('.chat-expand');
await store.wait('chatExpanded', true); // Wait for actual state
```

### 3. Validate Element Maps Regularly

Before running tests, validate the element map against the live page:

```typescript
const validation = await fetch('/api/elements/validate', {
  method: 'POST',
  body: JSON.stringify({ app: 'cv-builder' })
});

if (!validation.valid) {
  console.warn('Element map needs updating');
}
```

### 4. Use Fallback Selectors

Element maps include alternative selectors for robustness:

```typescript
const element = await fetch('/api/elements/get/navigation.tabs.bio');
const selectors = [element.selector, ...element.alternatives];

for (const selector of selectors) {
  if (await client.elementExists(selector)) {
    await client.click(selector);
    break;
  }
}
```

### 5. Combine Element + Store Queries

For reliable assertions, check both DOM and state:

```typescript
// Click button
await client.click('[data-testid="bio-tab"]');

// Verify in both DOM and Redux
await assert.elementVisible('[data-testid="bio-panel"]'); // DOM check
await store.wait('currentTab', 'bio'); // State check
```

---

## API Reference

### Element Discovery Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/elements/map` | GET | Full element map |
| `/api/elements/search` | GET | Fuzzy semantic search |
| `/api/elements/categories` | GET | List all categories |
| `/api/elements/category/:name` | GET | Elements in category |
| `/api/elements/get/:path` | GET | Specific element by path |
| `/api/elements/validate` | POST | Validate selectors |
| `/api/elements/update` | POST | Update/create element |

### Store Query Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/store/schema` | GET | Store map with all queries |
| `/api/store/query` | POST | Query state by name |
| `/api/store/wait` | POST | Wait for state condition |
| `/api/store/snapshot` | GET | Full state dump (dev only) |
| `/api/store/validate` | POST | Validate store queries |

---

## Example Prompts

### For Test Generation

**Prompt:** "Create a test that verifies the Jobs tab loads with at least one job listing"

**LLM Process:**
1. Search for "jobs tab" → get selector
2. Search for "job listing" → get selector
3. Check store schema for "jobCount" query
4. Generate test

**Output:**
```typescript
test('Jobs tab shows listings', async ({ client, store }) => {
  await client.click('[data-testid="jobs-tab"]');
  await store.wait('currentTab', 'jobs');

  const jobCount = await store.query('jobCount');
  if (jobCount === 0) {
    throw new Error('No job listings found');
  }

  await assert.elementVisible('.job-card');
});
```

### For Debugging

**Prompt:** "Why is the chat window not expanding when I click the expand button?"

**LLM Process:**
1. Get chat expand button selector
2. Verify button exists: `GET /api/elements/validate`
3. Query chat state: `POST /api/store/query { query: "chatExpanded" }`
4. Check for errors: `POST /api/store/query { query: "chatError" }`
5. Suggest fixes based on state

### For Documentation

**Prompt:** "Document all available chat-related UI elements"

**LLM Process:**
1. Search: `GET /api/elements/search?q=chat&limit=20`
2. Get chat category: `GET /api/elements/category/chat`
3. Generate markdown documentation with selectors

---

## Conclusion

The Phase 2 browser automation system enables LLM agents to:

✅ **Discover elements semantically** instead of guessing CSS selectors
✅ **Query application state** without reverse-engineering Redux paths
✅ **Wait for actual state changes** instead of arbitrary timeouts
✅ **Generate reliable tests** from natural language descriptions
✅ **Adapt to UI changes** via element map validation and updates

**Next Steps:**
- See `docs/TEST_AUTHORING_GUIDE.md` for test framework details
- See `tests/features/phase2-element-store-maps.test.ts` for working examples
- See `tests/element-maps/cv-builder.json` for full element map
- See `tests/store-maps/cv-builder.json` for all Redux queries

---

**Generated with Phase 2: LLM Integration & Element Mapping** 🤖
