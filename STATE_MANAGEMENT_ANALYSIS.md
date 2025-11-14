# CV Builder State Management Analysis

## Current Component Hierarchy

```
App (root)
├── Theme
├── Header
│   ├── Settings Button
│   └── Theme Toggle
├── Content
│   └── Dashboard
│       └── ChatProvider
│           └── DashboardContent
│               ├── Tabs (selectedIndex={currentTab})
│               │   ├── TabList
│               │   │   ├── Tab 0: Interactive
│               │   │   ├── Tab 1: Bio
│               │   │   ├── Tab 2: Jobs
│               │   │   ├── Tab 3: Outputs
│               │   │   └── Tab 4: Research
│               │   └── TabPanels
│               │       ├── InteractiveChat
│               │       ├── BioDashboard
│               │       ├── JobsDashboard
│               │       ├── OutputsDashboard
│               │       └── ResearchDashboard
│               └── CondensedChat (shown for tabs 1-4)
├── AgentProvider (wraps Dashboard)
└── ApiKeySettings Modal
```

## State Management Layers

### 1. App Component State
**File**: `/src/browser/App.tsx`

Local state:
- `theme`: 'white' | 'g100' (controls Carbon theme)
- `settingsOpen`: boolean (API key settings modal visibility)

Context provided:
- `AgentProvider` (wraps entire app)

**Issues**: None identified at this level.

---

### 2. AgentContext (Application Service Layer)
**File**: `/src/browser/contexts/AgentContext.tsx`

Manages:
- `orchestrator`: BrowserOrchestrator | null
- `apiKey`: string | null
- `isInitialized`: boolean
- `error`: string | null
- `setTabChangeHandler`: function to register tab change callbacks

**How it works**:
1. Tries to load API key from environment or localStorage
2. Initializes BrowserOrchestrator when API key is set
3. Registers tab change callback from ChatContext via `setTabChangeHandler()`

**Flow for tab navigation**:
```
DashboardContent.useEffect() 
  → setTabChangeHandler((tab, reason) => requestTabChange(tab, reason))
  → Sets callback in agent-service.ts
  → BrowserOrchestrator uses this callback to trigger navigations
```

**Potential Issue**: The callback is set in agent-service.ts but needs to be reset if orchestrator is recreated (line 21-23 handles this).

---

### 3. ChatContext (Navigation & Chat State)
**File**: `/src/browser/contexts/ChatContext.tsx`

Manages:
- `messages`: Message[] - Chat history (shared across tabs!)
- `currentTab`: number (0-4)
- `isExpanded`: boolean (for CondensedChat)
- `draftInput`: string (chat input field value)
- `chatSummary`: string (2-3 word summary for condensed chat header)
- `previousTabRef`: useRef - tracks previous tab

**Key Functions**:
- `addMessage(message)`: Appends message to chat history
- `clearMessages()`: Resets to welcome message
- `setCurrentTab(newTab)`: Updates tab and generates chat summary
- `requestTabChange(tab, reason)`: Currently just calls setCurrentTab
- `generateChatSummary()`: Creates topic summary from last 3 user messages

**Critical Behavior**:
```typescript
setCurrentTab = useCallback((newTab: number) => {
  previousTab = previousTabRef.current
  
  // Generate summary when leaving Interactive tab
  if (previousTab === 0 && newTab !== 0 && messages.length > 1) {
    setChatSummary(generateChatSummary())
  }
  
  // Clear summary when returning to Interactive
  if (newTab === 0) {
    setChatSummary('')
  }
  
  previousTabRef.current = newTab
  setCurrentTabInternal(newTab)
}, [draftInput, messages, generateChatSummary])
```

**Potential Issue 1 - Draft Input in Dependencies**:
- `draftInput` is in the dependency array but shouldn't affect tab changes
- This causes unnecessary re-evaluations

**Potential Issue 2 - Chat Summary Generation**:
- `generateChatSummary()` is memoized but depends on `messages`
- Creating a new summary on every tab transition

**Potential Issue 3 - Bio Tab Bug (The Main Issue)**:
- The `setCurrentTab` function has `[draftInput, messages, generateChatSummary]` in dependencies
- When user clicks Bio tab (tab 1) while input has text:
  - Function evaluates `previousTab === 0 && newTab !== 0 && messages.length > 1`
  - This is true, so it generates a summary
  - BUT the summary generation might trigger re-renders
  - Possibly the tab state update is not being applied correctly

---

### 4. InteractiveChat Component
**File**: `/src/browser/components/InteractiveChat.tsx`

Local state:
- `messages`: Message[] (INDEPENDENT from ChatContext!)
- `isLoading`: boolean
- `streamingContent`: string
- `inputFocused`: boolean
- `contextualSuggestions`: QuickAction[]
- `showContextualSuggestions`: boolean

Context used:
- `useAgent()`: Gets orchestrator, isInitialized
- `useChat()`: Gets currentTab, setCurrentTab, draftInput, setDraftInput

**Key Functions**:
- `handleSend()`: Sends message to orchestrator, extracts suggestions from response
- `handleQuickAction(action)`: 
  - If `action.navigateTo` is defined → calls `setCurrentTab(action.navigateTo)`
  - Otherwise → sets `draftInput` and calls `handleSend()`
- `extractSuggestionsFromResponse()`: Parses XML metadata and "Next Steps" section

**Data Duplication Issue**:
- InteractiveChat maintains its OWN messages state
- ChatContext also has messages
- These are NOT synchronized! Each tab has its own chat rendering.

**Potential Issue**: The extractSuggestionsFromResponse has extensive logging (lines 102-213) for debugging the Bio tab issue.

---

### 5. CondensedChat Component
**File**: `/src/browser/components/CondensedChat.tsx`

Local state:
- `isLoading`: boolean
- `showSuggestions`: boolean
- `contextualSuggestions`: QuickAction[]
- `isExpanded`: boolean (LOCAL, separate from ChatContext's isExpanded!)
- `streamingContent`: string

Context used:
- `useChat()`: Gets messages, addMessage, setCurrentTab, draftInput, setDraftInput, chatSummary
- `useAgent()`: Gets orchestrator, isInitialized

**Key Functions**:
- `handleQuickAction(action)`: Same navigation logic as InteractiveChat
- `handleSend()`: Uses messages from ChatContext via `addMessage()`

**Important**: CondensedChat uses ChatContext messages but InteractiveChat doesn't!

**Potential Issue**: Two different components handling quick actions with `setCurrentTab()` - logic duplication and inconsistency risk.

---

### 6. Dashboard Tabs Components
**File**: `/src/browser/components/BioDashboard.tsx`, `JobsDashboard.tsx`, `OutputsDashboard.tsx`, `ResearchDashboard.tsx`

These components:
- **BioDashboard**: No state, just UI with buttons (Edit Bio, Create New Bio)
- **JobsDashboard**: No state, displays empty table with "Add Job Listing" button
- **OutputsDashboard**: No state, displays empty table
- **ResearchDashboard**: 
  - `researchEntries`: ResearchEntry[]
  - `selectedEntry`: ResearchEntry | null
  - `viewModalOpen`: boolean
  - Loads data from browser storage via BrowserStorage

**None of these components use ChatContext or AgentContext directly.**

---

## State Data Flow Analysis

### Tab Navigation Flow

**Route 1: User clicks tab in TabList** (Most Common)
```
User clicks Tab 1
  ↓
Tabs onChange handler → setCurrentTab(1)
  ↓
ChatContext.setCurrentTab(1)
  ↓
- Checks if previousTab === 0 && newTab !== 0
- Generates chat summary if messages.length > 1
- Updates previousTabRef
- Calls setCurrentTabInternal(1)
  ↓
Re-renders DashboardContent with currentTab=1
  ↓
Tab 1 panel displays (BioDashboard, etc.)
  ↓
CondensedChat appears below tab content
```

**Route 2: User clicks suggestion badge in chat**
```
Suggestion clicked (with navigateTo)
  ↓
handleQuickAction(action)
  ↓
setCurrentTab(action.navigateTo) [from ChatContext]
  ↓
[Same as Route 1 above]
```

**Route 3: Agent tool invokes tab navigation**
```
orchestrator.processRequestStreaming()
  ↓
Tool use detected: navigate_to_tab
  ↓
BrowserOrchestrator.navigateToTab()
  ↓
onTabChangeRequest(tabIndex, reason) callback
  ↓
ChatContext.requestTabChange()
  ↓
setCurrentTab(tab)
  ↓
[Same as Route 1 above]
```

---

## The Bio Tab Bug - Root Cause Analysis

Based on the code, here's the likely cause:

### Symptom
When user clicks the Bio tab (tab 1), navigation sometimes fails or doesn't update properly.

### Likely Root Cause
In `ChatContext.setCurrentTab()` at line 106-132:

```typescript
const setCurrentTab = useCallback((newTab: number) => {
  const previousTab = previousTabRef.current
  
  console.log('[ChatContext] setCurrentTab called:', {
    previousTab,
    newTab,
    draftInput,  // ← PROBLEM: This variable is captured
    messagesLength: messages.length
  })
  
  if (previousTab === 0 && newTab !== 0 && messages.length > 1) {
    const summary = generateChatSummary()
    console.log('[ChatContext] Generated summary for header:', summary)
    setChatSummary(summary)
  } else if (newTab === 0) {
    setChatSummary('')
  }
  
  previousTabRef.current = newTab
  setCurrentTabInternal(newTab)
}, [draftInput, messages, generateChatSummary]) // ← PROBLEM: draftInput in deps
```

**The Problem**:
1. When user types in chat input (draftInput changes), the entire `setCurrentTab` function is recreated
2. `draftInput` is in the dependency array but shouldn't be - it's only logged
3. The logging creates a closure that captures the current draftInput value
4. If tab change is triggered while draftInput is being updated, there's a race condition
5. The function is recreated frequently, potentially causing stale closure issues

**Why it affects Bio tab specifically**:
- User is likely on Interactive tab (0) typing in the input
- When clicking Bio tab (1):
  - The condition `previousTab === 0 && newTab !== 0` is true
  - The function tries to generate a summary
  - Meanwhile `draftInput` might be changing
  - The dependency update causes the callback to be recreated
  - The re-creation might interrupt the state update

---

## Prop Drilling Patterns

**Minimal prop drilling** - mostly uses context:
- `setCurrentTab` is passed through ChatContext
- `messages` is passed through ChatContext
- `draftInput` is passed through ChatContext

**No significant prop drilling observed** between sibling components.

---

## State Duplication Issues

### Issue 1: Messages State Duplication
- **ChatContext.messages**: Shared across entire app
- **InteractiveChat.messages**: Local component state, independent copy
- **CondensedChat**: Uses ChatContext.messages via `addMessage()`

**Result**: InteractiveChat and CondensedChat have different message lists!
- InteractiveChat displays its own messages
- CondensedChat displays ChatContext messages
- They can diverge and cause inconsistency

### Issue 2: isExpanded State
- **ChatContext.isExpanded**: Part of context (set by CondensedChat)
- **CondensedChat.isExpanded**: Local state `isExpandedLocal` (line 40)
- **CondensedChat never updates ChatContext.isExpanded**!

**Result**: ChatContext.isExpanded is never actually used by CondensedChat!

### Issue 3: Callback Recreation
- `setCurrentTab` recreated whenever `draftInput` changes
- `handleSend` recreated whenever `currentTab`, `draftInput`, etc. change
- `handleQuickAction` recreated in both InteractiveChat and CondensedChat

---

## Summary Table: State by Component

| Component | State | Type | Shared? | Issue |
|-----------|-------|------|---------|-------|
| App | theme, settingsOpen | Local | No | None |
| AgentContext | orchestrator, apiKey, isInitialized, error | Context | Global | Callback setup works but recreates orchestrator |
| ChatContext | messages, currentTab, draftInput, chatSummary, previousTabRef | Context | Global | draftInput in wrong dependency array |
| InteractiveChat | messages, isLoading, streamingContent, suggestions, etc. | Local | No | Duplicates ChatContext.messages! |
| CondensedChat | isLoading, showSuggestions, isExpanded, streamingContent | Local | No | isExpanded duplicates context |
| BioDashboard | (none) | - | - | None |
| JobsDashboard | (none) | - | - | None |
| OutputsDashboard | (none) | - | - | None |
| ResearchDashboard | researchEntries, selectedEntry, viewModalOpen | Local | No | None |

---

## Redux Migration Checklist

When migrating to Redux, consolidate:

1. **App Slice**
   - theme
   - settingsOpen

2. **Agent Slice**
   - orchestrator
   - apiKey
   - isInitialized
   - error

3. **Chat Slice** (CRITICAL)
   - messages (unified, shared)
   - currentTab
   - previousTab
   - draftInput
   - chatSummary
   - isExpanded
   - isLoading
   - streamingContent

4. **Research Slice** (Optional, can stay local)
   - researchEntries
   - selectedEntry
   - viewModalOpen

**Key Redux Actions to Create**:
- `setCurrentTab(tab)`
- `setDraftInput(text)`
- `addMessage(message)`
- `clearMessages()`
- `setSummary(summary)`
- `setIsExpanded(expanded)`
- `setIsLoading(loading)`
- `setStreamingContent(content)`

