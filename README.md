# Resume Builder

> AI-powered resume builder with LangGraph multi-agent orchestration and a visual regression CI pipeline.

Two agent runtimes ship side by side: V1 (`agent-core`, always mounted at `/api/*`) and V2 (`agent-graph`, a LangGraph state graph with SQLite checkpointing and threads, mounted at `/api/v2/*` only when `ENABLE_V2_API=true`). The browser UI defaults to V2 mode; the root `pnpm dev:*` scripts set the flag, but any other server start (Docker, CI compose, `pnpm --filter @resume-builder/api start`) runs V1 only.

## As built (2026-09-24)

Verified against `main` @ `b670930`. Tracking: [#154](https://github.com/ojfbot/cv-builder/issues/154).

- **V2 graph** — hub-and-spoke: `START → orchestrator → {resumeGenerator | jobAnalysis | tailoring | skillsGap | interviewCoach} → orchestrator → … → END`. One conditional edge; no parallel fan-out, no aggregator.
- **Orchestrator** — one Opus call per turn, next action parsed from `**Next Action**:` by regex with a keyword fallback; it runs again after every specialist.
- **RAG** — `rag-retrieval-node.ts` and three seed-data retrievers exist but are **not wired into the graph**; no node reads `ragResults`.
- **Tests** — Playwright/visual suites in `browser-automation` (run against V1 in CI); `packages/agent-graph` has no tests.
- **Hosted deployment** — the Vercel build ships the browser app only; its API base URL is `http://localhost:3001/api`. There is no hosted API, so the public site can't tailor a resume.
- **Grounding** — the tailoring prompts tell the model not to fabricate; nothing checks the output against the source CV.

**Designed, not built** (each names what would build it; slices live in [`.claude/roadmap.md`](.claude/roadmap.md)):

| Item | Built by |
|------|----------|
| Orchestrator input rules, specialist → END edge, validated actions, graph tests, V2 stream client fix | `rm:rm-l1-cv-builder#S1` |
| RAG in the graph (persistent store + a consumer), or its removal | `rm:rm-l1-cv-builder#S2` |
| Bullet → source-CV grounding check + fabrication eval | `rm:rm-l1-cv-builder#S3` |
| Hosted API + keyless end-to-end run | `rm:rm-l1-cv-builder#S4`, `#S5` |
| Gap classification / adversarial review / pre-submission audit | TD-004, TD-005, TD-007 → `rm:rm-l1-cv-builder#S6`–`#S8` |
| Classifier node, parallel fan-out, aggregator, routing confidence | not scheduled (see `docs/ARCHITECTURE_V2.md` § Original design) |

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
│   ├── agent-graph/         # V2: LangGraph multi-agent system (behind ENABLE_V2_API)
│   │   ├── src/
│   │   │   ├── graphs/      # StateGraph definitions
│   │   │   ├── nodes/       # Agent nodes
│   │   │   ├── state/       # State management & checkpointing
│   │   │   ├── rag/         # Vector store & retrievers (not wired into the graph)
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
}
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

### Run Full Stack
```bash
pnpm dev:all        # API server (V1 + V2 routes) + Browser UI
pnpm dev:v2         # identical to dev:all
```

Both scripts set `ENABLE_V2_API=true`, so the API mounts V1 (`/api/*`) and V2 (`/api/v2/*`, agent-graph with SQLite checkpointing and threads). The browser UI starts in V2 mode; the toggle in the dashboard header switches to V1. Starting the API without the flag serves V1 only.

Known V2 gaps (see [As built](#as-built-2026-09-24)): the V2 streaming client expects `data:`-first frames carrying a `type` field, but the server sends named `event:` frames with no `type` — so frames are dropped depending on network chunking, the ones that do parse are untyped, and `done` is never detected. Also, `GET /api/v2/threads/:id` (used to load a thread) has no route. Both are fixed by `rm:rm-l1-cv-builder#S1`.

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