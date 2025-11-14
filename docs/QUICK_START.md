# Quick Start Guide for Developers

Get up and running with the CV Builder agent system in 5 minutes.

## Setup (2 minutes)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

3. **Create data directories**:
   ```bash
   mkdir -p bio jobs output
   ```

4. **Add your bio** (copy and edit example):
   ```bash
   cp public/examples/bio-example.json bio/bio.json
   # Edit bio/bio.json with your information
   ```

5. **Add a job listing** (optional):
   ```bash
   cp public/examples/job-example.json jobs/software-engineer.json
   # Edit with a real job listing
   ```

## Test the System (3 minutes)

### Option 1: CLI (Interactive)

```bash
npm run cli
```

Try these commands:
- "Generate my resume"
- "Analyze job software-engineer"
- "Tailor my resume for software-engineer"
- "Create a learning path for software-engineer"
- "Write a cover letter for software-engineer"

### Option 2: Web UI

```bash
npm run dev
```

Open http://localhost:3000 and interact with the dashboard.

### Option 3: Code Example

Create a test script `test-agent.ts`:

```typescript
import { OrchestratorAgent } from './src/agents/orchestrator-agent.js'

const apiKey = process.env.ANTHROPIC_API_KEY!
const orchestrator = new OrchestratorAgent(apiKey)

// Load bio
const bio = await orchestrator.loadBio()
console.log(`Loaded bio for: ${bio.personal.name}`)

// Generate resume
const resumeGen = orchestrator.getResumeGenerator()
const resume = await resumeGen.generateResumeStreaming(
  bio,
  { format: 'markdown' },
  (chunk) => process.stdout.write(chunk)
)

console.log('\n\nResume generated!')
```

Run it:
```bash
tsx test-agent.ts
```

## Common Tasks

### Generate a Resume

```typescript
const orchestrator = new OrchestratorAgent(apiKey)
const bio = await orchestrator.loadBio()

const resumeGen = orchestrator.getResumeGenerator()
const resume = await resumeGen.generateResume(bio, {
  format: 'markdown'
})

await orchestrator.getOutputStorage().writeText(
  `resume-${Date.now()}.md`,
  resume.content
)
```

### Analyze a Job

```typescript
const orchestrator = new OrchestratorAgent(apiKey)
const bio = await orchestrator.loadBio()
const job = await orchestrator.loadJob('software-engineer')

const analyzer = orchestrator.getJobAnalysis()
const analysis = await analyzer.analyzeJobWithBio(job, bio)

console.log(`Match Score: ${analysis.matchScore}%`)
console.log(`Key Requirements: ${analysis.keyRequirements.length}`)
```

### Tailor Resume for a Job

```typescript
const orchestrator = new OrchestratorAgent(apiKey)
const bio = await orchestrator.loadBio()
const job = await orchestrator.loadJob('software-engineer')

// First analyze the job
const analyzer = orchestrator.getJobAnalysis()
const analysis = await analyzer.analyzeJobWithBio(job, bio)

// Then tailor the resume
const tailoring = orchestrator.getTailoring()
const resume = await tailoring.tailorResume(bio, job, analysis, {
  format: 'markdown'
})

console.log('Tailored resume generated!')
```

### Create a Learning Path

```typescript
const orchestrator = new OrchestratorAgent(apiKey)
const bio = await orchestrator.loadBio()
const job = await orchestrator.loadJob('dream-job')

// Analyze job
const analyzer = orchestrator.getJobAnalysis()
const analysis = await analyzer.analyzeJobWithBio(job, bio)

// Create learning path
const skillsGap = orchestrator.getSkillsGap()
const learningPath = await skillsGap.analyzeSkillsGap(bio, job, analysis)

console.log(`Found ${learningPath.gaps.length} skill gaps`)
console.log(`${learningPath.resources.length} learning resources`)
console.log(`${learningPath.exercises.length} practice exercises`)
```

### Generate Cover Letter

```typescript
const orchestrator = new OrchestratorAgent(apiKey)
const bio = await orchestrator.loadBio()
const job = await orchestrator.loadJob('software-engineer')

const coach = orchestrator.getInterviewCoach()
const coverLetter = await coach.generateCoverLetter(bio, job)

await orchestrator.getOutputStorage().writeText(
  `cover-letter-${job.id}.md`,
  coverLetter.content
)
```

## Project Structure

```
cv-builder/
├── src/
│   ├── agents/              # All agent implementations
│   │   ├── base-agent.ts           # Base class for all agents
│   │   ├── orchestrator-agent.ts   # Coordinates all agents
│   │   ├── resume-generator-agent.ts
│   │   ├── job-analysis-agent.ts
│   │   ├── tailoring-agent.ts
│   │   ├── skills-gap-agent.ts
│   │   └── interview-coach-agent.ts
│   ├── models/              # Zod schemas and types
│   │   ├── bio.ts
│   │   ├── job.ts
│   │   └── output.ts
│   ├── utils/               # Utilities
│   │   ├── config.ts
│   │   └── file-storage.ts
│   ├── cli/                 # CLI interface
│   └── browser/             # Web UI (React + Carbon)
├── docs/
│   ├── AGENTS_GUIDE.md      # ⭐ Comprehensive agent guide
│   ├── QUICK_START.md       # This file
│   ├── examples/            # Code examples
│   └── technical/           # Technical docs
├── bio/                     # Your bio (gitignored)
├── jobs/                    # Job listings (gitignored)
└── output/                  # Generated outputs (gitignored)
```

## Next Steps

1. **Read the comprehensive guide**: [docs/AGENTS_GUIDE.md](./AGENTS_GUIDE.md)
2. **Explore examples**: [docs/examples/agent-usage-examples.ts](./examples/agent-usage-examples.ts)
3. **Review architecture**: [docs/technical/02-agent-architecture.md](./technical/02-agent-architecture.md)
4. **Build features**: [docs/how-to/01-building-features.md](./how-to/01-building-features.md)

## Troubleshooting

### "Bio not found" error
- Make sure `bio/bio.json` exists
- Copy from `public/examples/bio-example.json` and edit

### "Job listing not found" error
- Check that the job file exists in `jobs/` directory
- File name should be `{job-id}.json`

### Type errors
- Run `npm run type-check` to see detailed errors
- Make sure all imports use `.js` extension (TypeScript ESM requirement)

### API errors
- Verify `ANTHROPIC_API_KEY` is set in `.env`
- Check your API key has sufficient credits
- Review rate limits in Anthropic console

## Tips

1. **Use streaming for better UX**: Real-time feedback during generation
2. **Save intermediate results**: Helpful for debugging and iteration
3. **Validate with Zod**: All inputs/outputs use Zod schemas
4. **Type safety**: TypeScript strict mode catches errors early
5. **Agent composition**: Combine multiple agents for complex workflows

Happy building! 🚀
