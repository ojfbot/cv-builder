#!/usr/bin/env tsx

/**
 * Application Pipeline Runner
 *
 * Chains all CV Builder agents to produce a complete job application package:
 * 1. Job Analysis (match score + requirements breakdown)
 * 2. Tailored Resume
 * 3. Cover Letter
 * 4. Interview Prep (questions + talking points + motivation)
 * 5. Skills Gap Analysis (learning path)
 *
 * Usage: pnpm tsx scripts/run-application-pipeline.ts <jobId>
 * Example: pnpm tsx scripts/run-application-pipeline.ts browser-company-tech-lead-devex
 */

import { JobAnalysisAgent, TailoringAgent, InterviewCoachAgent, SkillsGapAgent } from '../packages/agent-core/src/index.js'
import { BioSchema, JobListingSchema } from '../packages/agent-core/src/index.js'
import { FileStorage } from '../packages/agent-core/src/utils/file-storage.js'
import { getConfig } from '../packages/agent-core/src/utils/config.js'

const jobId = process.argv[2]
if (!jobId) {
  console.error('Usage: pnpm tsx scripts/run-application-pipeline.ts <jobId>')
  process.exit(1)
}

const config = getConfig()
const bioStorage = new FileStorage(config.bioDir)
const jobStorage = new FileStorage(config.jobsDir)
const outputStorage = new FileStorage(config.outputDir)

async function loadData() {
  console.log('Loading bio and job data...')
  const bioRaw = await bioStorage.read('bio.json')
  const bio = BioSchema.parse(bioRaw)

  const jobRaw = await jobStorage.read(`${jobId}.json`)
  const job = JobListingSchema.parse(jobRaw)

  console.log(`  Bio: ${bio.personal.name}`)
  console.log(`  Job: ${job.title} at ${job.company}`)
  return { bio, job }
}

async function main() {
  const { bio, job } = await loadData()
  const prefix = jobId

  // Initialize agents
  const jobAnalysisAgent = new JobAnalysisAgent(config.anthropicApiKey)
  const tailoringAgent = new TailoringAgent(config.anthropicApiKey)
  const interviewCoach = new InterviewCoachAgent(config.anthropicApiKey)
  const skillsGapAgent = new SkillsGapAgent(config.anthropicApiKey)

  // Step 1: Job Analysis
  console.log('\n[1/5] Analyzing job listing...')
  const analysis = await jobAnalysisAgent.analyzeJobWithBio(job, bio)
  await outputStorage.write(`${prefix}-analysis.json`, analysis)
  console.log(`  Match score: ${analysis.matchScore ?? 'N/A'}/100`)
  console.log(`  Key requirements: ${analysis.keyRequirements.length}`)
  console.log(`  Saved: personal/output/${prefix}-analysis.json`)

  // Step 2: Tailored Resume
  console.log('\n[2/5] Tailoring resume...')
  const tailoredResume = await tailoringAgent.tailorResume(bio, job, analysis)
  await outputStorage.write(`${prefix}-resume.json`, tailoredResume)
  await outputStorage.writeText(`${prefix}-resume.md`, tailoredResume.content)
  console.log(`  Saved: personal/output/${prefix}-resume.md`)

  // Step 3: Cover Letter
  console.log('\n[3/5] Generating cover letter...')
  const coverLetter = await interviewCoach.generateCoverLetter(bio, job)
  await outputStorage.write(`${prefix}-cover-letter.json`, coverLetter)
  await outputStorage.writeText(`${prefix}-cover-letter.md`, coverLetter.content)
  console.log(`  Saved: personal/output/${prefix}-cover-letter.md`)

  // Step 4: Interview Prep
  console.log('\n[4/5] Preparing interview materials...')
  const [questions, talkingPoints, motivation] = await Promise.all([
    interviewCoach.prepareInterviewQuestions(bio, job),
    interviewCoach.getTalkingPoints(bio, job),
    interviewCoach.analyzeMotivation(bio, job),
  ])
  const talkingPointsStr = Array.isArray(talkingPoints)
    ? talkingPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')
    : String(talkingPoints)
  const interviewPrep = `# Interview Preparation: ${job.title} at ${job.company}\n\n## Likely Interview Questions\n\n${questions}\n\n## Key Talking Points\n\n${talkingPointsStr}\n\n## Motivation Analysis\n\n${motivation}`
  await outputStorage.writeText(`${prefix}-interview-prep.md`, interviewPrep)
  console.log(`  Saved: personal/output/${prefix}-interview-prep.md`)

  // Step 5: Skills Gap Analysis
  console.log('\n[5/5] Analyzing skills gaps...')
  const learningPath = await skillsGapAgent.analyzeSkillsGap(bio, job, analysis)
  await outputStorage.write(`${prefix}-learning-path.json`, learningPath)
  console.log(`  Saved: personal/output/${prefix}-learning-path.json`)

  // Summary
  console.log('\n========================================')
  console.log('Application package complete!')
  console.log('========================================')
  console.log(`\nOutputs in personal/output/:`)
  console.log(`  ${prefix}-analysis.json        — Job analysis + match score`)
  console.log(`  ${prefix}-resume.md             — Tailored resume`)
  console.log(`  ${prefix}-cover-letter.md       — Cover letter`)
  console.log(`  ${prefix}-interview-prep.md     — Interview questions + talking points`)
  console.log(`  ${prefix}-learning-path.json    — Skills gap + learning resources`)
}

main().catch((err) => {
  console.error('\nPipeline failed:', err.message || err)
  process.exit(1)
})
