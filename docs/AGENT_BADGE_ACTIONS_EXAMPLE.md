# Agent Badge Actions - Implementation Example

This document shows how to update an agent's system prompt to generate badge action metadata.

## Example: Orchestrator Agent Update

### Before (Current Approach)

```typescript
Your responses MUST follow this structure:

1. **Main Content** (visible to user):
   - Clear, helpful explanation
   - Status updates and results

2. **Metadata Block** (machine-readable, at the very end):
   - Format: XML-style tags on separate lines
   - Example:
     <metadata>
     <navigate tab="1" label="Add your profile information" />
     </metadata>
```

**Example output:**
```markdown
I'll help you create a resume! First, I need some information about you.

Please add your bio information to get started.

<metadata>
<navigate tab="1" label="Add your bio" />
</metadata>
```

### After (Badge Actions Approach)

```typescript
Your responses MUST include structured badge action metadata to enable rich UI interactions.

## Response Format

1. **Main Content**: Clear, helpful explanation and status updates

2. **Next Steps Section**: Optional bulleted list of suggested actions:
   - **Action Label**: Brief description of what the action does

3. **Metadata Block** (JSON format at the very end):

<metadata>
{
  "suggestions": [
    {
      "label": "Action Label",
      "icon": "emoji",
      "variant": "color",
      "actions": [
        { "type": "action_type", ...params }
      ]
    }
  ]
}
</metadata>

## Action Types

### Navigate
Navigate to a specific tab.
```json
{ "type": "navigate", "tabIndex": 1 }
```

Tab indices:
- 0: Chat
- 1: Bio Dashboard
- 2: Jobs Dashboard
- 3: Outputs Dashboard
- 4: Research Dashboard

### Chat
Send a follow-up message.
```json
{
  "type": "chat",
  "message": "The message to send",
  "expandChat": true  // Optional
}
```

### Multi-Action
Combine actions (execute in sequence):
```json
"actions": [
  { "type": "navigate", "tabIndex": 1 },
  { "type": "chat", "message": "Help me add my experience", "expandChat": true }
]
```

## Icon and Color Guidelines

**Icons (use emoji):**
- 👤 - Bio/Profile actions
- 💼 - Jobs/Listings actions
- 📄 - Resume/Output actions
- 🔬 - Research/Analysis actions
- 🔍 - Search/Analyze actions
- ✨ - Generate/Create actions
- 📚 - Learn/Skills actions
- ✍️ - Write/Edit actions

**Variants (colors):**
- `purple` - General actions (default)
- `blue` - Information/viewing
- `cyan` - Analysis/search
- `green` - Creation/generation
- `teal` - Navigation
- `gray` - Secondary actions

## Example Responses

### Example 1: Missing Bio Data

**Prompt:** "Generate my resume"

**Response:**
```markdown
I'd love to help you create a resume! However, I need your professional information first.

Let's get started by adding your bio. I'll guide you through adding:
- Your contact information
- Work experience
- Education
- Skills and certifications

## Next Steps

- **Add Your Bio**: Navigate to the Bio tab and enter your professional information
- **Import from File**: Upload an existing resume to extract your information

<metadata>
{
  "suggestions": [
    {
      "label": "Add Your Bio",
      "icon": "👤",
      "variant": "purple",
      "actions": [
        { "type": "navigate", "tabIndex": 1 },
        {
          "type": "chat",
          "message": "Help me add my professional information to my bio",
          "expandChat": true
        }
      ]
    },
    {
      "label": "Import Resume",
      "icon": "📄",
      "variant": "blue",
      "actions": [
        {
          "type": "file_upload",
          "accept": ".pdf,.docx,.txt",
          "targetTab": 1
        }
      ]
    }
  ]
}
</metadata>
```

### Example 2: Resume Generated Successfully

**Prompt:** "Generate a resume for a software engineer position"

**Response:**
```markdown
✅ I've generated your software engineer resume!

Your resume has been created with:
- Highlighted technical skills (Python, JavaScript, AWS)
- Quantified achievements from your experience
- Education and certifications section
- Clean, professional formatting

The resume is now available in the Outputs tab.

## Next Steps

- **View Resume**: Check out your generated resume
- **Tailor for Job**: Customize this resume for a specific job listing
- **Generate Cover Letter**: Create a matching cover letter

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
        {
          "type": "chat",
          "message": "Help me tailor my resume for a specific job",
          "expandChat": true
        }
      ]
    },
    {
      "label": "Generate Cover Letter",
      "icon": "✍️",
      "variant": "purple",
      "actions": [
        {
          "type": "chat",
          "message": "Generate a cover letter to match my resume"
        }
      ]
    }
  ]
}
</metadata>
```

### Example 3: Job Analysis Complete

**Prompt:** "Analyze how well I match the Senior Developer position"

**Response:**
```markdown
## Match Analysis: Senior Developer

**Overall Match: 85%** 🎯

You're a strong candidate! Here's the breakdown:

**Strengths:**
- ✅ 5+ years experience (Required)
- ✅ Python, JavaScript, React expertise
- ✅ Cloud platform experience (AWS)
- ✅ Team leadership background

**Areas for Development:**
- ⚠️ Kubernetes experience mentioned but could be stronger
- ⚠️ No GraphQL mentioned in your bio

## Next Steps

- **Create Learning Path**: Develop a plan to strengthen Kubernetes and GraphQL skills
- **Tailor Resume**: Customize your resume to highlight relevant experience for this role
- **Generate Cover Letter**: Write a compelling cover letter addressing the job requirements

<metadata>
{
  "suggestions": [
    {
      "label": "Create Learning Path",
      "icon": "📚",
      "variant": "cyan",
      "actions": [
        {
          "type": "chat",
          "message": "Create a learning path to fill the skills gaps for the Senior Developer position"
        }
      ]
    },
    {
      "label": "Tailor Resume",
      "icon": "✨",
      "variant": "green",
      "actions": [
        {
          "type": "chat",
          "message": "Tailor my resume for the Senior Developer position"
        },
        { "type": "navigate", "tabIndex": 3 }
      ]
    },
    {
      "label": "Write Cover Letter",
      "icon": "✍️",
      "variant": "purple",
      "actions": [
        {
          "type": "chat",
          "message": "Write a cover letter for the Senior Developer position addressing my qualifications"
        }
      ]
    }
  ]
}
</metadata>
```

## Implementation Checklist

When updating an agent to use badge actions:

- [ ] Add action type documentation to system prompt
- [ ] Include JSON metadata schema in response format
- [ ] Provide icon and color variant guidelines
- [ ] Add example responses showing proper metadata structure
- [ ] Test that metadata block is valid JSON
- [ ] Verify actions are contextually relevant
- [ ] Ensure labels are clear and action-oriented
- [ ] Include 2-4 suggestions per response (not too many)
- [ ] Chain actions logically when using multi-action badges

## Testing Your Updates

1. **Validate JSON**: Ensure metadata blocks are valid JSON
2. **Check Action Types**: Verify all action types are supported
3. **Test Tab Indices**: Confirm tab navigation works correctly
4. **Review UX**: Badge labels should be clear and encourage action
5. **Check Variants**: Icons and colors should be semantically appropriate

## Migration Strategy

You can migrate incrementally:

1. **Phase 1**: Keep existing XML metadata, add JSON suggestions
2. **Phase 2**: Update system prompts with new format
3. **Phase 3**: Remove legacy XML metadata support

The UI components support both formats during migration.
