# CV Builder

AI-powered CV builder with Claude agent orchestration system.

## Project Structure

This is a monorepo with two main packages:

```
cv-builder/
├── packages/
│   ├── agent-core/          # V1: Legacy agent system
│   │   ├── src/
│   │   │   ├── agents/      # Specialized AI agents
│   │   │   ├── models/      # Data models
│   │   │   ├── utils/       # Utilities
│   │   │   └── cli/         # CLI interface
│   │   └── package.json
│   │
│   ├── agent-graph/         # V2: LangGraph multi-agent system ⭐ NEW
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
│   │   │   ├── routes/      # API endpoints (V1 & V2)
│   │   │   ├── services/    # AgentManager & GraphManager
│   │   │   └── middleware/  # Auth, validation, errors
│   │   └── package.json
│   │
│   └── browser-app/         # React browser UI
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── store/       # Redux state
│       │   ├── api/         # API client
│       │   └── services/    # Browser services
│       └── package.json
│
├── docs/                    # Documentation
│   ├── technical/           # Technical docs & ADRs
│   └── how-to/              # Guides
├── V2_QUICKSTART.md         # V2 quick start guide
├── docker-compose.yml       # Docker orchestration
├── Dockerfile               # Agent system container
└── package.json             # Root workspace config
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- Docker (optional)
- Anthropic API key

### Installation

```bash
npm install
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
  "model": "claude-sonnet-4-20250514"
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
- Run `npm run security:verify` to check for security issues

See [`SECURITY.md`](SECURITY.md) for detailed security policies and incident reporting.

## Development

### Run Full Stack (V1 - Legacy)
```bash
npm run dev:all        # API server + Browser UI (agent-core)
```

### Run Full Stack (V2 - LangGraph) ⭐ NEW
```bash
npm run dev:v2         # API server + Browser UI (agent-graph)
```

This uses the new LangGraph-based architecture with:
- 🔄 Multi-agent orchestration
- 💾 State persistence (checkpointing)
- 🧵 Thread-based conversations
- 📡 Streaming support (SSE)

See [V2_QUICKSTART.md](V2_QUICKSTART.md) for details.

### Individual Services
```bash
npm run dev            # Browser UI only (port 3000)
npm run dev:api        # API server only (port 3001)
```

### CLI Agent System
```bash
npm run cli            # Interactive CLI mode
npm run cli:headless   # Headless mode
```

## Docker

### Build
```bash
npm run docker:build
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

### Deployment
- [Docker Guide](docs/DOCKER_GUIDE.md) - Docker setup and deployment

### Reference
- [Technical Documentation](docs/technical/) - In-depth technical guides
- [How-To Guides](docs/how-to/) - Step-by-step tutorials
- [Archive](docs/archive/) - Historical documentation and migration guides

## License

MIT
