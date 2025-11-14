# Badge Actions System

## Overview

The Badge Actions system provides a robust, type-safe pattern for creating interactive badge buttons in the CV Builder UI. Badge buttons can dispatch multiple actions (chat messages, tab navigation, file uploads, etc.) with a single click, creating a seamless user experience.

## Key Features

- **Type-Safe**: Zod schemas ensure runtime validation and TypeScript type safety
- **Multi-Action**: Single badge can execute multiple actions in sequence
- **Structured Data**: Works as both UI components and structured data for agent context
- **Extensible**: Easy to add new action types
- **Backward Compatible**: Supports legacy `QuickAction` format during migration
- **Agent-Friendly**: Agents can include badge actions in their responses via JSON metadata

## Architecture

### Core Components

```
packages/browser-app/src/
├── models/
│   └── badge-action.ts          # Zod schemas, types, helper functions
├── components/
│   ├── BadgeButton.tsx          # Badge button React component
│   ├── BadgeButton.css          # Styling
│   └── MarkdownMessage.tsx      # Markdown renderer with badge support
└── utils/
    └── action-dispatcher.ts     # Action execution logic
```

### Data Flow

```
Agent Response (JSON metadata)
    ↓
BadgeAction Model (Zod validation)
    ↓
BadgeButton Component (UI rendering)
    ↓
User Click
    ↓
Action Dispatcher (Redux integration)
    ↓
UI Updates (navigation, chat, etc.)
```

## Quick Start

### For Frontend Developers

Create and render a badge action:

```typescript
import { createBadgeAction, createChatAction, createNavigateAction } from '../models/badge-action'
import BadgeButton from '../components/BadgeButton'

// Create a multi-action badge
const resumeAction = createBadgeAction(
  'Generate Resume',
  [
    createChatAction('Generate a resume based on my bio'),
    createNavigateAction(3), // Navigate to Outputs tab
  ],
  {
    icon: '📄',
    variant: 'green',
  }
)

// Render it
<BadgeButton
  badgeAction={resumeAction}
  onExecute={handleActionExecute}
  size="md"
/>
```

### For Agent Developers

Include badge actions in agent responses:

```markdown
I've generated your resume!

## Next Steps

- **View Resume**: Check out your generated resume in the Outputs tab
- **Tailor for Job**: Customize this resume for a specific position

<metadata>
{
  "suggestions": [
    {
      "label": "View Resume",
      "icon": "📄",
      "variant": "blue",
      "actions": [
        { "type": "navigate", "tabIndex": 3 }
      ]
    },
    {
      "label": "Tailor for Job",
      "icon": "✨",
      "variant": "green",
      "actions": [
        { "type": "navigate", "tabIndex": 2 },
        { "type": "chat", "message": "Help me tailor my resume", "expandChat": true }
      ]
    }
  ]
}
</metadata>
```

## Action Types

| Type | Description | Example Use Case |
|------|-------------|------------------|
| `chat` | Send a message to the agent | Follow-up questions, generate content |
| `navigate` | Navigate to a tab | Go to Bio, Jobs, or Outputs |
| `file_upload` | Trigger file upload dialog | Import resume, upload documents |
| `expand_chat` | Expand the chat interface | Before sending a message |
| `copy_text` | Copy text to clipboard | Copy resume text, job description |
| `download` | Download a file | Download generated resume |
| `external_link` | Open external URL | Open documentation, tutorials |

See [BADGE_ACTIONS_GUIDE.md](./BADGE_ACTIONS_GUIDE.md) for detailed action type documentation.

## Visual Design

### Variants (Colors)

- **purple** (default) - General actions
- **blue** - Information/viewing
- **cyan** - Analysis/search
- **teal** - Navigation
- **green** - Creation/generation
- **gray** - Neutral/secondary
- **red** - Warning/deletion
- **magenta** - Special/featured

### Icons

Use emojis for consistent, accessible icons:

- 👤 - Bio/Profile
- 💼 - Jobs
- 📄 - Resume/Output
- 🔬 - Research
- 🔍 - Search/Analyze
- ✨ - Generate/Create
- 📚 - Learn/Skills
- ✍️ - Write/Edit

## Usage Examples

### Example 1: Simple Navigation Badge

Navigate to Bio tab:

```typescript
const bioAction = createBadgeAction(
  'Add Your Bio',
  [createNavigateAction(1)],
  { icon: '👤', variant: 'purple' }
)
```

### Example 2: Chat + Navigate

Send a message and navigate:

```typescript
const analyzeAction = createBadgeAction(
  'Analyze Job Fit',
  [
    createNavigateAction(2), // Go to Jobs tab
    createChatAction('Analyze my fit for this position', true), // Send message
  ],
  { icon: '🔍', variant: 'cyan' }
)
```

### Example 3: File Upload

Upload resume file:

```typescript
const uploadAction = createBadgeAction(
  'Upload Resume',
  [createFileUploadAction('.pdf,.docx', false, 1)],
  { icon: '📄', variant: 'blue' }
)
```

### Example 4: Copy to Clipboard

Copy resume text:

```typescript
const copyAction = createBadgeAction(
  'Copy Resume',
  [createCopyTextAction(resumeText)],
  { icon: '📋', variant: 'gray' }
)
```

## Integration Points

### MarkdownMessage Component

Automatically renders badge buttons from:

1. **Inline action links**: `[📄 Generate Resume](action:Generate a resume)`
2. **List items**: `- **Label**: Description` (in "Next Steps" sections)
3. **Metadata block**: JSON suggestions from agent responses

### CondensedChat Component

Handles action execution via `handleActionExecute`:

```typescript
const handleActionExecute = useCallback(async (actions: Action[]) => {
  await executeActions(actions, {
    dispatch,
    onSendMessage: async (message: string) => {
      await handleSend(message)
    },
    onFileUpload: async (accept?: string, multiple?: boolean) => {
      // File upload logic
    },
  })
}, [dispatch, handleSend])
```

## Extending the System

### Adding a New Action Type

1. **Define schema** in `badge-action.ts`:

```typescript
export const MyActionSchema = z.object({
  type: z.literal('my_action'),
  myParam: z.string(),
})
```

2. **Add to union**:

```typescript
export const ActionSchema = z.discriminatedUnion('type', [
  // ... existing
  MyActionSchema,
])
```

3. **Implement handler** in `action-dispatcher.ts`:

```typescript
case 'my_action': {
  // Handle action
  break
}
```

4. **Create helper**:

```typescript
export const createMyAction = (myParam: string): Action => ({
  type: 'my_action',
  myParam,
})
```

## Migration Guide

### From Legacy QuickAction

The system supports backward compatibility:

```typescript
// Legacy format (still works)
const legacy: QuickAction = {
  label: 'Add Bio',
  query: 'Help me add my bio',
  icon: '👤',
  navigateTo: 1
}

// Convert to BadgeAction
const badge = convertLegacyAction(legacy)
```

### Migration Strategy

1. **Phase 1**: Keep both formats, test new system
2. **Phase 2**: Update agent prompts to use JSON metadata
3. **Phase 3**: Remove legacy XML metadata support

## Documentation

- **[BADGE_ACTIONS_GUIDE.md](./BADGE_ACTIONS_GUIDE.md)** - Comprehensive guide for developers and agents
- **[AGENT_BADGE_ACTIONS_EXAMPLE.md](./AGENT_BADGE_ACTIONS_EXAMPLE.md)** - Agent prompt examples and implementation

## Best Practices

### For Frontend Developers

1. Use helper functions (`createBadgeAction`, `createChatAction`, etc.)
2. Validate actions with Zod schemas
3. Handle errors gracefully in action dispatcher
4. Test action chains thoroughly
5. Use semantic icon and color choices

### For Agent Developers

1. Limit suggestions to 2-4 per response
2. Use clear, action-oriented labels
3. Chain actions logically (navigate → chat)
4. Include relevant emojis for visual clarity
5. Place metadata block at end of response
6. Validate JSON structure before returning

### For UX Design

1. Badge buttons should be visually distinct
2. Tooltips should explain what will happen
3. Group related actions together
4. Use consistent icon meanings
5. Provide visual feedback on click

## Testing

Run type checks:

```bash
npm run type-check
```

Test in browser:

1. Start dev server: `npm run dev`
2. Click badge buttons in chat interface
3. Verify actions execute correctly
4. Check console logs for debugging

## Future Enhancements

Potential additions to the system:

- [ ] Conditional actions (if/else logic)
- [ ] Action history and undo
- [ ] Batch action execution
- [ ] Custom animations on execution
- [ ] Action analytics/telemetry
- [ ] Keyboard shortcuts for common actions
- [ ] Action templates library
- [ ] A/B testing for action suggestions

## Support

For questions or issues:

1. Check the comprehensive guides in `/docs`
2. Review example implementations
3. Examine TypeScript types and JSDoc comments
4. Test with console logging enabled
5. Create an issue with reproduction steps

---

**Version**: 1.0.0
**Last Updated**: 2025-11-14
**Status**: Production Ready ✅
