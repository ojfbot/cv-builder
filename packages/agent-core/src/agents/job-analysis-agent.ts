import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import * as z4 from 'zod/v4'
import { BaseAgent } from './base-agent.js'
import { JobListing, JobAnalysis, JobAnalysisSchema } from '../models/job.js'
import { Bio } from '../models/bio.js'

// Response shape for structured-output analysis calls: JobAnalysisSchema minus
// jobId/analyzedAt, which are filled in locally. Authored with zod/v4 because
// the SDK's zodOutputFormat helper requires v4 schemas, while the canonical
// models remain on the classic v3 API — the final JobAnalysisSchema.parse
// below keeps the two from drifting apart.
const JobAnalysisResponseSchema = z4.object({
  keyRequirements: z4.array(
    z4.object({
      skill: z4.string(),
      importance: z4.enum(['critical', 'important', 'nice-to-have']),
      category: z4.enum(['technical', 'soft-skill', 'experience', 'education']),
    })
  ),
  industryTerms: z4.array(z4.string()),
  matchScore: z4.number().min(0).max(100).optional(),
  recommendations: z4.array(z4.string()),
})

// Focused system prompt for structured analysis calls — the streaming system
// prompt (getSystemPrompt) mandates markdown output, which conflicts with
// JSON-constrained responses.
const ANALYSIS_SYSTEM_PROMPT = `You are the Job Analysis Agent for a Resume Builder system.

Your role is to:
1. Analyze job listings to extract key requirements and qualifications
2. Categorize requirements by importance and type
3. Identify industry-specific terminology and keywords
4. Assess candidate fit based on their bio
5. Provide actionable recommendations

When analyzing a job listing:
- Extract both explicit and implicit requirements
- Categorize skills as: technical, soft-skill, experience, or education
- Rank requirements as: critical, important, or nice-to-have
- Identify ATS keywords that should be included in the resume
- Look for required years of experience, certifications, or degrees
- Note company culture indicators and values

When comparing to a candidate's bio:
- Calculate a match score (0-100) based on requirements met
- Identify gaps between requirements and candidate's experience
- Highlight transferable skills that may apply
- Suggest how to frame existing experience to match requirements

Be thorough, objective, and provide specific, actionable insights.`

export class JobAnalysisAgent extends BaseAgent {
  constructor(apiKey: string) {
    super(apiKey, 'JobAnalysis')
  }

  protected getSystemPrompt(): string {
    return `You are the Job Analysis Agent for a Resume Builder system.

## CRITICAL: Markdown Formatting Requirements
**ALL responses MUST use proper GitHub-flavored Markdown from the very first character.**
Start with ## headers, use **bold** for emphasis, use - for lists, use \`\`\` for code blocks.
Output markdown incrementally during streaming - don't wait to format at the end.

## REQUIRED: Include Follow-up Actions

**EVERY response MUST include 2-4 suggested follow-up actions** in metadata:
- After analyzing: "Create Learning Path", "Tailor Resume", "Prepare Interview"
- When missing data: "Add Bio", "Share Job Details", "Show Example"

Your role is to:

1. Analyze job listings to extract key requirements and qualifications
2. Categorize requirements by importance and type
3. Identify industry-specific terminology and keywords
4. Assess candidate fit based on their bio
5. Provide actionable recommendations

When analyzing a job listing:
- Extract both explicit and implicit requirements
- Categorize skills as: technical, soft-skill, experience, or education
- Rank requirements as: critical, important, or nice-to-have
- Identify ATS keywords that should be included in the resume
- Look for required years of experience, certifications, or degrees
- Note company culture indicators and values

When comparing to a candidate's bio:
- Calculate a match score (0-100) based on requirements met
- Identify gaps between requirements and candidate's experience
- Highlight transferable skills that may apply
- Suggest how to frame existing experience to match requirements

Be thorough, objective, and provide specific, actionable insights.`
  }

  private async requestAnalysis(prompt: string, job: JobListing): Promise<JobAnalysis> {
    const response = await this.client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 16000,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      output_config: {
        format: zodOutputFormat(JobAnalysisResponseSchema),
      },
    })

    if (response.stop_reason === 'refusal') {
      throw new Error('Job analysis request was declined by the model.')
    }
    if (!response.parsed_output) {
      throw new Error(
        `Job analysis returned no structured output (stop_reason: ${response.stop_reason})`
      )
    }

    const analysis: JobAnalysis = {
      jobId: job.id,
      analyzedAt: new Date().toISOString(),
      ...response.parsed_output,
    }

    return JobAnalysisSchema.parse(analysis)
  }

  async analyzeJob(job: JobListing): Promise<JobAnalysis> {
    const prompt = `Analyze the following job listing and extract key information:

${JSON.stringify(job, null, 2)}

Provide:
1. Key requirements categorized by technical skills, soft skills, experience, and education
2. For each requirement: the skill name, importance level (critical, important, nice-to-have), and category
3. Industry-specific terms and keywords
4. General recommendations for candidates`

    return await this.requestAnalysis(prompt, job)
  }

  async analyzeJobWithBio(job: JobListing, bio: Bio): Promise<JobAnalysis> {
    const prompt = `Analyze how well this candidate matches the following job listing:

JOB LISTING:
${JSON.stringify(job, null, 2)}

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

Provide:
1. Key requirements from the job, with importance level and category for each
2. A match score (0-100) based on requirements met
3. Industry-specific terms the candidate should use
4. Specific recommendations for tailoring their resume`

    return await this.requestAnalysis(prompt, job)
  }

  async analyzeJobStreaming(
    job: JobListing,
    bio: Bio | null,
    onChunk: (text: string) => void
  ): Promise<string> {
    const prompt = bio
      ? `Analyze how well this candidate matches the following job listing:

JOB LISTING:
${JSON.stringify(job, null, 2)}

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

Provide a detailed analysis including:
- Key requirements and how well the candidate meets them
- Overall match assessment
- Specific recommendations for the candidate
- Keywords to emphasize in their resume`
      : `Analyze the following job listing:

${JSON.stringify(job, null, 2)}

Provide a detailed analysis including:
- Key requirements and qualifications
- Important skills and technologies
- Experience level needed
- Company culture indicators`

    return await this.streamChat(prompt, onChunk)
  }
}
