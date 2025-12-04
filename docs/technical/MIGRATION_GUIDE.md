# Migration Guide: agent-core → agent-graph

This document provides the complete migration plan from `agent-core` to `agent-graph` (LangGraph-based architecture).

## Table of Contents

1. [Overview](#overview)
2. [Architecture Comparison](#architecture-comparison)
3. [Migration Status](#migration-status)
4. [Using V2 API](#using-v2-api)
5. [Feature Parity](#feature-parity)
6. [Breaking Changes](#breaking-changes)
7. [Rollout Plan](#rollout-plan)
8. [Rollback Procedure](#rollback-procedure)

---

## Overview

**Goal**: Migrate from `agent-core` (legacy agent system) to `agent-graph` (LangGraph-powered multi-agent system) with zero downtime and guaranteed feature parity.

**Strategy**: Parallel implementation with feature flag, gradual rollout, and comprehensive testing.

### Why Migrate?

**LangGraph Benefits**:
- ✅ **Built-in checkpointing** - Resume from any point
- ✅ **Thread management** - Multi-conversation support
- ✅ **State persistence** - SQLite/PostgreSQL storage
- ✅ **Streaming** - Real-time response updates
- ✅ **Human-in-the-loop** - Pause for approval
- ✅ **Observability** - LangSmith integration
- ✅ **RAG support** - Vector store integration
- ✅ **Conversation branching** - Explore alternatives

---

## Architecture Comparison

### V1 (agent-core) - Legacy

```
Browser App → API Server → AgentManager → Specialized Agents → Claude API
                                         ↓
                                   FileStorage (JSON)
```

**Characteristics**:
- Stateless agents
- No built-in persistence
- Manual conversation management
- File-based storage
- Agent methods directly called

### V2 (agent-graph) - LangGraph

```
Browser App → API Server → GraphManager → StateGraph → Nodes → Claude API
                                         ↓
                                   Checkpointer (SQLite/PostgreSQL)
                                   ThreadManager
                                   VectorStores (RAG)
```

**Characteristics**:
- Stateful graph execution
- Built-in checkpointing
- Thread-based conversations
- Database storage
- Blackboard pattern

---

## Migration Status

### ✅ Phase 1: Foundation (Complete)
- State schema with Zod validation
- PostgreSQL checkpointer
- SQLite checkpointer (dev)
- Thread manager
- Configuration system

### ✅ Phase 2: Node Conversion (Complete)
- Base node pattern
- Resume generator node
- Job analysis node
- Tailoring node
- Skills gap node
- Interview coach node

### ✅ Phase 3: Graph & Orchestration (Complete)
- Orchestrator node
- StateGraph with conditional routing
- Streaming support
- State management API

### ✅ Phase 4: RAG Infrastructure (Complete)
- MemoryVectorStore integration
- Resume templates retriever
- Interview prep retriever
- Learning resources retriever
- RAG node

### ✅ Phase 5: API Integration (Complete)
- GraphManager service
- V2 chat endpoints (`/api/v2/chat`, `/api/v2/chat/stream`)
- V2 thread endpoints (`/api/v2/threads/*`)
- Feature flag (`ENABLE_V2_API`)
- Backward compatibility maintained

### 🔄 Phase 6: Feature Parity (Current)
- Comparison test suite
- Performance benchmarking
- Quality validation
- Documentation

### ⏳ Phase 7: Advanced Features (Planned)
- Human-in-the-loop
- Conversation branching
- Long-term memory
- Advanced RAG patterns
- LangSmith observability

### ⏳ Phase 8: Migration & Deprecation (Planned)
- Gradual rollout
- Monitoring
- Full cutover
- agent-core deprecation

---

## Using V2 API

### Enable V2 Endpoints

Set environment variable:

```bash
export ENABLE_V2_API=true
```

Or in `.env`:

```
ENABLE_V2_API=true
```

### API Endpoints

#### V1 (agent-core) - Legacy
- `POST /api/chat` - Chat with orchestrator
- `POST /api/resume` - Generate resume
- `POST /api/job` - Analyze job
- `POST /api/interview` - Interview prep

#### V2 (agent-graph) - LangGraph
- `POST /api/v2/chat` - Non-streaming chat
- `POST /api/v2/chat/stream` - Streaming chat (SSE)
- `POST /api/v2/threads` - Create thread
- `GET /api/v2/threads/:id` - Get thread
- `GET /api/v2/threads/user/:userId` - List user threads
- `PATCH /api/v2/threads/:id` - Update thread
- `DELETE /api/v2/threads/:id` - Delete thread
- `GET /api/v2/threads/:id/state` - Get thread state
- `PATCH /api/v2/threads/:id/state` - Update thread state
- `GET /api/v2/stats` - Get statistics

### Example: Creating a Thread and Chatting

```typescript
// 1. Create a thread
const createResponse = await fetch('http://localhost:3001/api/v2/threads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    metadata: { purpose: 'resume-generation' }
  })
});

const { data: thread } = await createResponse.json();
console.log('Thread created:', thread.id);

// 2. Load bio and job into thread state
await fetch(`http://localhost:3001/api/v2/threads/${thread.id}/state`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bio: myBioData,
    currentJob: jobListing
  })
});

// 3. Send a message
const chatResponse = await fetch('http://localhost:3001/api/v2/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    threadId: thread.id,
    message: 'Generate my resume'
  })
});

const { data } = await chatResponse.json();
console.log('Response:', data.message);
console.log('Outputs:', data.outputs);
```

### Example: Streaming Chat

```typescript
const response = await fetch('http://localhost:3001/api/v2/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    threadId: thread.id,
    message: 'Tailor my resume for this job'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.startsWith('event:')) {
      const eventType = line.substring(7).trim();
      console.log('Event:', eventType);
    } else if (line.startsWith('data:')) {
      const data = JSON.parse(line.substring(6));
      console.log('Data:', data);
    }
  }
}
```

---

## Feature Parity

### ✅ Confirmed Parity

| Feature | V1 (agent-core) | V2 (agent-graph) | Status |
|---------|----------------|------------------|---------|
| Resume Generation | ✅ | ✅ | **Parity** |
| Job Analysis | ✅ | ✅ | **Parity** |
| Resume Tailoring | ✅ | ✅ | **Parity** |
| Skills Gap Analysis | ✅ | ✅ | **Parity** |
| Interview Prep | ✅ | ✅ | **Parity** |
| Cover Letter Generation | ✅ | ✅ | **Parity** |
| Orchestrator Routing | ✅ | ✅ | **Parity** |
| Bio Management | ✅ | ✅ (via state) | **Parity** |
| Job Management | ✅ | ✅ (via state) | **Parity** |

### ✨ V2 Enhancements

| Feature | V1 | V2 | Notes |
|---------|----|----|-------|
| Thread Management | ❌ | ✅ | Multi-conversation support |
| Checkpointing | ❌ | ✅ | Resume from any point |
| State Persistence | File-based | Database | SQLite/PostgreSQL |
| Streaming | Limited | Full SSE | Real-time updates |
| RAG Support | ❌ | ✅ | Vector store integration |
| Human-in-the-loop | ❌ | ✅ (planned) | Pause for approval |
| Observability | ❌ | ✅ (planned) | LangSmith integration |

---

## Breaking Changes

### None for V1 API

**V1 endpoints remain unchanged** and will continue to work. No breaking changes for existing integrations.

### V2 API Differences

1. **Thread-based**: V2 requires thread creation before chatting
2. **State updates**: Bio/job loaded via `PATCH /threads/:id/state`
3. **Streaming format**: SSE events instead of raw text chunks
4. **Response structure**: Different JSON shape

---

## Rollout Plan

### Phase 1: Internal Testing (Week 1)
- ✅ Enable V2 API with `ENABLE_V2_API=true`
- ✅ Test all endpoints manually
- ✅ Run automated test suite
- ✅ Verify feature parity

### Phase 2: Canary (Week 2)
- Route 10% of requests to V2
- Monitor error rates and performance
- Compare outputs with V1
- Rollback if issues detected

### Phase 3: Gradual Increase (Weeks 3-4)
- Increase to 25% → 50% → 75%
- Monitor at each step
- Pause if error rate increases

### Phase 4: Full Migration (Week 5)
- Route 100% to V2
- Keep V1 code as fallback
- Monitor for 1 week

### Phase 5: Deprecation (Week 6+)
- Announce V1 deprecation (30-day notice)
- Remove V1 endpoints after notice period
- Archive agent-core package

---

## Rollback Procedure

### If V2 Has Issues

**Immediate Rollback**:

```bash
# 1. Disable V2 API
export ENABLE_V2_API=false

# 2. Restart API server
npm run dev:api

# 3. Verify V1 endpoints working
curl http://localhost:3001/api/health
```

**Database State**:
- V2 state stored in SQLite (`cv_builder.db`)
- V1 state stored in JSON files (`personal/`, `dev/`)
- No conflict - can run both simultaneously

---

## Next Steps

### For Development
1. Test V2 API endpoints locally
2. Compare outputs with V1
3. Report any differences or issues
4. Add integration tests

### For Production
1. Enable V2 with feature flag
2. Monitor logs and metrics
3. Gradually increase traffic
4. Complete migration checklist

### For Testing
See `packages/agent-graph/scripts/`:
- `test-nodes.ts` - Test individual nodes
- `test-graph.ts` - Test complete graph
- `test-rag.ts` - Test RAG functionality

---

## Support

### Questions?
- Check `docs/technical/04-langgraph-migration-plan.md`
- Review `docs/technical/05-architecture-decisions.md`
- See GitHub issue #46

### Issues?
- Report bugs in GitHub issues
- Tag with `migration` label
- Include V1 vs V2 comparison

---

**Status**: Phase 5 Complete ✅
**Next**: Phase 6 - Feature Parity Validation
**Timeline**: On track for 10-12 week migration
