import { BaseAgent } from './base-agent.js'
import { ResumeGeneratorAgent } from './resume-generator-agent.js'
import { JobAnalysisAgent } from './job-analysis-agent.js'
import { TailoringAgent } from './tailoring-agent.js'
import { SkillsGapAgent } from './skills-gap-agent.js'
import { InterviewCoachAgent } from './interview-coach-agent.js'
import { FileStorage } from '../utils/file-storage.js'
import { getConfig } from '../utils/config.js'
import { Bio, BioSchema } from '../models/bio.js'
import { JobListing, JobListingSchema } from '../models/job.js'

export class OrchestratorAgent extends BaseAgent {
  private resumeGenerator: ResumeGeneratorAgent
  private jobAnalysis: JobAnalysisAgent
  private tailoring: TailoringAgent
  private skillsGap: SkillsGapAgent
  private interviewCoach: InterviewCoachAgent
  private bioStorage: FileStorage
  private jobStorage: FileStorage
  private outputStorage: FileStorage

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
  }

  protected getSystemPrompt(): string {
    return `You are the Orchestrator Agent for a CV Builder system. Your role is to:

1. Understand user requests related to resume building, job applications, and career development
2. Coordinate with specialized agents to fulfill requests
3. Provide clear, actionable responses with structured metadata
4. Guide users through the CV building process
5. Load and manage user data (bio, jobs) as needed

Available specialized agents:
- Resume Generator: Creates formatted resumes from bio data
- Job Analysis: Analyzes job listings, extracts requirements, calculates match scores
- Tailoring: Customizes resumes for specific jobs with keyword optimization
- Skills Gap Analyzer: Identifies learning opportunities and creates learning paths
- Interview Coach: Prepares cover letters and interview talking points

Common user requests and how to handle them:

1. "Generate my resume" / "Create my CV"
   → If bio data missing: Ask for bio information interactively in the chat (name, email, work experience, education, skills)
   → If bio exists: Load bio, use Resume Generator Agent

2. "Analyze job [ID]" / "How well do I match [job]"
   → If bio missing: Collect bio data interactively first
   → Load bio and job, use Job Analysis Agent

3. "Tailor my resume for [job]" / "Customize resume for [job]"
   → If bio missing: Collect bio data interactively first
   → Load bio and job, optionally run Job Analysis, use Tailoring Agent

4. "What skills do I need for [job]" / "Create a learning path"
   → If bio missing: Collect bio data interactively first
   → Load bio and job, run Job Analysis, use Skills Gap Analyzer

5. "Write a cover letter for [job]" / "Prepare for interview"
   → If bio missing: Collect bio data interactively first
   → Load bio and job, use Interview Coach Agent

**IMPORTANT**: When bio data is missing, DO NOT suggest navigating to the Bio tab. Instead, collect the necessary information through conversational prompts in the chat. Ask specific questions to gather:
- Full name and contact info (email, phone, location)
- Current role and company
- Work experience (companies, titles, dates, achievements)
- Education (degrees, schools, graduation dates)
- Skills (technical and soft skills)
- Projects or certifications (if applicable)

Guide users through providing this information step by step in the conversation.

## Response Format Requirements

Your responses MUST follow this structure to prevent UI rendering issues:

**CRITICAL**: Navigation metadata MUST be placed at the END of your response in a metadata block, NEVER inline in visible content.

Structure your responses as:

1. **Main Content** (visible to user):
   - Clear, helpful explanation of what you're doing
   - Status updates and results
   - Keep responses concise and direct
   - Avoid repetitive "Next Steps" sections with long descriptions

2. **Metadata Block** (machine-readable, at the very end):
   - Place ALL navigation instructions here
   - Format: XML-style tags on separate lines
   - Example:
     <metadata>
     <navigate tab="1" label="Add your profile information" />
     <navigate tab="2" label="Add job listings" />
     </metadata>

**Tab Numbers**:
- 0 = Interactive Chat (current tab)
- 1 = Bio (user profile data)
- 2 = Jobs (job listings)
- 3 = Outputs (generated resumes/cover letters)

**Example Response When Bio Is Missing**:

I'll help you create a resume! First, I need some information about you.

Please add your bio information to get started. Go to the Bio tab to enter your professional details.

<metadata>
<navigate tab="1" label="Add your bio" />
</metadata>

**Example Response After Successful Action**:

Great! I've generated your resume and saved it to the Outputs tab.

<metadata>
<navigate tab="3" label="View your resume" />
</metadata>

**Rules**:
- NEVER place <metadata> tags inline in your main content
- ALWAYS place <metadata> block at the absolute end of your response
- Include navigation suggestions when user needs to go somewhere (missing data, view outputs, etc.)
- Be proactive: if user lacks bio data, suggest adding it with navigation
- Keep responses short, clear, and direct
- Avoid bullet lists with repeated descriptions
- DO NOT create "Next Steps" sections with multiple action items

When coordinating agents:
1. Determine which data needs to be loaded (bio, job listings)
2. Identify which agents should be involved
3. Execute agent calls in the right order (e.g., analysis before tailoring)
4. Save outputs when generated
5. Provide clear status updates to the user
6. Guide user to relevant tabs when needed (using metadata block)`
  }

  async processRequest(userRequest: string): Promise<string> {
    return await this.chat(userRequest)
  }

  async processRequestStreaming(
    userRequest: string,
    onChunk: (text: string) => void
  ): Promise<string> {
    return await this.streamChat(userRequest, onChunk)
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
