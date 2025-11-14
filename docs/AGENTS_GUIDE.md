# Agent System Guide for Claude

This guide explains how to use and extend the CV Builder's multi-agent system. This is intended for Claude (claude.ai/code) when working with this codebase.

## System Architecture Overview

The CV Builder uses a **hierarchical multi-agent architecture**:

```
User Request
    ↓
Orchestrator Agent (coordinates all agents)
    ↓
┌─────────────┴──────────────┬──────────────┬──────────────┬──────────────┐
│                            │              │              │              │
Resume Generator    Job Analysis    Tailoring    Skills Gap    Interview Coach
```

Each agent is a specialized Claude instance with:
- Dedicated system prompt defining its expertise
- Input/output schema validation using Zod
- Streaming and non-streaming modes
- Conversation history management
- Error handling

## Available Agents

### 1. Orchestrator Agent (`orchestrator-agent.ts`)

**Purpose**: Coordinates other agents and manages the overall workflow

**Key Responsibilities**:
- Parse and understand user requests
- Load required data (bio, job listings)
- Delegate tasks to specialized agents
- Manage data flow between agents
- Save generated outputs

**When to use directly**: When you need to orchestrate complex multi-step workflows

**Example**:
```typescript
const orchestrator = new OrchestratorAgent(apiKey)

// Load data
const bio = await orchestrator.loadBio()
const job = await orchestrator.loadJob('software-engineer-2024')

// Access specialized agents
const resumeGen = orchestrator.getResumeGenerator()
const analysis = orchestrator.getJobAnalysis()
```

### 2. Resume Generator Agent (`resume-generator-agent.ts`)

**Purpose**: Transform bio data into polished, ATS-friendly resumes

**Key Features**:
- Multiple format support (Markdown, HTML, JSON)
- Professional formatting and structure
- Action verb optimization
- Quantified achievement emphasis

**Usage**:
```typescript
const resumeGen = new ResumeGeneratorAgent(apiKey)

// Generate basic resume
const resume = await resumeGen.generateResume(bio, {
  format: 'markdown',
  sections: ['personal', 'summary', 'experience', 'skills', 'education']
})

// Stream generation for real-time feedback
const resume = await resumeGen.generateResumeStreaming(
  bio,
  { format: 'markdown' },
  (chunk) => console.log(chunk)
)
```

**Output**: `ResumeOutput` object with content, metadata, and format info

### 3. Job Analysis Agent (`job-analysis-agent.ts`)

**Purpose**: Analyze job listings and assess candidate fit

**Key Features**:
- Extract requirements (technical, soft skills, experience, education)
- Rank by importance (critical, important, nice-to-have)
- Calculate match scores (0-100)
- Identify ATS keywords
- Provide tailoring recommendations

**Usage**:
```typescript
const jobAnalyzer = new JobAnalysisAgent(apiKey)

// Basic job analysis
const analysis = await jobAnalyzer.analyzeJob(jobListing)

// Analysis with candidate bio for match scoring
const analysis = await jobAnalyzer.analyzeJobWithBio(jobListing, bio)

// Streaming analysis
const narrative = await jobAnalyzer.analyzeJobStreaming(
  jobListing,
  bio,
  (chunk) => console.log(chunk)
)
```

**Output**: `JobAnalysis` object with requirements, terms, match score, and recommendations

### 4. Tailoring Agent (`tailoring-agent.ts`)

**Purpose**: Customize resumes for specific job applications

**Key Features**:
- Keyword optimization from job description
- ATS compatibility
- Experience reframing to highlight relevance
- Section prioritization based on job requirements

**Usage**:
```typescript
const tailoring = new TailoringAgent(apiKey)

// Tailor resume with optional job analysis
const tailoredResume = await tailoring.tailorResume(
  bio,
  jobListing,
  analysis, // optional
  {
    format: 'markdown',
    emphasizeSkills: ['React', 'TypeScript', 'Node.js'],
    prioritizeSections: ['summary', 'experience', 'skills']
  }
)

// Get recommendations before tailoring
const recs = await tailoring.getTailoringRecommendations(bio, job, analysis)
```

**Output**: `ResumeOutput` object with `tailored: true` and job-specific optimizations

### 5. Skills Gap Analyzer Agent (`skills-gap-agent.ts`)

**Purpose**: Identify learning opportunities and create personalized learning paths

**Key Features**:
- Compare candidate skills vs job requirements
- Assess proficiency levels
- Find learning resources (docs, tutorials, courses)
- Generate practice exercises
- Estimate time commitments

**Usage**:
```typescript
const skillsGap = new SkillsGapAgent(apiKey)

// Full learning path generation
const learningPath = await skillsGap.analyzeSkillsGap(bio, job, analysis)

// Streaming narrative analysis
const narrative = await skillsGap.analyzeSkillsGapStreaming(
  bio,
  job,
  analysis,
  (chunk) => console.log(chunk)
)

// Get quick wins (skills learnable in 1-4 weeks)
const quickWins = await skillsGap.getQuickWins(bio, job, analysis)
```

**Output**: `LearningPath` object with gaps, resources, and exercises

### 6. Interview Coach Agent (`interview-coach-agent.ts`)

**Purpose**: Prepare candidates for interviews and create cover letters

**Key Features**:
- Personalized cover letter generation
- Interview question preparation
- STAR method response crafting
- Talking points development
- Motivation articulation

**Usage**:
```typescript
const coach = new InterviewCoachAgent(apiKey)

// Generate cover letter
const coverLetter = await coach.generateCoverLetter(
  bio,
  job,
  'I am passionate about...' // optional motivation
)

// Prepare for interview
const prep = await coach.prepareInterviewQuestions(bio, job)

// Get talking points
const points = await coach.getTalkingPoints(bio, job)

// Analyze motivation
const motivation = await coach.analyzeMotivation(bio, job)
```

**Output**: `CoverLetter` object with content, talking points, and motivation statement

## Common Workflows

### Workflow 1: Generate Basic Resume

```typescript
const orchestrator = new OrchestratorAgent(apiKey)
const bio = await orchestrator.loadBio()

const resumeGen = orchestrator.getResumeGenerator()
const resume = await resumeGen.generateResume(bio, {
  format: 'markdown'
})

// Save output
await orchestrator.getOutputStorage().write(
  `${resume.id}.json`,
  resume
)
await orchestrator.getOutputStorage().writeText(
  `${resume.id}.md`,
  resume.content
)
```

### Workflow 2: Full Job Application Package

```typescript
const orchestrator = new OrchestratorAgent(apiKey)
const bio = await orchestrator.loadBio()
const job = await orchestrator.loadJob('job-id')

// Step 1: Analyze job
const jobAnalyzer = orchestrator.getJobAnalysis()
const analysis = await jobAnalyzer.analyzeJobWithBio(job, bio)

// Step 2: Tailor resume
const tailoring = orchestrator.getTailoring()
const resume = await tailoring.tailorResume(bio, job, analysis, {
  format: 'markdown'
})

// Step 3: Generate cover letter
const coach = orchestrator.getInterviewCoach()
const coverLetter = await coach.generateCoverLetter(bio, job)

// Step 4: Prepare interview
const interviewPrep = await coach.prepareInterviewQuestions(bio, job)

// Save all outputs
const storage = orchestrator.getOutputStorage()
await storage.write(`analysis-${job.id}.json`, analysis)
await storage.write(`${resume.id}.json`, resume)
await storage.writeText(`${resume.id}.md`, resume.content)
await storage.write(`${coverLetter.id}.json`, coverLetter)
await storage.writeText(`cover-letter-${job.id}.md`, coverLetter.content)
await storage.writeText(`interview-prep-${job.id}.md`, interviewPrep)
```

### Workflow 3: Skills Development Plan

```typescript
const orchestrator = new OrchestratorAgent(apiKey)
const bio = await orchestrator.loadBio()
const job = await orchestrator.loadJob('dream-job-id')

// Analyze job
const jobAnalyzer = orchestrator.getJobAnalysis()
const analysis = await jobAnalyzer.analyzeJobWithBio(job, bio)

// Create learning path
const skillsGap = orchestrator.getSkillsGap()
const learningPath = await skillsGap.analyzeSkillsGap(bio, job, analysis)

// Get quick wins for immediate action
const quickWins = await skillsGap.getQuickWins(bio, job, analysis)

// Save outputs
const storage = orchestrator.getOutputStorage()
await storage.write(`learning-path-${job.id}.json`, learningPath)
await storage.writeText(`quick-wins-${job.id}.md`, quickWins)
```

## Adding New Agents

When adding a new specialized agent:

1. **Create the agent file** in `src/agents/`
   - Extend `BaseAgent` class
   - Implement `getSystemPrompt()` method
   - Add public methods for agent functionality

2. **Define data models** in `src/models/`
   - Use Zod schemas for validation
   - Export TypeScript types

3. **Integrate with Orchestrator**
   - Import the new agent
   - Initialize in constructor
   - Add getter method
   - Update system prompt with new agent capabilities

4. **Add to documentation**
   - Update this guide
   - Add examples to `docs/how-to/`

### Example: Adding a Salary Negotiation Agent

```typescript
// src/agents/salary-negotiation-agent.ts
import { BaseAgent } from './base-agent.js'

export class SalaryNegotiationAgent extends BaseAgent {
  constructor(apiKey: string) {
    super(apiKey, 'SalaryNegotiation')
  }

  protected getSystemPrompt(): string {
    return `You are the Salary Negotiation Agent...`
  }

  async analyzeCompensation(job: JobListing, bio: Bio): Promise<SalaryAnalysis> {
    // Implementation
  }
}
```

Then update `orchestrator-agent.ts`:
```typescript
private salaryNegotiation: SalaryNegotiationAgent

constructor(apiKey: string) {
  // ...
  this.salaryNegotiation = new SalaryNegotiationAgent(apiKey)
}

getSalaryNegotiation(): SalaryNegotiationAgent {
  return this.salaryNegotiation
}
```

## Best Practices

### 1. System Prompt Design
- Be specific about the agent's role and expertise
- Include output format requirements
- Provide examples of good outputs
- Define quality criteria
- Set boundaries (what NOT to do)

### 2. Error Handling
- Validate inputs with Zod schemas before processing
- Wrap agent calls in try/catch blocks
- Provide helpful error messages to users
- Log errors for debugging

### 3. Streaming vs Non-Streaming
- Use **streaming** for:
  - Interactive UI with real-time feedback
  - Long-running operations
  - Better perceived performance
- Use **non-streaming** for:
  - Structured data that needs parsing
  - Batch operations
  - When you need the complete response before proceeding

### 4. Token Management
- Use `maxTokens` parameter for long outputs
- Truncate conversation history when it gets too long
- Consider splitting very large jobs into multiple calls

### 5. Data Flow
- Always validate data at boundaries (input → agent → output)
- Save intermediate results for debugging
- Use TypeScript types throughout for safety

## Testing Agents

### Manual Testing via CLI
```bash
# Interactive mode to test orchestrator
npm run cli

# Test specific commands
npm run cli -- generate
npm run cli -- analyze job-id
npm run cli -- learn job-id
```

### Testing Individual Agents
```typescript
// Create a test script
import { ResumeGeneratorAgent } from './agents/resume-generator-agent.js'
import { testBio } from './test-data.js'

const agent = new ResumeGeneratorAgent(process.env.ANTHROPIC_API_KEY!)
const resume = await agent.generateResume(testBio, { format: 'markdown' })
console.log(resume.content)
```

## Debugging Tips

1. **Check conversation history**:
   ```typescript
   const history = agent.getHistory()
   console.log(JSON.stringify(history, null, 2))
   ```

2. **Clear history if context gets polluted**:
   ```typescript
   agent.clearHistory()
   ```

3. **Validate schemas explicitly**:
   ```typescript
   try {
     ResumeOutputSchema.parse(resume)
   } catch (error) {
     console.error('Validation error:', error)
   }
   ```

4. **Use streaming to see progressive output**:
   ```typescript
   await agent.generateResumeStreaming(bio, {}, (chunk) => {
     process.stdout.write(chunk) // See output in real-time
   })
   ```

## File Storage

All agents can access file storage through the Orchestrator:

```typescript
const orchestrator = new OrchestratorAgent(apiKey)

// Bio storage (bio/ directory)
const bioStorage = orchestrator.getBioStorage()
const bio = await bioStorage.read<Bio>('bio.json')

// Job storage (jobs/ directory)
const jobStorage = orchestrator.getJobStorage()
const jobs = await jobStorage.list('') // List all jobs
const job = await jobStorage.read<JobListing>('job-id.json')

// Output storage (output/ directory)
const outputStorage = orchestrator.getOutputStorage()
await outputStorage.write('resume-123.json', resumeOutput)
await outputStorage.writeText('resume-123.md', resumeOutput.content)
```

## Integration with UI

The browser UI (`src/browser/`) can interact with agents:

```typescript
// In a React component
const handleGenerateResume = async () => {
  const orchestrator = new OrchestratorAgent(apiKey)

  // Streaming for real-time UI updates
  await orchestrator.processRequestStreaming(
    'Generate my resume',
    (chunk) => {
      setMessage(prev => prev + chunk)
    }
  )
}
```

For direct agent access in UI, you can expose agents through an API or use them directly in the browser context (note: API key security considerations apply).

## Summary

The agent system is designed to be:
- **Modular**: Each agent is independent and focused
- **Composable**: Agents work together through the orchestrator
- **Extensible**: Easy to add new specialized agents
- **Type-safe**: Zod validation throughout
- **Flexible**: Streaming and non-streaming modes
- **User-friendly**: Clear outputs and helpful guidance

When working with agents, always:
1. Understand the agent's specific role
2. Validate inputs and outputs
3. Handle errors gracefully
4. Provide user feedback
5. Save important outputs
6. Use the right tool for the job (streaming vs non-streaming)

For more details, see:
- `docs/technical/02-agent-architecture.md` - Architecture overview
- `docs/how-to/01-building-features.md` - Development guide
- Source code in `src/agents/` - Implementation details
