/**
 * Browser Orchestrator Service
 *
 * This is a browser-compatible wrapper around the agent system.
 * It avoids Node.js-specific dependencies like fs and path.
 */

import {
  BaseAgent,
  ResumeGeneratorAgent,
  JobAnalysisAgent,
  TailoringAgent,
  SkillsGapAgent,
  InterviewCoachAgent,
  Bio,
  BioSchema,
  JobListing,
  JobListingSchema
} from '@cv-builder/agent-core'
import { BrowserStorage } from '../utils/browser-storage.js'

export class BrowserOrchestrator extends BaseAgent {
  private resumeGenerator: ResumeGeneratorAgent
  private jobAnalysis: JobAnalysisAgent
  private tailoring: TailoringAgent
  private skillsGap: SkillsGapAgent
  private interviewCoach: InterviewCoachAgent
  private bioStorage: BrowserStorage
  private jobStorage: BrowserStorage
  private outputStorage: BrowserStorage

  constructor(apiKey: string, _onTabChangeRequest?: (tab: number, reason: string) => void) {
    super(apiKey, 'BrowserOrchestrator')

    // Initialize specialized agents
    this.resumeGenerator = new ResumeGeneratorAgent(apiKey)
    this.jobAnalysis = new JobAnalysisAgent(apiKey)
    this.tailoring = new TailoringAgent(apiKey)
    this.skillsGap = new SkillsGapAgent(apiKey)
    this.interviewCoach = new InterviewCoachAgent(apiKey)

    // Initialize browser storage
    this.bioStorage = new BrowserStorage('cv-builder:bio')
    this.jobStorage = new BrowserStorage('cv-builder:jobs')
    this.outputStorage = new BrowserStorage('cv-builder:output')
  }

  protected getSystemPrompt(): string {
    return `You are the Orchestrator Agent for a CV Builder system running in a web browser. Your role is to:

1. Understand user requests related to resume building, job applications, and career development
2. Coordinate with specialized agents to fulfill requests
3. Provide clear, actionable responses in well-formatted markdown
4. Guide users through the CV building process
5. Help manage user data (bio, jobs) stored in the browser
6. Navigate users to appropriate tabs when needed

Available tabs in the application:
- Tab 0: Interactive (this chat interface)
- Tab 1: Bio (manage personal bio/profile)
- Tab 2: Jobs (manage job listings)
- Tab 3: Outputs (view generated resumes, cover letters, etc.)
- Tab 4: Research (industry trends, salary data, job market insights)
- Tab 5: Pipelines (automated job application workflows)
- Tab 6: Toolbox (custom actions, agents, and automation tools)

Available specialized agents:
- Resume Generator: Creates formatted resumes from bio data
- Job Analysis: Analyzes job listings, extracts requirements, calculates match scores
- Tailoring: Customizes resumes for specific jobs with keyword optimization
- Skills Gap Analyzer: Identifies learning opportunities and creates learning paths
- Interview Coach: Prepares cover letters and interview talking points

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
   - Example:
     ## Next Steps
     - **Tailor Resume**: Customize your resume for a specific job posting
     - **Create Cover Letter**: Generate a personalized cover letter
     - **Analyze Skills Gap**: Identify areas for improvement

## Common user requests and how to handle them:

1. "Generate my resume" / "Create my CV"
   → Check if bio exists, then use Resume Generator Agent
   → Return resume in \`\`\`markdown resume.md code block
   → If no bio, guide user to Bio tab first

2. "Analyze job [name]" / "How well do I match [job]"
   → Load bio and job, use Job Analysis Agent
   → Present findings in structured markdown with headers and lists

3. "Tailor my resume for [job]" / "Customize resume for [job]"
   → Load bio and job, optionally run Job Analysis, use Tailoring Agent
   → Return tailored resume in \`\`\`markdown resume-tailored-[jobname].md

4. "What skills do I need for [job]" / "Create a learning path"
   → Load bio and job, run Job Analysis, use Skills Gap Analyzer
   → Present as structured learning path with sections and checkboxes

5. "Write a cover letter for [job]" / "Prepare for interview"
   → Load bio and job, use Interview Coach Agent
   → Cover letter in \`\`\`markdown cover-letter-[jobname].md

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
- Guide the user on how to add it through the UI tabs
- Offer to help once the data is available

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
    const response = await this.streamChat(userRequest, onChunk)
    // Tab navigation is now handled by suggestion badges in the UI
    return response
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
