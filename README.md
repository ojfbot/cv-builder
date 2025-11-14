# CV Builder

AI-powered CV builder with Claude agent orchestration system.

## Project Structure

This is a monorepo with two main packages:

```
cv-builder/
├── packages/
│   ├── agent-core/          # Core AI agent system
│   │   ├── src/
│   │   │   ├── agents/      # Specialized AI agents
│   │   │   ├── models/      # Data models
│   │   │   ├── utils/       # Utilities
│   │   │   └── cli/         # CLI interface
│   │   └── package.json
│   │
│   └── browser-app/         # React browser UI
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── contexts/    # React contexts
│       │   ├── services/    # Browser services
│       │   └── utils/       # Browser utilities
│       └── package.json
│
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

## Development

### Browser UI
```bash
npm run dev
```

### CLI Agent System
```bash
npm run cli
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
