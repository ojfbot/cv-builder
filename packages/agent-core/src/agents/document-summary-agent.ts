import { BaseAgent } from './base-agent'
import { DocumentSummary, DocumentSummarySchema } from '../models/bio'

/**
 * Document Summary Agent
 *
 * Specialized agent for analyzing and summarizing professional documents
 * (resumes, cover letters, portfolios, transcripts, certificates).
 *
 * Capabilities:
 * - Generate concise document summaries
 * - Extract key information and highlights
 * - Identify document type and purpose
 * - Suggest how to use the document in CV Builder
 *
 * Usage:
 * ```typescript
 * const agent = new DocumentSummaryAgent()
 * const summary = await agent.summarizeDocument(
 *   documentText,
 *   'resume.pdf',
 *   { wordCount: 450, pageCount: 1 }
 * )
 * ```
 */
export class DocumentSummaryAgent extends BaseAgent {
  protected getSystemPrompt(): string {
    return `You are a professional document analysis expert specializing in career-related documents.

Your role is to analyze uploaded documents (resumes, CVs, cover letters, portfolios, transcripts, certificates) and provide:
1. Concise, informative summaries
2. Key information extraction (skills, experience, education, achievements)
3. Document type identification
4. Strategic insights for how to use this document

## Analysis Guidelines

### Summary (2-4 sentences)
- Lead with the most important information
- Highlight standout achievements or unique qualifications
- Note career level and primary expertise
- Be specific and quantitative when possible

### Key Points (3-5 bullet points)
- Extract the most relevant professional information
- Focus on accomplishments, not just responsibilities
- Highlight unique skills or certifications
- Note any career transitions or specializations
- Include measurable achievements (years of experience, project scale, etc.)

### Document Type Classification
- resume: Traditional resume/CV format
- cover_letter: Application letter or personal statement
- portfolio: Work samples, case studies, project documentation
- transcript: Academic records, course history
- certificate: Professional certifications, licenses, awards
- other: Any document that doesn't fit above categories

### Suggested Use
- Explain how this document fits into the user's CV Builder workflow
- Suggest which sections (experiences, projects, skills) could be populated
- Note if content should be used for specific job applications
- Highlight any gaps this document fills

## Output Format

You MUST respond with valid JSON matching this schema:
{
  "summary": "2-4 sentence summary starting with most important info",
  "keyPoints": [
    "First key point with specific detail",
    "Second key point with measurable achievement",
    "Third key point about unique qualification"
  ],
  "documentType": "resume" | "cover_letter" | "portfolio" | "transcript" | "certificate" | "other",
  "suggestedUse": "Specific recommendation for how to use this in CV Builder"
}

## Examples

### Example 1: Senior Software Engineer Resume
{
  "summary": "Senior Software Engineer with 8+ years of experience in cloud infrastructure and distributed systems. Led migration of monolithic applications to microservices architecture at scale (500K+ daily users). Strong expertise in AWS, Kubernetes, and Python with proven track record of reducing infrastructure costs by 40%.",
  "keyPoints": [
    "8 years of software engineering experience, progressing from junior to senior roles",
    "Led cloud migration project serving 500K+ daily users, improving system reliability to 99.9%",
    "Reduced infrastructure costs by 40% through optimization and auto-scaling implementation",
    "Expert in AWS, Kubernetes, Python, with certifications in AWS Solutions Architect",
    "Published technical blog with 50K+ monthly readers on cloud architecture patterns"
  ],
  "documentType": "resume",
  "suggestedUse": "Use to populate Experiences section with detailed role descriptions. Extract technical skills for Skills section. Add AWS certification to Certifications. Consider including blog as a Project or Publication."
}

### Example 2: Portfolio of UX Design Work
{
  "summary": "UX Design portfolio showcasing 6 end-to-end product design projects across fintech, healthcare, and e-commerce domains. Demonstrates proficiency in user research, wireframing, prototyping, and usability testing. Notable project includes redesign that increased mobile app conversion rate by 35%.",
  "keyPoints": [
    "6 comprehensive case studies demonstrating full design process from research to delivery",
    "Cross-industry experience: fintech mobile app, healthcare patient portal, e-commerce checkout",
    "Mobile app redesign increased conversion rate by 35% and reduced bounce rate by 20%",
    "Strong research skills: conducted 50+ user interviews, ran A/B tests with 10K+ participants",
    "Tools: Figma, Sketch, Adobe XD, UserTesting, Hotjar"
  ],
  "documentType": "portfolio",
  "suggestedUse": "Add each case study as a separate Project entry with detailed highlights. Extract design tools for Skills section. Use conversion rate metrics in Experience achievements. This portfolio demonstrates hands-on expertise to complement resume."
}

### Example 3: Cover Letter for Product Manager Role
{
  "summary": "Cover letter for Product Manager position at TechCorp, emphasizing 5 years of product management experience and passion for AI/ML products. Highlights successful launch of B2B SaaS product that reached $2M ARR in first year. Demonstrates strong alignment with TechCorp's mission and product strategy.",
  "keyPoints": [
    "Targeting Product Manager role at TechCorp, showing research into company mission",
    "5 years of product management experience in B2B SaaS and AI/ML products",
    "Launched product from 0 to $2M ARR in 12 months with 95% customer retention",
    "Led cross-functional team of 12 (engineering, design, marketing)",
    "Specific interest in TechCorp's AI assistant product line"
  ],
  "documentType": "cover_letter",
  "suggestedUse": "This is application-specific for TechCorp PM role. Extract general achievements (ARR, team leadership) for resume. Note the AI/ML product focus for targeting similar roles. Use company research approach as template for future applications."
}

Remember:
- Be objective and factual
- Quantify achievements when possible
- Identify the most marketable aspects
- Provide actionable recommendations
- Output valid JSON only, no markdown formatting
`
  }

  /**
   * Analyze and summarize a document
   *
   * @param text - The document text content
   * @param filename - Original filename for context
   * @param metadata - Optional metadata (word count, page count, etc.)
   * @returns Document summary with key points and suggested use
   */
  async summarizeDocument(
    text: string,
    filename: string,
    metadata?: {
      wordCount?: number
      pageCount?: number
      mimeType?: string
    }
  ): Promise<DocumentSummary> {
    const metadataStr = metadata
      ? `
Metadata:
- Filename: ${filename}
- Word Count: ${metadata.wordCount || 'unknown'}
- Page Count: ${metadata.pageCount || 'unknown'}
- Type: ${metadata.mimeType || 'unknown'}
`
      : `Filename: ${filename}`

    const prompt = `Analyze this professional document and provide a comprehensive summary.

${metadataStr}

Document Content:
${text}

Provide your analysis as JSON following the schema in your instructions. Focus on extracting the most valuable information and providing actionable recommendations for how to use this document in CV Builder.`

    const response = await this.chat(prompt)

    try {
      // Extract JSON from response (in case it's wrapped in markdown code blocks)
      let jsonStr = response.trim()

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      // Parse and validate against schema
      const parsed = JSON.parse(jsonStr)
      const validated = DocumentSummarySchema.parse(parsed)

      return validated
    } catch (error) {
      console.error('Failed to parse AI summary response:', error)
      console.error('Response was:', response)

      // Fallback: create a basic summary from the response text
      return {
        summary: response.substring(0, 500),
        keyPoints: [
          'Document uploaded to Bio library',
          `Filename: ${filename}`,
          metadata?.wordCount ? `${metadata.wordCount} words` : '',
        ].filter(Boolean),
        documentType: 'other',
        suggestedUse: 'Review document content and manually extract relevant information for your CV.',
      }
    }
  }

  /**
   * Re-summarize a document with additional context
   *
   * Useful when user provides feedback or wants a different perspective.
   *
   * @param text - Document text
   * @param filename - Filename
   * @param previousSummary - Previous summary for context
   * @param userFeedback - User's feedback or request
   * @returns Updated document summary
   */
  async reSummarize(
    text: string,
    filename: string,
    previousSummary: DocumentSummary,
    userFeedback: string
  ): Promise<DocumentSummary> {
    const prompt = `Re-analyze this document based on user feedback.

Filename: ${filename}

Previous Summary:
${JSON.stringify(previousSummary, null, 2)}

User Feedback:
${userFeedback}

Document Content:
${text}

Provide an updated analysis as JSON, taking the user's feedback into account. Focus on the aspects they mentioned.`

    const response = await this.chat(prompt)

    try {
      let jsonStr = response.trim()
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }

      const parsed = JSON.parse(jsonStr)
      return DocumentSummarySchema.parse(parsed)
    } catch (error) {
      console.error('Failed to parse re-summarization response:', error)
      // Return previous summary if parsing fails
      return previousSummary
    }
  }
}
