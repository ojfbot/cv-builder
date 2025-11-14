# Migration Guide: Monorepo Restructure

## Overview

The CV Builder project has been restructured into a proper monorepo with clear separation between:
- **Agent Core**: Core AI agent system (containerized)
- **Browser App**: React web UI

## Changes Summary

### New Structure

```
cv-builder/                           # Root workspace
├── packages/
│   ├── agent-core/                   # @cv-builder/agent-core
│   │   ├── src/
│   │   │   ├── agents/              # All AI agents
│   │   │   ├── models/              # Data models (Bio, Job, Resume, etc.)
│   │   │   ├── utils/               # FileStorage, MarkdownParser
│   │   │   ├── cli/                 # CLI interface
│   │   │   └── index.ts             # Package exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── browser-app/                  # @cv-builder/browser-app
│       ├── src/
│       │   ├── components/          # React components
│       │   ├── contexts/            # AgentContext, ChatContext
│       │   ├── services/            # BrowserOrchestrator
│       │   ├── utils/               # BrowserStorage
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── public/
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       └── vite.config.ts
│
├── docker-compose.yml                # Full stack orchestration
├── Dockerfile                        # Agent system container
├── .dockerignore
├── package.json                      # Root workspace config
└── README.md
```

### Old Structure (Removed)

```
cv-builder/
├── src/
│   ├── agents/         → moved to packages/agent-core/src/agents/
│   ├── models/         → moved to packages/agent-core/src/models/
│   ├── utils/          → moved to packages/agent-core/src/utils/
│   ├── cli/            → moved to packages/agent-core/src/cli/
│   └── browser/        → moved to packages/browser-app/src/
├── public/             → moved to packages/browser-app/public/
├── index.html          → moved to packages/browser-app/index.html
└── vite.config.ts      → moved to packages/browser-app/vite.config.ts
```

## Updated Commands

### Before (Old)
```bash
npm run dev              # Start browser app
npm run cli              # Run CLI
npm run build            # Build browser app
```

### After (New)
```bash
# Same commands work from root!
npm run dev              # Start browser app
npm run cli              # Run CLI agent system
npm run build            # Build all packages

# New commands
npm run docker:build     # Build Docker image
npm run docker:run       # Run in container
docker-compose up        # Run full stack
```

## Import Changes

### Before (Old)
```typescript
import { BaseAgent } from '../../agents/base-agent.js'
import { Bio } from '../../models/bio.js'
```

### After (New)
```typescript
import { BaseAgent, Bio } from '@cv-builder/agent-core'
```

## Docker Support

### Build Agent Container
```bash
docker build -t cv-builder-agents .
```

### Run Agent System
```bash
docker run -it --rm \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  cv-builder-agents
```

### Full Stack with Docker Compose
```bash
# Start everything
docker-compose up

# Start only agents
docker-compose up agents

# Start only browser
docker-compose up browser-app
```

## Development Workflow

### Local Development (No Docker)

1. Install dependencies:
```bash
npm install
```

2. Run browser app:
```bash
npm run dev
# Opens at http://localhost:3000
```

3. Run CLI in another terminal:
```bash
npm run cli
```

### Docker Development

1. Start services:
```bash
docker-compose up
```

2. Access:
- Browser App: http://localhost:3000
- Agents: Interactive terminal in docker-compose logs

### Working on Specific Packages

#### Agent Core
```bash
cd packages/agent-core
npm run cli
npm run type-check
```

#### Browser App
```bash
cd packages/browser-app
npm run dev
npm run build
npm run type-check
```

## Benefits of New Structure

1. **Clear Separation**: UI and agent logic are completely separated
2. **Containerization**: Agents can run in Docker independently
3. **Reusability**: Agent core can be used in other projects
4. **Type Safety**: Shared types through the agent-core package
5. **Better Deployment**: Can deploy agents and UI separately
6. **Easier Testing**: Can test packages independently

## Troubleshooting

### "Cannot find module @cv-builder/agent-core"

Run from root:
```bash
npm install
```

### Ports in Use

The dev server will automatically try alternate ports (3001, 3002, etc.)

### Docker Build Fails

Make sure .env file exists:
```bash
cp .env.example .env
# Edit with your ANTHROPIC_API_KEY
```

### Types Not Resolving

Run type check:
```bash
npm run type-check
```

## Next Steps

1. ✅ Structure is ready
2. ✅ Docker configuration complete
3. ✅ Workspace commands working
4. 🔄 Test agent functionality
5. 🔄 Test browser UI
6. 🔄 Deploy to production environment

## Questions?

Check the README.md for full documentation.
