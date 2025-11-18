# Chat Test Suite

Comprehensive test suite for chat interactions, badge actions, and user flows in the CV Builder application.

## Test Files

### 1. `message-input.test.ts`
Tests basic chat input functionality:
- Chat input element exists and is visible
- Typing into chat input updates Redux store (`draftInput`)
- Input can be cleared
- Store synchronization works correctly

**Run:** `npm run test:chat` (part of suite)

---

### 2. `show-help-flow.test.ts`
Tests the complete "Show Help" badge interaction flow:

**Flow Steps:**
1. User is on Interactive tab with welcome message
2. User clicks "Show Help" badge
3. Chat stays on Interactive tab (no navigation)
4. Prepared assistant message appears with help content
5. Help content contains all expected commands (`/upload`, `/generate`, `/tailor`, `/learn`, `/prep`, `/help`)
6. Chat input receives keyboard focus
7. User can type follow-up questions

**Expected Behavior:**
- ✅ Badge visible in welcome message
- ✅ Clicking badge triggers expand chat action
- ✅ Assistant message with help content appears
- ✅ All 6+ slash commands are documented
- ✅ Quick actions section is present
- ✅ Chat input is focused and accepts text

**Run:** `npm run test:chat` (part of suite) or `tsx tests/cv-builder/chat/show-help-flow.test.ts`

---

### 3. `badge-interactions.test.ts`
Comprehensive test suite for ALL badge actions in the welcome message.

**Badges Tested:**

#### Upload Resume Badge
- **Action:** Expand chat
- **Expected:** Upload instructions appear with file format info (PDF, Word, etc.)
- **Tab:** Stays on Interactive

#### Add Your Bio Badge
- **Action:** Navigate to Bio tab + expand chat
- **Expected:**
  - Navigation to Bio tab
  - Chat expands (CondensedChat)
  - Bio guidance message appears
  - Keyboard focus on CondensedChat input
  - Input accepts text
- **Tab:** Interactive → Bio

#### Show Help Badge
- **Action:** Expand chat
- **Expected:** Help content with all slash commands
- **Tab:** Stays on Interactive

#### Generate Resume Badge
- **Action:** Navigate to Outputs tab
- **Expected:**
  - Navigation to Outputs tab
  - User message auto-sent to trigger generation
- **Tab:** Interactive → Outputs

#### Tailor Resume Badge
- **Action:** Navigate to Jobs tab
- **Expected:**
  - Navigation to Jobs tab
  - Tailoring guidance message appears
- **Tab:** Interactive → Jobs

#### Learning Path Badge
- **Action:** Navigate to Research tab
- **Expected:**
  - Navigation to Research tab
  - Learning path guidance appears
- **Tab:** Interactive → Research

#### Interview Prep Badge
- **Action:** Navigate to Jobs tab
- **Expected:**
  - Navigation to Jobs tab
  - Interview prep guidance appears
- **Tab:** Interactive → Jobs

**Run:** `npm run test:chat` (part of suite) or `tsx tests/cv-builder/chat/badge-interactions.test.ts`

---

## Running the Tests

### Run All Chat Tests
```bash
npm run test:chat
```

This runs all three test files in sequence:
1. `message-input.test.ts`
2. `show-help-flow.test.ts`
3. `badge-interactions.test.ts`

### Run Individual Tests
```bash
# Show Help flow only
tsx tests/cv-builder/chat/show-help-flow.test.ts

# Badge interactions only
tsx tests/cv-builder/chat/badge-interactions.test.ts

# Message input only
tsx tests/cv-builder/chat/message-input.test.ts
```

### Run with Comprehensive Suite
```bash
npm run test:comprehensive
```

---

## Test Assertions

All tests use the following assertion types:

### DOM Assertions
- `assert.elementExists(selector)` - Verify element exists in DOM
- `assert.elementVisible(selector)` - Verify element is visible
- `assert.screenshotCaptured(screenshot)` - Verify screenshot was captured

### Store Assertions
- `assert.storeEquals(key, value)` - Verify Redux store state
- `assert.storeEventuallyEquals(key, value, options)` - Wait for store to match (with polling)

### Store Queries
- `client.storeQuery(key, appId)` - Get current Redux store value

---

## Key Behaviors Tested

### 1. Badge Click Actions
- ✅ Badges are visible and clickable
- ✅ Clicking triggers correct actions (navigate, expand, chat)
- ✅ Multiple actions execute in correct sequence
- ✅ Navigation changes tab correctly
- ✅ Chat expansion works on all tabs

### 2. Prepared Assistant Responses
- ✅ Assistant messages appear after badge click
- ✅ Message content matches expected guidance
- ✅ SuggestedMessage system works correctly
- ✅ Role-based messages (user vs assistant) behave differently

### 3. Chat Expansion & Focus
- ✅ Chat expands when navigating to non-Interactive tabs
- ✅ CondensedChat appears on Bio, Jobs, Outputs, Research tabs
- ✅ Chat input receives keyboard focus automatically
- ✅ Input accepts text correctly
- ✅ Store synchronizes with input changes

### 4. Navigation Flows
- ✅ Tab navigation works correctly
- ✅ CondensedChat appears on target tabs
- ✅ Bio panel visible on Bio tab
- ✅ Jobs panel visible on Jobs tab
- ✅ Outputs panel visible on Outputs tab
- ✅ Research panel visible on Research tab

---

## Common Issues & Debugging

### Issue: Badge Not Found
**Symptom:** `[data-element="badge-xxx"]` selector fails
**Solution:**
1. Check that welcome message is loaded (navigate to Interactive tab first)
2. Verify badge label matches (check `chatSlice.ts` for exact labels)
3. Badge data-element is auto-generated from label: `badge-{label-in-kebab-case}`

### Issue: Chat Not Expanding
**Symptom:** `chatExpanded` remains `false`
**Solution:**
1. Wait longer after badge click (try 2000ms instead of 1000ms)
2. Check that badge has `expand_chat` action
3. Verify CondensedChat component is rendered on target tab

### Issue: Input Not Focused
**Symptom:** Typing doesn't work or input is empty
**Solution:**
1. Use correct selector for tab context:
   - Interactive tab: `[data-element="chat-input"]`
   - Other tabs (CondensedChat): `[data-element="condensed-chat-input-wrapper"] [data-element="chat-input"]`
2. Add delay after expansion (500-1000ms)
3. Manually click input before typing

### Issue: Message Content Not Detected
**Symptom:** Page content checks fail
**Solution:**
1. Increase wait time after badge click (1500-2000ms)
2. Use broader search terms (e.g., "bio" instead of exact phrase)
3. Check that suggestedMessage is defined in badge action
4. Verify assistant message role is correct

---

## Screenshot Locations

All screenshots are saved to:
```
packages/browser-automation/screenshots/cv-builder/chat/
```

With semantic naming:
- `show-help-flow-initial.png`
- `show-help-flow-message.png`
- `badge-interactions-all-badges.png`
- `badge-interactions-add-bio-expanded.png`
- etc.

---

## Related Documentation

- [Test Organization Guide](../../docs/TEST_ORGANIZATION.md)
- [Assertions Documentation](../../docs/ASSERTIONS.md)
- [Test Authoring Guide](../../docs/TEST_AUTHORING_GUIDE.md)
- [Badge Action System](../../../browser-app/src/models/badge-action.ts)
- [Chat Slice](../../../browser-app/src/store/slices/chatSlice.ts)

---

## Future Enhancements

Potential additions to this test suite:

1. **Voice Input Tests** - Test microphone button functionality
2. **File Upload Tests** - Test drag-and-drop and file dialog
3. **Markdown Rendering Tests** - Verify code blocks, lists, etc.
4. **Badge Suggestions in Responses** - Test dynamic badge generation from agent responses
5. **Chat History Tests** - Test message persistence and scrolling
6. **Streaming Content Tests** - Test real-time streaming indicators
7. **Error Handling Tests** - Test API errors and fallback behavior
8. **Command Parsing Tests** - Test `/upload`, `/generate`, etc. commands
