# Running Chat Test Suite

## Prerequisites

The chat test suite requires **three running services**:

### 1. Browser Automation API Server (Port 3002)
```bash
# Terminal 1
cd packages/browser-automation
npm run dev
```

**What it does:**
- Provides REST API for browser automation
- Manages Playwright browser instances
- Handles screenshot capture
- Provides Redux store inspection

**Verify it's running:**
```bash
curl http://localhost:3002/health
# Should return: {"status":"ok"}
```

---

### 2. CV Builder API Server (Port 3001)
```bash
# Terminal 2
npm run dev:api
```

**What it does:**
- Runs server-side Claude AI agents
- Manages API keys securely
- Handles agent orchestration
- Serves agent responses to browser

**Verify it's running:**
```bash
curl http://localhost:3001/health
# Should return health status
```

---

### 3. CV Builder Browser App (Port 3000)
```bash
# Terminal 3
npm run dev
```

**What it does:**
- Serves the React frontend
- Provides the UI being tested
- Communicates with API server

**Verify it's running:**
Open browser to: http://localhost:3000

**OR run all together:**
```bash
# Single terminal - runs API + Browser App together
npm run dev:all
```

---

## Running the Tests

### Prerequisites Check
Before running tests, verify all services are running:

```bash
# Check browser automation API (must be running)
curl http://localhost:3002/health

# Check CV Builder app (must be running)
curl http://localhost:3000

# Check API server (must be running)
curl http://localhost:3001/health
```

---

### Option 1: Run All Chat Tests
```bash
cd packages/browser-automation
npm run test:chat
```

This runs three test suites in sequence:
1. **message-input.test.ts** - Basic chat input functionality
2. **show-help-flow.test.ts** - "Show Help" badge flow (NEW)
3. **badge-interactions.test.ts** - All 7 badge interactions (NEW)

**Expected Duration:** ~2-3 minutes

**Expected Output:**
```
✅ Chat Message Input: 3/3 passed
✅ Show Help Flow: 6/6 passed
✅ Badge Interactions: 8/8 passed
```

---

### Option 2: Run Individual Test Files

#### Show Help Flow Only
```bash
cd packages/browser-automation
tsx tests/cv-builder/chat/show-help-flow.test.ts
```

**Tests:**
- Badge visibility
- Click behavior (stay on Interactive tab)
- Help message content
- All 6 slash commands present
- Keyboard focus

**Duration:** ~30-40 seconds

---

#### Badge Interactions Only
```bash
cd packages/browser-automation
tsx tests/cv-builder/chat/badge-interactions.test.ts
```

**Tests:**
- All 7 badges visible
- Upload Resume flow
- Add Your Bio flow (navigation + expansion + focus)
- Show Help flow
- Generate Resume flow (navigation)
- Tailor Resume flow (navigation)
- Learning Path flow (navigation)
- Interview Prep flow (navigation)

**Duration:** ~1-2 minutes

---

#### Message Input Only
```bash
cd packages/browser-automation
tsx tests/cv-builder/chat/message-input.test.ts
```

**Tests:**
- Chat input exists
- Typing updates Redux store
- Input can be cleared

**Duration:** ~20-30 seconds

---

### Option 3: Run Comprehensive Test Suite
```bash
npm run test:comprehensive
```

Runs ALL tests including chat tests as part of full suite.

---

## Test Output & Screenshots

### Console Output
Each test produces detailed console output:

```
🚀 Navigating to CV Builder app...
✅ Interactive chat loaded

Test: Show Help badge is visible in welcome message
✅ Badge found: badge-show-help
📸 Screenshot: show-help-flow-initial.png

Test: Click Show Help badge stays on Interactive tab
🖱️  Clicked Show Help badge
📊 Initial tab: interactive
📊 Current tab after click: interactive
✅ Remained on interactive tab (expected behavior)
📸 Screenshot: show-help-flow-clicked.png

...

✅ Show Help Flow: 6/6 passed
```

### Screenshots
All screenshots saved to:
```
packages/browser-automation/screenshots/cv-builder/chat/
```

**Examples:**
- `show-help-flow-initial.png` - Welcome message with badges
- `show-help-flow-message.png` - Help content displayed
- `show-help-flow-commands.png` - All commands visible
- `badge-interactions-all-badges.png` - All 7 badges in welcome
- `badge-interactions-add-bio-expanded.png` - Bio tab with expanded chat

---

## Common Issues

### Issue: ECONNREFUSED on port 3002
**Error:**
```
NetworkError: Error
code: 'ECONNREFUSED'
baseURL: 'http://localhost:3002'
```

**Solution:**
Browser automation API server is not running.
```bash
# Start in separate terminal
cd packages/browser-automation
npm run dev
```

---

### Issue: Navigation timeout or page not loading
**Error:**
```
Failed to navigate: timeout exceeded
```

**Solution:**
CV Builder app is not running on port 3000.
```bash
# Start in separate terminal
npm run dev
# OR
npm run dev:all  # Starts both API and browser app
```

---

### Issue: Tests fail but no clear error
**Debugging Steps:**

1. **Check all services are running:**
   ```bash
   curl http://localhost:3002/health  # Browser automation API
   curl http://localhost:3000         # CV Builder app
   curl http://localhost:3001/health  # CV Builder API
   ```

2. **Run test with verbose logging:**
   ```bash
   VERBOSE=true tsx tests/cv-builder/chat/show-help-flow.test.ts
   ```

3. **Check screenshots:**
   Look at captured screenshots to see actual UI state:
   ```bash
   open packages/browser-automation/screenshots/cv-builder/chat/
   ```

4. **Run test in isolation:**
   Sometimes tests interfere with each other. Run one at a time:
   ```bash
   tsx tests/cv-builder/chat/message-input.test.ts
   # Wait for completion, then:
   tsx tests/cv-builder/chat/show-help-flow.test.ts
   ```

---

### Issue: Badge not found
**Error:**
```
ElementNotFoundError: [data-element="badge-show-help"] not found
```

**Possible Causes:**
1. Welcome message not loaded (not on Interactive tab)
2. Badge label changed in code
3. Chat state is not fresh (previous interactions)

**Solution:**
1. Verify you're on Interactive tab in test setup
2. Check badge label in `chatSlice.ts` matches test
3. Clear browser state between tests
4. Check screenshot to see actual DOM state

---

### Issue: Chat not expanding
**Error:**
```
Store assertion failed: chatExpanded = false (expected true)
```

**Possible Causes:**
1. Badge doesn't have `expand_chat` action
2. Navigation happened too fast
3. CondensedChat not rendering

**Solution:**
1. Check badge action definition in `chatSlice.ts`
2. Increase wait time after badge click (try 2000ms)
3. Verify CondensedChat component is rendered on target tab
4. Check screenshot to see chat UI state

---

### Issue: Input doesn't accept text
**Error:**
```
Input value is empty after typing
```

**Possible Causes:**
1. Wrong selector (InteractiveChat vs CondensedChat)
2. Input not focused
3. Input disabled state

**Solution:**
1. Use correct selector for context:
   - Interactive tab: `[data-element="chat-input"]`
   - Other tabs: `[data-element="condensed-chat-input-wrapper"] [data-element="chat-input"]`
2. Add manual click before typing:
   ```typescript
   await client.click(inputSelector);
   await new Promise(resolve => setTimeout(resolve, 500));
   await client.type(inputSelector, 'test');
   ```
3. Check input is not disabled in screenshot

---

## Performance Tips

### Parallel Test Execution
Tests currently run sequentially. For faster execution:

```bash
# Run tests in parallel (requires multiple browser instances)
npm run test:chat:parallel  # Not implemented yet
```

### Headless Mode
Browser automation runs in headless mode by default for speed.

To see browser during tests (debugging):
```bash
HEADLESS=false tsx tests/cv-builder/chat/show-help-flow.test.ts
```

### Skip Screenshots
To run faster without screenshots:
```bash
SKIP_SCREENSHOTS=true npm run test:chat
```

---

## Test Maintenance

### Updating Tests
When badge behavior changes:

1. Update test expectations in test files
2. Update documentation in README.md
3. Run tests to verify
4. Update screenshots in docs if needed

### Adding New Badge Tests
To add a new badge to `badge-interactions.test.ts`:

1. Add badge data-element to test (e.g., `badge-new-feature`)
2. Add test case following existing pattern
3. Define expected behavior (navigation, expansion, content)
4. Add assertions for all behaviors
5. Capture screenshot with semantic naming
6. Update README.md with new badge details

---

## Related Documentation

- [Chat Test Suite README](./README.md) - Comprehensive test documentation
- [Test Organization](../../docs/TEST_ORGANIZATION.md) - Overall test structure
- [Assertions Guide](../../docs/ASSERTIONS.md) - Available assertions
- [Badge Action System](../../../browser-app/src/models/badge-action.ts) - Badge implementation
- [Chat Slice](../../../browser-app/src/store/slices/chatSlice.ts) - Welcome message and badges

---

## Quick Reference

### Service Ports
- Browser Automation API: `http://localhost:3002`
- CV Builder App: `http://localhost:3000`
- CV Builder API: `http://localhost:3001`

### Key Test Files
- `message-input.test.ts` - Basic input
- `show-help-flow.test.ts` - Help badge (NEW)
- `badge-interactions.test.ts` - All badges (NEW)

### Run Commands
```bash
# All chat tests
cd packages/browser-automation && npm run test:chat

# Individual tests
tsx tests/cv-builder/chat/show-help-flow.test.ts
tsx tests/cv-builder/chat/badge-interactions.test.ts

# Comprehensive suite
npm run test:comprehensive
```

### Screenshot Location
```
packages/browser-automation/screenshots/cv-builder/chat/
```
