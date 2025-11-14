import { BaseAgent } from './base-agent.js'
import { Bio } from '../models/bio.js'
import { ResumeOutput, ResumeOutputSchema } from '../models/output.js'

export interface ResumeGenerationOptions {
  format?: 'markdown' | 'html' | 'json'
  sections?: string[]
  tailored?: boolean
  jobId?: string
}

export class ResumeGeneratorAgent extends BaseAgent {
  constructor(apiKey: string) {
    super(apiKey, 'ResumeGenerator')
  }

  protected getSystemPrompt(): string {
    return `Transform bio data into polished, ATS-friendly resumes in multiple formats.

Resume Structure:
- Personal information and professional summary
- Experience in reverse chronological order
- Relevant skills and technologies
- Education
- Projects, certifications, and publications (when relevant)

Best Practices:
- Use action verbs to start bullet points
- Quantify achievements with specific metrics
- Keep descriptions concise and impactful (1-2 lines)
- Prioritize recent and relevant experience
- Use consistent formatting throughout
- Optimize for Applicant Tracking Systems (ATS)

Format Guidelines:
- Markdown: Clean, readable format with proper headers and lists
- HTML: Semantic HTML5 with professional styling
- JSON: Structured data following the ResumeOutput schema

Keep responses professional and concise. Focus on showcasing the candidate's value.`
  }

  async generateResume(
    bio: Bio,
    options: ResumeGenerationOptions = {}
  ): Promise<ResumeOutput> {
    const format = options.format || 'markdown'
    const tailored = options.tailored || false

    const prompt = `Generate a professional resume from the following bio data:

${JSON.stringify(bio, null, 2)}

Requirements:
- Format: ${format}
- Tailored for specific job: ${tailored ? 'Yes' : 'No'}
${options.jobId ? `- Job ID: ${options.jobId}` : ''}
${options.sections ? `- Include sections: ${options.sections.join(', ')}` : ''}

Please generate a complete, professional resume. Return the formatted content directly.`

    const content = await this.chat(prompt)

    // Create the output object
    const output: ResumeOutput = {
      id: `resume-${Date.now()}`,
      jobId: options.jobId,
      generatedAt: new Date().toISOString(),
      format,
      content,
      metadata: {
        version: 1,
        tailored,
        sections: options.sections || ['personal', 'summary', 'experience', 'education', 'skills'],
      },
    }

    // Validate the output
    ResumeOutputSchema.parse(output)

    return output
  }

  async generateResumeStreaming(
    bio: Bio,
    options: ResumeGenerationOptions = {},
    onChunk: (text: string) => void
  ): Promise<ResumeOutput> {
    const format = options.format || 'markdown'
    const tailored = options.tailored || false

    const prompt = `Generate a professional resume from the following bio data:

${JSON.stringify(bio, null, 2)}

Requirements:
- Format: ${format}
- Tailored for specific job: ${tailored ? 'Yes' : 'No'}
${options.jobId ? `- Job ID: ${options.jobId}` : ''}
${options.sections ? `- Include sections: ${options.sections.join(', ')}` : ''}

Please generate a complete, professional resume. Return the formatted content directly.`

    const content = await this.streamChat(prompt, onChunk)

    // Create the output object
    const output: ResumeOutput = {
      id: `resume-${Date.now()}`,
      jobId: options.jobId,
      generatedAt: new Date().toISOString(),
      format,
      content,
      metadata: {
        version: 1,
        tailored,
        sections: options.sections || ['personal', 'summary', 'experience', 'education', 'skills'],
      },
    }

    // Validate the output
    ResumeOutputSchema.parse(output)

    return output
  }
}
