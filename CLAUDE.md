# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CV Builder is an AI-powered resume and career development tool that uses Claude AI agents to help users create tailored resumes, prepare for interviews, and develop professional skills. The system uses a **secure client-server architecture** with a multi-agent system where specialized agents run server-side and communicate with the browser through a REST API.

**Key Architecture Changes** (as of latest update):
- All agents now run **server-side only** via a new Express API (`packages/api/`)
- API keys are stored securely in `env.json` on the server (never exposed to browser)
- Browser app communicates through REST API with proper security middleware
- Removed `dangerouslyAllowBrowser` flag from all agents

For detailed architecture documentation, see `ARCHITECTURE.md`.

## Development Commands

### Running the Application

**Development Mode (Recommended)**:
```bash
# Run both API server and browser app together
npm run dev:all
```

**Alternative - Run services separately**:
```bash
# Terminal 1: API server (port 3001)
npm run dev:api

# Terminal 2: Browser app (port 3000)
npm run dev
```

**CLI Mode**:
```bash
# CLI interactive mode
npm run cli

# CLI headless mode (requires job file)
npm run cli:headless -- --job jobs/example.json
```

### Build and Type Checking
```bash
# Build for production (TypeScript compilation + Vite build)
npm run build

# Type check without building
npm run type-check

# Preview production build
npm run preview
```

## Environment Setup

### Configuration

The application supports two configuration methods (env.json is recommended):

1. **env.json (Recommended)**: Create `packages/agent-core/env.json` with API key and settings
   ```bash
   cp packages/agent-core/env.json.example packages/agent-core/env.json
   ```

2. **Legacy .env.local**: Create `.env.local` with `ANTHROPIC_API_KEY` (copy from `.env.example`)
   ```bash
   cp .env.example .env.local
   ```

The app uses the Claude Sonnet 4 model (`claude-sonnet-4-20250514`) by default.

### Data Directories

Create local data directories (gitignored):
- `bio/` - Personal bio data
- `jobs/` - Job listings
- `output/` - Generated resumes and outputs

Example data is in `public/examples/`.

## Architecture

### Multi-Agent System

The codebase uses a **multi-agent architecture** where specialized Claude agents coordinate to handle different tasks:

1. **Orchestrator Agent** (`src/agents/orchestrator-agent.ts`): Coordinates other agents, parses requests, and manages workflow
2. **Resume Generator Agent**: Creates and formats resumes
3. **Job Analysis Agent**: Extracts requirements from job descriptions
4. **Tailoring Agent**: Customizes resumes for specific jobs
5. **Skills Gap Analyzer Agent**: Identifies learning opportunities
6. **Interview Coach Agent**: Prepares cover letters and interview guidance
7. **Research Agent**: Finds best practices and industry trends

Currently only the base agent and orchestrator are implemented. Other agents are planned.

### Agent Communication Flow
```
User Request → Orchestrator Agent → Specialized Agents (parallel execution)
```

All agents extend `BaseAgent` class which provides:
- Anthropic client setup
- Conversation history management
- Streaming and non-streaming chat methods
- System prompt abstraction

### Code Structure

```
src/
├── agents/          # Agent implementations (BaseAgent + OrchestratorAgent)
├── browser/         # React web UI (Carbon Design System)
│   └── components/  # Dashboard components for Bio, Jobs, Outputs, Chat
├── cli/            # Command-line interface
├── models/         # Zod schemas and TypeScript types (Bio, Job, Output)
└── utils/          # Config and file storage utilities
```

### Data Models

All models use **Zod** for runtime validation and type inference:

- **Bio** (`src/models/bio.ts`): Personal info, experiences, education, skills, projects, certifications, publications
- **JobListing** (`src/models/job.ts`): Job details, requirements, company info
- **Output** (`src/models/output.ts`): Generated resumes, analyses, learning paths

Data stored as JSON files in respective directories.

### Path Alias

The project uses `@/` as an alias for `src/` directory (configured in `vite.config.ts` and `tsconfig.json`).

## Agent System

All specialized agents are now implemented:

- **Resume Generator** (`resume-generator-agent.ts`): Creates formatted resumes
- **Job Analysis** (`job-analysis-agent.ts`): Analyzes jobs and calculates match scores
- **Tailoring** (`tailoring-agent.ts`): Customizes resumes for specific jobs
- **Skills Gap Analyzer** (`skills-gap-agent.ts`): Creates learning paths
- **Interview Coach** (`interview-coach-agent.ts`): Generates cover letters and interview prep

The `OrchestratorAgent` coordinates all agents, loads data, and manages workflows.

**For detailed agent usage instructions, see `docs/AGENTS_GUIDE.md`** - this comprehensive guide includes:
- How to use each agent
- Common workflows (job application package, learning path generation)
- Code examples
- Best practices for system prompts, streaming, and error handling

## Adding New Agents

When creating a new agent:

1. Create a new file in `src/agents/` extending `BaseAgent`
2. Implement `getSystemPrompt()` with the agent's role and responsibilities
3. Add public methods for the agent's functionality (use `chat()` or `streamChat()`)
4. Define input/output types in `src/models/` with Zod schemas
5. Integrate with `OrchestratorAgent` for coordination
6. Update `docs/AGENTS_GUIDE.md` with usage examples

See `docs/how-to/01-building-features.md` and `docs/AGENTS_GUIDE.md` for detailed walkthroughs.

## Key Technologies

- **TypeScript**: Strict mode enabled with ES2022 target
- **React**: For web UI with IBM Carbon Design System (`@carbon/react`)
- **Vite**: Build tool and dev server
- **Anthropic SDK**: Claude API integration
- **Zod**: Runtime schema validation
- **Commander**: CLI argument parsing
- **tsx**: TypeScript execution for CLI

## Testing Philosophy

The project emphasizes iterative development: Plan → Implement → Test → Refine → Document. Focus on type safety (Zod validation), error handling, and streaming responses for better UX.

## Privacy

Personal data (bio, jobs, outputs) is gitignored. Only example data in `public/examples/` should be committed.
