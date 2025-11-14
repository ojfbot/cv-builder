# Navigation System

## Overview

The CV Builder uses a **keyed navigation system** instead of index-based tab navigation. This provides:

- **Robustness**: Tab order changes don't break navigation
- **Clarity**: Explicit tab keys (e.g., `"bio"`, `"jobs"`) instead of magic numbers
- **Type Safety**: TypeScript enum ensures only valid tabs can be referenced
- **Agent-Friendly**: Agents can easily reference tabs by name in their prompts

## Tab Keys

All tabs are identified by their `TabKey` enum value:

```typescript
enum TabKey {
  INTERACTIVE = 'interactive',
  BIO = 'bio',
  JOBS = 'jobs',
  OUTPUTS = 'outputs',
  RESEARCH = 'research',
  PIPELINES = 'pipelines',
  TOOLBOX = 'toolbox',
}
```

## Available Tabs

| Key | Label | Icon | Description |
|-----|-------|------|-------------|
| `interactive` | Interactive | 💬 | Chat with the AI assistant |
| `bio` | Bio | 👤 | Your professional profile and experience |
| `jobs` | Jobs | 💼 | Job listings and opportunities |
| `outputs` | Outputs | 📄 | Generated resumes and cover letters |
| `research` | Research | 🔬 | Industry research and insights |
| `pipelines` | Pipelines | 🔄 | Automated workflows and job application pipelines |
| `toolbox` | Toolbox | 🧰 | Utilities and tools for career development |

## For Frontend Developers

### Navigate to a Tab

```typescript
import { navigateToTab } from '../store/slices/navigationSlice'
import { TabKey } from '../models/navigation'

// Navigate to Bio tab
dispatch(navigateToTab(TabKey.BIO))

// Navigate to Jobs tab
dispatch(navigateToTab(TabKey.JOBS))
```

### Get Current Tab

```typescript
const currentTab = useAppSelector(state => state.navigation.currentTab)
// Returns: TabKey (e.g., TabKey.BIO)

const currentTabIndex = useAppSelector(state => state.navigation.currentTabIndex)
// Returns: number (for backward compatibility)
```

### Check Which Tab is Active

```typescript
if (currentTab === TabKey.INTERACTIVE) {
  // Show expanded chat
}

if (currentTab === TabKey.BIO) {
  // Load bio data
}
```

### Get Tab Metadata

```typescript
import { getTabByKey, getTabLabel, getTabIcon } from '../models/navigation'

const tab = getTabByKey(TabKey.BIO)
// Returns: { key: 'bio', label: 'Bio', icon: '👤', description: '...', index: 1 }

const label = getTabLabel(TabKey.JOBS)
// Returns: 'Jobs'

const icon = getTabIcon(TabKey.OUTPUTS)
// Returns: '📄'
```

## For Agent Developers

### Using Tab Keys in Badge Actions

When creating navigation actions in agent responses, use tab keys:

```json
{
  "type": "navigate",
  "tab": "bio"
}
```

**Available tab values:**
- `"interactive"` - Chat tab
- `"bio"` - Bio tab
- `"jobs"` - Jobs tab
- `"outputs"` - Outputs tab
- `"research"` - Research tab
- `"pipelines"` - Pipelines tab
- `"toolbox"` - Toolbox tab

### Example Agent Response

```markdown
I can help you with that! Let's go to the Bio tab to update your profile.

<metadata>
{
  "suggestions": [
    {
      "label": "Go to Bio",
      "icon": "👤",
      "variant": "purple",
      "actions": [
        {
          "type": "navigate",
          "tab": "bio"
        },
        {
          "type": "chat",
          "message": "Help me update my professional experience",
          "expandChat": true
        }
      ]
    }
  ]
}
</metadata>
```

### Tab Context in Messages

The system automatically includes the current tab in the context:

```
[SYSTEM: User is currently on the "Bio" tab (bio)]

User's actual message here...
```

This helps agents provide context-aware responses.

## Navigation API

### Core Functions

```typescript
// Get tab by key
getTabByKey(TabKey.BIO): TabMetadata

// Get tab by index (for backward compatibility)
getTabByIndex(index: number): TabMetadata | undefined

// Convert between key and index
getIndexFromKey(TabKey.BIO): number
getKeyFromIndex(1): TabKey | undefined

// Validate tab key
isValidTabKey('bio'): boolean

// Get all tabs in order
getAllTabs(): TabMetadata[]

// Parse flexible tab references
parseTabReference('bio'): TabKey | undefined
parseTabReference('Bio'): TabKey | undefined  // Case-insensitive
parseTabReference(1): TabKey | undefined      // Index-based
```

### Redux Actions

```typescript
// Preferred: Navigate using tab key
navigateToTab(tab: TabKey)

// Legacy: Navigate using index
setCurrentTab(index: number)

// Request navigation with reason (supports both)
requestTabChange({ tab: TabKey | number, reason: string })
```

## Migration from Index-Based Navigation

### Old Code (Index-Based)

```typescript
// ❌ Old way - fragile, magic numbers
dispatch(setCurrentTab(1))  // What's tab 1?
if (currentTab === 2) {     // What's tab 2?
  // Do something
}
```

### New Code (Key-Based)

```typescript
// ✅ New way - explicit, type-safe
dispatch(navigateToTab(TabKey.BIO))
if (currentTab === TabKey.JOBS) {
  // Do something
}
```

### Backward Compatibility

The system supports both approaches during migration:

```typescript
// These both work:
dispatch(navigateToTab(TabKey.BIO))    // ✅ Preferred
dispatch(setCurrentTab(1))             // ✅ Still works

// State includes both representations:
state.navigation.currentTab           // TabKey.BIO
state.navigation.currentTabIndex      // 1
```

## Tab Registry

The `TAB_REGISTRY` is the single source of truth for all tab information:

```typescript
export const TAB_REGISTRY: Record<TabKey, TabMetadata> = {
  [TabKey.BIO]: {
    key: TabKey.BIO,
    label: 'Bio',
    icon: '👤',
    description: 'Your professional profile and experience',
    index: 1,
  },
  // ... other tabs
}
```

### Tab Order

Tabs are rendered in the order defined by `TAB_ORDER`:

```typescript
export const TAB_ORDER: TabKey[] = [
  TabKey.INTERACTIVE,
  TabKey.BIO,
  TabKey.JOBS,
  TabKey.OUTPUTS,
  TabKey.RESEARCH,
  TabKey.PIPELINES,
  TabKey.TOOLBOX,
]
```

To reorder tabs, simply change the `TAB_ORDER` array. All navigation will continue to work correctly.

## Pattern Matching in MarkdownMessage

The `MarkdownMessage` component automatically infers navigation from label patterns:

```typescript
// These patterns trigger navigation to Bio tab:
"bio", "profile", "add bio", "create profile", "your bio"

// These patterns trigger navigation to Jobs tab:
"job", "listing", "add job", "import job"

// These patterns trigger navigation to Outputs tab:
"output", "view resume", "check resume", "see resume"

// These patterns trigger navigation to Research tab:
"research", "intelligence", "analysis"

// These patterns trigger navigation to Pipelines tab:
"pipeline", "workflow", "automation", "automate"

// These patterns trigger navigation to Toolbox tab:
"toolbox", "tool", "utility", "utilities"
```

## Best Practices

### Do's ✅

- Use `TabKey` enum values for navigation
- Use `navigateToTab()` for new code
- Reference tabs by their key in agent metadata
- Use `getTabByKey()` to get tab information
- Check `currentTab === TabKey.XXX` for conditionals

### Don'ts ❌

- Don't use magic numbers for tab indices
- Don't hardcode tab positions
- Don't assume tab order will never change
- Don't use string literals instead of enum values

## Examples

### Navigate on Button Click

```typescript
<Button onClick={() => dispatch(navigateToTab(TabKey.OUTPUTS))}>
  View Outputs
</Button>
```

### Conditional Rendering Based on Tab

```typescript
{currentTab === TabKey.INTERACTIVE ? (
  <ExpandedChat />
) : (
  <CondensedChat />
)}
```

### Multi-Action Navigation

```typescript
const goToBioAndEdit = createBadgeAction(
  'Edit Bio',
  [
    createNavigateAction(TabKey.BIO),
    createChatAction('Help me edit my work experience', true),
  ],
  { icon: '👤', variant: 'purple' }
)
```

### Agent Response with Multiple Tab Options

```json
{
  "suggestions": [
    {
      "label": "Update Bio",
      "icon": "👤",
      "actions": [{ "type": "navigate", "tab": "bio" }]
    },
    {
      "label": "View Outputs",
      "icon": "📄",
      "actions": [{ "type": "navigate", "tab": "outputs" }]
    },
    {
      "label": "Check Research",
      "icon": "🔬",
      "actions": [{ "type": "navigate", "tab": "research" }]
    }
  ]
}
```

## Testing

### Unit Tests

```typescript
import { TabKey, getTabByKey, getIndexFromKey } from '../models/navigation'

test('getTabByKey returns correct metadata', () => {
  const bio = getTabByKey(TabKey.BIO)
  expect(bio.label).toBe('Bio')
  expect(bio.icon).toBe('👤')
  expect(bio.index).toBe(1)
})

test('getIndexFromKey returns correct index', () => {
  expect(getIndexFromKey(TabKey.BIO)).toBe(1)
  expect(getIndexFromKey(TabKey.JOBS)).toBe(2)
})
```

### Integration Tests

```typescript
test('navigation action dispatches correct tab key', () => {
  const action = navigateToTab(TabKey.BIO)
  expect(action.payload).toBe(TabKey.BIO)
})
```

## Troubleshooting

### Issue: Navigation doesn't work

**Check:**
1. Are you using `TabKey` enum values?
2. Is the tab key valid? (`isValidTabKey(key)`)
3. Is Redux store properly configured?

### Issue: Tab shows wrong content

**Check:**
1. Is `renderTabContent()` handling all tab keys?
2. Are you checking `currentTab` (not `currentTabIndex`)?

### Issue: Agent navigation fails

**Check:**
1. Is the `"tab"` field in metadata using string literals (e.g., `"bio"`)?
2. Is the tab key spelled correctly?
3. Check console for validation errors

## Summary

The keyed navigation system provides:
- **Type Safety**: TypeScript enum prevents invalid tab references
- **Flexibility**: Easy to reorder or add tabs
- **Clarity**: Explicit tab names instead of indices
- **Agent-Friendly**: Simple string-based tab references in metadata
- **Backward Compatible**: Supports legacy index-based navigation

Always use `TabKey` enum for navigation in new code!
