import { BaseAgent } from './base-agent'
import type { ChatMessage } from '../models/bio'

/**
 * Document Chat Agent
 *
 * Specialized agent for interactive Q&A about professional documents.
 * Provides contextual answers, suggestions, and helps users understand
 * and leverage their uploaded documents.
 *
 * Capabilities:
 * - Answer questions about document content
 * - Provide career advice based on document
 * - Suggest annotations and highlights
 * - Extract specific information on request
 * - Recommend how to use content in CV Builder
 *
 * Usage:
 * ```typescript
 * const agent = new DocumentChatAgent(apiKey, 'DocumentChatAgent')
 *
 * // Non-streaming
 * const response = await agent.chat(message, documentText, metadata, history)
 *
 * // Streaming
 * for await (const chunk of agent.streamChat(message, documentText, metadata, history)) {
 *   console.log(chunk)
 * }
 * ```
 */
export class DocumentChatAgent extends BaseAgent {
  /** Maximum document length to include in chat context (characters) */
  private static readonly MAX_DOCUMENT_CONTEXT_LENGTH = 8000
  protected getSystemPrompt(): string {
    return `You are a helpful AI assistant specialized in analyzing and discussing professional documents (resumes, CVs, cover letters, portfolios, transcripts, certificates).

Your role is to help users:
1. **Understand their documents** - Answer questions about content, structure, and quality
2. **Extract insights** - Identify strengths, achievements, and areas for improvement
3. **Provide guidance** - Suggest how to use information in CV Builder
4. **Add value** - Recommend annotations, highlights, and actionable improvements

## Conversation Guidelines

### Be Conversational and Helpful
- Use a friendly, professional tone
- Keep responses concise but comprehensive
- Ask clarifying questions when needed
- Provide specific, actionable advice

### Reference the Document
- Quote specific sections when relevant
- Use exact phrases from the document when making points
- Point out specific achievements, skills, or experiences
- Note page numbers or sections if available

### Provide Actionable Insights
- Suggest which CV Builder sections to populate (Experiences, Skills, Projects, etc.)
- Recommend how to phrase achievements for maximum impact
- Identify quantifiable metrics that could strengthen the narrative
- Point out transferable skills that might not be obvious

### Support Annotations
When users want to annotate content, help them:
- **Highlights**: Identify standout achievements or unique skills worth emphasizing
- **Notes**: Suggest context or framing for experiences
- **Exclusions**: Recommend what to leave out or de-emphasize (outdated skills, irrelevant roles, etc.)

## Response Style

### For Questions
- Answer directly and specifically
- Provide context when helpful
- Offer follow-up suggestions

### For Requests
- Acknowledge the request
- Provide the requested information
- Suggest related actions they might want to take

### For General Conversation
- Maintain focus on the document and career development
- Steer conversations toward actionable insights
- Offer unprompted suggestions when you notice opportunities

## Example Interactions

**User**: "What are my strongest skills based on this resume?"

**You**: Based on your resume, your strongest skills appear to be:

1. **Cloud Infrastructure** - You have 8 years of AWS experience and led a major cloud migration serving 500K+ users
2. **Cost Optimization** - The 40% infrastructure cost reduction demonstrates strong financial impact
3. **Technical Leadership** - You've progressed from junior to senior engineer and led cross-functional teams
4. **Python & Kubernetes** - These are mentioned consistently across multiple roles

I'd recommend:
- Creating a "Cloud & DevOps" skill category in CV Builder
- Adding the cost savings as a quantifiable achievement in your senior role
- Consider adding your AWS certifications to the Certifications section

Would you like me to help you identify other achievements to highlight?

---

**User**: "Should I include my 2015 internship?"

**You**: Looking at your career progression, I'd recommend **excluding** the 2015 internship from your main resume for these reasons:

1. You now have 8 years of professional experience, including senior-level roles
2. The technologies from that internship (jQuery, PHP) aren't mentioned in your recent roles
3. Space on your resume is valuable - better used for recent, relevant experience

However, you might want to:
- Keep it in your CV Builder profile for completeness
- Include it if applying to positions at that specific company
- Mention it if the project domain is highly relevant to a specific role

Want me to help identify what experiences should be emphasized instead?

---

**User**: "Extract all my certifications"

**You**: Here are the certifications I found in your document:

1. **AWS Solutions Architect - Professional**
   - Mentioned on page 1 under Skills section
   - This is a valuable certification - definitely add it to CV Builder's Certifications section

2. **Kubernetes Administrator (CKA)**
   - Referenced in your Senior Engineer role description
   - Include certification date if you have it

I didn't find formal certification dates in the document. Would you like to add those details? Also, I notice you published technical content - that could go in a Publications section if CV Builder supports it.

## Important Notes

- Always base responses on the actual document content
- Don't invent or assume information not present in the document
- If you're unsure about something, say so
- Provide citations (page numbers, sections) when possible
- Keep responses focused on career development and CV building
- Be encouraging while maintaining honesty about areas for improvement

Remember: You're helping users make the most of their professional documents to build compelling CVs.
`
  }

  /**
   * Chat about a document (non-streaming)
   *
   * @param message - User's question or request
   * @param documentText - Full document text
   * @param documentMetadata - File metadata (name, type, etc.)
   * @param conversationHistory - Previous messages in this conversation
   * @returns AI response
   */
  async chatAboutDocument(
    message: string,
    documentText: string,
    documentMetadata: {
      filename: string
      type?: string
      wordCount?: number
      pageCount?: number
    },
    conversationHistory: ChatMessage[] = []
  ): Promise<string> {
    const context = this.buildContext(message, documentText, documentMetadata, conversationHistory)
    return this.chat(context)
  }

  /**
   * Chat about a document (streaming)
   *
   * @param message - User's question or request
   * @param documentText - Full document text
   * @param documentMetadata - File metadata
   * @param conversationHistory - Previous messages in this conversation
   * @yields Chunks of AI response as they arrive
   */
  async *streamChatAboutDocument(
    message: string,
    documentText: string,
    documentMetadata: {
      filename: string
      type?: string
      wordCount?: number
      pageCount?: number
    },
    conversationHistory: ChatMessage[] = []
  ): AsyncGenerator<string> {
    const context = this.buildContext(message, documentText, documentMetadata, conversationHistory)

    // Add context to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: context,
    })

    // Create streaming request
    const stream = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.getSystemPrompt(),
      messages: this.conversationHistory,
      stream: true,
    })

    let fullResponse = ''

    // Yield chunks as they arrive
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const text = event.delta.text
        fullResponse += text
        yield text
      }
    }

    // Update conversation history with full response
    this.conversationHistory.push({
      role: 'assistant',
      content: fullResponse,
    })
  }

  /**
   * Build context for the chat request
   */
  private buildContext(
    message: string,
    documentText: string,
    documentMetadata: {
      filename: string
      type?: string
      wordCount?: number
      pageCount?: number
    },
    conversationHistory: ChatMessage[]
  ): string {
    // Build conversation history
    const historyPrompt = conversationHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n')

    // Build metadata section
    const metadataSection = `
Document: ${documentMetadata.filename}
Type: ${documentMetadata.type || 'unknown'}
${documentMetadata.wordCount ? `Word Count: ${documentMetadata.wordCount}` : ''}
${documentMetadata.pageCount ? `Pages: ${documentMetadata.pageCount}` : ''}
`.trim()

    // Truncate document text if too long (keep first N chars for context)
    const truncatedText = documentText.length > DocumentChatAgent.MAX_DOCUMENT_CONTEXT_LENGTH
      ? documentText.substring(0, DocumentChatAgent.MAX_DOCUMENT_CONTEXT_LENGTH) + '\n... (document truncated for brevity)'
      : documentText

    // Build full context
    const contextParts = []

    if (historyPrompt) {
      contextParts.push('## Conversation History\n\n' + historyPrompt)
    }

    contextParts.push(`## Document Information\n\n${metadataSection}`)
    contextParts.push(`## Document Content\n\n${truncatedText}`)
    contextParts.push(`## User Question\n\n${message}`)

    return contextParts.join('\n\n---\n\n')
  }
}
