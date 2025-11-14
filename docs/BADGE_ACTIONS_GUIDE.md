# Badge Actions System Guide

## Overview

The Badge Actions system provides a robust, type-safe pattern for creating inline action buttons in agent responses. These badge buttons can dispatch multiple actions (chat messages, navigation, file uploads, etc.) with a single click.

## Architecture

### Components

1. **BadgeAction Model** (`src/models/badge-action.ts`)
   - Zod schemas for runtime validation
   - Type-safe action definitions
   - Helper functions for creating actions

2. **BadgeButton Component** (`src/components/BadgeButton.tsx`)
   - Renders inline badge/tag buttons
   - Executes actions on click
   - Supports multiple visual variants

3. **Action Dispatcher** (`src/utils/action-dispatcher.ts`)
   - Executes actions in sequence
   - Integrates with Redux store
   - Handles navigation, chat, file upload, etc.

4. **MarkdownMessage Component** (`src/components/MarkdownMessage.tsx`)
   - Renders badge buttons from markdown
   - Supports both inline and list item badges
   - Auto-infers actions from patterns

## For Agent Developers

### How to Include Badge Actions in Agent Responses

Agents can suggest actions to users in two ways:

#### Method 1: Inline Action Links (Simple)

Use markdown links with `action:` protocol:

```markdown
You can [📄 Generate Resume](action:Generate a resume based on my bio) or [👤 Add Experience](action:Help me add my latest work experience).
```

This creates inline badge buttons that send chat messages when clicked.

#### Method 2: Structured Metadata (Advanced)

Include JSON metadata in a `<metadata>` block at the end of your response:

```markdown
Your response content here...

## Next Steps

- **Generate Resume**: Create a tailored resume
- **Analyze Job Fit**: Calculate match score

<metadata>
{
  "suggestions": [
    {
      "label": "Generate Resume",
      "icon": "📄",
      "variant": "green",
      "actions": [
        {
          "type": "chat",
          "message": "Generate a resume based on my bio"
        },
        {
          "type": "navigate",
          "tabIndex": 3
        }
      ]
    },
    {
      "label": "Analyze Job Fit",
      "icon": "🔍",
      "variant": "cyan",
      "actions": [
        {
          "type": "navigate",
          "tabIndex": 2
        },
        {
          "type": "chat",
          "message": "Analyze the job requirements and calculate my match score",
          "expandChat": true
        }
      ]
    }
  ]
}
</metadata>
```

### Action Types

#### 1. Chat Action
Send a message to the agent.

```json
{
  "type": "chat",
  "message": "Generate a resume based on my bio",
  "expandChat": true  // Optional: expand chat before sending
}
```

#### 2. Navigate Action
Navigate to a specific tab.

```json
{
  "type": "navigate",
  "tabIndex": 3  // 0-based index (0=Bio, 1=Jobs, 2=Outputs, 3=Research, 4=Toolbox)
}
```

Tab indices:
- `0`: Bio Dashboard
- `1`: Jobs Dashboard
- `2`: Outputs Dashboard
- `3`: Research Dashboard
- `4`: Toolbox Dashboard

#### 3. File Upload Action
Trigger file upload dialog.

```json
{
  "type": "file_upload",
  "accept": ".pdf,.docx,.txt",  // Optional: file type filter
  "multiple": false,            // Optional: allow multiple files
  "targetTab": 1                // Optional: navigate to tab after upload
}
```

#### 4. Expand Chat Action
Expand the chat interface.

```json
{
  "type": "expand_chat"
}
```

#### 5. Copy Text Action
Copy text to clipboard.

```json
{
  "type": "copy_text",
  "text": "The text to copy"
}
```

#### 6. Download Action
Download a file.

```json
{
  "type": "download",
  "url": "data:text/plain;base64,SGVsbG8gV29ybGQ=",
  "filename": "resume.txt"
}
```

#### 7. External Link Action
Open an external URL.

```json
{
  "type": "external_link",
  "url": "https://example.com",
  "openInNew": true  // Optional: open in new tab (default: true)
}
```

### Visual Variants

Badge buttons support different color variants:

- `purple` (default) - General actions
- `blue` - Information/viewing
- `cyan` - Analysis/search
- `teal` - Navigation
- `green` - Creation/generation
- `gray` - Neutral/secondary
- `red` - Warning/deletion
- `magenta` - Special/featured

### Multi-Action Badges

A single badge can trigger multiple actions in sequence:

```json
{
  "label": "Generate & View Resume",
  "icon": "📄",
  "variant": "green",
  "actions": [
    {
      "type": "chat",
      "message": "Generate a resume based on my bio"
    },
    {
      "type": "navigate",
      "tabIndex": 3
    }
  ]
}
```

This badge will:
1. Send a chat message to generate a resume
2. Navigate to the Outputs tab to view it

### Best Practices

1. **Use Clear Labels**: Make badge labels action-oriented (e.g., "Add Experience" not "Experience")

2. **Add Emojis**: Include relevant emojis to make badges visually distinct

3. **Provide Context**: Use tooltips (auto-generated) to explain what the action does

4. **Limit Suggestions**: Don't overwhelm users - suggest 2-4 most relevant actions

5. **Chain Actions Logically**: When using multi-action badges, chain actions that make sense together

6. **Match Patterns**: Use established patterns for common actions:
   - Bio tab: 👤
   - Jobs tab: 💼
   - Outputs tab: 📄
   - Research tab: 🔬
   - Generate: ✨
   - Analyze: 🔍
   - Learn: 📚

### Example Agent Response

```markdown
I've analyzed your profile and found some great opportunities to enhance your resume.

## Recommendations

- **Add Cloud Certifications**: Your AWS experience would benefit from certification badges
- **Quantify Achievements**: Add metrics to your accomplishments (e.g., "Reduced costs by 30%")
- **Update Skills Section**: Include newer technologies like Kubernetes and Terraform

## Next Steps

Try one of these actions:

- **Update Bio**: Add your latest experience and skills
- **Generate Resume**: Create a tailored resume with your current bio
- **Analyze Job Fit**: See how well you match target job listings

<metadata>
{
  "suggestions": [
    {
      "label": "Update Bio",
      "icon": "👤",
      "variant": "purple",
      "actions": [
        {
          "type": "navigate",
          "tabIndex": 1
        },
        {
          "type": "chat",
          "message": "Help me add my AWS certification and cloud experience to my bio",
          "expandChat": true
        }
      ]
    },
    {
      "label": "Generate Resume",
      "icon": "📄",
      "variant": "green",
      "actions": [
        {
          "type": "chat",
          "message": "Generate a resume highlighting my cloud experience"
        },
        {
          "type": "navigate",
          "tabIndex": 3
        }
      ]
    },
    {
      "label": "Analyze Job Fit",
      "icon": "🔍",
      "variant": "cyan",
      "actions": [
        {
          "type": "navigate",
          "tabIndex": 2
        },
        {
          "type": "chat",
          "message": "Analyze my fit for cloud engineer positions",
          "expandChat": true
        }
      ]
    }
  ]
}
</metadata>
```

## For Frontend Developers

### Using Badge Actions Programmatically

```typescript
import { createBadgeAction, createChatAction, createNavigateAction } from '../models/badge-action'
import BadgeButton from '../components/BadgeButton'
import { executeActions } from '../utils/action-dispatcher'

// Create a badge action
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

// Render the badge button
<BadgeButton
  badgeAction={resumeAction}
  onExecute={handleActionExecute}
  size="md"
/>

// Execute actions
await executeActions(resumeAction.actions, {
  dispatch,
  onSendMessage: async (message) => {
    await orchestrator.processRequest(message)
  },
  onFileUpload: async (accept, multiple) => {
    // Handle file upload
  },
})
```

### Extending the System

To add a new action type:

1. **Define the schema** in `badge-action.ts`:

```typescript
export const MyCustomActionSchema = z.object({
  type: z.literal('my_custom_action'),
  customParam: z.string(),
})
```

2. **Add to the union**:

```typescript
export const ActionSchema = z.discriminatedUnion('type', [
  // ... existing actions
  MyCustomActionSchema,
])
```

3. **Implement the handler** in `action-dispatcher.ts`:

```typescript
case 'my_custom_action': {
  // Handle your custom action
  console.log('Custom action:', action.customParam)
  break
}
```

4. **Create a helper function**:

```typescript
export const createMyCustomAction = (customParam: string): Action => ({
  type: 'my_custom_action',
  customParam,
})
```

## Testing

Test badge actions by:

1. **Type Safety**: TypeScript will catch invalid action definitions at compile time
2. **Runtime Validation**: Zod schemas validate action data at runtime
3. **Console Logging**: Action dispatcher logs all executions to console
4. **Manual Testing**: Click badge buttons in the UI to verify behavior

## Migration from Legacy System

The system supports legacy `QuickAction` format for backward compatibility:

```typescript
// Legacy format (still works)
interface QuickAction {
  label: string
  query: string
  icon: string
  navigateTo?: number
}

// Automatically converted to BadgeAction
const legacy: QuickAction = {
  label: 'Add Bio',
  query: 'Help me add my bio',
  icon: '👤',
  navigateTo: 1
}

// Use convertLegacyAction() to convert
const badgeAction = convertLegacyAction(legacy)
```

Components like `MarkdownMessage` automatically handle both formats.
