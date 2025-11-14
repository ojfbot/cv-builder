# Quick Reference: State Management Analysis

## Key Files

1. **STATE_MANAGEMENT_ANALYSIS.md** - Comprehensive analysis of current state structure
2. **STATE_MANAGEMENT_DIAGRAMS.md** - Visual diagrams and execution flows
3. **REDUX_MIGRATION_PLAN.md** - Detailed Redux migration guide
4. **QUICK_REFERENCE.md** - This file

## Current Problems (TL;DR)

### Problem 1: Bio Tab Navigation Bug
**Cause**: `setCurrentTab` callback recreated on every keystroke due to `draftInput` in dependency array
**Effect**: Tab state updates can be interrupted mid-execution
**Files**: ChatContext.tsx (line 132)

### Problem 2: Message Duplication
**Cause**: InteractiveChat has local messages state; ChatContext also has messages
**Effect**: Message history diverges between expanded and collapsed chat
**Files**: InteractiveChat.tsx (line 32), ChatContext.tsx (line 33)

### Problem 3: isExpanded Duplication
**Cause**: CondensedChat uses local `isExpandedLocal`; ChatContext.isExpanded unused
**Effect**: Wasted state in context
**Files**: CondensedChat.tsx (line 40), ChatContext.tsx (line 51)

### Problem 4: Multiple State Updates
**Cause**: `setChatSummary()` and `setCurrentTabInternal()` called separately
**Effect**: Updates can be interrupted by other renders
**Files**: ChatContext.tsx (lines 120-131)

---

## Component State Map

### App.tsx
```
- theme: 'white' | 'g100'
- settingsOpen: boolean
```

### ChatContext.tsx (shared across all components)
```
- messages: Message[]
- currentTab: number
- isExpanded: boolean
- draftInput: string
- chatSummary: string
- previousTabRef: useRef
```

### AgentContext.tsx (shared)
```
- orchestrator: BrowserOrchestrator | null
- apiKey: string | null
- isInitialized: boolean
- error: string | null
```

### InteractiveChat.tsx (LOCAL - problematic!)
```
- messages: Message[] (DUPLICATE!)
- isLoading: boolean
- streamingContent: string
- inputFocused: boolean
- contextualSuggestions: QuickAction[]
- showContextualSuggestions: boolean
```

### CondensedChat.tsx (LOCAL)
```
- isLoading: boolean
- showSuggestions: boolean
- contextualSuggestions: QuickAction[]
- isExpanded: boolean (LOCAL - should be from context!)
- streamingContent: string
```

### ResearchDashboard.tsx (LOCAL)
```
- researchEntries: ResearchEntry[]
- selectedEntry: ResearchEntry | null
- viewModalOpen: boolean
```

---

## Navigation Flow

### User Clicks Tab
```
User clicks "Bio" tab
  ↓
Tabs onChange({ selectedIndex: 1 })
  ↓
setCurrentTab(1) from ChatContext
  ↓
Condition check: previousTab === 0 && newTab !== 0 && messages.length > 1
  ↓
generateChatSummary() (if true)
  ↓
setChatSummary(summary)
setCurrentTabInternal(1)
  ↓
DashboardContent re-renders
  ↓
Tab 1 displays (BioDashboard)
CondensedChat appears
```

### User Clicks Quick Action
```
User clicks "Add Bio Data" badge (navigateTo: 1)
  ↓
handleQuickAction(action)
  ↓
Check: action.navigateTo !== undefined
  ↓
setCurrentTab(1) [from ChatContext]
  ↓
[Same as "User Clicks Tab" flow above]
```

### Agent Triggers Navigation
```
Tool use: navigate_to_tab(4)
  ↓
BrowserOrchestrator.navigateToTab()
  ↓
onTabChangeRequest callback
  ↓
ChatContext.requestTabChange()
  ↓
setCurrentTab(4)
  ↓
[Same as "User Clicks Tab" flow above]
```

---

## Redux Solution Architecture

### Store Shape
```typescript
{
  app: {
    theme: 'white' | 'g100',
    settingsOpen: boolean
  },
  agent: {
    orchestrator: BrowserOrchestrator | null,
    apiKey: string | null,
    isInitialized: boolean,
    error: string | null
  },
  chat: {
    messages: Message[],
    currentTab: number,
    previousTab: number,
    draftInput: string,
    chatSummary: string,
    isExpanded: boolean,
    isLoading: boolean,
    streamingContent: string
  },
  research: {
    researchEntries: ResearchEntry[],
    selectedEntry: ResearchEntry | null,
    viewModalOpen: boolean
  }
}
```

### Key Actions
```typescript
// Chat actions
setCurrentTab(tab: number)
setDraftInput(text: string)
addMessage(message: Message)
clearMessages()
setSummary(summary: string)
setIsExpanded(expanded: boolean)
setIsLoading(loading: boolean)
setStreamingContent(content: string)

// App actions
setTheme(theme: 'white' | 'g100')
setSettingsOpen(open: boolean)

// Agent actions
setApiKey(key: string)
setOrchestrator(orchestrator: BrowserOrchestrator)
setInitialized(initialized: boolean)
setError(error: string | null)
```

---

## Why Redux Fixes Bio Tab Bug

### Current (Broken)
```typescript
const setCurrentTab = useCallback((newTab: number) => {
  // ... complex logic
}, [draftInput, messages, generateChatSummary])
// ← Recreated every keystroke!

// When user clicks Bio tab while typing:
// 1. setCurrentTab(1) called
// 2. draftInput changes → callback recreated
// 3. State updates may not complete
// 4. Tab might not change
```

### Redux (Fixed)
```typescript
const dispatch = useAppDispatch()

const handleTabClick = (tab) => {
  dispatch(chatActions.setCurrentTab(tab))
}
// ← Created once, never recreated

// Reducer handles ALL state updates atomically:
// state.previousTab = previousTab
// state.currentTab = tab
// state.chatSummary = ...
// All done in one update, no interruption possible
```

---

## Debugging Tips

### Find Bio Tab Issue in Redux DevTools
1. Open Redux DevTools browser extension
2. Open DashboardContent (Interactive tab)
3. Type in input field
4. Click Bio tab
5. Watch the actions list:
   - See many `@@reduxjs/update` actions (from typing)
   - See `chat/setCurrentTab` action (from clicking tab)
   - Verify all state updates complete in one action

### Monitor Callback Recreations (Current)
```typescript
useEffect(() => {
  console.log('setCurrentTab recreated at', new Date().toISOString())
}, [setCurrentTab])
```

Count how many times it logs while typing! (Thousands of times = problem)

### Monitor State Updates (Current)
```typescript
useEffect(() => {
  console.log('currentTab changed to', currentTab)
}, [currentTab])

useEffect(() => {
  console.log('chatSummary changed to', chatSummary)
}, [chatSummary])
```

See if both update together or separately when clicking tab.

---

## Implementation Order

1. **Create Redux store** (store.ts, slices)
2. **Migrate ChatContext** to chatSlice (most critical)
3. **Update DashboardContent** to use Redux
4. **Update InteractiveChat** (remove local messages state)
5. **Update CondensedChat** (remove local isExpanded state)
6. **Migrate AgentContext** to agentSlice (optional)
7. **Delete context files** and clean up
8. **Test thoroughly** (especially Bio tab!)

---

## Files Affected

### High Priority (Bugs, duplication)
- ChatContext.tsx - Remove (migrate to Redux)
- InteractiveChat.tsx - Update (use Redux instead of local messages)
- CondensedChat.tsx - Update (use Redux instead of local isExpanded)
- DashboardContent.tsx - Update (use Redux instead of useChat hook)

### Medium Priority (Architecture)
- AgentContext.tsx - Consider migrating to Redux
- Dashboard.tsx - May become unnecessary after context removal

### Low Priority (Future optimization)
- ResearchDashboard.tsx - Could stay local or move to Redux

---

## Testing Strategy

### Before Redux Migration
```
1. Navigate between tabs rapidly
2. Type in input while navigating to Bio tab
3. Click suggestion badges with navigation
4. Send messages and verify chat history
5. Document which tests pass/fail
```

### After Redux Migration
```
1. Run same tests as above
2. Use Redux DevTools to verify state updates
3. Verify no callback recreations
4. Verify atomic state updates
5. Measure performance (should be similar or better)
6. Verify chat history never diverges
```

---

## Time Estimate

- Phase 1 (Setup): 1-2 hours
- Phase 2 (ChatSlice): 2-3 hours
- Phase 3 (Update components): 3-4 hours
- Phase 4 (Testing): 2-3 hours
- Phase 5 (Cleanup): 1 hour
- **Total: 9-13 hours** for complete migration

---

## Decision Points

### Should we migrate AgentContext?
- **Yes**: If we want full Redux adoption and consistent patterns
- **No**: If we want minimal change and focus only on fixing Bio tab bug

### Should we migrate ResearchDashboard?
- **Yes**: For consistency across codebase
- **No**: If local state works fine (no shared state needed)

### Should we use Redux Thunk for async?
- Probably yes, for handling tab navigation callbacks from orchestrator
- Keep BrowserOrchestrator.onTabChangeRequest pattern but dispatch actions instead

---

## Resources

- Redux Toolkit docs: https://redux-toolkit.js.org/
- Redux DevTools: https://github.com/reduxjs/redux-devtools
- React-Redux hooks: https://react-redux.js.org/api/hooks

