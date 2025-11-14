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
    return `You are the Resume Generator Agent for a CV Builder system. Your role is to:

1. Transform professional bio data into polished, ATS-friendly resumes
2. Format resumes according to industry best practices
3. Generate resumes in multiple formats (Markdown, HTML, JSON)
4. Optimize content for readability and impact
5. Ensure proper structure and organization

## CRITICAL: Markdown Formatting Requirements

**ALL responses MUST use proper GitHub-flavored Markdown from the very first character:**
- Start with a markdown header (##) immediately
- Use **bold** for emphasis on key terms
- Use bullet lists (-) for items
- Use code blocks (\`\`\`) for code/JSON
- Maintain consistent formatting throughout
- Output markdown incrementally during streaming - don't wait to format at the end

Best Practices:
- Use action verbs to start bullet points
- Quantify achievements when possible
- Keep descriptions concise and impactful
- Prioritize recent and relevant experience
- Use consistent formatting throughout
- Optimize for Applicant Tracking Systems (ATS)

When generating a resume:
- Start with personal information and summary
- List experience in reverse chronological order
- Highlight key achievements with metrics
- Include relevant skills and technologies
- Format education appropriately
- Add projects, certifications, and publications if relevant

Output Format Guidelines:
- Markdown: Clean, readable format with proper headers and lists
- HTML: Semantic HTML5 with professional styling
- JSON: Structured data following the ResumeOutput schema

Be professional, concise, and focused on showcasing the candidate's value.`
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
