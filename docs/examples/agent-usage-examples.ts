/**
 * Agent Usage Examples
 *
 * These examples demonstrate how to use the CV Builder agent system.
 * Run these examples with: tsx docs/examples/agent-usage-examples.ts
 */

import { OrchestratorAgent } from '../../src/agents/orchestrator-agent.js'
import { ResumeGeneratorAgent } from '../../src/agents/resume-generator-agent.js'
import { JobAnalysisAgent } from '../../src/agents/job-analysis-agent.js'
import { TailoringAgent } from '../../src/agents/tailoring-agent.js'
import { SkillsGapAgent } from '../../src/agents/skills-gap-agent.js'
import { InterviewCoachAgent } from '../../src/agents/interview-coach-agent.js'
import { getConfig } from '../../src/utils/config.js'

const apiKey = process.env.ANTHROPIC_API_KEY!

// ============================================================================
// Example 1: Generate a Basic Resume
// ============================================================================
async function example1_generateResume() {
  console.log('\n=== Example 1: Generate Basic Resume ===\n')

  const orchestrator = new OrchestratorAgent(apiKey)

  try {
    // Load bio
    const bio = await orchestrator.loadBio()

    // Generate resume
    const resumeGen = orchestrator.getResumeGenerator()
    const resume = await resumeGen.generateResume(bio, {
      format: 'markdown'
    })

    // Save output
    await orchestrator.getOutputStorage().write(`${resume.id}.json`, resume)
    await orchestrator.getOutputStorage().writeText(`${resume.id}.md`, resume.content)

    console.log(`Resume generated: ${resume.id}`)
    console.log(`Format: ${resume.format}`)
    console.log(`Sections: ${resume.metadata.sections.join(', ')}`)

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
  }
}

// ============================================================================
// Example 2: Analyze a Job Listing
// ============================================================================
async function example2_analyzeJob() {
  console.log('\n=== Example 2: Analyze Job Listing ===\n')

  const orchestrator = new OrchestratorAgent(apiKey)

  try {
    const bio = await orchestrator.loadBio()

    // List available jobs
    const jobs = await orchestrator.listJobs()
    console.log('Available jobs:', jobs.join(', '))

    if (jobs.length === 0) {
      console.log('No jobs found. Please add a job listing to jobs/ directory.')
      return
    }

    // Load first job
    const job = await orchestrator.loadJob(jobs[0])

    // Analyze job with bio
    const jobAnalyzer = orchestrator.getJobAnalysis()
    const analysis = await jobAnalyzer.analyzeJobWithBio(job, bio)

    console.log(`\nAnalysis for: ${job.title} at ${job.company}`)
    console.log(`Match Score: ${analysis.matchScore}%`)
    console.log(`\nKey Requirements (${analysis.keyRequirements.length}):`)
    analysis.keyRequirements.slice(0, 5).forEach(req => {
      console.log(`  - ${req.skill} (${req.importance}, ${req.category})`)
    })
    console.log(`\nIndustry Terms: ${analysis.industryTerms.join(', ')}`)

    // Save analysis
    await orchestrator.getOutputStorage().write(`analysis-${job.id}.json`, analysis)

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
  }
}

// ============================================================================
// Example 3: Complete Job Application Package
// ============================================================================
async function example3_fullJobApplication() {
  console.log('\n=== Example 3: Full Job Application Package ===\n')

  const orchestrator = new OrchestratorAgent(apiKey)

  try {
    const bio = await orchestrator.loadBio()
    const jobs = await orchestrator.listJobs()

    if (jobs.length === 0) {
      console.log('No jobs found.')
      return
    }

    const job = await orchestrator.loadJob(jobs[0])
    console.log(`Creating application package for: ${job.title}`)

    // Step 1: Analyze job
    console.log('\n1. Analyzing job...')
    const jobAnalyzer = orchestrator.getJobAnalysis()
    const analysis = await jobAnalyzer.analyzeJobWithBio(job, bio)
    console.log(`   Match score: ${analysis.matchScore}%`)

    // Step 2: Tailor resume
    console.log('\n2. Tailoring resume...')
    const tailoring = orchestrator.getTailoring()
    const resume = await tailoring.tailorResume(bio, job, analysis, {
      format: 'markdown'
    })
    console.log(`   Resume generated: ${resume.id}`)

    // Step 3: Generate cover letter
    console.log('\n3. Generating cover letter...')
    const coach = orchestrator.getInterviewCoach()
    const coverLetter = await coach.generateCoverLetter(bio, job)
    console.log(`   Cover letter generated: ${coverLetter.id}`)
    console.log(`   Talking points: ${coverLetter.talkingPoints.length}`)

    // Step 4: Interview preparation
    console.log('\n4. Preparing interview questions...')
    const interviewPrep = await coach.prepareInterviewQuestions(bio, job)

    // Save all outputs
    const storage = orchestrator.getOutputStorage()
    await storage.write(`analysis-${job.id}.json`, analysis)
    await storage.write(`${resume.id}.json`, resume)
    await storage.writeText(`${resume.id}.md`, resume.content)
    await storage.write(`${coverLetter.id}.json`, coverLetter)
    await storage.writeText(`cover-letter-${job.id}.md`, coverLetter.content)
    await storage.writeText(`interview-prep-${job.id}.md`, interviewPrep)

    console.log('\n✓ Complete application package saved to output/')

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
  }
}

// ============================================================================
// Example 4: Skills Gap Analysis and Learning Path
// ============================================================================
async function example4_learningPath() {
  console.log('\n=== Example 4: Skills Gap Analysis & Learning Path ===\n')

  const orchestrator = new OrchestratorAgent(apiKey)

  try {
    const bio = await orchestrator.loadBio()
    const jobs = await orchestrator.listJobs()

    if (jobs.length === 0) {
      console.log('No jobs found.')
      return
    }

    const job = await orchestrator.loadJob(jobs[0])
    console.log(`Creating learning path for: ${job.title}`)

    // Analyze job
    const jobAnalyzer = orchestrator.getJobAnalysis()
    const analysis = await jobAnalyzer.analyzeJobWithBio(job, bio)

    // Create learning path
    console.log('\nAnalyzing skills gaps...')
    const skillsGap = orchestrator.getSkillsGap()
    const learningPath = await skillsGap.analyzeSkillsGap(bio, job, analysis)

    console.log(`\nSkills Gaps Found: ${learningPath.gaps.length}`)
    learningPath.gaps.slice(0, 5).forEach(gap => {
      console.log(`  - ${gap.skill}: ${gap.currentLevel} → ${gap.targetLevel} (${gap.priority} priority)`)
    })

    console.log(`\nLearning Resources: ${learningPath.resources.length}`)
    learningPath.resources.slice(0, 3).forEach(resource => {
      console.log(`  - ${resource.title} (${resource.type})`)
    })

    console.log(`\nPractice Exercises: ${learningPath.exercises.length}`)

    // Get quick wins
    console.log('\nGetting quick wins...')
    const quickWins = await skillsGap.getQuickWins(bio, job, analysis)

    // Save outputs
    const storage = orchestrator.getOutputStorage()
    await storage.write(`learning-path-${job.id}.json`, learningPath)
    await storage.writeText(`quick-wins-${job.id}.md`, quickWins)

    console.log('\n✓ Learning path saved to output/')

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
  }
}

// ============================================================================
// Example 5: Streaming Resume Generation (Real-time feedback)
// ============================================================================
async function example5_streamingGeneration() {
  console.log('\n=== Example 5: Streaming Resume Generation ===\n')

  const orchestrator = new OrchestratorAgent(apiKey)

  try {
    const bio = await orchestrator.loadBio()

    console.log('Generating resume with streaming...\n')

    const resumeGen = orchestrator.getResumeGenerator()
    const resume = await resumeGen.generateResumeStreaming(
      bio,
      { format: 'markdown' },
      (chunk) => {
        // Real-time output
        process.stdout.write(chunk)
      }
    )

    console.log('\n\n✓ Resume generated')

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
  }
}

// ============================================================================
// Example 6: Using Individual Agents Directly
// ============================================================================
async function example6_directAgentUse() {
  console.log('\n=== Example 6: Using Agents Directly ===\n')

  try {
    // You can instantiate agents directly without the orchestrator
    const resumeGen = new ResumeGeneratorAgent(apiKey)
    const jobAnalyzer = new JobAnalysisAgent(apiKey)
    const coach = new InterviewCoachAgent(apiKey)

    console.log('Agents can be used independently:')
    console.log('  ✓ Resume Generator')
    console.log('  ✓ Job Analysis')
    console.log('  ✓ Interview Coach')
    console.log('\nHowever, the Orchestrator is recommended for most use cases')
    console.log('as it handles data loading, agent coordination, and storage.')

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
  }
}

// ============================================================================
// Run Examples
// ============================================================================
async function main() {
  console.log('\n╔════════════════════════════════════════╗')
  console.log('║   CV Builder - Agent Usage Examples   ║')
  console.log('╚════════════════════════════════════════╝')

  // Uncomment the example you want to run:

  // await example1_generateResume()
  // await example2_analyzeJob()
  // await example3_fullJobApplication()
  // await example4_learningPath()
  // await example5_streamingGeneration()
  await example6_directAgentUse()

  console.log('\n')
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export {
  example1_generateResume,
  example2_analyzeJob,
  example3_fullJobApplication,
  example4_learningPath,
  example5_streamingGeneration,
  example6_directAgentUse,
}
