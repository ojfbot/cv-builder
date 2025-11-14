# Badge Actions Quick Reference

## Quick Links

- **Main Docs**: [BADGE_ACTIONS_README.md](./BADGE_ACTIONS_README.md)
- **Full Guide**: [BADGE_ACTIONS_GUIDE.md](./BADGE_ACTIONS_GUIDE.md)
- **Flow Diagram**: [BADGE_ACTIONS_FLOW.md](./BADGE_ACTIONS_FLOW.md)
- **Agent Examples**: [AGENT_BADGE_ACTIONS_EXAMPLE.md](./AGENT_BADGE_ACTIONS_EXAMPLE.md)

## For Frontend Developers

### Import

```typescript
import {
  createBadgeAction,
  createChatAction,
  createNavigateAction,
  createFileUploadAction,
  createCopyTextAction,
  createDownloadAction,
  createExternalLinkAction,
} from '../models/badge-action'
import BadgeButton from '../components/BadgeButton'
```

### Create & Render

```typescript
// Create
const action = createBadgeAction(
  'Label',
  [createNavigateAction(3)],
  { icon: '📄', variant: 'blue' }
)

// Render
<BadgeButton badgeAction={action} onExecute={handleExecute} />
```

### Common Patterns

```typescript
// Navigate
createBadgeAction('View Bio', [createNavigateAction(1)], { icon: '👤' })

// Chat
createBadgeAction('Ask Question', [createChatAction('Help me...')], { icon: '💬' })

// Chat + Navigate
createBadgeAction('Generate Resume', [
  createChatAction('Generate resume'),
  createNavigateAction(3)
], { icon: '📄', variant: 'green' })

// File Upload
createBadgeAction('Upload', [
  createFileUploadAction('.pdf', false, 1)
], { icon: '📄' })

// Copy
createBadgeAction('Copy', [createCopyTextAction(text)], { icon: '📋' })
```

## For Agent Developers

### Basic Template

```markdown
Your content here...

<metadata>
{
  "suggestions": [
    {
      "label": "Action Label",
      "icon": "📄",
      "variant": "blue",
      "actions": [
        { "type": "navigate", "tabIndex": 3 }
      ]
    }
  ]
}
</metadata>
```

### Action Types

```json
// Navigate
{ "type": "navigate", "tabIndex": 3 }

// Chat
{ "type": "chat", "message": "Help me...", "expandChat": true }

// File Upload
{ "type": "file_upload", "accept": ".pdf", "multiple": false, "targetTab": 1 }

// Expand Chat
{ "type": "expand_chat" }

// Copy
{ "type": "copy_text", "text": "Text to copy" }

// Download
{ "type": "download", "url": "data:...", "filename": "file.txt" }

// External Link
{ "type": "external_link", "url": "https://...", "openInNew": true }
```

### Tab Indices

- `0` = Chat
- `1` = Bio Dashboard
- `2` = Jobs Dashboard
- `3` = Outputs Dashboard
- `4` = Research Dashboard

### Variants

`purple` (default), `blue`, `cyan`, `teal`, `green`, `gray`, `red`, `magenta`

### Icons

👤 Bio | 💼 Jobs | 📄 Resume | 🔬 Research | 🔍 Analyze | ✨ Generate | 📚 Learn | ✍️ Write

## Common Use Cases

### 1. Missing Data → Navigate

```json
{
  "label": "Add Your Bio",
  "icon": "👤",
  "variant": "purple",
  "actions": [
    { "type": "navigate", "tabIndex": 1 },
    { "type": "chat", "message": "Help me add my bio", "expandChat": true }
  ]
}
```

### 2. Generated Content → View

```json
{
  "label": "View Resume",
  "icon": "📄",
  "variant": "blue",
  "actions": [
    { "type": "navigate", "tabIndex": 3 }
  ]
}
```

### 3. Analysis → Next Steps

```json
{
  "label": "Create Learning Path",
  "icon": "📚",
  "variant": "cyan",
  "actions": [
    { "type": "chat", "message": "Create a learning path for the skills I'm missing" }
  ]
}
```

### 4. Import Data → Upload

```json
{
  "label": "Upload Resume",
  "icon": "📄",
  "variant": "blue",
  "actions": [
    { "type": "file_upload", "accept": ".pdf,.docx", "targetTab": 1 }
  ]
}
```

## Validation

All actions are validated with Zod schemas:

```typescript
import { BadgeActionSchema } from '../models/badge-action'

// Validate
const result = BadgeActionSchema.safeParse(data)
if (!result.success) {
  console.error('Invalid badge action:', result.error)
}
```

## Error Handling

- Invalid JSON → Logged, empty suggestions returned
- Invalid schema → Logged, action skipped
- Action fails → Logged, next action continues
- File upload unimplemented → Warning logged

## Testing

```bash
# Type check
npm run type-check

# Build
npm run build

# Dev server
npm run dev
```

## Debugging

Enable console logs:
- `[MarkdownMessage]` - Badge rendering
- `[CondensedChat]` - Action clicks
- `[ActionDispatcher]` - Action execution

## Examples in Code

See `ExampleBadgeActions` in `badge-action.ts`:

```typescript
import { ExampleBadgeActions } from '../models/badge-action'

ExampleBadgeActions.addExperience
ExampleBadgeActions.uploadResume
ExampleBadgeActions.generateResume
ExampleBadgeActions.analyzeJob
```

## Cheat Sheet

| Want to... | Use action type | Example |
|------------|-----------------|---------|
| Navigate to tab | `navigate` | `{ type: "navigate", tabIndex: 3 }` |
| Send message | `chat` | `{ type: "chat", message: "Help..." }` |
| Upload file | `file_upload` | `{ type: "file_upload", accept: ".pdf" }` |
| Copy text | `copy_text` | `{ type: "copy_text", text: "..." }` |
| Download | `download` | `{ type: "download", url: "...", filename: "..." }` |
| Open link | `external_link` | `{ type: "external_link", url: "..." }` |
| Expand chat | `expand_chat` | `{ type: "expand_chat" }` |

## Best Practices

✅ Use 2-4 suggestions per response
✅ Clear, action-oriented labels
✅ Relevant icons and colors
✅ Chain actions logically
✅ Validate JSON structure
✅ Handle errors gracefully

❌ Too many suggestions (>4)
❌ Vague labels ("Click here")
❌ Missing icons
❌ Illogical action chains
❌ Invalid JSON
❌ Unhandled errors

## File Locations

```
packages/browser-app/src/
├── models/badge-action.ts       ← Types, schemas, helpers
├── components/BadgeButton.tsx   ← UI component
└── utils/action-dispatcher.ts   ← Execution logic
```

## Need Help?

1. Check [BADGE_ACTIONS_GUIDE.md](./BADGE_ACTIONS_GUIDE.md)
2. Review examples in [AGENT_BADGE_ACTIONS_EXAMPLE.md](./AGENT_BADGE_ACTIONS_EXAMPLE.md)
3. See flow diagram in [BADGE_ACTIONS_FLOW.md](./BADGE_ACTIONS_FLOW.md)
4. Look at code examples in `badge-action.ts`
