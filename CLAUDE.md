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

The application uses a **three-tier storage structure** for organized data management:

1. **`personal/`** - User data (gitignored, private)
   - `bios/` - Uploaded resumes and bio data
   - `jobs/` - Job listings
   - `output/` - Generated resumes and documents
   - `research/` - Research data

2. **`dev/`** - Mock data for development (tracked in git)
   - Contains sample files with the same structure as `personal/`
   - Used for consistent testing and development
   - See `dev/README.md` for details

3. **`temp/`** - Ephemeral test files (gitignored)
   - Same structure as `personal/` and `dev/`
   - Used for temporary testing and experiments

Example data is in `public/examples/` and `dev/` directories.

## Architecture

### Multi-Agent System

The codebase uses a **multi-agent architecture** where specialized Claude agents coordinate to handle different tasks:

1. **Orchestrator Agent** (`packages/agent-core/src/agents/orchestrator-agent.ts`): Coordinates other agents, parses requests, and manages workflow
2. **Resume Generator Agent**: Creates and formats resumes
3. **Job Analysis Agent**: Extracts requirements from job descriptions
4. **Tailoring Agent**: Customizes resumes for specific jobs
5. **Skills Gap Analyzer Agent**: Identifies learning opportunities
6. **Interview Coach Agent**: Prepares cover letters and interview guidance
7. **Research Agent**: Finds best practices and industry trends

All specialized agents are fully implemented in the agent-core package.

### Agent Communication Flow
```
Browser App → API Server → Orchestrator Agent → Specialized Agents (parallel execution)
```

All agents extend `BaseAgent` class which provides:
- Anthropic client setup
- Conversation history management
- Streaming and non-streaming chat methods
- System prompt abstraction

### Monorepo Structure

This project uses a monorepo structure with npm workspaces:

```
packages/
├── agent-core/          # @cv-builder/agent-core
│   ├── src/
│   │   ├── agents/      # Agent implementations (BaseAgent, specialized agents)
│   │   ├── cli/         # Command-line interface
│   │   ├── models/      # Zod schemas and TypeScript types (Bio, Job, Output, Research)
│   │   └── utils/       # Config and file storage utilities (Node.js only)
│   └── package.json
├── api/                 # @cv-builder/api
│   ├── src/
│   │   ├── routes/      # Express API routes for agent operations
│   │   ├── middleware/  # Auth, validation, error handling
│   │   └── services/    # Agent manager for server-side execution
│   └── package.json
└── browser-app/         # @cv-builder/browser-app
    ├── src/
    │   ├── components/  # Dashboard components for Bio, Jobs, Outputs, Chat
    │   ├── api/         # API client for server communication
    │   ├── services/    # Browser orchestrator
    │   └── store/       # Redux state management
    └── package.json
```

### Data Models

All models use **Zod** for runtime validation and type inference, located in `packages/agent-core/src/models/`:

- **Bio**: Personal info, experiences, education, skills, projects, certifications, publications
- **JobListing**: Job details, requirements, company info
- **Output**: Generated resumes, analyses, learning paths
- **ResearchEntry**: Research findings, industry analysis, company intelligence

Data stored as JSON files in respective directories (CLI/API) or browser localStorage (browser app).

### Package Imports

The monorepo uses package references for cross-package imports:

```typescript
// Import from agent-core (main exports)
import { BaseAgent, Bio, JobListing } from '@cv-builder/agent-core'

// Import Node.js-only utilities (server-side)
import { FileStorage } from '@cv-builder/agent-core/utils/file-storage'
import { OrchestratorAgent } from '@cv-builder/agent-core/agents/orchestrator-agent'
```

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

1. Create a new file in `packages/agent-core/src/agents/` extending `BaseAgent`
2. Implement `getSystemPrompt()` with the agent's role and responsibilities
3. Add public methods for the agent's functionality (use `chat()` or `streamChat()`)
4. Define input/output types in `packages/agent-core/src/models/` with Zod schemas
5. Export the agent from `packages/agent-core/src/index.ts` (if browser-compatible)
6. Integrate with `OrchestratorAgent` for coordination
7. Add API routes in `packages/api/src/routes/` for server-side execution
8. Update `docs/AGENTS_GUIDE.md` with usage examples

See `docs/how-to/01-building-features.md` and `docs/AGENTS_GUIDE.md` for detailed walkthroughs.

## Supporting Agents
## Available Agents

Claude can load and execute specialized agents from `.agents/` directory:

- `agent:pre-commit` - Run pre-commit validation
- `agent:issue-manager` - Manage GitHub issues
- `agent:pr-manager` - Handle pull requests
- `agent:quality-check` - Run quality validation
- `agent:build-validator` - Validate build configuration

To use an agent, simply say: "Run the pre-commit validator agent"
or "Use the issue manager agent to create a new issue"

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
