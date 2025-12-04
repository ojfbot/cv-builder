# CV Builder Architecture

## Overview

CV Builder now uses a secure **client-server architecture** with proper separation of concerns. All agent operations run server-side with API keys securely stored in `env.json`, while the browser app communicates through a RESTful API.

> **📘 Documentation Structure:**
> - **This document (ARCHITECTURE.md)**: V1 architecture (agent-core) - Current stable version
> - **[ARCHITECTURE_V2.md](ARCHITECTURE_V2.md)**: V2 architecture (agent-graph) - LangGraph-based system with advanced features
> - **[SERVICE_INTERACTIONS.md](SERVICE_INTERACTIONS.md)**: Detailed service interaction diagrams for both V1 and V2

## Architecture Versions

### V1 (Current - agent-core)
- Simple sequential agent execution
- REST API with streaming
- File-based storage
- Production-ready and stable

### V2 (New - agent-graph)
- LangGraph-based orchestration
- Parallel expert execution
- State persistence with checkpointing
- Thread-based conversations
- RAG (Retrieval-Augmented Generation)
- Advanced state management

**Feature Flag**: Set `ENABLE_V2_API=true` to enable V2 endpoints

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (React App)                          │
│                  packages/browser-app/                           │
│                                                                   │
│  ┌──────────────┐        ┌──────────────┐                       │
│  │ React        │        │ API Client   │                       │
│  │ Components   │───────▶│ (REST)       │                       │
│  └──────────────┘        └──────┬───────┘                       │
│         │                        │                               │
│         ▼                        │                               │
│  ┌──────────────┐                │                               │
│  │ Browser      │                │                               │
│  │ Orchestrator │◀───────────────┘                               │
│  └──────────────┘                                                │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────┐                                                │
│  │ Browser      │                                                │
│  │ Storage      │                                                │
│  │ (localStorage)│                                               │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTP/REST
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API Server                          │
│                    packages/api/                                 │
│                                                                   │
│  ┌──────────────┐        ┌──────────────┐                       │
│  │ Express      │        │ Security     │                       │
│  │ Routes       │───────▶│ Middleware   │                       │
│  └──────┬───────┘        └──────────────┘                       │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────┐                                                │
│  │ Agent        │                                                │
│  │ Manager      │                                                │
│  │ (Singleton)  │                                                │
│  └──────┬───────┘                                                │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────┐            │
│  │  Specialized Agents (agent-core)                 │            │
│  │                                                   │            │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │            │
│  │  │ Orchestrator│  │ Resume Gen  │  │ Job      │ │            │
│  │  └─────────────┘  └─────────────┘  │ Analysis │ │            │
│  │                                     └──────────┘ │            │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │            │
│  │  │ Tailoring   │  │ Skills Gap  │  │ Interview│ │            │
│  │  └─────────────┘  └─────────────┘  │ Coach    │ │            │
│  │                                     └──────────┘ │            │
│  └──────────────────────────────────────────────────┘            │
│         │                                                         │
│         ▼                                                         │
│  ┌──────────────┐                                                │
│  │ env.json     │                                                │
│  │ (API Key)    │                                                │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Anthropic API
                               ▼
                      Claude AI Models
```

## Package Structure

### 1. `packages/agent-core` - Agent System Core

**Purpose**: Core agent implementations and shared models

**Key Files**:
- `packages/agent-core/src/agents/base-agent.ts` - Base class for all agents
- `packages/agent-core/src/agents/orchestrator-agent.ts` - Main coordinator agent (Node.js only)
- `packages/agent-core/src/agents/resume-generator-agent.ts` - Resume generation
- `packages/agent-core/src/agents/job-analysis-agent.ts` - Job matching and analysis
- `packages/agent-core/src/agents/tailoring-agent.ts` - Resume customization
- `packages/agent-core/src/agents/skills-gap-agent.ts` - Learning path generation
- `packages/agent-core/src/agents/interview-coach-agent.ts` - Interview preparation
- `packages/agent-core/src/models/` - Zod schemas for Bio, JobListing, etc.
- `packages/agent-core/src/utils/config.ts` - Loads `env.json` (Node.js only)
- `packages/agent-core/src/utils/file-storage.ts` - File system storage (Node.js only)

**Security**:
- Agents NO LONGER use `dangerouslyAllowBrowser`
- All agents run server-side only
- API keys never exposed to browser

### 2. `packages/api` - Backend REST API (NEW)

**Purpose**: Secure REST API for agent operations

**Key Files**:
- `src/server.ts` - Express server setup
- `src/services/agent-manager.ts` - Singleton managing all agents
- `src/routes/chat.ts` - Chat endpoints (streaming & non-streaming)
- `src/routes/resume.ts` - Resume generation endpoints
- `src/routes/job.ts` - Job analysis endpoints
- `src/routes/interview.ts` - Interview preparation endpoints
- `src/routes/health.ts` - Health check endpoint
- `src/middleware/auth.ts` - Authentication (placeholder for future)
- `src/middleware/validation.ts` - Zod request validation
- `src/middleware/error-handler.ts` - Centralized error handling

**Security**:
- Rate limiting (100 requests per 15 minutes)
- Helmet.js for security headers
- CORS configuration
- Input validation with Zod
- Centralized error handling

**API Endpoints**:
```
POST /api/chat              - Send chat message
POST /api/chat/stream       - Stream chat response (SSE)
POST /api/resume/generate   - Generate resume
POST /api/resume/tailor     - Tailor resume to job
POST /api/job/analyze       - Analyze job listing
POST /api/job/skills-gap    - Analyze skills gap
POST /api/interview/cover-letter - Generate cover letter
POST /api/interview/prepare - Prepare interview materials
GET  /api/health            - Health check
```

### 3. `packages/browser-app` - React Web UI

**Purpose**: User interface for CV Builder

**Key Changes**:
- `packages/browser-app/src/api/client.ts` - NEW: REST API client with timeout handling
- `packages/browser-app/src/services/browser-orchestrator.ts` - UPDATED: Now uses API client instead of direct agents
- `packages/browser-app/src/services/agent-service.ts` - UPDATED: No longer requires API key
- `packages/browser-app/src/contexts/AgentContext.tsx` - UPDATED: Removed API key management
- `packages/browser-app/src/store/slices/agentSlice.ts` - UPDATED: Removed API key state
- `packages/browser-app/src/components/ApiKeySettings.tsx` - UPDATED: Now shows connection status
- `packages/browser-app/src/utils/browser-storage.ts` - Unchanged: LocalStorage for user data

**Data Flow**:
1. User interacts with UI components
2. Components call `BrowserOrchestrator` methods
3. `BrowserOrchestrator` forwards requests to API via `ApiClient`
4. API server processes request through agents
5. Response streamed back to UI

## Configuration

### Server Configuration

**Location**: `packages/agent-core/env.json`

```json
{
  "apiKey": "sk-ant-api03-...",
  "modelName": "claude-sonnet-4-20250514",
  "bioDirectory": "bio",
  "jobsDirectory": "jobs",
  "outputsDirectory": "output"
}
```

**Note**: This file contains sensitive data and should NEVER be committed to git.

### Client Configuration

**Location**: `packages/browser-app/.env` (optional)

```env
VITE_API_URL=http://localhost:3001/api
NODE_ENV=development
```

**Default**: If not specified, defaults to `http://localhost:3001/api`

## Running the Application

### Development Mode

**Option 1: Run both services together (Recommended)**
```bash
npm run dev:all
```

This runs:
- API server on port 3001
- Browser app on port 3000

**Option 2: Run services separately**

Terminal 1 - API Server:
```bash
npm run dev:api
```

Terminal 2 - Browser App:
```bash
npm run dev
```

### Production Mode

```bash
# Build all packages
npm run build

# Start API server
npm run start:api

# Preview browser app (or serve dist/ with your hosting)
npm run preview
```

## Security Benefits

### Before (Browser-based agents)

❌ API key exposed in browser
❌ Network requests visible in DevTools
❌ Anyone with the key could abuse it
❌ No rate limiting
❌ No request validation

### After (API-based architecture)

✅ API key stored securely on server
✅ API key never sent to browser
✅ Rate limiting per IP
✅ Request validation with Zod
✅ Centralized error handling
✅ Ready for authentication/authorization
✅ Proper separation of concerns

## Future Enhancements

### Authentication (TODO)

The API has placeholders for authentication:
- `src/middleware/auth.ts` - Ready for JWT or API key validation
- `src/middleware/auth.ts` has `authorize()` for RBAC

**Implementation Plan**:
1. Add user authentication (OAuth, JWT, or session-based)
2. Require authenticated requests
3. Implement user-specific data isolation
4. Add rate limiting per user instead of per IP

### Database Integration (TODO)

Currently, user data is stored in:
- Browser: `localStorage` (Bio, Jobs)
- Server: File system via `FileStorage`

**Future**:
- Add PostgreSQL or MongoDB
- Store user data server-side
- Implement proper data persistence
- Add data backup and recovery

### WebSocket Support (TODO)

Currently using Server-Sent Events (SSE) for streaming.

**Future**:
- WebSocket for bidirectional communication
- Real-time collaboration features
- Live agent status updates

## Migration Guide

### For Existing Codebases

If you have existing code using the old browser-based agents:

**Before**:
```typescript
import { ResumeGeneratorAgent } from '@cv-builder/agent-core';

const agent = new ResumeGeneratorAgent(apiKey);
const resume = await agent.generateResume(bio);
```

**After**:
```typescript
import { getOrchestratorAgent } from '../services/agent-service';

const orchestrator = getOrchestratorAgent();
const resume = await orchestrator.generateResume(bio);
```

### API Key Storage

**Before**: API keys stored in:
- `VITE_ANTHROPIC_API_KEY` environment variable
- `localStorage['anthropic_api_key']`

**After**: API keys stored in:
- `packages/agent-core/env.json` (server-side only)

**Migration**:
1. Copy API key from browser storage or `.env.local`
2. Create `packages/agent-core/env.json`:
   ```bash
   cp packages/agent-core/env.json.example packages/agent-core/env.json
   ```
3. Add your API key to `env.json`
4. Remove API key from browser storage and `.env.local`

## Troubleshooting

### API Server Not Starting

**Error**: "Failed to initialize AgentManager"
**Solution**: Check `packages/agent-core/env.json` exists and contains valid API key

### Browser Can't Connect to API

**Error**: "Failed to fetch" or network error in browser console
**Solution**:
1. Ensure API server is running (`npm run dev:api`)
2. Check `VITE_API_URL` environment variable
3. Check CORS settings in `packages/api/src/server.ts`

### Type Errors in Browser App

**Solution**: Run `npm install` to update dependencies

## Contributing

When adding new agent functionality:

1. **Add agent method** in `packages/agent-core/src/agents/`
2. **Add API route** in `packages/api/src/routes/`
3. **Add API client method** in `packages/browser-app/src/api/client.ts`
4. **Add orchestrator method** in `packages/browser-app/src/services/browser-orchestrator.ts`
5. **Update UI components** to use new functionality

## Summary

The new architecture provides:
- ✅ Secure API key management
- ✅ Proper separation of concerns
- ✅ Scalable architecture
- ✅ Foundation for authentication
- ✅ Production-ready security
- ✅ Better error handling
- ✅ Rate limiting and protection

All agents now run server-side only, with the browser communicating through a secure REST API.
