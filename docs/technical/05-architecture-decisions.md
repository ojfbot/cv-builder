# Architecture Decision Records (ADRs)

## ADR-001: LangGraph Migration - Blackboard Multi-Agent Architecture

**Status**: Proposed
**Date**: 2025-12-04
**Context**: Issue #46 - Refactor to LangChain/LangGraph Multi-Agent Architecture

---

### Context and Problem Statement

The current `agent-core` package uses a custom multi-agent architecture with:
- Manual orchestration through OrchestratorAgent
- Instance-level conversation history (no persistence)
- No checkpointing or resumability
- Limited streaming capabilities
- No RAG integration

We need to migrate to an enterprise-grade multi-agent system that provides:
- Persistent state management
- Durable execution with checkpointing
- Advanced RAG capabilities
- Production-ready streaming
- Human-in-the-loop patterns

**Key Question**: What architecture pattern should we use for coordinating multiple specialized AI agents with shared state?

---

### Decision Drivers

1. **Maintainability**: Easy to add new agents and modify workflows
2. **Reliability**: Fault tolerance and automatic recovery
3. **Performance**: Low latency and efficient token usage
4. **Scalability**: Support for growing feature set
5. **Developer Experience**: Clear patterns and good tooling
6. **User Experience**: Conversational resumability and branching

---

### Considered Options

#### Option 1: Sequential Pipeline Pattern

```
User Request → Orchestrator → Agent 1 → Agent 2 → Agent 3 → Response
```

**Pros**:
- ✅ Simple to understand and implement
- ✅ Clear linear flow
- ✅ Easy to debug

**Cons**:
- ❌ Rigid - hard to add conditional logic
- ❌ No parallelization
- ❌ All agents execute regardless of need
- ❌ Poor fit for conversational AI

---

#### Option 2: Event-Driven Architecture

```
User Request → Event Bus
                  ↓
        ┌─────────┼─────────┐
        ↓         ↓         ↓
    Agent 1   Agent 2   Agent 3
        ↓         ↓         ↓
        └─────────┼─────────┘
                  ↓
              Aggregator → Response
```

**Pros**:
- ✅ Highly decoupled
- ✅ Easy to add new agents
- ✅ Supports parallel execution
- ✅ Scales well

**Cons**:
- ❌ Over-engineered for current needs
- ❌ Complex debugging
- ❌ Requires event infrastructure
- ❌ Hard to maintain conversation context

---

#### Option 3: Blackboard Pattern (CHOSEN)

```
                 ┌─────────────────┐
                 │   BLACKBOARD    │
                 │ (Shared State)  │
                 └─────────────────┘
                    ↑  ↓  ↑  ↓  ↑  ↓
         ┌──────────┘  │  │  │  └──────────┐
         │             │  │  │             │
    ┌────────┐   ┌────────┐   ┌────────┐
    │ Agent  │   │ Agent  │   │ Agent  │
    │   1    │   │   2    │   │   3    │
    └────────┘   └────────┘   └────────┘
         ↓             ↓             ↓
    (Read/Write) (Read/Write) (Read/Write)
```

**Pros**:
- ✅ **Natural fit for multi-agent coordination**
- ✅ **Agents share knowledge via blackboard**
- ✅ **Flexible control flow** (orchestrator decides routing)
- ✅ **Easy to add specialized agents**
- ✅ **Supports asynchronous agent execution**
- ✅ **Perfect for LangGraph's StateGraph pattern**
- ✅ **Maintains conversation context naturally**

**Cons**:
- ⚠️ Requires careful state schema design
- ⚠️ More complex than simple pipeline
- ⚠️ Potential for state bloat if not managed

---

### Decision

**We will use the Blackboard Pattern implemented via LangGraph's StateGraph**.

#### Rationale

1. **LangGraph is designed for this**: StateGraph is essentially a blackboard implementation where:
   - State = Blackboard
   - Nodes = Agents (knowledge sources)
   - Edges = Control flow
   - Reducers = State update logic

2. **Flexibility**: Orchestrator can dynamically route to agents based on:
   - User request analysis
   - Current state of the blackboard
   - Previous agent results
   - External conditions

3. **Extensibility**: Adding a new agent requires:
   - Create node function
   - Add to graph
   - Update routing logic
   - No changes to other agents

4. **State Management**: All agents read from and write to shared state:
   - Bio data
   - Job listings
   - Analysis results
   - Generated outputs
   - Conversation history

5. **Checkpointing**: State snapshots enable:
   - Resume interrupted workflows
   - Conversation branching
   - Time travel debugging
   - Human-in-the-loop

---

### Implementation Pattern

```typescript
import { StateGraph, Annotation } from "@langchain/langgraph";

// Define blackboard state
const CVBuilderState = Annotation.Root({
  // Shared knowledge
  messages: Annotation<BaseMessage[]>({
    reducer: (state, update) => state.concat(update)
  }),
  bio: Annotation<Bio | null>(),
  currentJob: Annotation<JobListing | null>(),
  jobAnalysis: Annotation<JobAnalysis | null>(),
  outputs: Annotation<Output[]>({
    reducer: (state, update) => state.concat(update)
  }),

  // Control flow
  nextAction: Annotation<string>()
});

// Create graph with blackboard
const graph = new StateGraph(CVBuilderState)
  // Orchestrator reads blackboard and decides next agent
  .addNode("orchestrator", orchestratorNode)

  // Specialized agents read/write blackboard
  .addNode("resumeGenerator", resumeGeneratorNode)
  .addNode("jobAnalysis", jobAnalysisNode)
  .addNode("tailoring", tailoringNode)

  // Conditional routing based on blackboard state
  .addConditionalEdges("orchestrator", (state) => {
    return state.nextAction; // Route based on orchestrator decision
  })

  // Return to orchestrator after each agent
  .addEdge("resumeGenerator", "orchestrator")
  .addEdge("jobAnalysis", "orchestrator")
  .addEdge("tailoring", "orchestrator")

  .compile({ checkpointer });
```

---

### Consequences

#### Positive

- ✅ **Better separation of concerns**: Each agent is independent
- ✅ **Easier testing**: Agents can be tested with mock state
- ✅ **Clear data flow**: All state changes visible in blackboard
- ✅ **Production-ready**: Built on battle-tested LangGraph framework
- ✅ **Advanced features**: HITL, branching, time travel come for free

#### Negative

- ⚠️ **Learning curve**: Team needs to understand LangGraph patterns
- ⚠️ **State design critical**: Poor schema leads to confusion
- ⚠️ **Migration effort**: ~10-12 weeks to full parity

#### Neutral

- 🔄 **Different mental model**: From imperative to declarative
- 🔄 **More infrastructure**: Requires database for checkpointing

---

## ADR-002: Build agent-graph in Parallel vs. Replace agent-core In-Place

**Status**: Accepted
**Date**: 2025-12-04

---

### Decision

**We will build a new `packages/agent-graph/` package in parallel with `agent-core`**.

#### Rationale

1. **Zero risk to production**:
   - Current system continues working unchanged
   - No accidental breakage during development
   - Easy rollback if LangGraph doesn't work out

2. **Gradual validation**:
   - Build feature-by-feature
   - Compare outputs side-by-side
   - Validate parity before cutover

3. **Learning curve**:
   - Team learns LangGraph incrementally
   - Experiment without pressure
   - Refine patterns before committing

4. **Feature flagging**:
   - Run both systems simultaneously
   - A/B test in production
   - Gradual rollout (10% → 50% → 100%)

#### Trade-offs

**Pros**:
- ✅ Safe migration path
- ✅ Easy rollback
- ✅ Time to validate

**Cons**:
- ❌ Temporary code duplication
- ❌ Longer timeline (~2 weeks extra)
- ❌ Two packages to maintain during migration

#### Alternatives Rejected

**Option A: Replace agent-core in-place**
- ❌ Too risky - one mistake breaks production
- ❌ No rollback path
- ❌ Forces "big bang" cutover

**Option C: Feature-flag within agent-core**
- ❌ Complex branching logic
- ❌ Harder to test
- ❌ Messy codebase during migration

---

## ADR-003: PostgreSQL Checkpointer vs. Redis

**Status**: Accepted
**Date**: 2025-12-04

---

### Decision

**We will use PostgreSQL for checkpoint persistence**.

#### Rationale

1. **Durability**:
   - ACID transactions ensure data consistency
   - Survives server restarts
   - Can't lose conversation state

2. **Queryability**:
   - Easy to inspect checkpoints via SQL
   - Can join with user data
   - Rich filtering and aggregation

3. **Familiarity**:
   - Team likely already knows PostgreSQL
   - Common in production stacks
   - Good tooling ecosystem

4. **Cost**:
   - Often already provisioned
   - No additional service
   - Free for development (local DB)

#### Trade-offs

**Pros**:
- ✅ Durable persistence
- ✅ ACID guarantees
- ✅ Easy to query
- ✅ Battle-tested

**Cons**:
- ⚠️ Slower than Redis (~10-50ms per checkpoint)
- ⚠️ Requires database provisioning
- ⚠️ More complex schema management

#### Alternatives Considered

**Option B: Redis**
- ✅ Faster (< 1ms per checkpoint)
- ❌ Less durable (memory-based)
- ❌ Harder to query
- ❌ Another service to maintain

**Option C: In-memory (MemorySaver)**
- ✅ Fastest (0ms)
- ❌ No persistence
- ❌ Lost on restart
- ❌ Only for development

#### Performance Considerations

For typical conversation:
- 5-10 checkpoints per conversation
- 10-50ms per checkpoint = 50-500ms total overhead
- Acceptable for conversational AI (users expect 2-5s responses)

If performance becomes an issue:
- Add Redis cache layer
- Batch checkpoint writes
- Migrate to Redis + PostgreSQL hybrid

---

## ADR-004: Supabase vs. Pinecone for Vector Store

**Status**: Accepted
**Date**: 2025-12-04

---

### Decision

**We will start with Supabase for vector storage, with Pinecone as fallback**.

#### Rationale

1. **Free tier**:
   - Supabase: 500MB storage, 2GB bandwidth/month
   - Sufficient for MVP and initial launch
   - No credit card required

2. **PostgreSQL-based**:
   - Uses pgvector extension
   - Same database as checkpointing (simplified stack)
   - No vendor lock-in (can migrate to self-hosted)

3. **Developer experience**:
   - Good documentation
   - TypeScript SDK
   - Integrated dashboard

4. **Performance**:
   - Good enough for < 100k vectors
   - < 100ms query latency for typical use case
   - Horizontal scaling if needed

#### Trade-offs

**Pros**:
- ✅ Free to start
- ✅ Integrated with PostgreSQL
- ✅ No vendor lock-in
- ✅ Easy to self-host

**Cons**:
- ⚠️ May need migration at scale (> 1M vectors)
- ⚠️ Slower than Pinecone for large datasets
- ⚠️ Less optimized for vector search

#### Alternatives Considered

**Option B: Pinecone**
- ✅ Best-in-class vector search
- ✅ Optimized for scale
- ✅ Excellent performance
- ❌ Paid service (free tier limited)
- ❌ Vendor lock-in

**Option C: Self-hosted (Chroma/Qdrant)**
- ✅ Full control
- ✅ No external dependency
- ❌ More work to maintain
- ❌ Requires infrastructure setup

#### Migration Path

If we outgrow Supabase:
1. Export embeddings from Supabase (pgvector)
2. Import to Pinecone
3. Update vector store config
4. Test parity
5. Cutover with feature flag

---

## ADR-005: OpenAI Embeddings vs. Open Source Models

**Status**: Accepted
**Date**: 2025-12-04

---

### Decision

**We will use OpenAI's `text-embedding-3-small` for embeddings**.

#### Rationale

1. **Quality**:
   - State-of-the-art embeddings
   - Consistent with industry benchmarks
   - Well-tested for semantic search

2. **Cost**:
   - $0.02 per 1M tokens
   - ~1,000 tokens per resume
   - 1,000 resumes = $0.02 (negligible)

3. **Latency**:
   - < 100ms per embedding
   - Batch API for bulk ingestion
   - Good enough for real-time use

4. **LangChain integration**:
   - First-class support
   - Well-documented
   - Easy to swap later

#### Trade-offs

**Pros**:
- ✅ Excellent quality
- ✅ Fast inference
- ✅ Well-supported
- ✅ Low cost

**Cons**:
- ⚠️ External dependency (OpenAI API)
- ⚠️ Costs scale with usage
- ⚠️ Not fully private (data sent to OpenAI)

#### Alternatives Considered

**Option B: Open source (BAAI/bge-small-en-v1.5)**
- ✅ Free
- ✅ Self-hosted (private)
- ❌ Lower quality (~5-10% worse retrieval)
- ❌ Requires GPU or slow CPU inference
- ❌ More work to maintain

**Option C: Anthropic embeddings**
- N/A - Not available yet

#### Privacy Considerations

If users are concerned about sending resume data to OpenAI:
- Option 1: Add consent checkbox
- Option 2: Migrate to self-hosted open-source embeddings
- Option 3: Use Claude API when embeddings available

---

## ADR-006: Gradual Rollout Strategy

**Status**: Accepted
**Date**: 2025-12-04

---

### Decision

**We will roll out agent-graph gradually using feature flags and percentage-based traffic routing**.

#### Rollout Plan

**Week 10** (Internal Testing):
- Enable agent-graph for internal users only
- Monitor errors and performance
- Fix issues before external rollout

**Week 10** (10% Canary):
- Enable for 10% of production traffic
- Monitor metrics:
  - Error rates
  - Response times (p50, p95, p99)
  - Token usage
  - User satisfaction
- Keep for 2-3 days

**Week 11** (50% Rollout):
- If 10% stable, increase to 50%
- Monitor same metrics
- Keep for 3-5 days

**Week 11** (100% Rollout):
- If 50% stable, increase to 100%
- Monitor for 1 week

**Week 12** (Deprecation):
- Mark agent-core as deprecated
- Remove old API routes
- Clean up code

#### Rollback Plan

At any stage, if we see:
- Error rate increase > 5%
- Response time regression > 20%
- Token usage increase > 30%
- Negative user feedback

Then:
1. Immediately roll back to previous percentage
2. Investigate root cause
3. Fix issue in agent-graph
4. Resume rollout after validation

---

## ADR-007: State Schema Design Principles

**Status**: Accepted
**Date**: 2025-12-04

---

### Decision

**We will design the blackboard state schema with these principles**:

1. **Flat is better than nested**:
   ```typescript
   // ✅ Good
   bio: Annotation<Bio | null>()
   currentJob: Annotation<JobListing | null>()

   // ❌ Bad
   data: Annotation<{
     bio: Bio | null,
     currentJob: JobListing | null
   }>()
   ```

2. **Explicit nullability**:
   ```typescript
   // ✅ Good - clear when data is optional
   jobAnalysis: Annotation<JobAnalysis | null>()

   // ❌ Bad - unclear if missing or error
   jobAnalysis: Annotation<JobAnalysis>()
   ```

3. **Use reducers for append-only data**:
   ```typescript
   // ✅ Good - messages accumulate
   messages: Annotation<BaseMessage[]>({
     reducer: (state, update) => state.concat(update)
   })

   // ❌ Bad - would replace entire array
   messages: Annotation<BaseMessage[]>()
   ```

4. **Separate data from control**:
   ```typescript
   // Data fields
   bio: Annotation<Bio | null>()
   currentJob: Annotation<JobListing | null>()

   // Control fields
   nextAction: Annotation<string>()
   currentAgent: Annotation<string>()
   ```

5. **Zod validation for all data**:
   ```typescript
   // ✅ Good - runtime validation
   const bio = BioSchema.parse(state.bio);

   // ❌ Bad - assumes data is valid
   const bio = state.bio;
   ```

---

## Summary of Decisions

| ADR | Decision | Status |
|-----|----------|--------|
| 001 | Blackboard Pattern via LangGraph StateGraph | ✅ Accepted |
| 002 | Build agent-graph in parallel | ✅ Accepted |
| 003 | PostgreSQL for checkpointing | ✅ Accepted |
| 004 | Supabase for vector store (Pinecone fallback) | ✅ Accepted |
| 005 | OpenAI embeddings | ✅ Accepted |
| 006 | Gradual rollout (10% → 50% → 100%) | ✅ Accepted |
| 007 | State schema design principles | ✅ Accepted |

---

**Next Steps**:
1. Review and approve these ADRs with team
2. Begin Phase 1: Foundation & Infrastructure
3. Update as decisions evolve

---

**References**:
- [LangGraph Multi-Agent Systems](https://langchain-ai.github.io/langgraphjs/concepts/multi_agent/)
- [Blackboard Pattern](https://en.wikipedia.org/wiki/Blackboard_(design_pattern))
- [Architecture Decision Records](https://adr.github.io/)
