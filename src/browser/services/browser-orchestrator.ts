/**
 * Browser Orchestrator Service
 *
 * This is a browser-compatible wrapper around the agent system.
 * It uses BrowserStorage instead of FileStorage for browser compatibility.
 */

import Anthropic from '@anthropic-ai/sdk'
import { BrowserStorage } from '../utils/browser-storage.js'
import { Bio, BioSchema } from '../../models/bio.js'
import { JobListing, JobListingSchema } from '../../models/job.js'
import { ResearchEntry, ResearchEntrySchema } from '../../models/research.js'
import { ALL_TOOLS } from '../../agents/tools.js'

// Tool use interface
interface ToolUse {
  toolName: string
  toolInput: any
}

class BaseAgent {
  protected client: Anthropic
  protected conversationHistory: Array<{ role: 'user' | 'assistant'; content: any }> = []

  constructor(
    protected apiKey: string,
    protected agentName: string
  ) {
    this.client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true
    })
  }

  protected getSystemPrompt(): string {
    return ''
  }

  async chat(message: string): Promise<string> {
    this.conversationHistory.push({
      role: 'user',
      content: message
    })

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.getSystemPrompt(),
      messages: this.conversationHistory
    })

    const assistantMessage = response.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('')

    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage
    })

    return assistantMessage
  }

  async streamChat(
    message: string,
    onChunk: (text: string) => void,
    options?: {
      tools?: Anthropic.Tool[]
      onToolUse?: (toolUse: ToolUse) => void
    }
  ): Promise<string> {
    this.conversationHistory.push({
      role: 'user',
      content: message
    })

    const stream = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.getSystemPrompt(),
      messages: this.conversationHistory,
      tools: options?.tools,
      stream: true
    })

    let fullResponse = ''
    const contentBlocks: Anthropic.ContentBlock[] = []
    let currentToolUse: any = null

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const text = event.delta.text
        fullResponse += text
        onChunk(text)
      } else if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
        currentToolUse = {
          type: 'tool_use',
          id: event.content_block.id,
          name: event.content_block.name,
          input: ''
        }
      } else if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
        if (currentToolUse) {
          currentToolUse.input += event.delta.partial_json
        }
      } else if (event.type === 'content_block_stop' && currentToolUse) {
        try {
          currentToolUse.input = JSON.parse(currentToolUse.input)
        } catch (e) {
          console.error('Failed to parse tool input:', e)
        }
        contentBlocks.push(currentToolUse)
        if (options?.onToolUse) {
          options.onToolUse({
            toolName: currentToolUse.name,
            toolInput: currentToolUse.input
          })
        }
        currentToolUse = null
      }
    }

    if (contentBlocks.length > 0 || fullResponse) {
      const content: any[] = []
      if (fullResponse) {
        content.push({ type: 'text', text: fullResponse })
      }
      content.push(...contentBlocks)

      this.conversationHistory.push({
        role: 'assistant',
        content: content.length === 1 && content[0].type === 'text' ? fullResponse : content
      })
    } else {
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse
      })
    }

    return fullResponse
  }
}

// Stub agent classes (for now, we'll just use the base)
class ResumeGeneratorAgent extends BaseAgent {}
class JobAnalysisAgent extends BaseAgent {}
class TailoringAgent extends BaseAgent {}
class SkillsGapAgent extends BaseAgent {}
class InterviewCoachAgent extends BaseAgent {}

export class BrowserOrchestrator extends BaseAgent {
  private resumeGenerator: ResumeGeneratorAgent
  private jobAnalysis: JobAnalysisAgent
  private tailoring: TailoringAgent
  private skillsGap: SkillsGapAgent
  private interviewCoach: InterviewCoachAgent
  private bioStorage: BrowserStorage
  private jobStorage: BrowserStorage
  private outputStorage: BrowserStorage
  private researchStorage: BrowserStorage
  private onTabChangeRequest?: (tab: number, reason: string) => void

  constructor(apiKey: string, onTabChangeRequest?: (tab: number, reason: string) => void) {
    super(apiKey, 'BrowserOrchestrator')
    this.onTabChangeRequest = onTabChangeRequest

    // Initialize specialized agents
    this.resumeGenerator = new ResumeGeneratorAgent(apiKey, 'ResumeGenerator')
    this.jobAnalysis = new JobAnalysisAgent(apiKey, 'JobAnalysis')
    this.tailoring = new TailoringAgent(apiKey, 'Tailoring')
    this.skillsGap = new SkillsGapAgent(apiKey, 'SkillsGap')
    this.interviewCoach = new InterviewCoachAgent(apiKey, 'InterviewCoach')

    // Initialize browser storage
    this.bioStorage = new BrowserStorage('cv-builder:bio')
    this.jobStorage = new BrowserStorage('cv-builder:jobs')
    this.outputStorage = new BrowserStorage('cv-builder:output')
    this.researchStorage = new BrowserStorage('cv-builder:research')
  }

  protected getSystemPrompt(): string {
    return `You are the Orchestrator Agent for a CV Builder system running in a web browser. Your role is to:

1. Understand user requests related to resume building, job applications, and career development
2. Coordinate with specialized agents to fulfill requests
3. Provide clear, actionable responses in well-formatted markdown
4. Guide users through the CV building process
5. Help manage user data (bio, jobs) stored in the browser
6. Navigate users to appropriate tabs when needed
7. **IMPORTANT**: Pay attention to the current tab context provided in each message

Available tabs in the application:
- Tab 0: Interactive (this chat interface)
- Tab 1: Bio (manage personal bio/profile)
- Tab 2: Jobs (manage job listings)
- Tab 3: Outputs (view generated resumes, cover letters, etc.)
- Tab 4: Research (career research, company intelligence, industry analyses)

**Current Tab Context**: Each user message will be prefixed with [SYSTEM: User is currently on the "X" tab (tab N)]. Use this information to provide context-aware responses. For example:
- If user is on the Bio tab asking "how do I add my info?", explain they're already in the right place
- If user is on Interactive tab asking to add bio, navigate them to Bio tab
- Never tell a user to navigate to a tab they're already on

Available specialized agents:
- Resume Generator: Creates formatted resumes from bio data
- Job Analysis: Analyzes job listings, extracts requirements, calculates match scores
- Tailoring: Customizes resumes for specific jobs with keyword optimization
- Skills Gap Analyzer: Identifies learning opportunities and creates learning paths
- Interview Coach: Prepares cover letters and interview talking points

Available Tools:
- create_research_entry: Create and save research entries (company intelligence, industry analysis, interview prep, etc.) to the Research database
- navigate_to_tab: Navigate users to specific tabs after creating content

When users ask about companies, industries, roles, or want to save career information:
1. Generate comprehensive research content in well-structured markdown
2. Use create_research_entry tool to save it
3. The system will automatically navigate to the Research tab (tab 4)
4. Confirm the action: "I've created a research entry about [topic] and saved it to your Research database."

## Response Formatting Guidelines

IMPORTANT: All your responses are rendered as markdown in the UI. Follow these rules:

1. **Use markdown formatting**:
   - Headers for sections (# ## ###)
   - Bold (**text**) for emphasis
   - Lists (- or 1.) for enumeration
   - Code blocks with language tags for code/resumes
   - Tables when comparing data

2. **For generated resumes**:
   - ALWAYS wrap in a code block with proper extension
   - Use this format: \`\`\`markdown resume.md
   - Example:
     \`\`\`markdown resume.md
     # John Doe
     Email: john@example.com
     ...
     \`\`\`
   - This allows users to easily copy the resume

3. **For cover letters**:
   - Use: \`\`\`markdown cover-letter.md
   - Full letter in the code block

4. **For learning paths or guides**:
   - Use clear headers and lists
   - Organize with sections
   - Use checkboxes for actionable items: - [ ] Task

5. **For code snippets**:
   - Use appropriate language tags: \`\`\`javascript, \`\`\`python, etc.

6. **Be conversational but CONCISE**:
   - Start with a brief summary (1-2 sentences max)
   - Use clear section headers only when needed
   - End with actionable next steps as badges
   - AVOID wordiness - get straight to the point
   - When action is clear, present options without lengthy explanation

7. **ALWAYS include a "Next Steps" section**:
   - End every response with a ## Next Steps section
   - List 3-6 suggested follow-up actions
   - Format as: **Action Name**: Description of what this does
   - For navigation actions, use clear keywords: "Add Bio Data", "Add Job Listing", "View Outputs"
   - Example:
     ## Next Steps
     - **Add Bio Data**: Enter your professional information in the Bio tab
     - **Add Job Listing**: Add a job you're interested in to the Jobs tab
     - **Generate Resume**: Create your professional resume
     - **Tailor Resume**: Customize your resume for a specific job posting

## Common user requests and how to handle them:

1. "Generate my resume" / "Create my CV"
   → Check if bio exists, then use Resume Generator Agent
   → Return resume in \`\`\`markdown resume.md code block
   → If no bio, include in Next Steps: **Add Bio Data**: Enter your professional information in the Bio tab

2. "Analyze job [name]" / "How well do I match [job]"
   → Load bio and job, use Job Analysis Agent
   → Present findings in structured markdown with headers and lists
   → If no job, include in Next Steps: **Add Job Listing**: Add the job you want to analyze in the Jobs tab

3. "Tailor my resume for [job]" / "Customize resume for [job]"
   → Load bio and job, optionally run Job Analysis, use Tailoring Agent
   → Return tailored resume in \`\`\`markdown resume-tailored-[jobname].md
   → Include in Next Steps: **View Outputs**: See your generated resumes in the Outputs tab

4. "What skills do I need for [job]" / "Create a learning path"
   → Load bio and job, run Job Analysis, use Skills Gap Analyzer
   → Present as structured learning path with sections and checkboxes

5. "Write a cover letter for [job]" / "Prepare for interview"
   → Load bio and job, use Interview Coach Agent
   → Cover letter in \`\`\`markdown cover-letter-[jobname].md
   → Include in Next Steps: **View Outputs**: See your cover letter in the Outputs tab

Important notes for browser context:
- Data is stored in browser localStorage, not files
- Guide users to add their bio and job listings through the Bio and Jobs tabs
- Be encouraging and helpful about setting up their data
- Explain that everything is stored locally in their browser for privacy

Your responses should be:
- Well-formatted markdown
- CONCISE and to-the-point (avoid wordiness)
- Action-oriented with badge-ready next steps
- Helpful but brief
- Professional yet friendly
- Include relevant emojis for visual clarity (✅ ❌ 📄 etc.)
- Present options, NEVER auto-execute actions

When you cannot complete a task:
- Explain what data is needed
- Include navigation actions in Next Steps with clear keywords
- Example Next Steps for missing data:
  - **Add Bio Data**: Enter your professional information in the Bio tab
  - **Add Job Listing**: Add a job posting you're interested in
  - **Upload Existing Resume**: If you have one, add the details to your bio

## Tab Navigation

When a user needs to perform actions in a specific tab, navigate them directly:

To navigate to a tab, include this EXACT format in your response:
[NAVIGATE_TO_TAB:1:Update your bio]

Format: [NAVIGATE_TO_TAB:{tab_number}:{brief_reason}]

Examples:
- User asks to update bio → [NAVIGATE_TO_TAB:1:Update your bio]
- User asks to add a job → [NAVIGATE_TO_TAB:2:Add job listing]
- User asks to see generated resumes → [NAVIGATE_TO_TAB:3:View outputs]

**IMPORTANT**: Navigation is IMMEDIATE and DIRECT - no confirmation dialog.
- Keep responses CONCISE when navigating
- Do NOT explain what they'll do in the tab - just navigate
- Do NOT be wordy - state the action and include the navigation tag
- Present ALL next steps as badge-friendly suggestions
- NEVER auto-execute or auto-attempt any action - present options only

Example of good concise navigation response:
"Let's update your bio first. [NAVIGATE_TO_TAB:1:Update bio]"

Example of bad wordy response (AVOID):
"Great question! To help you with that, I'll need to take you to the Bio tab where you can update your profile information. Once there, you'll be able to add details about your experience, education, and skills. Let me navigate you there now. [NAVIGATE_TO_TAB:1:Let's update your bio]"`
  }

  async processRequest(userRequest: string): Promise<string> {
    return await this.chat(userRequest)
  }

  async processRequestStreaming(
    userRequest: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    const response = await this.streamChat(userRequest, onChunk, {
      tools: ALL_TOOLS,
      onToolUse: async (toolUse: ToolUse) => {
        await this.handleToolUse(toolUse)
      }
    })

    // Tab navigation is now handled by suggestion badges, not automatic
    // this.processTabNavigationRequests(response)

    return response
  }

  private async handleToolUse(toolUse: ToolUse): Promise<void> {
    console.log('[BrowserOrchestrator] Tool use detected:', toolUse.toolName, toolUse.toolInput)

    if (toolUse.toolName === 'create_research_entry') {
      await this.createResearchEntry(toolUse.toolInput)
    } else if (toolUse.toolName === 'navigate_to_tab') {
      this.navigateToTab(toolUse.toolInput.tabIndex, toolUse.toolInput.reason)
    }
  }

  private async createResearchEntry(input: any): Promise<void> {
    const now = new Date().toISOString()
    const entry: ResearchEntry = {
      id: crypto.randomUUID(),
      title: input.title,
      type: input.type,
      content: input.content,
      tags: input.tags,
      source: input.source,
      jobId: input.jobId,
      createdAt: now,
      updatedAt: now,
      metadata: {}
    }

    // Validate with Zod
    const validated = ResearchEntrySchema.parse(entry)

    // Save to browser research storage
    await this.researchStorage.write(`${validated.id}.json`, validated)

    console.log('[BrowserOrchestrator] Research entry created:', validated.id)

    // Automatically navigate to Research tab
    this.navigateToTab(4, 'View your new research entry')
  }

  private navigateToTab(tabIndex: number, reason: string): void {
    console.log('[BrowserOrchestrator] Navigating to tab:', tabIndex, reason)
    if (this.onTabChangeRequest) {
      this.onTabChangeRequest(tabIndex, reason)
    }
  }

  private processTabNavigationRequests(response: string): void {
    // Look for [NAVIGATE_TO_TAB:number:reason] pattern
    const navRegex = /\[NAVIGATE_TO_TAB:(\d+):([^\]]+)\]/g
    let match

    while ((match = navRegex.exec(response)) !== null) {
      const tabNumber = parseInt(match[1], 10)
      const reason = match[2].trim()

      if (this.onTabChangeRequest && tabNumber >= 0 && tabNumber <= 3) {
        this.onTabChangeRequest(tabNumber, reason)
        break // Only process the first navigation request
      }
    }
  }

  // Helper methods for loading data
  async loadBio(): Promise<Bio> {
    try {
      const bioData = await this.bioStorage.read<Bio>('bio.json')
      return BioSchema.parse(bioData)
    } catch (error) {
      throw new Error('Bio not found. Please create your bio in the Bio tab first.')
    }
  }

  async saveBio(bio: Bio): Promise<void> {
    BioSchema.parse(bio) // Validate before saving
    await this.bioStorage.write('bio.json', bio)
  }

  async loadJob(jobId: string): Promise<JobListing> {
    try {
      const jobData = await this.jobStorage.read<JobListing>(`${jobId}.json`)
      return JobListingSchema.parse(jobData)
    } catch (error) {
      throw new Error(`Job listing "${jobId}" not found. Please add it in the Jobs tab.`)
    }
  }

  async saveJob(job: JobListing): Promise<void> {
    JobListingSchema.parse(job) // Validate before saving
    await this.jobStorage.write(`${job.id}.json`, job)
  }

  async listJobs(): Promise<string[]> {
    const keys = await this.jobStorage.list('')
    return keys.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
  }

  // Expose specialized agents for direct use
  getResumeGenerator(): ResumeGeneratorAgent {
    return this.resumeGenerator
  }

  getJobAnalysis(): JobAnalysisAgent {
    return this.jobAnalysis
  }

  getTailoring(): TailoringAgent {
    return this.tailoring
  }

  getSkillsGap(): SkillsGapAgent {
    return this.skillsGap
  }

  getInterviewCoach(): InterviewCoachAgent {
    return this.interviewCoach
  }

  // Storage access
  getBioStorage(): BrowserStorage {
    return this.bioStorage
  }

  getJobStorage(): BrowserStorage {
    return this.jobStorage
  }

  getOutputStorage(): BrowserStorage {
    return this.outputStorage
  }
}
