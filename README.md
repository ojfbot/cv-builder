# Resume Builder

> AI-powered resume builder with LangGraph multi-agent orchestration and a visual regression CI pipeline.

The project migrated from a monolithic agent system (V1/agent-core) to LangGraph's state graph architecture (V2/agent-graph) for explicit state management, checkpointing, and SSE streaming. V2 is the default.

## CI/CD Pipeline

Every pull request targeting `main` runs the full browser automation + visual regression suite:

```
```
PR opened
  └─ browser-automation-tests.yml
       ├─ pnpm type-check (all packages)
       ├─ skill-audit (shared composite action from ojfbot/github-actions@v1)
       ├─ Docker Compose: browser-app + api + browser-automation
       ├─ Comprehensive tests + visual regression tests
       ├─ Generate PR comment (test outcomes + baseline coverage)
       ├─ Deploy draw.io architecture viewer → GitHub Pages
       ├─ [if S3_BUCKET set] Upload baseline PNGs to S3
       └─ [on main push] Commit updated draw.io canvas to repo
```

**Live architecture viewer:** Every CI run publishes a draw.io viewer (with real screenshots injected by the pipeline) to **[ojfbot.github.io/cv-builder](https://ojfbot.github.io/cv-builder/)**. Links are posted automatically in the PR comment.

Visual regression baselines live in `packages/browser-automation/test-baselines/cv-builder-visual/`. Regenerate by triggering the workflow with `update_baselines: true`. When AWS credentials are configured, the pipeline uploads baselines to S3 and injects public URLs into the draw.io canvas. See [docs/AWS_CI_SETUP.md](docs/AWS_CI_SETUP.md) for infrastructure setup.

## Project Structure

This is a monorepo with the following packages:

```
resume-builder/
├── packages/
│   ├── agent-core/          # V1: Legacy agent system
│   │   ├── src/
│   │   │   ├── agents/      # Specialized AI agents
│   │   │   ├── models/      # Data models
│   │   │   ├── utils/       # Utilities
│   │   │   └── cli/         # CLI interface
│   │   └── package.json
│   │
│   ├── agent-graph/         # V2: LangGraph multi-agent system ⭐ DEFAULT
│   │   ├── src/
│   │   │   ├── graphs/      # StateGraph definitions
│   │   │   ├── nodes/       # Agent nodes
│   │   │   ├── state/       # State management & checkpointing
│   │   │   ├── rag/         # Vector stores & retrievers
│   │   │   └── utils/       # Utilities
│   │   └── package.json
│   │
│   ├── api/                 # Express API server
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints (V1 & V2, + GET /api/beads)
│   │   │   ├── services/    # AgentManager & GraphManager
│   │   │   └── middleware/  # Auth, validation, errors
│   │   └── package.json
│   │
│   ├── browser-app/         # React browser UI
│   │   ├── src/
│   │   │   ├── components/  # React components
│   │   │   ├── store/       # Redux state
│   │   │   ├── api/         # API client
│   │   │   └── services/    # Browser services
│   │   └── package.json
│   │
│   ├── browser-automation/  # Playwright visual regression + CI pipeline
│   │   ├── src/
│   │   │   ├── drawio/      # draw.io URL injector
│   │   │   └── storage/     # S3 uploader
│   │   ├── templates/drawio/ # cvBuilder.drawio.xml + screenshot manifest
│   │   ├── tests/           # Playwright test suites
│   │   └── scripts/         # ci-screenshot-pipeline.ts
│   │
│   └── visual-dashboard/    # Visual regression dashboard React app
│       ├── src/
│       │   ├── components/  # DrawioCanvas, DiagramViewer, …
│       │   └── utils/       # drawioParser.ts
│       └── package.json
│
├── .github/workflows/
│   └── browser-automation-tests.yml  # Full CI/CD pipeline
│
├── docs/                    # Documentation
│   ├── CI_CD_PIPELINE.md    # Complete CI/CD pipeline reference
│   ├── AWS_CI_SETUP.md      # S3 + OIDC one-time setup guide
│   ├── technical/           # Technical docs & ADRs
│   └── how-to/              # Guides
├── V2_QUICKSTART.md         # V2 quick start guide
├── docker-compose.yml       # Docker orchestration
├── docker-compose.ci.yml    # CI-specific Docker Compose
├── Dockerfile               # Agent system container
└── package.json             # Root workspace config
```

## Getting Started

### Prerequisites

- Node.js 22.11.1+ (LTS)
- pnpm 9.0.0+
- Docker (optional)
- Anthropic API key
- fnm (recommended for Node version management)

### Node Version Management

This project uses `.nvmrc` to pin the Node version. If you have `fnm` installed:

```bash
# Install the correct Node version
fnm use

# Or install if not present
fnm install
```

### Installation

```bash
# Install pnpm globally (if not already installed)
corepack enable
corepack prepare pnpm@9.15.4 --activate

# Install dependencies
pnpm install
```

### Configuration

You can configure the application using either `env.json` (recommended) or `.env.local`:

#### Option 1: env.json (Recommended)

Create `env.json` in `packages/agent-core/`:
```bash
cp packages/agent-core/env.json.example packages/agent-core/env.json
# Edit env.json and add your API key
```

Example `env.json`:
```json
{
  "anthropicApiKey": "your_api_key_here",
  "directories": {
    "bio": "bio",
    "jobs": "jobs",
    "output": "output",
    "public": "public"
  },
  "model": "claude-opus-5"
```

#### Option 2: .env.local (Legacy)

Create `.env.local` file (using `.env.local` to avoid conflicts with Claude CLI):
```bash
cp .env.example .env.local
# Edit .env.local and add your API key
```

Example `.env.local`:
```bash
ANTHROPIC_API_KEY=your_api_key_here
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

### 🔐 Security

**IMPORTANT**: API keys and secrets must NEVER be committed to git.

- `env.json` and `.env.local` are gitignored
- Pre-commit hooks scan for API keys
- Build artifacts (`dist/`, `build/`) are never committed
- Run `pnpm security:verify` to check for security issues

See [`SECURITY.md`](SECURITY.md) for detailed security policies and incident reporting.

## Development

### Run Full Stack (V1 - Legacy)
```bash
pnpm dev:all        # API server + Browser UI (agent-core)
```

### Run Full Stack (V2 - LangGraph) ⭐ DEFAULT
```bash
pnpm dev:v2         # API server + Browser UI (agent-graph)
# Or use pnpm dev:all - V2 is now the default mode in the browser UI
```

This uses the new LangGraph-based architecture with:
- 🔄 Multi-agent orchestration
- 💾 State persistence (checkpointing)
- 🧵 Thread-based conversations
- 📡 Streaming support (SSE)

**Note:** V2 (LangGraph) mode is now enabled by default in the browser UI. Users can toggle between V1 and V2 modes using the toggle in the dashboard header.

See [V2_QUICKSTART.md](V2_QUICKSTART.md) for details.

### Individual Services
```bash
pnpm dev            # Browser UI only (port 3000)
pnpm dev:api        # API server only (port 3001)
```

### CLI Agent System
```bash
pnpm cli            # Interactive CLI mode
pnpm cli:headless   # Headless mode
```

## Docker

### Build
```bash
pnpm docker:build
```

### Run
```bash
docker-compose up
```

## Documentation

Comprehensive documentation is available in the `/docs` directory:

### Getting Started
- [Setup Guide](docs/SETUP_GUIDE.md) - Detailed setup and configuration
- [Quick Start](docs/QUICK_START.md) - Get up and running quickly
- [Architecture](docs/ARCHITECTURE.md) - System architecture overview

### Development
- [Agents Guide](docs/AGENTS_GUIDE.md) - Working with AI agents
- [Badge Actions](docs/BADGE_ACTIONS_GUIDE.md) - Interactive UI actions
- [Navigation System](docs/NAVIGATION_SYSTEM.md) - Tab navigation
- [Browser Integration](docs/BROWSER_INTEGRATION.md) - Browser app integration

### Deployment & CI/CD
- [CI/CD Pipeline](docs/CI_CD_PIPELINE.md) - Complete pipeline reference (GitHub Actions, GitHub Pages, draw.io canvas)
- [AWS CI Setup](docs/AWS_CI_SETUP.md) - S3 + OIDC one-time infrastructure setup
- [Docker Guide](docs/DOCKER_GUIDE.md) - Docker setup and deployment

### Reference
- [Technical Documentation](docs/technical/) - In-depth technical guides
- [How-To Guides](docs/how-to/) - Step-by-step tutorials
- [Archive](docs/archive/) - Historical documentation and migration guides

## License

MIT

## Frame OS Ecosystem

Part of [Frame OS](https://github.com/ojfbot/shell) — an AI-native application OS.

| Repo | Description |
|------|-------------|
| [shell](https://github.com/ojfbot/shell) | Module Federation host + frame-agent LLM gateway |
| [core](https://github.com/ojfbot/core) | Workflow framework — 30+ slash commands + TypeScript engine |
| **cv-builder** | **AI-powered resume builder with LangGraph agents (this repo)** |
| [blogengine](https://github.com/ojfbot/BlogEngine) | AI blog content creation platform |
| [TripPlanner](https://github.com/ojfbot/TripPlanner) | AI trip planner with 11-phase pipeline |
| [core-reader](https://github.com/ojfbot/core-reader) | Documentation viewer for the core framework |
| [lean-canvas](https://github.com/ojfbot/lean-canvas) | AI-powered lean canvas business model tool |
| [gastown-pilot](https://github.com/ojfbot/gastown-pilot) | Multi-agent coordination dashboard |
| [seh-study](https://github.com/ojfbot/seh-study) | NASA SEH spaced repetition study tool |
| [daily-logger](https://github.com/ojfbot/daily-logger) | Automated daily dev blog pipeline |
| [purefoy](https://github.com/ojfbot/purefoy) | Roger Deakins cinematography knowledge base |
| [MrPlug](https://github.com/ojfbot/MrPlug) | Chrome extension for AI UI feedback |
| [frame-ui-components](https://github.com/ojfbot/frame-ui-components) | Shared component library (Carbon DS) — published as `@ojfbot/frame-ui-components` on npm |
| [github-actions](https://github.com/ojfbot/github-actions) | Shared composite GitHub Actions (skill-audit CI, etc.) |
| [asset-foundry](https://github.com/ojfbot/asset-foundry) | Asset pipeline with dual Blender transports — Frame MF remote at :3035 |