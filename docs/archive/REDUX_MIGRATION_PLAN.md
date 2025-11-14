# Redux Migration Plan & Implementation Guide

## Executive Summary

The CV Builder UI suffers from **state management fragmentation** that causes the Bio tab navigation bug:

1. **State Duplication**: Messages stored in both ChatContext AND InteractiveChat
2. **Callback Recreation**: `setCurrentTab` recreated on every keystroke due to `draftInput` in dependencies
3. **Race Conditions**: Multiple state updates (`setChatSummary` + `setCurrentTabInternal`) can be interrupted
4. **Logic Duplication**: `handleQuickAction` implemented separately in InteractiveChat and CondensedChat

**Redux solves this by**:
- Single source of truth for all state
- Atomic state updates (all state changes in one reducer)
- Better DevTools support for debugging
- Eliminated callback recreation issues

---

## Current Issues Deep Dive

### Issue 1: Dependency Array Problem

**Location**: `ChatContext.tsx` line 132

```typescript
const setCurrentTab = useCallback((newTab: number) => {
  // ...
}, [draftInput, messages, generateChatSummary]) // ← draftInput is problematic
```

**Problem**: `draftInput` changes 1000s of times while user types. Each change recreates `setCurrentTab`.

**Example Timeline**:
- User types: "How do I add bio?" (10 characters)
- Each keystroke triggers: onChange → setDraftInput → draftInput state update
- Each update changes `draftInput` dependency
- `setCurrentTab` is RECREATED 10 times
- If user clicks Bio tab during typing, the callback being used might be stale

**Why it affects Bio tab**: Bio tab navigation reads `previousTabRef`, which depends on stable closure over `setCurrentTab`. If the callback is recreated between the click and execution, `previousTabRef` might not be properly updated.

---

### Issue 2: Multiple State Updates

**Location**: `ChatContext.tsx` lines 120-131

```typescript
if (previousTab === 0 && newTab !== 0 && messages.length > 1) {
  const summary = generateChatSummary()
  setChatSummary(summary)  // ← State update 1
} else if (newTab === 0) {
  setChatSummary('')
}

previousTabRef.current = newTab  // ← Ref update
setCurrentTabInternal(newTab)     // ← State update 2
```

**Problem**: Two separate `setState` calls can be batched together, but if React's batching is interrupted (by concurrent renders, suspense, etc.), they might not both complete.

**Scenario**:
1. User clicks Bio tab
2. `setCurrentTab(1)` starts
3. `generateChatSummary()` triggers (depends on messages)
4. Meanwhile, a new message arrives from CondensedChat
5. `messages` state updates → triggers re-render
6. Re-render interrupts the `setCurrentTab` execution
7. `currentTab` state might not update, or updates partially

---

### Issue 3: State Duplication

**Location**: `InteractiveChat.tsx` line 32

```typescript
const [messages, setMessages] = useState<Message[]>([...])
```

**And**: `ChatContext.tsx` line 33

```typescript
const [messages, setMessages] = useState<Message[]>([...])
```

**Problem**: Two independent message lists that don't sync!

**What happens**:
- InteractiveChat maintains its own messages list
- CondensedChat uses ChatContext.messages (via `addMessage`)
- When CondensedChat adds a message, InteractiveChat doesn't see it
- They can diverge, causing different content to be displayed

**Example**:
1. User on InteractiveChat (tab 0), sends message
2. Message added to InteractiveChat.messages
3. User switches to Bio tab (1)
4. CondensedChat appears, uses ChatContext.messages
5. CondensedChat messages don't include the message from step 2
6. User sees different chat history in collapsed chat vs expanded chat

---

### Issue 4: isExpanded State Duplication

**Location**: `CondensedChat.tsx` line 40

```typescript
const [isExpanded, setIsExpandedLocal] = useState(false)
```

**And**: `ChatContext.tsx` line 51

```typescript
const [isExpanded, setIsExpanded] = useState(true)
```

**Problem**: CondensedChat uses LOCAL `isExpandedLocal` but ChatContext also has `isExpanded`. They're never synced!

**Result**: ChatContext.isExpanded is wasted state that's never used.

---

## Redux Solution

### Store Structure

```typescript
// store/slices/appSlice.ts
{
  theme: 'white' | 'g100'
  settingsOpen: boolean
}

// store/slices/agentSlice.ts
{
  orchestrator: BrowserOrchestrator | null
  apiKey: string | null
  isInitialized: boolean
  error: string | null
}

// store/slices/chatSlice.ts (CRITICAL)
{
  messages: Message[]
  currentTab: number (0-4)
  previousTab: number
  draftInput: string
  chatSummary: string
  isExpanded: boolean
  isLoading: boolean
  streamingContent: string
}

// store/slices/researchSlice.ts (optional, could stay local)
{
  researchEntries: ResearchEntry[]
  selectedEntry: ResearchEntry | null
  viewModalOpen: boolean
}
```

### Benefits of Redux Approach

1. **Single Atomic Update**
   ```typescript
   // Instead of:
   setChatSummary(summary)
   setCurrentTabInternal(tab)
   
   // Redux does this atomically:
   dispatch(setCurrentTab(tab))
   // Reducer updates both in one object:
   // { ...state, chat: { ...state.chat, currentTab: tab, chatSummary: ... } }
   ```

2. **No Callback Recreation**
   ```typescript
   // Before: useCallback with dependencies
   const setCurrentTab = useCallback(..., [draftInput, messages, ...])
   
   // After: Simple dispatch call
   const handleTabChange = (tab) => dispatch(chatActions.setCurrentTab(tab))
   // No dependencies! Function is created once per component lifecycle
   ```

3. **Time-Travel Debugging**
   - Redux DevTools shows every state update
   - Can replay exact sequence of events that causes Bio tab bug
   - Can see when draftInput changes vs when tab change happens

4. **Unified Messages State**
   - One source of truth for all messages
   - InteractiveChat, CondensedChat, any component can read same messages
   - No divergence or sync issues

---

## Implementation Plan

### Phase 1: Setup Redux

```bash
npm install redux react-redux @reduxjs/toolkit
```

Create files:
```
src/browser/store/
├── store.ts                 # Redux store configuration
├── slices/
│   ├── appSlice.ts         # App state (theme, settingsOpen)
│   ├── agentSlice.ts       # Agent state
│   ├── chatSlice.ts        # Chat state (messages, currentTab, etc.)
│   └── researchSlice.ts    # Research state (optional)
└── hooks.ts                # Custom typed hooks (useAppDispatch, useAppSelector)
```

### Phase 2: Migrate ChatContext to Redux

1. **Create chatSlice.ts** with reducers:
   - `setCurrentTab(state, action)`: Sets currentTab, updates previousTab, generates summary
   - `setDraftInput(state, action)`: Sets draftInput
   - `addMessage(state, action)`: Appends message
   - `clearMessages(state, action)`: Resets to welcome
   - `setIsExpanded(state, action)`: Sets isExpanded
   - `setIsLoading(state, action)`: Sets isLoading
   - `setStreamingContent(state, action)`: Sets streamingContent
   - `setSummary(state, action)`: Sets chatSummary

2. **Update DashboardContent**:
   ```typescript
   // Before:
   const { currentTab, setCurrentTab } = useChat()
   const { setTabChangeHandler } = useAgent()
   
   // After:
   const currentTab = useAppSelector(state => state.chat.currentTab)
   const dispatch = useAppDispatch()
   const { setTabChangeHandler } = useAgent()
   
   useEffect(() => {
     setTabChangeHandler((tab) => {
       dispatch(chatSlice.actions.setCurrentTab(tab))
     })
   }, [dispatch, setTabChangeHandler])
   ```

3. **Update InteractiveChat**:
   ```typescript
   // Before:
   const [messages, setMessages] = useState([...])
   const { currentTab, setCurrentTab, draftInput, setDraftInput } = useChat()
   
   // After:
   const messages = useAppSelector(state => state.chat.messages)
   const currentTab = useAppSelector(state => state.chat.currentTab)
   const draftInput = useAppSelector(state => state.chat.draftInput)
   const dispatch = useAppDispatch()
   
   // Replace handleSend to use dispatch instead of setMessages:
   dispatch(chatSlice.actions.addMessage(userMessage))
   dispatch(chatSlice.actions.addMessage(assistantMessage))
   
   // Replace setCurrentTab calls:
   dispatch(chatSlice.actions.setCurrentTab(tab))
   ```

4. **Update CondensedChat**:
   ```typescript
   // Before:
   const [isExpanded, setIsExpandedLocal] = useState(false)
   const { messages, addMessage, setCurrentTab, draftInput, setDraftInput } = useChat()
   
   // After:
   const messages = useAppSelector(state => state.chat.messages)
   const isExpanded = useAppSelector(state => state.chat.isExpanded)
   const draftInput = useAppSelector(state => state.chat.draftInput)
   const dispatch = useAppDispatch()
   
   const toggleExpanded = () => {
     dispatch(chatSlice.actions.setIsExpanded(!isExpanded))
   }
   ```

### Phase 3: Migrate AgentContext to Redux

```typescript
// agentSlice.ts
{
  setApiKey(state, action) { state.apiKey = action.payload },
  setOrchestrator(state, action) { state.orchestrator = action.payload },
  setInitialized(state, action) { state.isInitialized = action.payload },
  setError(state, action) { state.error = action.payload }
}

// App.tsx
const apiKey = useAppSelector(state => state.agent.apiKey)
const dispatch = useAppDispatch()

const setApiKey = (key: string) => {
  dispatch(agentSlice.actions.setApiKey(key))
}
```

### Phase 4: Remove Context Files

After migration is complete:
- Delete `ChatContext.tsx`
- Delete `AgentContext.tsx`
- Delete `Dashboard.tsx` wrapper
- Update `App.tsx` to directly use Redux instead of providing contexts

---

## Fixing the Bio Tab Bug with Redux

### Root Cause (Current)
```typescript
const setCurrentTab = useCallback((newTab: number) => {
  // ...reads and updates multiple state variables
  // ...can be interrupted by draftInput changes
}, [draftInput, messages, generateChatSummary])
```

### Redux Solution
```typescript
// chatSlice.ts
const chatSlice = createSlice({
  name: 'chat',
  initialState: { ... },
  reducers: {
    setCurrentTab: (state, action) => {
      const newTab = action.payload
      const previousTab = state.currentTab
      
      // All state updates happen ATOMICALLY in one reducer call
      if (previousTab === 0 && newTab !== 0 && state.messages.length > 1) {
        state.chatSummary = generateChatSummary(state.messages)
      } else if (newTab === 0) {
        state.chatSummary = ''
      }
      
      state.previousTab = previousTab
      state.currentTab = newTab
      // ← ALL updates applied together in one state mutation
    }
  }
})

// In component:
const dispatch = useAppDispatch()
const handleTabClick = (tab) => {
  dispatch(chatSlice.actions.setCurrentTab(tab))
  // ← Single dispatch, no callback recreation, no race conditions
}
```

### Why This Fixes Bio Tab
1. **No callback recreation**: `handleTabClick` doesn't depend on `draftInput`
2. **Atomic updates**: `previousTab` and `currentTab` and `chatSummary` all update together
3. **No interruption**: Reducer executes synchronously without being interrupted
4. **DevTools visibility**: Can see exact state transitions in Redux DevTools

---

## Migration Checklist

### Stage 1: Setup
- [ ] Install Redux packages: `npm install redux react-redux @reduxjs/toolkit`
- [ ] Create `src/browser/store/` directory structure
- [ ] Create `store.ts` with `configureStore`
- [ ] Create `hooks.ts` with typed `useAppDispatch` and `useAppSelector`
- [ ] Create `slices/appSlice.ts`, `slices/agentSlice.ts`, `slices/chatSlice.ts`

### Stage 2: ChatSlice Implementation
- [ ] Implement `chatSlice` with initial state
- [ ] Implement all reducers: `setCurrentTab`, `setDraftInput`, `addMessage`, etc.
- [ ] Add `generateChatSummary` helper function in slice
- [ ] Test slice with Redux DevTools

### Stage 3: Update Components
- [ ] Update `DashboardContent.tsx` to use Redux (delete useChat hook calls)
- [ ] Update `InteractiveChat.tsx` to use Redux (remove local messages state)
- [ ] Update `CondensedChat.tsx` to use Redux (remove local isExpanded state)
- [ ] Update `AgentContext.tsx` or migrate to Redux

### Stage 4: Testing
- [ ] Test tab navigation: Click each tab, verify currentTab updates
- [ ] Test Bio tab specifically: Type in input, then click Bio tab rapidly
- [ ] Test quick actions: Click suggestion badges, verify navigation
- [ ] Test message history: Send messages in different tabs, verify messages sync
- [ ] Test chat summary: Switch tabs, verify summary appears correctly

### Stage 5: Cleanup
- [ ] Delete `ChatContext.tsx`
- [ ] Delete `AgentContext.tsx` (if fully migrated to Redux)
- [ ] Delete `Dashboard.tsx` wrapper (move logic to `DashboardContent`)
- [ ] Update `App.tsx` to use `Provider` from Redux instead of context providers

---

## Quick Reference: Redux vs Context

| Aspect | Context | Redux |
|--------|---------|-------|
| **State Updates** | Multiple setState calls | Single reducer call |
| **Atomic Updates** | No (each setState separate) | Yes (all in one reducer) |
| **Callback Recreation** | Frequent if deps change | No (dispatch is stable) |
| **State Duplication** | Easy to do accidentally | Impossible (single store) |
| **DevTools** | Limited (React DevTools) | Excellent (Redux DevTools) |
| **Async Logic** | useEffect + setState | Thunks/Sagas |
| **Learning Curve** | Low | Medium |
| **Bundle Size** | Smaller | Larger (+25KB) |
| **Best For** | Simple state | Complex interconnected state |

---

## Performance Considerations

### Before Redux (Context)
- Multiple re-renders when any part of ChatContext updates
- All components re-render if any single piece of state changes
- Components can't selectively subscribe to state pieces

### After Redux
- `useSelector` with memoization prevents unnecessary re-renders
- Components only re-render when their selected state changes
- Better performance if multiple components read different slices

**Example**:
```typescript
// After Redux, these don't re-render when draftInput changes:
const currentTab = useAppSelector(state => state.chat.currentTab)

// But this would:
const chat = useAppSelector(state => state.chat) // selects entire chat slice

// So prefer:
const { currentTab, messages } = useAppSelector(state => ({
  currentTab: state.chat.currentTab,
  messages: state.chat.messages
}))
```

---

## Files to Create/Modify

### Create:
- `src/browser/store/store.ts`
- `src/browser/store/hooks.ts`
- `src/browser/store/slices/appSlice.ts`
- `src/browser/store/slices/agentSlice.ts`
- `src/browser/store/slices/chatSlice.ts`
- `src/browser/store/slices/researchSlice.ts` (optional)

### Modify:
- `src/browser/App.tsx`
- `src/browser/components/Dashboard.tsx` (or delete if wrapping logic moved)
- `src/browser/components/DashboardContent.tsx` (rename from Dashboard.tsx)
- `src/browser/components/InteractiveChat.tsx`
- `src/browser/components/CondensedChat.tsx`
- `src/browser/main.tsx` (wrap app with Redux Provider)

### Delete:
- `src/browser/contexts/ChatContext.tsx`
- `src/browser/contexts/AgentContext.tsx` (if fully migrated)

