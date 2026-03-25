# Badge Actions Flow Diagram

This document illustrates the complete flow of the badge actions system from agent response to user interaction.

## Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. AGENT GENERATES RESPONSE                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Agent Response (Markdown + JSON metadata)                       │
│                                                                  │
│ I've analyzed your profile!                                     │
│                                                                  │
│ ## Next Steps                                                   │
│ - **View Resume**: Check your generated resume                  │
│                                                                  │
│ <metadata>                                                      │
│ {                                                               │
│   "suggestions": [                                              │
│     {                                                           │
│       "label": "View Resume",                                   │
│       "icon": "📄",                                             │
│       "variant": "blue",                                        │
│       "actions": [                                              │
│         { "type": "navigate", "tabIndex": 3 }                   │
│       ]                                                         │
│     }                                                           │
│   ]                                                             │
│ }                                                               │
│ </metadata>                                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. PARSING & VALIDATION                                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ parseBadgeActionMetadata()                                      │
│   ├─ Extract <metadata> JSON                                    │
│   └─ Parse JSON string                                          │
│                                                                  │
│ BadgeActionSchema.parse()                                       │
│   ├─ Validate label (string)                                    │
│   ├─ Validate icon (optional string)                            │
│   ├─ Validate variant (enum)                                    │
│   └─ Validate actions array                                     │
│       └─ ActionSchema.parse() for each action                   │
│           ├─ Check discriminated union type                     │
│           └─ Validate action-specific fields                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. COMPONENT RENDERING                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ MarkdownMessage Component                                       │
│   ├─ Receives: suggestions (BadgeAction[])                      │
│   ├─ Normalizes legacy QuickActions if needed                   │
│   └─ Renders ReactMarkdown with custom components               │
│                                                                  │
│     ┌───────────────────────────────────────┐                   │
│     │ List Item Renderer                    │                   │
│     │   ├─ Parse: "**Label**: Description"  │                   │
│     │   ├─ Find matching BadgeAction        │                   │
│     │   └─ Render <BadgeButton />           │                   │
│     └───────────────────────────────────────┘                   │
│                                                                  │
│     ┌───────────────────────────────────────┐                   │
│     │ Link Renderer                         │                   │
│     │   ├─ Detect: action: protocol         │                   │
│     │   ├─ Extract label and query          │                   │
│     │   └─ Render <BadgeButton />           │                   │
│     └───────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ BadgeButton Component                                           │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ <Tag type="blue" onClick={...}>                         │   │
│   │   <span className="badge-icon">📄</span>                │   │
│   │   <span className="badge-label">View Resume</span>      │   │
│   │ </Tag>                                                  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│ Props:                                                           │
│   • badgeAction: { label, icon, variant, actions, tooltip }     │
│   • onExecute: (actions: Action[]) => void                      │
│   • size: 'sm' | 'md'                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. USER INTERACTION                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ User clicks badge button                                        │
│   ↓                                                              │
│ onClick handler triggered                                       │
│   ↓                                                              │
│ onExecute(badgeAction.actions) called                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. ACTION EXECUTION                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ CondensedChat.handleActionExecute()                             │
│   ↓                                                              │
│ executeActions(actions, context)                                │
│   ├─ context.dispatch (Redux)                                   │
│   ├─ context.onSendMessage (chat handler)                       │
│   └─ context.onFileUpload (file handler)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Action Dispatcher                                               │
│                                                                  │
│ for each action in actions:                                     │
│   ↓                                                              │
│   executeAction(action, context)                                │
│   ↓                                                              │
│   switch (action.type):                                         │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ case 'navigate':                                        │   │
│   │   dispatch(setCurrentTab(action.tabIndex))             │   │
│   │                                                         │   │
│   │ case 'chat':                                            │   │
│   │   if (action.expandChat):                              │   │
│   │     dispatch(setIsExpanded(true))                      │   │
│   │   await context.onSendMessage(action.message)          │   │
│   │                                                         │   │
│   │ case 'file_upload':                                     │   │
│   │   await context.onFileUpload(accept, multiple)         │   │
│   │   if (action.targetTab):                               │   │
│   │     dispatch(setCurrentTab(action.targetTab))          │   │
│   │                                                         │   │
│   │ case 'copy_text':                                       │   │
│   │   await navigator.clipboard.writeText(action.text)     │   │
│   │                                                         │   │
│   │ case 'download':                                        │   │
│   │   trigger download with URL and filename               │   │
│   │                                                         │   │
│   │ case 'external_link':                                   │   │
│   │   window.open(action.url, target)                      │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   Small delay between actions (50ms) for better UX              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. UI UPDATES (Redux State Changes)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Redux Store Updates                                             │
│   ├─ navigationSlice: currentTab = 3                            │
│   ├─ chatSlice: isExpanded, draftInput, messages                │
│   └─ Other slices as needed                                     │
│                                                                  │
│ React Components Re-render                                      │
│   ├─ Dashboard: Shows Outputs tab (tab 3)                       │
│   ├─ CondensedChat: Updates chat state                          │
│   └─ Other components respond to state changes                  │
└─────────────────────────────────────────────────────────────────┘
```

## Example Scenarios

### Scenario 1: Simple Navigation

```
User clicks: [📄 View Resume]
  ↓
Actions: [{ type: "navigate", tabIndex: 3 }]
  ↓
Dispatcher: dispatch(setCurrentTab(3))
  ↓
UI: Switches to Outputs tab
```

### Scenario 2: Chat + Navigate

```
User clicks: [✨ Tailor Resume]
  ↓
Actions: [
  { type: "navigate", tabIndex: 2 },
  { type: "chat", message: "Help me tailor...", expandChat: true }
]
  ↓
Dispatcher:
  1. dispatch(setCurrentTab(2))        → Navigate to Jobs
  2. delay 50ms
  3. dispatch(setIsExpanded(true))     → Expand chat
  4. await onSendMessage("Help me...")  → Send message
  ↓
UI:
  1. Shows Jobs tab
  2. Chat expands
  3. Message appears in chat
  4. Agent responds
```

### Scenario 3: File Upload

```
User clicks: [📄 Upload Resume]
  ↓
Actions: [
  {
    type: "file_upload",
    accept: ".pdf,.docx",
    multiple: false,
    targetTab: 1
  }
]
  ↓
Dispatcher:
  1. await onFileUpload(".pdf,.docx", false)  → Trigger file dialog
  2. User selects file
  3. File processes/uploads
  4. dispatch(setCurrentTab(1))               → Navigate to Bio
  ↓
UI:
  1. File picker opens
  2. File uploads
  3. Shows Bio tab with new data
```

## Data Structures

### BadgeAction Type

```typescript
type BadgeAction = {
  label: string                    // "View Resume"
  icon?: string                    // "📄"
  variant?: 'purple' | 'blue' | ...// 'blue'
  actions: Action[]                // [{ type: "navigate", tabIndex: 3 }]
  tooltip?: string                 // "Navigate to tab 4" (auto-generated)
  disabled?: boolean               // false
}
```

### Action Types (Discriminated Union)

```typescript
type Action =
  | { type: 'chat', message: string, expandChat?: boolean }
  | { type: 'navigate', tabIndex: number }
  | { type: 'file_upload', accept?: string, multiple?: boolean, targetTab?: number }
  | { type: 'expand_chat' }
  | { type: 'copy_text', text: string }
  | { type: 'download', url: string, filename: string }
  | { type: 'external_link', url: string, openInNew?: boolean }
```

## Error Handling

```
┌─────────────────────────────────────────────────────────────────┐
│ Error Handling at Each Stage                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. Parsing:                                                      │
│    └─ Invalid JSON → Log error, return empty suggestions        │
│                                                                  │
│ 2. Validation:                                                   │
│    └─ Zod parse error → Log error, skip invalid action          │
│                                                                  │
│ 3. Execution:                                                    │
│    ├─ Action fails → Log error, continue with next action       │
│    ├─ Navigate fails → Log error, skip navigation               │
│    ├─ Chat fails → Show error message in chat                   │
│    └─ File upload fails → Show error notification               │
│                                                                  │
│ 4. General:                                                      │
│    └─ Try/catch around each action, don't break the chain       │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Considerations

- **Validation**: Zod schemas run at runtime (minimal overhead)
- **Action delays**: 50ms between actions for better UX
- **Async operations**: File upload and message sending are awaited
- **State updates**: Redux batches updates automatically
- **Rendering**: React memo/useMemo can optimize if needed

## Debugging Tips

1. **Console Logs**: Action dispatcher logs all executions
2. **Redux DevTools**: Monitor state changes in real-time
3. **React DevTools**: Inspect component props and state
4. **Network Tab**: Monitor file uploads and API calls
5. **Breakpoints**: Set breakpoints in executeAction() switch case

## Testing Checklist

- [ ] Badge buttons render with correct icons and colors
- [ ] Tooltips display action descriptions
- [ ] Single actions execute correctly
- [ ] Multi-action chains execute in order
- [ ] Navigation updates currentTab in Redux
- [ ] Chat actions send messages
- [ ] File upload triggers dialog (when implemented)
- [ ] Errors are handled gracefully
- [ ] TypeScript compilation passes
- [ ] Zod validation catches invalid actions
