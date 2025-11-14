import { BaseAgent } from './base-agent.js'
import { JobListing, JobAnalysis, JobAnalysisSchema } from '../models/job.js'
import { Bio } from '../models/bio.js'

export class JobAnalysisAgent extends BaseAgent {
  constructor(apiKey: string) {
    super(apiKey, 'JobAnalysis')
  }

  protected getSystemPrompt(): string {
    return `You are the Job Analysis Agent for a CV Builder system.

## CRITICAL: Markdown Formatting Requirements
**ALL responses MUST use proper GitHub-flavored Markdown from the very first character.**
Start with ## headers, use **bold** for emphasis, use - for lists, use \`\`\` for code blocks.
Output markdown incrementally during streaming - don't wait to format at the end.

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

  async analyzeJob(job: JobListing): Promise<JobAnalysis> {
    const prompt = `Analyze the following job listing and extract key information:

${JSON.stringify(job, null, 2)}

Please provide:
1. Key requirements categorized by:
   - Technical skills
   - Soft skills
   - Experience requirements
   - Education requirements
2. For each requirement, specify:
   - The skill/requirement name
   - Importance level (critical, important, nice-to-have)
   - Category (technical, soft-skill, experience, education)
3. Industry-specific terms and keywords
4. General recommendations for candidates

Format your response as a JSON object matching this structure:
{
  "keyRequirements": [
    {
      "skill": "skill name",
      "importance": "critical|important|nice-to-have",
      "category": "technical|soft-skill|experience|education"
    }
  ],
  "industryTerms": ["term1", "term2"],
  "recommendations": ["recommendation1", "recommendation2"]
}`

    const response = await this.chat(prompt)

    // Parse the JSON response
    let analysisData: any
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/```\n?([\s\S]*?)\n?```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : response
      analysisData = JSON.parse(jsonStr.trim())
    } catch (error) {
      throw new Error(`Failed to parse job analysis response: ${error}`)
    }

    const analysis: JobAnalysis = {
      jobId: job.id,
      analyzedAt: new Date().toISOString(),
      keyRequirements: analysisData.keyRequirements || [],
      industryTerms: analysisData.industryTerms || [],
      recommendations: analysisData.recommendations || [],
    }

    // Validate the output
    JobAnalysisSchema.parse(analysis)

    return analysis
  }

  async analyzeJobWithBio(job: JobListing, bio: Bio): Promise<JobAnalysis> {
    const prompt = `Analyze how well this candidate matches the following job listing:

JOB LISTING:
${JSON.stringify(job, null, 2)}

CANDIDATE BIO:
${JSON.stringify(bio, null, 2)}

Please provide:
1. Key requirements from the job and whether the candidate meets them
2. Match score (0-100) based on requirements met
3. Industry-specific terms the candidate should use
4. Specific recommendations for tailoring their resume

Format your response as a JSON object matching this structure:
{
  "keyRequirements": [
    {
      "skill": "skill name",
      "importance": "critical|important|nice-to-have",
      "category": "technical|soft-skill|experience|education"
    }
  ],
  "industryTerms": ["term1", "term2"],
  "matchScore": 75,
  "recommendations": ["recommendation1", "recommendation2"]
}`

    const response = await this.chat(prompt)

    // Parse the JSON response
    let analysisData: any
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || response.match(/```\n?([\s\S]*?)\n?```/)
      const jsonStr = jsonMatch ? jsonMatch[1] : response
      analysisData = JSON.parse(jsonStr.trim())
    } catch (error) {
      throw new Error(`Failed to parse job analysis response: ${error}`)
    }

    const analysis: JobAnalysis = {
      jobId: job.id,
      analyzedAt: new Date().toISOString(),
      keyRequirements: analysisData.keyRequirements || [],
      industryTerms: analysisData.industryTerms || [],
      matchScore: analysisData.matchScore,
      recommendations: analysisData.recommendations || [],
    }

    // Validate the output
    JobAnalysisSchema.parse(analysis)

    return analysis
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
