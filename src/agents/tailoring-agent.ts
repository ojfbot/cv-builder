import { BaseAgent } from './base-agent.js'
import { Bio } from '../models/bio.js'
import { JobListing, JobAnalysis } from '../models/job.js'
import { ResumeOutput, ResumeOutputSchema } from '../models/output.js'

export interface TailoringOptions {
  format?: 'markdown' | 'html' | 'json'
  emphasizeSkills?: string[]
  prioritizeSections?: string[]
}

export class TailoringAgent extends BaseAgent {
  constructor(apiKey: string) {
    super(apiKey, 'Tailoring')
  }

  protected getSystemPrompt(): string {
    return `Customize resumes to match specific job requirements through keyword optimization and strategic reframing.

When tailoring resumes:
- Mirror keywords from the job description naturally
- Emphasize relevant experience and de-emphasize less relevant items
- Reorder bullet points to put most relevant achievements first
- Use industry-specific terminology from the job posting
- Quantify achievements that align with job requirements
- Adjust the professional summary to match the role
- Ensure ATS compatibility while maintaining readability

Role-Specific Strategies:
- Technical roles: Emphasize technical skills, projects, and relevant tools
- Leadership roles: Highlight team management, strategic initiatives, and impact
- Entry-level roles: Focus on projects, education, and transferable skills
- Career transitions: Emphasize transferable skills and relevant achievements

Balance optimization with authenticity - never fabricate experience, only reframe and emphasize what's already there.`
  }

  async tailorResume(
    bio: Bio,
    job: JobListing,
    analysis?: JobAnalysis,
    options: TailoringOptions = {}
  ): Promise<ResumeOutput> {
    const format = options.format || 'markdown'

    const prompt = `Tailor this resume for the specific job listing:

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

JOB LISTING:
${JSON.stringify(job, null, 2)}

${analysis ? `JOB ANALYSIS:
${JSON.stringify(analysis, null, 2)}` : ''}

Requirements:
- Format: ${format}
- Generate a tailored resume that:
  1. Mirrors keywords from the job description
  2. Emphasizes relevant experience and skills
  3. Reorders content to prioritize what matters most for this role
  4. Uses terminology from the job posting
  5. Optimizes for ATS while remaining readable
${options.emphasizeSkills ? `- Particularly emphasize these skills: ${options.emphasizeSkills.join(', ')}` : ''}
${options.prioritizeSections ? `- Prioritize these sections: ${options.prioritizeSections.join(', ')}` : ''}

Return the complete tailored resume content directly.`

    const content = await this.chat(prompt)

    const output: ResumeOutput = {
      id: `resume-tailored-${job.id}-${Date.now()}`,
      jobId: job.id,
      generatedAt: new Date().toISOString(),
      format,
      content,
      metadata: {
        version: 1,
        tailored: true,
        sections: options.prioritizeSections || ['personal', 'summary', 'experience', 'skills', 'education'],
      },
      notes: `Tailored for ${job.title} at ${job.company}`,
    }

    // Validate the output
    ResumeOutputSchema.parse(output)

    return output
  }

  async tailorResumeStreaming(
    bio: Bio,
    job: JobListing,
    analysis: JobAnalysis | undefined,
    options: TailoringOptions = {},
    onChunk: (text: string) => void
  ): Promise<ResumeOutput> {
    const format = options.format || 'markdown'

    const prompt = `Tailor this resume for the specific job listing:

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

JOB LISTING:
${JSON.stringify(job, null, 2)}

${analysis ? `JOB ANALYSIS:
${JSON.stringify(analysis, null, 2)}` : ''}

Requirements:
- Format: ${format}
- Generate a tailored resume that:
  1. Mirrors keywords from the job description
  2. Emphasizes relevant experience and skills
  3. Reorders content to prioritize what matters most for this role
  4. Uses terminology from the job posting
  5. Optimizes for ATS while remaining readable
${options.emphasizeSkills ? `- Particularly emphasize these skills: ${options.emphasizeSkills.join(', ')}` : ''}
${options.prioritizeSections ? `- Prioritize these sections: ${options.prioritizeSections.join(', ')}` : ''}

Return the complete tailored resume content directly.`

    const content = await this.streamChat(prompt, onChunk)

    const output: ResumeOutput = {
      id: `resume-tailored-${job.id}-${Date.now()}`,
      jobId: job.id,
      generatedAt: new Date().toISOString(),
      format,
      content,
      metadata: {
        version: 1,
        tailored: true,
        sections: options.prioritizeSections || ['personal', 'summary', 'experience', 'skills', 'education'],
      },
      notes: `Tailored for ${job.title} at ${job.company}`,
    }

    // Validate the output
    ResumeOutputSchema.parse(output)

    return output
  }

  async getTailoringRecommendations(
    bio: Bio,
    job: JobListing,
    analysis: JobAnalysis
  ): Promise<string> {
    const prompt = `Based on this candidate's bio and job analysis, provide specific recommendations for tailoring their resume:

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

JOB LISTING:
${JSON.stringify(job, null, 2)}

JOB ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Provide specific, actionable recommendations such as:
- Which experiences to emphasize
- How to reframe bullet points
- Keywords to incorporate
- Sections to prioritize
- Skills to highlight
- Any gaps to address`

    return await this.chat(prompt)
  }
}
