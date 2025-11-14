import { BaseAgent } from './base-agent.js'
import { Bio } from '../models/bio.js'
import { JobListing } from '../models/job.js'
import { CoverLetter, CoverLetterSchema } from '../models/output.js'

export class InterviewCoachAgent extends BaseAgent {
  constructor(apiKey: string) {
    super(apiKey, 'InterviewCoach')
  }

  protected getSystemPrompt(): string {
    return `You are the Interview Coach Agent for a CV Builder system.

## CRITICAL: Markdown Formatting Requirements
**ALL responses MUST use proper GitHub-flavored Markdown from the very first character.**
Start with ## headers, use **bold** for emphasis, use - for lists, use \`\`\` for code blocks.
Output markdown incrementally during streaming - don't wait to format at the end.

Your role is to:

1. Generate personalized cover letters
2. Prepare candidates for interviews
3. Identify compelling narratives and talking points
4. Help candidates articulate their motivation and fit
5. Provide interview question preparation

For cover letters:
- Keep it concise (3-4 paragraphs, under 400 words)
- Start with a strong opening that shows genuine interest
- Connect candidate's experience to job requirements
- Include specific examples and achievements
- Show knowledge of the company
- End with enthusiasm and clear call to action
- Maintain professional but personable tone
- Avoid clichés and generic statements

For interview preparation:
- Anticipate likely questions based on the role
- Help craft compelling "story" responses using STAR method
- Identify unique selling points
- Prepare questions for the interviewer
- Address potential concerns or gaps proactively
- Coach on company culture fit

For talking points:
- Connect past experiences to future role
- Quantify impact with specific metrics
- Highlight relevant skills through concrete examples
- Prepare "why this company" and "why this role" answers
- Develop thoughtful questions about the team and role

Be authentic, strategic, and help the candidate present their best self while remaining genuine.`
  }

  async generateCoverLetter(
    bio: Bio,
    job: JobListing,
    motivation?: string
  ): Promise<CoverLetter> {
    const prompt = `Generate a compelling, personalized cover letter for this job application:

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

JOB LISTING:
${JSON.stringify(job, null, 2)}

${motivation ? `CANDIDATE'S MOTIVATION:
${motivation}` : ''}

Create a professional cover letter that:
1. Opens with a strong hook showing genuine interest
2. Connects the candidate's experience to job requirements
3. Includes specific achievements and examples
4. Demonstrates knowledge of the company
5. Shows enthusiasm for the role
6. Ends with a clear call to action

Keep it concise (3-4 paragraphs, under 400 words) and professional yet personable.

Also provide:
- 3-5 key talking points for interviews
- A brief statement about what motivates the candidate for this role

Format your response as JSON:
{
  "content": "the full cover letter text",
  "talkingPoints": ["point 1", "point 2", "point 3"],
  "motivation": "brief motivation statement"
}`

    const response = await this.chat(prompt, { maxTokens: 4096 })

    // Parse the JSON response
    let letterData: any
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/```\n?([\s\S]*?)\n?```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : response
      letterData = JSON.parse(jsonStr.trim())
    } catch (error) {
      throw new Error(`Failed to parse cover letter response: ${error}`)
    }

    const coverLetter: CoverLetter = {
      id: `cover-letter-${job.id}-${Date.now()}`,
      jobId: job.id,
      generatedAt: new Date().toISOString(),
      content: letterData.content,
      talkingPoints: letterData.talkingPoints || [],
      motivation: letterData.motivation || motivation || '',
    }

    // Validate the output
    CoverLetterSchema.parse(coverLetter)

    return coverLetter
  }

  async generateCoverLetterStreaming(
    bio: Bio,
    job: JobListing,
    motivation: string | undefined,
    onChunk: (text: string) => void
  ): Promise<string> {
    const prompt = `Generate a compelling, personalized cover letter for this job application:

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

JOB LISTING:
${JSON.stringify(job, null, 2)}

${motivation ? `CANDIDATE'S MOTIVATION:
${motivation}` : ''}

Create a professional cover letter that:
1. Opens with a strong hook showing genuine interest
2. Connects the candidate's experience to job requirements
3. Includes specific achievements and examples
4. Demonstrates knowledge of the company
5. Shows enthusiasm for the role
6. Ends with a clear call to action

Keep it concise (3-4 paragraphs, under 400 words) and professional yet personable.

Return the cover letter text directly.`

    return await this.streamChat(prompt, onChunk)
  }

  async prepareInterviewQuestions(bio: Bio, job: JobListing): Promise<string> {
    const prompt = `Based on this job and candidate profile, prepare comprehensive interview guidance:

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

JOB LISTING:
${JSON.stringify(job, null, 2)}

Provide:

1. LIKELY INTERVIEW QUESTIONS (8-10 questions)
   - Behavioral questions specific to this role
   - Technical questions based on requirements
   - Culture fit questions

2. SUGGESTED ANSWERS using the STAR method
   - Draw from the candidate's actual experience
   - Include specific examples and metrics
   - Keep answers concise (1-2 minutes when spoken)

3. CANDIDATE'S QUESTIONS FOR INTERVIEWER
   - 5-6 thoughtful questions about the role, team, and company
   - Show genuine interest and research

4. KEY TALKING POINTS
   - Unique selling points for this candidate
   - How to position career transitions or gaps
   - Specific achievements to highlight

5. POTENTIAL CONCERNS TO ADDRESS
   - Any gaps or mismatches in the profile
   - How to proactively address them`

    return await this.chat(prompt, { maxTokens: 8192 })
  }

  async getTalkingPoints(bio: Bio, job: JobListing): Promise<string[]> {
    const prompt = `Generate 5-7 key talking points for this candidate's interview:

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

JOB LISTING:
${JSON.stringify(job, null, 2)}

Each talking point should:
- Connect a specific experience or achievement to the job requirements
- Include concrete examples or metrics
- Be memorable and unique to this candidate
- Be expressible in 30-60 seconds

Return as a JSON array of strings:
["talking point 1", "talking point 2", ...]`

    const response = await this.chat(prompt)

    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/```\n?([\s\S]*?)\n?```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : response
      return JSON.parse(jsonStr.trim())
    } catch (error) {
      throw new Error(`Failed to parse talking points response: ${error}`)
    }
  }

  async analyzeMotivation(bio: Bio, job: JobListing): Promise<string> {
    const prompt = `Help the candidate articulate why they're interested in this role:

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

JOB LISTING:
${JSON.stringify(job, null, 2)}

Based on the candidate's background and the job opportunity, suggest:
1. Genuine reasons they might be interested in this role
2. How this role aligns with their career trajectory
3. What they can uniquely bring to this position
4. How to articulate "why this company" and "why now"

Help them develop an authentic, compelling motivation statement.`

    return await this.chat(prompt)
  }
}
