# Test Agent Response Formats

## Test Case 1: Old Format (Should Still Work)

**Agent Response:**
```
I'll help you create a resume!

[NAVIGATE_TO_TAB:1:Add your bio information first]

## Next Steps
- **Add Bio Data**: Complete your profile
```

**Expected Result:**
- Parser detects `[NAVIGATE_TO_TAB:1:...]`
- Creates QuickAction with `navigateTo: 1`
- Badge button appears with "Add your bio information first"
- Clicking navigates to Bio tab (index 1)

## Test Case 2: New JSON Format (Preferred)

**Agent Response:**
```
I'll help you create a professional resume! First, I need your bio information.

Let's get started by adding your professional details.

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

**Expected Result:**
- Parser detects `<metadata>` block
- Parses JSON successfully
- Extracts BadgeAction with `tab: "bio"`
- Converts to QuickAction with `navigateTo: 1`
- Badge button appears with "Add Your Bio" and 👤 icon
- Clicking:
  1. Navigates to Bio tab
  2. Expands chat
  3. Sends message "Help me add my professional information"

## Test Case 3: Multiple Suggestions

**Agent Response:**
```
✅ I've generated your resume!

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
        { "type": "chat", "message": "Help me tailor this resume", "expandChat": true }
      ]
    }
  ]
}
</metadata>
```

**Expected Result:**
- 2 badge buttons appear
- Button 1: "View Resume" with 📄, navigates to Outputs tab
- Button 2: "Tailor for Job" with ✨, navigates to Jobs + sends chat

## Test Case 4: Chat-Only Action

**Agent Response:**
```
I can help you with that!

<metadata>
{
  "suggestions": [
    {
      "label": "Tell Me More",
      "icon": "💬",
      "variant": "cyan",
      "actions": [
        { "type": "chat", "message": "What are the best practices for resume formatting?" }
      ]
    }
  ]
}
</metadata>
```

**Expected Result:**
- Badge button appears with "Tell Me More"
- Clicking sends chat message (no navigation)

## Parsing Logic Flow

```
1. Extract <metadata> block from response
   ↓
2. Try to parse as JSON
   ↓
3a. SUCCESS → Use new BadgeAction format
   - Extract suggestions array
   - For each suggestion:
     - Get first action
     - If navigate: convert tab key to index
     - If chat: use message as query
   - Create QuickAction
   ↓
3b. FAIL → Try XML format
   - Look for <navigate tab="1" />
   - Create QuickAction from XML
   ↓
4. FALLBACK → Look for [NAVIGATE_TO_TAB:X:Label]
   - Create QuickAction from bracket format
   ↓
5. Return suggestions array
```

## Console Logs to Check

When testing, look for these console messages:

```
[InteractiveChat] Metadata match found: true
[InteractiveChat] Metadata content: { ... }
[InteractiveChat] Found JSON badge action suggestions: 2
[InteractiveChat] Converted to QuickActions: [{label: "...", navigateTo: 1}, ...]
```

Or for old format:
```
[InteractiveChat] Not valid JSON, trying XML format...
```

Or for very old format:
```
[InteractiveChat] FALLBACK: Found old bracket format navigation
```

## How to Test

1. **Start dev server**: `npm run dev`
2. **Open browser console**
3. **Type**: "Generate my resume" (when no bio exists)
4. **Watch console logs** for parsing messages
5. **Check UI** for badge buttons
6. **Click button** and verify navigation

## Known Issues

- Agent may still output old format due to cached prompt
- Solution: Start fresh conversation or restart server
- Frontend supports both formats during transition
