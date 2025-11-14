# BadgeAction JSON Metadata Examples

## Complete Reference for CV Builder Agent Responses

### Table of Contents
1. [Data Collection Scenarios](#data-collection-scenarios)
2. [Generation Scenarios](#generation-scenarios)
3. [Analysis Scenarios](#analysis-scenarios)
4. [Error Recovery Scenarios](#error-recovery-scenarios)
5. [Progress Tracking Scenarios](#progress-tracking-scenarios)
6. [Learning Path Scenarios](#learning-path-scenarios)

---

## Data Collection Scenarios

### No Bio Data - Full Options
```json
{
  "suggestions": [
    {
      "label": "Start from Scratch",
      "icon": "✍️",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's build your professional profile step by step!\n\n**Step 1: Contact Information**\n• Full name\n• Email address\n• Phone number\n• Location (City, State/Country)\n• LinkedIn URL (optional)\n\n**Example:**\n'Jane Doe, jane@email.com, (555) 123-4567, San Francisco, CA'\n\nShare your info and I'll format everything professionally!",
        "compactContent": "Share your name, email, phone, and location"
      },
      "tooltip": "Build your profile with guided questions"
    },
    {
      "label": "Upload Resume",
      "icon": "📄",
      "variant": "blue",
      "actions": [{
        "type": "file_upload",
        "accept": ".pdf,.docx,.txt",
        "multiple": false
      }],
      "tooltip": "Import existing resume (PDF, DOCX, TXT)"
    },
    {
      "label": "Use Template",
      "icon": "📋",
      "variant": "cyan",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Show me a professional bio template for a software engineer",
        "compactContent": "Show bio template"
      }
    },
    {
      "label": "See Example",
      "icon": "💡",
      "variant": "teal",
      "actions": [
        { "type": "navigate", "tab": "outputs" },
        { "type": "chat", "message": "Show me an example of a complete professional bio", "expandChat": true }
      ]
    }
  ]
}
```

### Partial Bio - Complete Missing Sections
```json
{
  "suggestions": [
    {
      "label": "Add Work Experience",
      "icon": "💼",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's add your work experience! For each position, share:\n\n📍 **Company & Role**\nExample: 'Software Engineer at Google'\n\n📅 **Dates**\nExample: 'June 2020 - Present'\n\n✨ **Key Achievements** (3-5 bullets)\n• Led team of 5 to deliver...\n• Increased performance by 40%...\n• Implemented new system that...\n\nStart with your current/most recent role!",
        "compactContent": "Share your work experience: company, role, dates, achievements"
      }
    },
    {
      "label": "Add Education",
      "icon": "🎓",
      "variant": "blue",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's add your education:\n\n• Degree and Major\n• University/College\n• Graduation Year\n• GPA (if 3.5+)\n• Relevant coursework or honors\n\nExample: 'BS Computer Science, Stanford University, 2020, GPA 3.8'",
        "compactContent": "Add your education details"
      }
    },
    {
      "label": "Add Skills",
      "icon": "🎯",
      "variant": "green",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's add your skills! Organize by category:\n\n**Programming:** Python, JavaScript, Java\n**Frameworks:** React, Django, Spring\n**Tools:** Git, Docker, AWS\n**Soft Skills:** Leadership, Communication\n\nList your strongest skills first!",
        "compactContent": "List your technical and soft skills"
      }
    },
    {
      "label": "Generate Now",
      "icon": "⚡",
      "variant": "cyan",
      "actions": [{ "type": "chat", "message": "Generate resume with current information" }],
      "tooltip": "Create resume with available data"
    }
  ]
}
```

### Job Input Options
```json
{
  "suggestions": [
    {
      "label": "Paste Description",
      "icon": "📝",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "**Ready to analyze a job!** Paste the full job description below.\n\nI'll extract and analyze:\n✅ Required qualifications\n✅ Technical requirements\n✅ Soft skills needed\n✅ Company culture signals\n✅ Your match percentage\n\nPaste away!",
        "compactContent": "Paste job description here"
      }
    },
    {
      "label": "Add Job URL",
      "icon": "🔗",
      "variant": "blue",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Analyze this job: [paste LinkedIn/Indeed/company URL here]",
        "compactContent": "Paste job URL"
      }
    },
    {
      "label": "Quick Search",
      "icon": "🔍",
      "variant": "cyan",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's find relevant jobs! Tell me:\n\n• **Role:** What position?\n• **Level:** Entry/Mid/Senior?\n• **Location:** Remote/City?\n• **Industry:** Tech/Finance/etc?\n\nExample: 'Senior Backend Engineer, Remote, FinTech'",
        "compactContent": "Describe the job you're looking for"
      }
    },
    {
      "label": "Use Sample Job",
      "icon": "📂",
      "variant": "teal",
      "actions": [
        { "type": "navigate", "tab": "jobs" },
        { "type": "chat", "message": "Show me sample job listings" }
      ]
    }
  ]
}
```

---

## Generation Scenarios

### Successful Resume Generation
```json
{
  "suggestions": [
    {
      "label": "View Resume",
      "icon": "📄",
      "variant": "blue",
      "actions": [{ "type": "navigate", "tab": "outputs" }]
    },
    {
      "label": "Download PDF",
      "icon": "📥",
      "variant": "green",
      "actions": [{
        "type": "download",
        "filename": "resume.pdf",
        "mimeType": "application/pdf"
      }]
    },
    {
      "label": "Tailor for Job",
      "icon": "✨",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's customize your resume for a specific job!\n\n1. Share the job description or URL\n2. I'll identify key requirements\n3. Optimize your resume with relevant keywords\n4. Emphasize matching experience\n\nReady? Paste the job details!",
        "compactContent": "Share job to tailor resume"
      }
    },
    {
      "label": "Create Cover Letter",
      "icon": "✉️",
      "variant": "cyan",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Create a cover letter for my target position",
        "compactContent": "Generate cover letter"
      }
    }
  ]
}
```

### Tailored Resume Created
```json
{
  "suggestions": [
    {
      "label": "View Changes",
      "icon": "🔍",
      "variant": "blue",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Show me what changed in the tailored version",
        "compactContent": "View changes"
      }
    },
    {
      "label": "Download Both",
      "icon": "📥",
      "variant": "green",
      "actions": [
        { "type": "download", "filename": "resume-general.pdf" },
        { "type": "download", "filename": "resume-tailored.pdf" }
      ],
      "tooltip": "Download general and tailored versions"
    },
    {
      "label": "Interview Prep",
      "icon": "🎤",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's prepare for the interview!\n\nI'll help you with:\n• Common questions for this role\n• STAR method examples from your experience\n• Company-specific talking points\n• Questions to ask the interviewer\n\nWhich area should we focus on first?",
        "compactContent": "Prepare for interview"
      }
    },
    {
      "label": "Apply Strategy",
      "icon": "🎯",
      "variant": "cyan",
      "actions": [{ "type": "navigate", "tab": "pipelines" }]
    }
  ]
}
```

---

## Analysis Scenarios

### Job Match Analysis - High Score (80%+)
```json
{
  "suggestions": [
    {
      "label": "Tailor Resume",
      "icon": "✨",
      "variant": "green",
      "actions": [{ "type": "chat", "message": "Tailor my resume for this job" }]
    },
    {
      "label": "Write Cover Letter",
      "icon": "✉️",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Write a compelling cover letter emphasizing my strong match",
        "compactContent": "Generate cover letter"
      }
    },
    {
      "label": "Interview Prep",
      "icon": "🎤",
      "variant": "blue",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Great match! Let's prep for the interview:\n\n**Your Strengths for This Role:**\n• [List specific matches]\n\n**Potential Questions:**\n1. Tell me about your experience with [key skill]\n2. How would you approach [job responsibility]?\n\nShall we do a mock interview?",
        "compactContent": "Practice interview questions"
      }
    },
    {
      "label": "Apply Now",
      "icon": "🚀",
      "variant": "cyan",
      "actions": [{ "type": "external_link", "url": "[application_url]" }]
    }
  ]
}
```

### Job Match Analysis - Medium Score (50-79%)
```json
{
  "suggestions": [
    {
      "label": "Bridge Gaps",
      "icon": "🌉",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Match Score: 65%. Let's improve it!\n\n**Quick Wins** (1-2 weeks):\n• Complete online course in [missing skill]\n• Add portfolio project using [technology]\n\n**Medium Term** (1-3 months):\n• Get certification in [area]\n• Gain experience with [tool]\n\nWhich improvement path interests you most?",
        "compactContent": "Create plan to improve match"
      }
    },
    {
      "label": "Emphasize Strengths",
      "icon": "💪",
      "variant": "blue",
      "actions": [{ "type": "chat", "message": "Tailor resume emphasizing my matching qualifications" }]
    },
    {
      "label": "Find Similar Jobs",
      "icon": "🔍",
      "variant": "cyan",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Find similar jobs where I'd be a better match",
        "compactContent": "Search similar positions"
      }
    },
    {
      "label": "Learning Path",
      "icon": "📚",
      "variant": "green",
      "actions": [{ "type": "chat", "message": "Create a learning path to qualify for this role" }]
    }
  ]
}
```

### Job Match Analysis - Low Score (<50%)
```json
{
  "suggestions": [
    {
      "label": "Transferable Skills",
      "icon": "🔄",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's identify your transferable skills!\n\nEven with a 35% technical match, you might have:\n• Problem-solving abilities\n• Project management experience\n• Industry knowledge\n• Leadership skills\n\nTell me about your biggest achievements - I'll connect them to this role.",
        "compactContent": "Find transferable skills"
      }
    },
    {
      "label": "Career Pivot Plan",
      "icon": "🎯",
      "variant": "blue",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "This role requires a career pivot. Let's create a plan:\n\n1. **Foundation** (Month 1-2)\n2. **Core Skills** (Month 3-4)\n3. **Portfolio** (Month 5-6)\n4. **Network & Apply** (Ongoing)\n\nReady to map out your transition?",
        "compactContent": "Create career transition plan"
      }
    },
    {
      "label": "Find Better Matches",
      "icon": "✅",
      "variant": "green",
      "actions": [{ "type": "navigate", "tab": "jobs" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Find jobs that better match my current skills",
        "compactContent": "Search better matches"
      }
    },
    {
      "label": "Entry-Level Path",
      "icon": "🌱",
      "variant": "cyan",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Show me entry-level positions that could lead to this role",
        "compactContent": "Find stepping stone roles"
      }
    }
  ]
}
```

---

## Error Recovery Scenarios

### File Upload Failed
```json
{
  "suggestions": [
    {
      "label": "Try Again",
      "icon": "🔄",
      "variant": "blue",
      "actions": [{ "type": "file_upload", "accept": ".pdf,.docx,.txt" }]
    },
    {
      "label": "Copy-Paste Instead",
      "icon": "📋",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "No problem! Just copy and paste your resume text here. I'll handle the formatting.",
        "compactContent": "Paste resume text"
      }
    },
    {
      "label": "Start Fresh",
      "icon": "✍️",
      "variant": "green",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's build from scratch! Starting with basics:\n\n• Your name and contact info\n• Current job title\n• Years of experience\n\nWe'll build up from there!",
        "compactContent": "Build from scratch"
      }
    },
    {
      "label": "Get Help",
      "icon": "❓",
      "variant": "gray",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Upload issues? Common fixes:\n\n• Check file size (<10MB)\n• Ensure PDF/DOCX/TXT format\n• Try different browser\n• Clear browser cache\n\nStill stuck? Describe the error you're seeing.",
        "compactContent": "Troubleshoot upload issue"
      }
    }
  ]
}
```

### Generation Incomplete
```json
{
  "suggestions": [
    {
      "label": "Continue Generation",
      "icon": "▶️",
      "variant": "green",
      "actions": [{ "type": "chat", "message": "Continue from where you left off" }]
    },
    {
      "label": "Restart Section",
      "icon": "🔄",
      "variant": "blue",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Regenerate the last section that was incomplete",
        "compactContent": "Redo last section"
      }
    },
    {
      "label": "Save Progress",
      "icon": "💾",
      "variant": "purple",
      "actions": [{ "type": "navigate", "tab": "outputs" }],
      "tooltip": "Save what was generated so far"
    },
    {
      "label": "Simplify Request",
      "icon": "✂️",
      "variant": "cyan",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's simplify! Which section is most important?\n\n• Work Experience only\n• Skills summary only\n• Education and certifications\n• Quick bio paragraph\n\nI'll focus on that first.",
        "compactContent": "Pick one section to complete"
      }
    }
  ]
}
```

---

## Progress Tracking Scenarios

### Multi-Step Process Started
```json
{
  "suggestions": [
    {
      "label": "Next Step",
      "icon": "➡️",
      "variant": "green",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "✅ Step 1 Complete!\n\n**Step 2: Work Experience**\nLet's add your professional experience...",
        "compactContent": "Continue to Step 2"
      }
    },
    {
      "label": "Skip Step",
      "icon": "⏭️",
      "variant": "blue",
      "actions": [{ "type": "chat", "message": "Skip to the next step" }]
    },
    {
      "label": "Save & Pause",
      "icon": "⏸️",
      "variant": "purple",
      "actions": [],
      "tooltip": "Your progress is saved - continue anytime"
    },
    {
      "label": "View Progress",
      "icon": "📊",
      "variant": "cyan",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Show me what we've completed so far",
        "compactContent": "View progress"
      }
    }
  ]
}
```

### Process Completed
```json
{
  "suggestions": [
    {
      "label": "Review Everything",
      "icon": "👀",
      "variant": "blue",
      "actions": [{ "type": "navigate", "tab": "outputs" }]
    },
    {
      "label": "Next Goal",
      "icon": "🎯",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Great job! What's next?\n\n• Apply to specific jobs\n• Improve weak areas\n• Practice interviews\n• Network strategically\n\nWhich goal should we tackle?",
        "compactContent": "What's your next career goal?"
      }
    },
    {
      "label": "Download All",
      "icon": "📦",
      "variant": "green",
      "actions": [{ "type": "download", "filename": "career-package.zip" }]
    },
    {
      "label": "Share Success",
      "icon": "🎉",
      "variant": "cyan",
      "actions": [{ "type": "copy_text", "text": "Just completed my professional career package with CV Builder!" }]
    }
  ]
}
```

---

## Learning Path Scenarios

### Learning Path Generated
```json
{
  "suggestions": [
    {
      "label": "Start Week 1",
      "icon": "🚀",
      "variant": "green",
      "actions": [{ "type": "external_link", "url": "https://learning-resource.com/week1" }]
    },
    {
      "label": "Set Reminders",
      "icon": "⏰",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Let's set up your learning schedule!\n\n• Daily study time: Morning/Evening?\n• Hours per day: 1/2/3?\n• Days per week: 5/6/7?\n• Milestone check-ins: Weekly/Biweekly?\n\nI'll create a personalized schedule.",
        "compactContent": "Set up learning schedule"
      }
    },
    {
      "label": "Find Study Buddy",
      "icon": "👥",
      "variant": "blue",
      "actions": [{ "type": "external_link", "url": "https://discord.gg/study-group" }],
      "tooltip": "Join study group on Discord"
    },
    {
      "label": "Track Progress",
      "icon": "📈",
      "variant": "cyan",
      "actions": [{ "type": "navigate", "tab": "pipelines" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Set up progress tracking for my learning path",
        "compactContent": "Track learning progress"
      }
    }
  ]
}
```

### Skill Assessment Complete
```json
{
  "suggestions": [
    {
      "label": "Priority Skills",
      "icon": "⭐",
      "variant": "purple",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Based on market demand, focus on these first:\n\n1. **Cloud Computing** (AWS/Azure)\n   - High demand: +45% jobs\n   - 2-month timeline\n\n2. **Container Tech** (Docker/K8s)\n   - High impact: +30% salary\n   - 1-month basics\n\nWhich interests you more?",
        "compactContent": "Choose priority skill to learn"
      }
    },
    {
      "label": "Free Resources",
      "icon": "🆓",
      "variant": "green",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Show me only free learning resources",
        "compactContent": "Find free courses"
      }
    },
    {
      "label": "Quick Wins",
      "icon": "⚡",
      "variant": "blue",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "assistant",
        "content": "Skills you can add THIS WEEK:\n\n• Git/GitHub (2 hours)\n• Basic SQL (4 hours)\n• Markdown (1 hour)\n• Command Line (3 hours)\n\nEach adds value to your resume immediately!",
        "compactContent": "Learn quick skills this week"
      }
    },
    {
      "label": "Certification Path",
      "icon": "🏆",
      "variant": "cyan",
      "actions": [{ "type": "expand_chat" }],
      "suggestedMessage": {
        "role": "user",
        "content": "Show me certification options for my target role",
        "compactContent": "Explore certifications"
      }
    }
  ]
}
```

---

## Usage Notes

### Best Practices
1. **Always include suggestedMessage** for interactive badges
2. **Use appropriate variants**: purple (primary), blue (info), green (success), cyan (secondary)
3. **Combine actions** for complex workflows (navigate + chat)
4. **Provide tooltips** for clarity when needed
5. **Keep labels short** (2-4 words ideal)
6. **Use clear icons** that match the action

### Testing Checklist
- [ ] All JSON validates correctly
- [ ] SuggestedMessages are helpful and specific
- [ ] Actions array contains valid action types
- [ ] Variants use allowed color values
- [ ] File upload includes accept parameter
- [ ] External links include full URLs
- [ ] Download actions include filename
- [ ] Multi-action badges execute in correct order