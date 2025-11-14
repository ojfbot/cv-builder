import { BaseAgent } from './base-agent.js'
import { Bio } from '../models/bio.js'
import { JobListing, JobAnalysis } from '../models/job.js'
import { LearningPath, LearningPathSchema } from '../models/output.js'

export class SkillsGapAgent extends BaseAgent {
  constructor(apiKey: string) {
    super(apiKey, 'SkillsGapAnalyzer')
  }

  protected getSystemPrompt(): string {
    return `You are the Skills Gap Analyzer Agent for a CV Builder system.

## CRITICAL: Markdown Formatting Requirements
**ALL responses MUST use proper GitHub-flavored Markdown from the very first character.**
Start with ## headers, use **bold** for emphasis, use - for lists, use \`\`\` for code blocks.
Output markdown incrementally during streaming - don't wait to format at the end.

Your role is to:

1. Compare candidate skills against job requirements
2. Identify skill gaps and learning opportunities
3. Assess current proficiency levels
4. Create personalized learning paths
5. Find relevant learning resources
6. Generate practice exercises

When analyzing skill gaps:
- Be honest but encouraging about gaps
- Identify transferable skills that may apply
- Assess realistic time needed to close gaps
- Prioritize skills by importance and achievability
- Consider the candidate's learning style and background

For learning paths:
- Provide a mix of resources: documentation, tutorials, courses, books, practice
- Include free and paid options when possible
- Suggest hands-on projects and exercises
- Estimate time commitments realistically
- Order learning steps from foundational to advanced
- Include verification methods (projects, certifications)

For practice exercises:
- Create practical, real-world scenarios
- Align with the job requirements
- Provide different difficulty levels
- Include hints or starter code when helpful
- Focus on applicable skills

Be supportive, practical, and focus on actionable learning strategies.`
  }

  async analyzeSkillsGap(
    bio: Bio,
    job: JobListing,
    analysis: JobAnalysis
  ): Promise<LearningPath> {
    const prompt = `Analyze the skills gap between this candidate and job requirements:

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

JOB LISTING:
${JSON.stringify(job, null, 2)}

JOB ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Create a comprehensive learning path that includes:

1. Skill Gaps: List each missing or underdeveloped skill with:
   - skill: The skill name
   - currentLevel: "none", "beginner", or "intermediate"
   - targetLevel: "intermediate", "advanced", or "expert"
   - priority: "high", "medium", or "low"

2. Learning Resources: For each skill, provide resources including:
   - skill: The skill this resource is for
   - type: "documentation", "tutorial", "course", "book", or "practice"
   - title: Name of the resource
   - url: Link to the resource (if available)
   - estimatedHours: Time needed (optional)

3. Practice Exercises: Create hands-on exercises:
   - skill: The skill being practiced
   - description: What to build/do
   - difficulty: "easy", "medium", or "hard"
   - code: Starter code or hints (optional)

Format your response as a JSON object matching this structure:
{
  "gaps": [
    {
      "skill": "skill name",
      "currentLevel": "none|beginner|intermediate",
      "targetLevel": "intermediate|advanced|expert",
      "priority": "high|medium|low"
    }
  ],
  "resources": [
    {
      "skill": "skill name",
      "type": "documentation|tutorial|course|book|practice",
      "title": "resource title",
      "url": "https://...",
      "estimatedHours": 10
    }
  ],
  "exercises": [
    {
      "skill": "skill name",
      "description": "exercise description",
      "difficulty": "easy|medium|hard",
      "code": "optional starter code"
    }
  ]
}`

    const response = await this.chat(prompt, { maxTokens: 8192 })

    // Parse the JSON response
    let pathData: any
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/```\n?([\s\S]*?)\n?```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : response
      pathData = JSON.parse(jsonStr.trim())
    } catch (error) {
      throw new Error(`Failed to parse learning path response: ${error}`)
    }

    const learningPath: LearningPath = {
      jobId: job.id,
      createdAt: new Date().toISOString(),
      gaps: pathData.gaps || [],
      resources: pathData.resources || [],
      exercises: pathData.exercises || [],
    }

    // Validate the output
    LearningPathSchema.parse(learningPath)

    return learningPath
  }

  async analyzeSkillsGapStreaming(
    bio: Bio,
    job: JobListing,
    analysis: JobAnalysis,
    onChunk: (text: string) => void
  ): Promise<string> {
    const prompt = `Analyze the skills gap between this candidate and job requirements:

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

JOB LISTING:
${JSON.stringify(job, null, 2)}

JOB ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Provide a comprehensive analysis including:
1. Skills the candidate has that match the job
2. Skills gaps and how critical they are
3. Recommended learning path with specific resources
4. Practice projects or exercises to build those skills
5. Estimated timeline to become job-ready
6. Transferable skills that can help bridge gaps`

    return await this.streamChat(prompt, onChunk)
  }

  async getQuickWins(bio: Bio, job: JobListing, analysis: JobAnalysis): Promise<string> {
    const prompt = `Based on this skills gap analysis, identify "quick wins" - skills that:
- Are important for the job
- The candidate can learn relatively quickly (1-4 weeks)
- Have high impact on their candidacy

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

JOB LISTING:
${JSON.stringify(job, null, 2)}

JOB ANALYSIS:
${JSON.stringify(analysis, null, 2)}

For each quick win, explain:
- Why it's important for this role
- How long it might take to learn
- The best resources to get started
- A small project to demonstrate proficiency`

    return await this.chat(prompt)
  }
}
