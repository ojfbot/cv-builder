# Agent System Prompt Optimization Guide

## Overview

This guide provides optimization patterns for CV Builder agents to generate proactive, helpful suggestions when users lack required data or encounter obstacles.

## Core Principles

1. **Always Provide Alternatives**: When prerequisites are missing, offer 3-4 different paths forward
2. **Guide, Don't Block**: Never just say "you need X first" - show HOW to get X
3. **Progressive Disclosure**: Start simple, offer complexity as needed
4. **Anticipate Needs**: Think about what users might want next
5. **Encourage Progress**: Celebrate partial completion, offer incremental improvements

## BadgeAction Metadata Structure

```typescript
{
  label: string              // Action button text (2-4 words)
  icon?: string             // Emoji or icon
  variant?: string          // Color theme
  actions: Action[]         // What happens on click
  suggestedMessage?: {      // Follow-up prompt
    role: 'user' | 'assistant'
    content: string         // Full message
    compactContent?: string // Short version
  }
  tooltip?: string          // Hover text
}
```

## Specialized Agent Guidelines

### 1. ResumeGeneratorAgent

**Current State**: Basic generation without fallback options

**Enhanced System Prompt Addition**:
```
When bio data is incomplete or missing, provide these alternatives:

1. Generate with Available Data:
   - Create partial resume
   - Highlight what's missing
   - Suggest completion steps

2. Template-Based Generation:
   - Offer industry-specific templates
   - Provide section-by-section guidance
   - Show best practices

3. Import Options:
   - Upload existing resume
   - LinkedIn import suggestion
   - Portfolio URL parsing

Always include metadata suggestions for next steps after generation.
```

**Example Metadata Response**:
```json
{
  "suggestions": [
    {
      "label": "Enhance Resume",
      "icon": "✨",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Your resume looks good! Let's enhance it:\n\n• Add quantifiable achievements\n• Include industry keywords\n• Optimize formatting\n\nWhich section should we improve first?"
      }
    },
    {
      "label": "Add Missing Sections",
      "icon": "➕",
      "variant": "blue",
      "actions": [{ "type": "navigate", "tab": "bio" }]
    },
    {
      "label": "Download PDF",
      "icon": "📥",
      "variant": "green",
      "actions": [{
        "type": "download",
        "filename": "resume.pdf",
        "content": "[base64_content]"
      }]
    }
  ]
}
```

### 2. JobAnalysisAgent

**Enhanced System Prompt Addition**:
```
Proactively help users when:

1. No job data provided:
   - Suggest job search strategies
   - Offer to analyze job URLs
   - Provide industry trend analysis

2. Incomplete bio for matching:
   - Run partial analysis
   - Highlight critical missing skills
   - Suggest quick wins

3. Poor match score:
   - Identify transferable skills
   - Suggest learning paths
   - Offer alternative positions

Include actionable suggestions in metadata for every analysis.
```

**Example Metadata for Poor Match**:
```json
{
  "suggestions": [
    {
      "label": "Bridge Skill Gaps",
      "icon": "🌉",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Match Score: 65%. Let's improve it!\n\n**Quick Wins** (1-2 weeks):\n• Learn Docker basics\n• Get AWS Cloud Practitioner cert\n\n**Medium Term** (1-3 months):\n• Master Kubernetes\n• Build portfolio project\n\nWhich path interests you?"
      }
    },
    {
      "label": "Find Similar Jobs",
      "icon": "🔍",
      "variant": "cyan",
      "actions": [{ "type": "navigate", "tab": "research" }]
    },
    {
      "label": "Tailor Resume Anyway",
      "icon": "📝",
      "variant": "green",
      "actions": [{ "type": "chat", "message": "Tailor my resume emphasizing transferable skills" }]
    }
  ]
}
```

### 3. TailoringAgent

**Enhanced System Prompt Addition**:
```
When tailoring, always provide follow-up actions:

1. After successful tailoring:
   - Review changes option
   - Generate cover letter
   - Prepare interview points

2. When missing job details:
   - Quick tailor with job title only
   - Industry-standard optimization
   - Request more details

3. When bio lacks relevant experience:
   - Focus on transferable skills
   - Suggest adding projects
   - Highlight soft skills

Always explain what was changed and why.
```

### 4. SkillsGapAgent

**Enhanced System Prompt Addition**:
```
Create actionable learning paths with multiple entry points:

1. No time commitment specified:
   - Offer 1-week, 1-month, 3-month plans
   - Suggest daily time investments
   - Provide flexible options

2. No budget specified:
   - Include free resources first
   - Show premium alternatives
   - Highlight ROI

3. Overwhelming skill gaps:
   - Prioritize by impact
   - Suggest foundation skills
   - Break into milestones

Always include specific next actions in metadata.
```

**Example Learning Path Metadata**:
```json
{
  "suggestions": [
    {
      "label": "Start Week 1",
      "icon": "🚀",
      "variant": "green",
      "actions": [{ "type": "external_link", "url": "https://course-link.com" }]
    },
    {
      "label": "Download Roadmap",
      "icon": "🗺️",
      "variant": "blue",
      "actions": [{ "type": "download", "filename": "learning-path.pdf" }]
    },
    {
      "label": "Find Study Buddy",
      "icon": "👥",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Help me find study groups or partners for this learning path"
      }
    },
    {
      "label": "Track Progress",
      "icon": "📊",
      "variant": "cyan",
      "actions": [{ "type": "navigate", "tab": "pipelines" }]
    }
  ]
}
```

### 5. InterviewCoachAgent

**Enhanced System Prompt Addition**:
```
Provide comprehensive interview preparation:

1. Missing job details:
   - Use general industry questions
   - Focus on common scenarios
   - Request specific role info

2. Missing experience:
   - Coach on transferable skills
   - Suggest STAR method examples
   - Build confidence

3. After generating materials:
   - Offer practice questions
   - Suggest mock interview
   - Provide speaking tips

Always include practice and refinement options.
```

## Common Scenarios & Responses

### Scenario 1: Complete Beginner

**User**: "Help me get a job"

**Response Pattern**:
```markdown
I'll guide you through the entire job search process! Let's start with understanding where you are.

<metadata>
{
  "suggestions": [
    {
      "label": "I'm New to This",
      "icon": "🌟",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Welcome! Let's build your career foundation:\n\n1. What field interests you?\n2. Any education or experience?\n3. What are your strengths?\n\nNo experience needed - everyone starts somewhere!"
      }
    },
    {
      "label": "I Have Experience",
      "icon": "💼",
      "variant": "blue",
      "actions": [{ "type": "file_upload", "accept": ".pdf,.docx" }],
      "tooltip": "Upload your existing resume"
    },
    {
      "label": "Show Me Examples",
      "icon": "📚",
      "variant": "cyan",
      "actions": [{ "type": "navigate", "tab": "outputs" }]
    },
    {
      "label": "Browse Jobs First",
      "icon": "🔍",
      "variant": "teal",
      "actions": [{ "type": "navigate", "tab": "jobs" }]
    }
  ]
}
</metadata>
```

### Scenario 2: Stuck Mid-Process

**User**: "I started filling out my bio but got stuck"

**Response Pattern**:
```markdown
No problem! Let's get you unstuck. I can help you continue from where you left off.

<metadata>
{
  "suggestions": [
    {
      "label": "Show My Progress",
      "icon": "📊",
      "variant": "blue",
      "actions": [{ "type": "navigate", "tab": "bio" }]
    },
    {
      "label": "Help with Descriptions",
      "icon": "✍️",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's improve your descriptions! Share:\n\n1. Role/task you're describing\n2. What you did (briefly)\n3. The outcome/impact\n\nI'll help craft compelling bullet points!"
      }
    },
    {
      "label": "Skip to Resume",
      "icon": "⏭️",
      "variant": "green",
      "actions": [{ "type": "chat", "message": "Generate resume with what I have so far" }]
    },
    {
      "label": "See Examples",
      "icon": "💡",
      "variant": "cyan",
      "actions": [{ "type": "chat", "message": "Show me examples of good bio descriptions" }]
    }
  ]
}
</metadata>
```

### Scenario 3: Overwhelmed User

**User**: "This is too complicated"

**Response Pattern**:
```markdown
Let's simplify! I'll break this down into small, manageable steps.

<metadata>
{
  "suggestions": [
    {
      "label": "5-Minute Start",
      "icon": "⚡",
      "variant": "green",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's do just 5 minutes:\n\n1. Your name\n2. Current/last job title\n3. One achievement you're proud of\n\nThat's it! We'll build from there."
      }
    },
    {
      "label": "Use Template",
      "icon": "📋",
      "variant": "blue",
      "actions": [{ "type": "chat", "message": "Give me the simplest resume template" }]
    },
    {
      "label": "Talk It Through",
      "icon": "💬",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's chat! Tell me about your work in your own words - like you're explaining to a friend. I'll format it professionally."
      }
    },
    {
      "label": "Take a Break",
      "icon": "☕",
      "variant": "gray",
      "actions": [],
      "tooltip": "Save progress and come back later"
    }
  ]
}
</metadata>
```

## Implementation Checklist

When updating agent prompts:

- [ ] Add proactive fallback patterns for missing data
- [ ] Include 3-4 alternative paths in metadata
- [ ] Use suggestedMessage for all interactive badges
- [ ] Provide templates and examples as options
- [ ] Include "quick" or "partial" completion options
- [ ] Add progress tracking and save points
- [ ] Offer help and guidance options
- [ ] Test with minimal, partial, and complete data
- [ ] Ensure encouraging, patient tone
- [ ] Validate all JSON metadata structures

## Key Success Metrics

Good agent responses will:
1. Never leave users stuck
2. Always provide multiple paths forward
3. Celebrate partial progress
4. Reduce follow-up questions
5. Increase task completion rates
6. Build user confidence