# Claude reference — cv-builder

Deep reference relocated from the root `CLAUDE.md` (ADR-0081 Layer 2 — task reference, not
always-loaded). Repo-wide policy and the command quick-start stay in the root `CLAUDE.md`;
agent-authoring guidance is in `packages/agent-core/CLAUDE.md`; the canonical architecture
narrative is `docs/ARCHITECTURE.md`. This file holds the operational/tooling detail and the
agent/monorepo specifics that `docs/ARCHITECTURE.md` does not cover.

## Prerequisites (full)

- Node.js 24.11.1+ (use `fnm use` to switch to the correct version)
- pnpm 9.0.0+ (install via `corepack enable && corepack prepare pnpm@9.15.4 --activate`) — CI reads the version from the `packageManager` field in `package.json`, not the action config
- **Optional**: `uv` (Python package manager) — required to use the AWS Documentation MCP server in Claude Code. Install from https://docs.astral.sh/uv/. Copy `.mcp.json.example` (when available) or create `.mcp.json` locally with `{"mcpServers":{"aws-documentation":{"command":"uvx","args":["awslabs.aws-documentation-mcp-server@1.1.18"]}}}`. The `.mcp.json` file is gitignored (personal dev config).

## ESLint custom rules

The project uses `@frame/eslint-plugin` with custom rules enforcing monorepo safety:
- **`no-source-maps-in-production`** — errors if sourceMap is enabled in production build configs
- **`no-api-keys-in-client`** — errors on API keys or `dangerouslyAllowBrowser` in browser code
- **`enforce-singleton-versions`** — warns on hardcoded versions in Module Federation shared configs
- **`no-cross-package-relative-imports`** — errors on relative imports crossing workspace package boundaries
- **`require-zod-validation-at-boundaries`** — warns if route handlers access `req.body`/`req.params`/`req.query` without Zod validation
- **`no-console-in-production`** — warns on console.log/debug/warn in production source files
- **`no-untyped-schema-fields`** — warns on flat `z.array(z.string())` for enrichable schema fields (see TD-002/TD-003)
- **`require-test-for-new-exports`** — warns when exported functions have no corresponding test file

A **post-build artifact scanner** (`scripts/artifact-scanner.ts`) runs automatically after `pnpm build` via the `postbuild` hook, scanning `dist/` for `.map` files, `sourceMappingURL` directives, embedded API keys, and debugger statements.

## Claude Code Hooks

The project uses Claude Code hooks (`.claude/settings.json`) to integrate ESLint rules as **LLM instructions**:

- **PreToolUse (`lint-before-edit.sh`)** — Before Claude edits a file, runs ESLint and injects violations as `additionalContext`. Claude sees warnings and fixes them alongside its intended edit.
- **PostToolUse (`lint-after-edit.sh`)** — After editing, compares violation count before/after. Reports regressions (new violations introduced by the edit).
- **PostToolUse (`scan-after-write.sh`)** — Scans files written to `dist/` for source maps, API keys, debugger statements.
- **PostToolUse (`log-skill.sh`)** — Logs skill invocations to `~/.claude/skill-telemetry.jsonl`.

Global hooks (`~/.claude/settings.json`):
- **PostToolUse (`log-tool-use.sh`)** — Logs all tool calls to `~/.claude/tool-telemetry.jsonl`.
- **SessionStart (`log-session.sh`)** — Logs session metadata to `~/.claude/session-telemetry.jsonl`.
- **UserPromptSubmit (`suggest-skill.sh`)** — Fuzzy-matches prompts to the skill catalog and suggests relevant skills.

Telemetry analysis: `bash scripts/hooks/../../../core/scripts/analyze-telemetry.sh`

## Security commands

```bash
# Run comprehensive security audit
pnpm security:verify

# Scan for API keys in source code
pnpm security:scan

# Run security checks (used by prebuild)
pnpm security:check
```

## Environment Setup

### Configuration

The application supports two configuration methods (env.json is recommended):

1. **env.json (Recommended)**: Create `packages/agent-core/env.json` with API key and settings (note: the package is now `@cv-builder/agent-core`)
   ```bash
   cp packages/agent-core/env.json.example packages/agent-core/env.json
   # Edit env.json and add your Anthropic API key
   ```

2. **Legacy .env.local**: Create `.env.local` with `ANTHROPIC_API_KEY` (copy from `.env.example`)
   ```bash
   cp .env.example .env.local
   ```

The app uses the Claude Sonnet 4 model (`claude-sonnet-4-20250514`) by default.

**⚠️ SECURITY WARNING**: NEVER commit `env.json` or `.env.local` to git. These files contain API keys and must remain local only. The repository is configured to automatically prevent this.

### Security Best Practices

**Before committing code:**
1. Run `pnpm security:verify` to check for security issues
2. Pre-commit hooks automatically scan for API keys
3. NEVER commit `dist/` or `build/` directories
4. Store all secrets in `env.json` (gitignored)

**If you accidentally commit a secret:**
1. Immediately rotate the API key at console.anthropic.com
2. Remove the file from git history (see `SECURITY.md`)
3. Report the incident in GitHub issues

See `SECURITY.md` for comprehensive security documentation.

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

## Architecture detail

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
This project uses a monorepo structure with pnpm workspaces:

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
├── browser-app/         # @cv-builder/browser-app
│   ├── src/
│   │   ├── components/  # Dashboard components for Bio, Jobs, Outputs, Chat (container-presenter decomposition)
│   │   ├── services/    # Browser orchestrator
│   │   └── store/       # Redux state management
│   └── package.json
├── tsconfig/            # @frame/tsconfig — shared TypeScript presets
│   ├── base.json        # Shared base (ES2022, strict, bundler)
│   ├── node.json        # Node.js packages
│   ├── browser.json     # Browser/React packages
│   └── node-emit.json   # Node packages that emit JS (sourceMap: false)
└── eslint-plugin/       # @frame/eslint-plugin — custom ESLint rules
    ├── src/rules/       # 8 custom rules (source maps, API keys, MF singletons, etc.)
    ├── tests/           # RuleTester-based test suites
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

## Agent System (implemented)

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

## Available Agents (`.agents/` directory)

Claude can load and execute specialized agents from `.agents/` directory:

- `agent:pre-commit` - Run pre-commit validation
- `agent:issue-manager` - Manage GitHub issues
- `agent:pr-manager` - Handle pull requests
- `agent:pr-educator` - Analyze PRs and generate educational senior engineering commentary
- `agent:screenshot-commenter` - Generate test reports with embedded screenshots
- `agent:quality-check` - Run quality validation
- `agent:build-validator` - Validate build configuration

To use an agent, simply say: "Run the pre-commit validator agent" or "Use the issue manager agent to create a new issue" or "Analyze PR #41 with the pr-educator agent"

## Key Technologies

- **TypeScript**: Strict mode enabled with ES2022 target
- **React**: For web UI with IBM Carbon Design System (`@carbon/react`)
- **Vite**: Build tool and dev server
- **Anthropic SDK**: Claude API integration
- **Zod**: Runtime schema validation
- **Commander**: CLI argument parsing
- **tsx**: TypeScript execution for CLI
