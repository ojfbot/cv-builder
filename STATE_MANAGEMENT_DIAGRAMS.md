# State Management Diagrams & Visual Analysis

## 1. Component Tree with State Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ App.tsx                                                                 │
│ ├─ State: theme, settingsOpen                                          │
│ └─ Providers:                                                           │
│    └─ AgentProvider                                                     │
│       └─ App Content:                                                   │
│          ├─ Header (Settings, Theme Toggle)                           │
│          └─ Content:                                                   │
│             └─ Dashboard.tsx                                           │
│                ├─ Wraps with: ChatProvider                            │
│                └─ Renders: DashboardContent()                         │
│                   │                                                    │
│                   ├─ Heading: "CV Builder Dashboard"                 │
│                   │                                                    │
│                   ├─ Tabs Component (Carbon)                         │
│                   │  selectedIndex={currentTab}                       │
│                   │  onChange={setCurrentTab}                         │
│                   │                                                    │
│                   ├─ TabList:                                         │
│                   │  ├─ Tab 0: "Interactive"                         │
│                   │  ├─ Tab 1: "Bio"                                 │
│                   │  ├─ Tab 2: "Jobs"                                │
│                   │  ├─ Tab 3: "Outputs"                             │
│                   │  └─ Tab 4: "Research"                            │
│                   │                                                    │
│                   ├─ TabPanels:                                       │
│                   │  ├─ TabPanel 0:                                  │
│                   │  │  └─ InteractiveChat.tsx                       │
│                   │  │     State: messages (LOCAL!), isLoading,      │
│                   │  │            streamingContent,                   │
│                   │  │            inputFocused,                       │
│                   │  │            contextualSuggestions, etc.         │
│                   │  │     Hooks: useAgent(), useChat()              │
│                   │  │                                                │
│                   │  ├─ TabPanel 1:                                  │
│                   │  │  └─ BioDashboard.tsx                          │
│                   │  │     State: (none)                             │
│                   │  │                                                │
│                   │  ├─ TabPanel 2:                                  │
│                   │  │  └─ JobsDashboard.tsx                         │
│                   │  │     State: (none)                             │
│                   │  │                                                │
│                   │  ├─ TabPanel 3:                                  │
│                   │  │  └─ OutputsDashboard.tsx                      │
│                   │  │     State: (none)                             │
│                   │  │                                                │
│                   │  └─ TabPanel 4:                                  │
│                   │     └─ ResearchDashboard.tsx                     │
│                   │        State: researchEntries, selectedEntry,    │
│                   │               viewModalOpen                       │
│                   │                                                    │
│                   └─ CondensedChat.tsx (shown when currentTab !== 0)  │
│                      State: isLoading, showSuggestions,              │
│                             contextualSuggestions,                    │
│                             isExpanded (LOCAL!),                      │
│                             streamingContent                          │
│                      Hooks: useChat(), useAgent()                    │
│                      Uses: ChatContext.messages (via addMessage)      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2. Context Providers & Their Scope

```
┌─ AgentContext (App level)
│  ├─ Provides:
│  │  ├─ orchestrator: BrowserOrchestrator | null
│  │  ├─ apiKey: string | null
│  │  ├─ isInitialized: boolean
│  │  ├─ error: string | null
│  │  └─ setTabChangeHandler: (handler) => void
│  │
│  └─ Used by:
│     ├─ DashboardContent.useEffect() - sets tab change handler
│     ├─ InteractiveChat - gets orchestrator, isInitialized
│     └─ CondensedChat - gets orchestrator, isInitialized
│
└─ ChatContext (Dashboard level, wraps DashboardContent)
   ├─ Provides:
   │  ├─ messages: Message[]
   │  ├─ currentTab: number (0-4)
   │  ├─ isExpanded: boolean
   │  ├─ draftInput: string
   │  ├─ chatSummary: string
   │  ├─ setCurrentTab: (tab) => void
   │  ├─ setDraftInput: (text) => void
   │  ├─ addMessage: (msg) => void
   │  ├─ clearMessages: () => void
   │  └─ requestTabChange: (tab, reason) => void
   │
   └─ Used by:
      ├─ DashboardContent - uses currentTab to control Tabs selectedIndex
      ├─ InteractiveChat - uses currentTab, setCurrentTab, draftInput, setDraftInput
      └─ CondensedChat - uses all of above plus chatSummary, messages, addMessage
```

## 3. State Duplication Matrix

```
STATE VARIABLE          LOCATION 1              LOCATION 2              SYNCED?
─────────────────────────────────────────────────────────────────────────────
messages                ChatContext             InteractiveChat         ✗ NO
                        (shared)                (LOCAL copy)            
                                                                        
isExpanded              ChatContext             CondensedChat           ✗ NO
                        (context state)         (isExpandedLocal)       
                                                                        
currentTab              ChatContext             (not duplicated)        ✓ YES
                        (used by Tabs)          
                                                                        
draftInput              ChatContext             (not duplicated)        ✓ YES
                        (shared)                
                                                                        
chatSummary             ChatContext             (not duplicated)        ✓ YES
                        (shared)                

isLoading               InteractiveChat         CondensedChat           ✗ NO
                        (local)                 (local)                 

streamingContent        InteractiveChat         CondensedChat           ✗ NO
                        (local)                 (local)                 

contextualSuggestions   InteractiveChat         CondensedChat           ✗ NO
                        (local)                 (local)                 
```

## 4. Message Flow Diagrams

### A. User Clicks Bio Tab (Tab 1)

```
┌─ USER ACTION: Click "Bio" tab in TabList
│
├─ Carbon Tabs onChange event fires
│
├─ DashboardContent: onChange({ selectedIndex: 1 })
│  │
│  └─→ setCurrentTab(1) from ChatContext
│      │
│      ├─ INSIDE setCurrentTab callback:
│      │  ├─ Read previousTabRef.current (currently 0)
│      │  ├─ Check: previousTab === 0 && newTab !== 0? YES ✓
│      │  ├─ Check: messages.length > 1? YES ✓
│      │  ├─ GENERATE SUMMARY
│      │  │  └─ Call generateChatSummary()
│      │  │     └─ Read last 3 user messages
│      │  │     └─ Generate 2-3 word summary
│      │  │     └─ setChatSummary(summary)
│      │  │
│      │  ├─ Update previousTabRef.current = 1
│      │  └─ Call setCurrentTabInternal(1)
│      │
│      ├─ STATE UPDATED
│      │  ├─ currentTab: 0 → 1
│      │  └─ chatSummary: "" → "Resume help" (example)
│      │
│      └─ RERENDER
│         ├─ DashboardContent rerenders
│         ├─ Tabs selectedIndex: 0 → 1
│         ├─ Tab 1 panel shows: BioDashboard
│         └─ CondensedChat appears below tabs
│
├─ RESULT: Bio tab is now active ✓
│
└─ PROBLEM SCENARIOS:
   ├─ If draftInput is changing while tab click happens:
   │  └─ setCurrentTab callback might be recreated mid-execution
   │  └─ Could cause state update to not complete
   │
   ├─ If generateChatSummary causes re-render:
   │  └─ Could interrupt the tab state update
   │
   └─ If previousTabRef is not properly maintained:
      └─ The condition checks might fail on second click
```

### B. User Clicks Quick Action with Navigation

```
┌─ USER ACTION: Click suggestion badge "Add Bio Data" (navigateTo: 1)
│
├─ InteractiveChat: handleQuickAction(action)
│  │
│  ├─ Check: action.navigateTo !== undefined? YES ✓
│  │
│  └─→ setCurrentTab(action.navigateTo) [from ChatContext]
│      │
│      ├─ [SAME FLOW AS "User Clicks Tab" above]
│      │
│      └─ RESULT: Bio tab activates ✓
│
└─ ALSO used by CondensedChat: handleQuickAction(action)
   └─ Same logic, same setCurrentTab call
```

### C. Agent Tool Triggers Tab Navigation

```
┌─ AGENT ACTION: Tool use "navigate_to_tab"
│
├─ orchestrator.processRequestStreaming()
│  │
│  └─→ handleToolUse({toolName: "navigate_to_tab", ...})
│      │
│      └─→ BrowserOrchestrator.navigateToTab(4, "View your new research")
│          │
│          ├─ Call this.onTabChangeRequest callback
│          │
│          └─→ Agent-service tabChangeCallback
│              │
│              └─→ (callback passed from DashboardContent.useEffect)
│                  │
│                  └─→ ChatContext.requestTabChange(4, reason)
│                      │
│                      └─→ setCurrentTab(4)
│                          │
│                          ├─ [SAME FLOW AS "User Clicks Tab" above]
│                          │
│                          └─ RESULT: Research tab activates ✓
```

## 5. Callback Dependency Chain

```
ChatContext.setCurrentTab
├─ Dependencies: [draftInput, messages, generateChatSummary]
│  │
│  ├─ draftInput: PROBLEMATIC
│  │  └─ Changes on every keystroke
│  │  └─ Causes callback to be recreated
│  │  └─ Only used in console.log (debug info)
│  │
│  ├─ messages: NECESSARY
│  │  └─ Used in condition: messages.length > 1
│  │  └─ Needed to determine if summary generation
│  │
│  └─ generateChatSummary: NECESSARY
│     └─ Depends on messages
│     └─ Called inside callback
│
└─ EFFECT: setCurrentTab recreated 1000s of times as user types!


InteractiveChat.handleSend
├─ Dependencies: [currentTab, draftInput, isLoading, isInitialized, 
│                 orchestrator, setDraftInput]
│  │
│  └─ All legitimate, but many cause recreation
│
└─ EFFECT: handleSend recreated frequently


InteractiveChat.handleQuickAction
├─ Dependencies: [setCurrentTab, setDraftInput, handleSend]
│  │
│  └─ Depends on handleSend, which has many deps
│
└─ EFFECT: Cascading callback recreations


CondensedChat.handleQuickAction
├─ Dependencies: [setCurrentTab, setDraftInput, handleSend]
│  │
│  └─ SEPARATE implementation from InteractiveChat
│  └─ Duplication of logic
│
└─ EFFECT: Two different handleQuickAction functions
```

## 6. The Bio Tab Bug - Execution Timeline

```
TIME │ INTERACTIVE TAB (0)      │ STATE & REFS                    │ BIO TAB
─────┼──────────────────────────┼─────────────────────────────────┼──────────────
T0   │ User typing in input     │ draftInput: "H"                 │
     │ "How do I add bio?"      │ messages.length: 2              │
     │                          │ previousTabRef: 0               │
     │                          │ currentTab: 0                   │
─────┼──────────────────────────┼─────────────────────────────────┼──────────────
T1   │ draftInput change event  │ draftInput: "Ho"                │
     │ ↓                        │ ← setCurrentTab callback        │
     │ setCurrentTab recreated  │ is RECREATED                    │
     │                          │                                 │
─────┼──────────────────────────┼─────────────────────────────────┼──────────────
T2   │ draftInput change event  │ draftInput: "How"               │
     │ ↓                        │ ← setCurrentTab callback        │
     │ setCurrentTab recreated  │ is RECREATED (again)            │
     │                          │                                 │
─────┼──────────────────────────┼─────────────────────────────────┼──────────────
T3   │ User clicks "Bio" tab    │ setCurrentTab(1) called         │ [ACTION]
     │ ↓                        │                                 │ ↓
     │ onChange event fired     │ Reads previousTabRef: 0         │ ← Check old ref
     │                          │ Evaluates condition: YES        │
     │                          │ generateChatSummary() called    │
     │                          │ setChatSummary(summary)         │
     │                          │ previousTabRef = 1              │
     │                          │ setCurrentTabInternal(1)        │
     │                          │                                 │
─────┼──────────────────────────┼─────────────────────────────────┼──────────────
T4   │ draftInput change event  │ draftInput: "How "              │
     │ ↓                        │ ← setCurrentTab callback        │
     │ WAIT! Callback recreated │ is RECREATED (again!)           │
     │ AGAIN while onClick was  │ ← MIGHT INTERRUPT STATE UPDATE  │
     │ processing!              │                                 │
     │                          │                                 │
─────┼──────────────────────────┼─────────────────────────────────┼──────────────
T5   │ [Rerender happens?]      │ currentTab: 0 or 1?             │ [Tab shows?]
     │                          │ ← UNCLEAR STATE                 │ [Maybe not]
     │                          │                                 │
─────┴──────────────────────────┴─────────────────────────────────┴──────────────

PROBLEM: Between T3 and T5, there's a race condition where draftInput changes
can interfere with the setCurrentTab callback execution and state updates.
```

## 7. Redux Migration - Before vs After

### BEFORE (Current - Context)

```
App
├─ AgentProvider (context)
│  └─ AgentContext: { orchestrator, apiKey, isInitialized, error, setTabChangeHandler }
│
└─ Dashboard
   └─ ChatProvider (context)
      └─ ChatContext: { 
            messages, currentTab, draftInput, 
            chatSummary, isExpanded,
            setCurrentTab, setDraftInput, addMessage, ...
         }
      └─ DashboardContent
         ├─ InteractiveChat (has own messages state)
         └─ CondensedChat (has own isExpanded state)
```

### AFTER (Redux)

```
App
├─ ReduxProvider (store)
│  └─ Store: {
│       app: { theme, settingsOpen },
│       agent: { orchestrator, apiKey, isInitialized, error },
│       chat: { 
│         messages, currentTab, previousTab, draftInput,
│         chatSummary, isExpanded,
│         isLoading, streamingContent
│       },
│       research: { researchEntries, selectedEntry, viewModalOpen }
│     }
│
└─ Dashboard
   ├─ DashboardContent
   │  ├─ useSelector(state => state.chat.currentTab) [multiple times]
   │  └─ useDispatch()
   │
   ├─ InteractiveChat
   │  ├─ useSelector(state => state.chat)
   │  ├─ useDispatch()
   │  └─ NO local messages state
   │
   └─ CondensedChat
      ├─ useSelector(state => state.chat)
      ├─ useDispatch()
      └─ NO local isExpanded state
```

## 8. State Update Flow Comparison

### BEFORE (Context - Synchronous)

```
Click Tab 1
  ↓
setCurrentTab(1) from context
  ↓
setChatSummary(summary) [state update 1]
  ↓
setCurrentTabInternal(1) [state update 2]
  ↓
Batch render
  ↓
Both states update together (if no interruptions)
```

### AFTER (Redux - Dispatch)

```
Click Tab 1
  ↓
dispatch(setCurrentTab(1)) [action]
  ↓
Redux reducer: 
  {
    ...state,
    chat: {
      ...state.chat,
      previousTab: state.chat.currentTab,
      currentTab: 1,
      chatSummary: generateSummary(...)
    }
  }
  ↓
Single state update
  ↓
Single re-render
  ↓
Much less prone to race conditions!
```

