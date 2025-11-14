# Agent Prompt Update Required

## Current Issue

The agent is still outputting old format navigation tags:
```
[NAVIGATE_TO_TAB:1:Add your bio information first]
```

Instead of the new JSON badge action format:
```json
<metadata>
{
  "suggestions": [
    {
      "label": "Add Your Bio",
      "icon": "👤",
      "variant": "purple",
      "actions": [
        { "type": "navigate", "tab": "bio" }
      ]
    }
  ]
}
</metadata>
```

## What Was Updated

### 1. Orchestrator Agent Prompt (`orchestrator-agent.ts`)

The system prompt has been updated with:
- New JSON metadata format instructions
- Badge action structure with proper examples
- Tab keys instead of indices (`"bio"` instead of `1`)
- Action types (navigate, chat, multi-action)
- Badge variants (colors) and icons
- Clear examples of proper format

### 2. Frontend Parsing (InteractiveChat & CondensedChat)

Both components now:
- Try to parse JSON metadata first (new format)
- Fall back to old XML format for compatibility
- Convert BadgeAction to QuickAction internally
- Support both formats during transition

## Expected Agent Response Format

### Example 1: Missing Bio Data

**OLD (incorrect) format:**
```
I'll help you create a resume!

[NAVIGATE_TO_TAB:1:Add your bio information first]

## Next Steps
- **Add Bio Data**: Complete your profile
```

**NEW (correct) format:**
```
I'll help you create a professional resume! First, I need your bio information.

Let's get started by adding your professional details to your bio.

<metadata>
{
  "suggestions": [
    {
      "label": "Add Your Bio",
      "icon": "👤",
      "variant": "purple",
      "actions": [
        { "type": "navigate", "tab": "bio" },
        { "type": "chat", "message": "Help me add my professional information", "expandChat": true }
      ]
    }
  ]
}
</metadata>
```

### Example 2: Resume Generated

**OLD (incorrect) format:**
```
Great! I've generated your resume.

[NAVIGATE_TO_TAB:3:View your resume]
```

**NEW (correct) format:**
```
✅ I've generated your resume and saved it to the Outputs tab!

Your resume highlights your key skills and experience.

<metadata>
{
  "suggestions": [
    {
      "label": "View Resume",
      "icon": "📄",
      "variant": "blue",
      "actions": [
        { "type": "navigate", "tab": "outputs" }
      ]
    },
    {
      "label": "Tailor for Job",
      "icon": "✨",
      "variant": "green",
      "actions": [
        { "type": "navigate", "tab": "jobs" },
        { "type": "chat", "message": "Help me tailor this resume for a specific job", "expandChat": true }
      ]
    }
  ]
}
</metadata>
```

## Tab Keys Reference

Use these **exact** string keys in the `"tab"` field:

| Tab Key | Description | Icon |
|---------|-------------|------|
| `"interactive"` | Chat interface | 💬 |
| `"bio"` | User profile/experience | 👤 |
| `"jobs"` | Job listings | 💼 |
| `"outputs"` | Generated resumes | 📄 |
| `"research"` | Industry insights | 🔬 |
| `"pipelines"` | Automated workflows | 🔄 |
| `"toolbox"` | Career utilities | 🧰 |

## Action Types

### Navigate Only
```json
{
  "type": "navigate",
  "tab": "bio"
}
```

### Chat Only
```json
{
  "type": "chat",
  "message": "Help me add my work experience",
  "expandChat": true
}
```

### Multi-Action (Navigate + Chat)
```json
"actions": [
  { "type": "navigate", "tab": "bio" },
  { "type": "chat", "message": "Help me add my experience", "expandChat": true }
]
```

## Badge Variants (Colors)

- `"purple"` - General actions (default)
- `"blue"` - Viewing/information
- `"cyan"` - Analysis/search
- `"green"` - Creation/generation
- `"teal"` - Navigation
- `"gray"` - Secondary actions

## Common Icons

- 👤 - Bio/Profile
- 💼 - Jobs
- 📄 - Resume/Outputs
- 🔬 - Research
- 🔍 - Search/Analyze
- ✨ - Generate/Create
- 📚 - Learning
- ✍️ - Write/Edit
- 🔄 - Workflows/Pipelines
- 🧰 - Tools/Utilities

## Rules for Agents

### ✅ DO:
- Use JSON metadata format in `<metadata>` tags
- Place metadata at the **very end** of response
- Use tab **keys** (strings like `"bio"`)
- Include 2-4 badge suggestions per response
- Use clear, action-oriented labels
- Include appropriate icons and colors
- Chain actions when it makes sense (navigate + chat)

### ❌ DON'T:
- Use old `[NAVIGATE_TO_TAB:X:Label]` format
- Use old `<navigate tab="1" />` XML format
- Use tab **indices** (numbers like `1`, `2`)
- Put navigation tags inline in content
- Create too many suggestions (>4)
- Use vague labels like "Click here"

## Testing the Agent

After the agent processes the new prompt:

1. **Ask**: "Generate my resume" (when bio is missing)
2. **Expected**: Agent outputs JSON metadata with `"tab": "bio"`
3. **UI**: Badge button appears with "Add Your Bio"
4. **Click**: Should navigate to Bio tab

## Troubleshooting

If agent still outputs old format:
1. Check that orchestrator-agent.ts was saved
2. Agent may have cached the old prompt in conversation history
3. Start a new conversation to get fresh prompt
4. Check console logs for parsing errors

## Migration Status

✅ **Frontend** - Ready for new format, supports legacy
✅ **Agent Prompt** - Updated with new instructions
⏳ **Agent Behavior** - Needs to output new format
🔄 **Testing** - Test with new conversation

The system is backward compatible - old format will still work while agent learns new format.
