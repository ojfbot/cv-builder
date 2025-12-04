# V2 API Quick Start Guide

Run the CV Builder with the new LangGraph-based architecture (agent-graph).

## Quick Start

### Run UI with V2 API

```bash
npm run dev:v2
```

This single command:
- ✅ Starts API server with V2 endpoints enabled (`ENABLE_V2_API=true`)
- ✅ Starts browser UI (React app on port 3000)
- ✅ Both services run concurrently

### What's Different?

**V2 API uses**:
- 🔄 LangGraph for agent orchestration
- 💾 SQLite for state persistence (checkpointing)
- 🧵 Thread-based conversations
- 📡 Server-sent events for streaming
- 🔍 Vector stores for RAG (optional)

**V1 API uses**:
- Legacy agent-core
- File-based JSON storage
- Stateless agents

## Available Commands

```bash
# V1 (legacy agent-core)
npm run dev:all           # UI + V1 API

# V2 (new agent-graph)
npm run dev:v2            # UI + V2 API ⭐ NEW

# API only
npm run dev:api           # API server (V1 by default)
ENABLE_V2_API=true npm run dev:api  # API server with V2

# UI only
npm run dev               # Browser app only
```

## Testing V2 API

### 1. Check API is Running

```bash
curl http://localhost:3001/api/health
```

### 2. Create a Thread

```bash
curl -X POST http://localhost:3001/api/v2/threads \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "thread-abc123",
    "userId": "test-user",
    "createdAt": "2025-12-04T...",
    "updatedAt": "2025-12-04T..."
  }
}
```

### 3. Send a Message

```bash
curl -X POST http://localhost:3001/api/v2/chat \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "thread-abc123",
    "message": "What can you help me with?"
  }'
```

### 4. Test Streaming

```bash
curl -X POST http://localhost:3001/api/v2/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "thread-abc123",
    "message": "Generate my resume"
  }'
```

Returns Server-Sent Events:
```
event: connected
data: {"status":"connected"}

event: state
data: {"currentAgent":"orchestrator","nextAction":"generate_resume"}

event: message
data: {"content":"I'll generate your resume..."}

event: done
data: {"status":"completed"}
```

## V2 API Endpoints

### Chat
- `POST /api/v2/chat` - Non-streaming chat
- `POST /api/v2/chat/stream` - Streaming chat (SSE)

### Threads
- `POST /api/v2/threads` - Create thread
- `GET /api/v2/threads/:id` - Get thread
- `GET /api/v2/threads/user/:userId` - List user threads
- `PATCH /api/v2/threads/:id` - Update thread
- `DELETE /api/v2/threads/:id` - Delete thread
- `GET /api/v2/threads/:id/state` - Get thread state
- `PATCH /api/v2/threads/:id/state` - Update thread state
- `GET /api/v2/stats` - Get statistics

## Environment Variables

Create `.env.local` or set:

```bash
# Enable V2 API
ENABLE_V2_API=true

# Required: Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-...

# Optional: OpenAI for RAG embeddings
OPENAI_API_KEY=sk-...

# Optional: Database (defaults to SQLite)
DATABASE_TYPE=sqlite
DB_PATH=./cv_builder.db
```

## Browser App Integration

The browser app still uses V1 API by default. To integrate V2:

1. **Update API client** to use `/api/v2/*` endpoints
2. **Add thread management** to Redux store
3. **Update streaming** to handle SSE events
4. **Add feature flag** to toggle V1/V2

See `docs/technical/MIGRATION_GUIDE.md` for details.

## Troubleshooting

### V2 API not working?

Check the API server logs:
```
GraphManager (v2) initialized successfully
V2 API routes (LangGraph) mounted at /api/v2
```

If you see:
```
V2 API (LangGraph): Disabled (set ENABLE_V2_API=true to enable)
```

Then V2 is not enabled. Use `npm run dev:v2` or set `ENABLE_V2_API=true`.

### Database errors?

Delete the SQLite database and restart:
```bash
rm cv_builder.db
npm run dev:v2
```

### Missing dependencies?

```bash
npm install
```

## Architecture

```
Browser App (port 3000)
    ↓
API Server (port 3001)
    ↓
GraphManager
    ↓
LangGraph StateGraph
    ├── Orchestrator Node
    ├── Resume Generator Node
    ├── Job Analysis Node
    ├── Tailoring Node
    ├── Skills Gap Node
    └── Interview Coach Node
    ↓
SQLite (cv_builder.db)
    - Checkpoints
    - Threads
    - State
```

## Next Steps

1. **Test manually**: Use Postman or curl to test endpoints
2. **Compare with V1**: Run same operations on both APIs
3. **Integrate UI**: Update browser app to use V2
4. **Report issues**: Create GitHub issues for any problems

## Documentation

- `docs/technical/MIGRATION_GUIDE.md` - Complete migration guide
- `docs/technical/MIGRATION_COMPLETE.md` - Phase completion status
- `docs/technical/04-langgraph-migration-plan.md` - Original plan
- `packages/agent-graph/README.md` - Package documentation

## Support

- **GitHub Issues**: Report bugs and feature requests
- **Migration Guide**: See `MIGRATION_GUIDE.md`
- **Tests**: Run `cd packages/agent-graph && npm test`

---

**Status**: V2 API Ready for Testing ✅
**Command**: `npm run dev:v2`
**Ports**: API (3001), UI (3000)
