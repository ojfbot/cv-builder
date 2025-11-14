import { BaseAgent, ToolUse } from './base-agent.js'
import { ResumeGeneratorAgent } from './resume-generator-agent.js'
import { JobAnalysisAgent } from './job-analysis-agent.js'
import { TailoringAgent } from './tailoring-agent.js'
import { SkillsGapAgent } from './skills-gap-agent.js'
import { InterviewCoachAgent } from './interview-coach-agent.js'
import { FileStorage } from '../utils/file-storage.js'
import { getConfig } from '../utils/config.js'
import { Bio, BioSchema } from '../models/bio.js'
import { JobListing, JobListingSchema } from '../models/job.js'
import { ResearchEntry, ResearchEntrySchema } from '../models/research.js'
import { ALL_TOOLS } from './tools.js'

export class OrchestratorAgent extends BaseAgent {
  private resumeGenerator: ResumeGeneratorAgent
  private jobAnalysis: JobAnalysisAgent
  private tailoring: TailoringAgent
  private skillsGap: SkillsGapAgent
  private interviewCoach: InterviewCoachAgent
  private bioStorage: FileStorage
  private jobStorage: FileStorage
  private outputStorage: FileStorage
  private researchStorage: FileStorage
  private tempResearchStorage: FileStorage
  private tabChangeCallback?: (tab: number, reason: string) => void

  constructor(apiKey: string) {
    super(apiKey, 'Orchestrator')

    // Initialize specialized agents
    this.resumeGenerator = new ResumeGeneratorAgent(apiKey)
    this.jobAnalysis = new JobAnalysisAgent(apiKey)
    this.tailoring = new TailoringAgent(apiKey)
    this.skillsGap = new SkillsGapAgent(apiKey)
    this.interviewCoach = new InterviewCoachAgent(apiKey)

    // Initialize storage
    const config = getConfig()
    this.bioStorage = new FileStorage(config.bioDir)
    this.jobStorage = new FileStorage(config.jobsDir)
    this.outputStorage = new FileStorage(config.outputDir)
    this.researchStorage = new FileStorage(config.researchDir)
    this.tempResearchStorage = new FileStorage(config.tempDir + '/research')
  }

  setTabChangeCallback(callback: (tab: number, reason: string) => void) {
    this.tabChangeCallback = callback
  }

  protected getSystemPrompt(): string {
    return `Coordinate specialized agents to help users with resume building, job applications, and career development.

Available Agents:
- Resume Generator: Creates formatted resumes from bio data
- Job Analysis: Analyzes job listings, extracts requirements, calculates match scores
- Tailoring: Customizes resumes for specific jobs with keyword optimization
- Skills Gap Analyzer: Identifies learning opportunities and creates learning paths
- Interview Coach: Prepares cover letters and interview talking points

Available Tools:
- create_research_entry: Create and save research entries (company intelligence, industry analysis, interview prep, etc.)
- navigate_to_tab: Navigate users to specific tabs after creating content

Common Workflows:

"Generate my resume" / "Create my CV"
→ Load bio, use Resume Generator

"Analyze job [ID]" / "How well do I match [job]"
→ Load bio and job, use Job Analysis

"Tailor my resume for [job]" / "Customize resume for [job]"
→ Load bio and job, optionally run Job Analysis, use Tailoring Agent

"What skills do I need for [job]" / "Create a learning path"
→ Load bio and job, run Job Analysis, use Skills Gap Analyzer

"Write a cover letter for [job]" / "Prepare for interview"
→ Load bio and job, use Interview Coach

"Research [company]" / "Tell me about [company]" / "Analyze [industry]"
→ Generate comprehensive research content, use create_research_entry tool to save it, then navigate to Research tab

Research Creation Guidelines:
- When users ask about companies, industries, roles, salaries, or want to save career information, use the create_research_entry tool
- Generate comprehensive, well-structured markdown content with headings, bullet points, and detailed information
- Choose appropriate type (company_intelligence, industry_analysis, role_research, salary_data, interview_prep, market_trends, best_practices, other)
- Include relevant tags for categorization
- After creating research, the system will automatically navigate to the Research tab (tab 4)
- Explain to the user what you've created and that it's been saved to their research database

Coordination Process:
1. Determine which data to load (bio, job listings)
2. Identify which agents to involve
3. Execute agent calls in the right order (e.g., analysis before tailoring)
4. Save outputs when generated using appropriate tools
5. Provide clear status updates

Keep responses clear, concise, and action-oriented. Be helpful and professional. When creating research entries, confirm the action with the user: "I've created a research entry about [topic] and saved it to your Research database."`
  }

  async processRequest(userRequest: string): Promise<string> {
    return await this.chat(userRequest)
  }

  async processRequestStreaming(
    userRequest: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    return await this.streamChat(userRequest, onChunk, {
      tools: ALL_TOOLS,
      onToolUse: async (toolUse: ToolUse) => {
        await this.handleToolUse(toolUse)
      }
    })
  }

  private async handleToolUse(toolUse: ToolUse): Promise<void> {
    console.log('[OrchestratorAgent] Tool use detected:', toolUse.toolName, toolUse.toolInput)

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

    // Save to temp research storage
    await this.tempResearchStorage.write(`${validated.id}.json`, validated)

    console.log('[OrchestratorAgent] Research entry created:', validated.id)

    // Automatically navigate to Research tab
    this.navigateToTab(4, 'View your new research entry')
  }

  private navigateToTab(tabIndex: number, reason: string): void {
    console.log('[OrchestratorAgent] Navigating to tab:', tabIndex, reason)
    if (this.tabChangeCallback) {
      this.tabChangeCallback(tabIndex, reason)
    }
  }

  // Helper methods for loading data
  async loadBio(): Promise<Bio> {
    try {
      const bioData = await this.bioStorage.read<Bio>('bio.json')
      return BioSchema.parse(bioData)
    } catch (error) {
      throw new Error('Bio not found. Please create your bio first.')
    }
  }

  async loadJob(jobId: string): Promise<JobListing> {
    try {
      const jobData = await this.jobStorage.read<JobListing>(`${jobId}.json`)
      return JobListingSchema.parse(jobData)
    } catch (error) {
      throw new Error(`Job listing "${jobId}" not found.`)
    }
  }

  async listJobs(): Promise<string[]> {
    const files = await this.jobStorage.list('')
    return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
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
  getBioStorage(): FileStorage {
    return this.bioStorage
  }

  getJobStorage(): FileStorage {
    return this.jobStorage
  }

  getOutputStorage(): FileStorage {
    return this.outputStorage
  }
}
