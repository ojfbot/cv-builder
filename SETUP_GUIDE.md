# CV Builder Monorepo Setup Guide

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm
- Anthropic API key (from https://console.anthropic.com/)

### Initial Setup

1. **Install dependencies**:
```bash
npm install
```

2. **Configure API key**:
The API key is now stored in `packages/agent-core/env.json` (already created).

## Running the Application

### Browser Mode (with API Backend)

To run the full stack with both the browser UI and API server:

```bash
npm run dev:all
```

This starts:
- API server on `http://localhost:3001`
- Browser UI on `http://localhost:3000`

### Browser Only

To run just the browser UI (requires API server running separately):

```bash
npm run dev
```

### API Server Only

To run just the API backend:

```bash
npm run dev:api
```

### Headless CLI Mode

For command-line interaction:

```bash
npm run cli
```

This starts an interactive terminal session. Type `exit` or `quit` to end.

## Architecture Overview

The monorepo has proper separation of concerns:

### Packages

1. **`@cv-builder/agent-core`** (`packages/agent-core/`)
   - Core AI agents and business logic
   - CLI interface for headless mode
   - Configuration management (`env.json`)
   - Exports browser-compatible agents

2. **`@cv-builder/api`** (`packages/api/`)
   - Express.js REST API server
   - Agent orchestration via AgentManager
   - Secure API key handling (server-side only)
   - Rate limiting and security middleware

3. **`@cv-builder/browser-app`** (`packages/browser-app/`)
   - React + Vite browser UI
   - Communicates with API (no direct agent access)
   - Local storage for user data
   - No API keys in browser

### Configuration

API keys are stored in `packages/agent-core/env.json`:

```json
{
  "anthropicApiKey": "your-key-here",
  "directories": {
    "bio": "bio",
    "jobs": "jobs",
    "output": "output",
    ...
  },
  "model": "claude-sonnet-4-20250514"
}
```

This file is:
- Used by CLI for direct agent access
- Used by API server via AgentManager
- Never exposed to the browser
- Git-ignored for security

## Recent Fixes Applied

### 1. Fixed AgentManager Bug
**File**: `packages/api/src/services/agent-manager.ts`

**Issue**: Incorrect property name when accessing config
```typescript
// ❌ Before
this.apiKey = config.apiKey;

// ✅ After
this.apiKey = config.anthropicApiKey;
```

### 2. Fixed Import Paths
**File**: `packages/api/src/services/agent-manager.ts`

**Issue**: Incorrect import paths for Node.js-only modules
```typescript
// ❌ Before
import { OrchestratorAgent } from '@cv-builder/agent-core/dist/agents/orchestrator-agent.js';
import { getConfig } from '@cv-builder/agent-core/dist/utils/config.js';

// ✅ After  
import { OrchestratorAgent } from '@cv-builder/agent-core/agents/orchestrator-agent';
import { getConfig } from '@cv-builder/agent-core/utils/config';
```

### 3. Created env.json Configuration
**File**: `packages/agent-core/env.json`

Created from `env.json.example` with your Anthropic API key.

## Troubleshooting

### CLI won't start
- Ensure `packages/agent-core/env.json` exists with valid API key
- Run `npm install` from project root
- Check API key starts with `sk-ant-`

### Browser app can't connect to API
- Ensure API server is running (`npm run dev:api`)
- Check API is on port 3001
- Browser expects API at `http://localhost:3001/api`

### TypeScript errors
- Run `npm install` to ensure all workspace links are updated
- Run `npm run type-check` to verify types

### Agent initialization fails
- Verify `env.json` has correct `anthropicApiKey` field (not `apiKey`)
- Check console for specific error messages
- Ensure all required directories exist or will be created

## Development Workflow

### Making Changes to Agents
1. Edit files in `packages/agent-core/src/agents/`
2. Changes automatically picked up by CLI (via tsx watch in dev)
3. Restart API server to pick up changes (`npm run dev:api`)
4. Browser UI will reconnect automatically

### Adding New API Endpoints
1. Create route in `packages/api/src/routes/`
2. Update `packages/api/src/server.ts` to include route
3. Add corresponding method in `packages/browser-app/src/api/client.ts`
4. Use in browser components via `BrowserOrchestrator`

## Security Notes

✅ **Secure**:
- API keys stored server-side only (`env.json`)
- Browser communicates only via REST API
- No sensitive credentials in browser code

❌ **Don't**:
- Don't commit `env.json` to git (already in `.gitignore`)
- Don't expose API key in browser environment variables
- Don't bypass API to call agents directly from browser

## Next Steps

1. ✅ CLI is working in headless mode
2. Test browser mode: `npm run dev:all`
3. Verify API connection from browser UI
4. Create your bio data in the Bio tab
5. Add job listings in the Jobs tab
6. Start using the AI features!
