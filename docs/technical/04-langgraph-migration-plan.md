# LangGraph Migration Plan: Multi-Agent Blackboard Architecture

**Issue**: [#46 - Refactor: Migrate to LangChain/LangGraph Multi-Agent Architecture](https://github.com/ojfbot/cv-builder/issues/46)

**Status**: Planning Phase
**Last Updated**: 2025-12-04
**Architecture Team**: Engineering Lead + Claude Code

---

## Executive Summary

This document outlines a comprehensive, phased migration from the current `agent-core` package to a new **LangChain/LangGraph-based multi-agent system** with **blackboard architecture**. The migration guarantees backward compatibility while enabling enterprise-grade features like checkpointing, RAG integration, and durable execution.

### Key Decisions

1. **Approach**: Build `packages/agent-graph/` in parallel (Option B from issue)
2. **Architecture Pattern**: Blackboard with shared state coordination
3. **Migration Strategy**: Phased rollout with feature parity validation
4. **Timeline**: 8 phases over approximately 10-12 weeks
5. **Risk Mitigation**: Maintain `agent-core` until full parity achieved

---

## 1. Current Architecture Analysis

### agent-core Package Structure

```
packages/agent-core/
├── src/
│   ├── agents/
│   │   ├── base-agent.ts              # Abstract base class
│   │   ├── orchestrator-agent.ts      # Coordination (Node.js only)
│   │   ├── resume-generator-agent.ts  # Resume creation
│   │   ├── job-analysis-agent.ts      # Job requirements analysis
│   │   ├── tailoring-agent.ts         # Resume customization
│   │   ├── skills-gap-agent.ts        # Learning path generation
│   │   └── interview-coach-agent.ts   # Cover letters & prep
│   ├── models/                        # Zod schemas
│   │   ├── bio.ts
│   │   ├── job.ts
│   │   ├── output.ts
│   │   └── research.ts
│   ├── utils/
│   │   ├── config.ts                  # env.json loading
│   │   └── file-storage.ts            # JSON persistence
│   └── cli/                           # CLI interface
└── package.json
```

### Current Limitations

❌ **No persistent state management** - Instance-level history only
❌ **No checkpointing** - Cannot resume interrupted workflows
❌ **Manual coordination** - Orchestrator uses imperative routing
❌ **No RAG capabilities** - No semantic search or vector stores
❌ **Limited streaming** - Callback-based, no advanced patterns
❌ **No conversation branching** - Linear history only
❌ **Tight coupling** - Directly bound to Anthropic SDK

### Critical Features to Preserve

✅ **Zod validation** - All data models use runtime validation
✅ **Type safety** - Full TypeScript coverage
✅ **Streaming support** - Both streaming and non-streaming methods
✅ **API compatibility** - REST endpoints for browser app
✅ **Data isolation** - FileStorage abstraction for persistence
✅ **Security** - Server-side API key management

---

## 2. Target Architecture: LangGraph Blackboard Pattern

### Blackboard Architecture Overview

The **blackboard pattern** is ideal for multi-agent systems where:
- Multiple specialized agents collaborate on complex problems
- Agents share a common knowledge base (the "blackboard")
- Control flow is determined by the current state of the blackboard
- Agents work asynchronously and independently

```
┌─────────────────────────────────────────────────────────────┐
│                      BLACKBOARD                              │
│  (Shared State: Messages, Bio, Jobs, Outputs, Analysis)     │
└─────────────────────────────────────────────────────────────┘
        ↑                    ↑                    ↑
        │ read/write         │ read/write         │ read/write
        ↓                    ↓                    ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Orchestrator   │    │  Resume Gen   │    │  Job Analysis │
│     Node         │    │    Node        │    │     Node       │
└──────────────┘    └──────────────┘    └──────────────┘
        ↑                    ↑                    ↑
        │                    │                    │
        └────────────────────┴────────────────────┘
                    LangGraph State Machine
```

### LangGraph Implementation

**StateGraph with Conditional Routing**:
```typescript
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";

// Define blackboard state schema
const CVBuilderState = Annotation.Root({
  // Message history (conversation)
  messages: Annotation<BaseMessage[]>({
    reducer: (state, update) => state.concat(update)
  }),

  // User data
  bio: Annotation<Bio | null>(),

  // Job data
  currentJob: Annotation<JobListing | null>(),
  jobs: Annotation<Map<string, JobListing>>(),

  // Analysis results (shared across agents)
  jobAnalysis: Annotation<JobAnalysis | null>(),
  learningPath: Annotation<LearningPath | null>(),

  // Generated outputs
  outputs: Annotation<Output[]>({
    reducer: (state, update) => state.concat(update)
  }),

  // Control flow
  currentAgent: Annotation<string>(),
  nextAction: Annotation<string>(),

  // Metadata
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  metadata: Annotation<Record<string, any>>()
});

// Create state graph
const graph = new StateGraph(CVBuilderState)
  // Add nodes (agents)
  .addNode("orchestrator", orchestratorNode)
  .addNode("resumeGenerator", resumeGeneratorNode)
  .addNode("jobAnalysis", jobAnalysisNode)
  .addNode("tailoring", tailoringNode)
  .addNode("skillsGap", skillsGapNode)
  .addNode("interviewCoach", interviewCoachNode)
  .addNode("ragRetrieval", ragRetrievalNode)

  // Define edges
  .addEdge(START, "orchestrator")
  .addConditionalEdges("orchestrator", routeToAgent)
  .addEdge("resumeGenerator", "orchestrator")
  .addEdge("jobAnalysis", "orchestrator")
  .addEdge("tailoring", "orchestrator")
  .addEdge("skillsGap", "orchestrator")
  .addEdge("interviewCoach", "orchestrator")

  // Compile with checkpointing
  .compile({
    checkpointer: new PostgresSaver(pool),
    interruptBefore: ["humanReview"]
  });
```

### Routing Logic (Conditional Edges)

```typescript
function routeToAgent(state: CVBuilderState): string {
  const lastMessage = state.messages[state.messages.length - 1];
  const nextAction = state.nextAction;

  // Route based on orchestrator's decision
  if (nextAction === "generate_resume") return "resumeGenerator";
  if (nextAction === "analyze_job") return "jobAnalysis";
  if (nextAction === "tailor_resume") return "tailoring";
  if (nextAction === "analyze_skills_gap") return "skillsGap";
  if (nextAction === "prepare_interview") return "interviewCoach";
  if (nextAction === "done") return END;

  // Default: back to orchestrator
  return "orchestrator";
}
```

---

## 3. Package Architecture: agent-graph

### Directory Structure

```
packages/agent-graph/
├── src/
│   ├── graphs/
│   │   ├── cv-builder-graph.ts          # Main state graph
│   │   ├── orchestrator-graph.ts        # Orchestrator subgraph
│   │   └── types.ts                     # Graph type definitions
│   │
│   ├── nodes/
│   │   ├── orchestrator-node.ts         # Routing & coordination
│   │   ├── resume-generator-node.ts     # Resume creation
│   │   ├── job-analysis-node.ts         # Job analysis
│   │   ├── tailoring-node.ts            # Resume tailoring
│   │   ├── skills-gap-node.ts           # Skills gap analysis
│   │   ├── interview-coach-node.ts      # Interview prep
│   │   ├── rag-retrieval-node.ts        # RAG queries
│   │   └── types.ts                     # Node type definitions
│   │
│   ├── state/
│   │   ├── schema.ts                    # Zod schemas for state
│   │   ├── checkpointer.ts              # Checkpoint implementation
│   │   ├── thread-manager.ts            # Thread lifecycle
│   │   └── memory-manager.ts            # Long-term memory
│   │
│   ├── rag/
│   │   ├── vector-store.ts              # Vector DB integration
│   │   ├── embeddings.ts                # Embedding generation
│   │   ├── retrievers/
│   │   │   ├── resume-templates.ts      # Resume examples
│   │   │   ├── job-requirements.ts      # Job patterns
│   │   │   ├── learning-resources.ts    # Skill development
│   │   │   └── interview-prep.ts        # Interview questions
│   │   └── ingestion/
│   │       ├── ingest-resumes.ts        # Resume corpus
│   │       └── ingest-jobs.ts           # Job postings
│   │
│   ├── chains/
│   │   ├── analysis-chain.ts            # LCEL chains
│   │   ├── generation-chain.ts
│   │   └── retrieval-chain.ts
│   │
│   ├── tools/
│   │   ├── file-tools.ts                # File I/O tools
│   │   ├── search-tools.ts              # Web search
│   │   └── analysis-tools.ts            # Data analysis
│   │
│   ├── utils/
│   │   ├── config.ts                    # Config loading
│   │   ├── logger.ts                    # Structured logging
│   │   └── validators.ts                # Zod helpers
│   │
│   └── index.ts                         # Public exports
│
├── tests/
│   ├── graphs/
│   ├── nodes/
│   ├── state/
│   └── integration/
│
├── package.json
├── tsconfig.json
└── README.md
```

### Dependencies

```json
{
  "name": "@cv-builder/agent-graph",
  "version": "0.1.0",
  "dependencies": {
    "@langchain/core": "^0.3.19",
    "@langchain/langgraph": "^0.2.19",
    "@langchain/langgraph-checkpoint": "^0.0.11",
    "@langchain/anthropic": "^0.3.9",
    "@langchain/community": "^0.3.16",
    "@langchain/openai": "^0.3.14",

    // Vector stores (choose one or multiple)
    "@langchain/supabase": "^0.1.0",
    "@langchain/pinecone": "^0.1.4",

    // Database for checkpointing
    "pg": "^8.13.1",
    "ioredis": "^5.4.1",

    // Existing CV Builder dependencies
    "@cv-builder/agent-core": "file:../agent-core",
    "zod": "^3.23.8",

    // Utilities
    "uuid": "^11.0.3",
    "pino": "^9.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "@types/pg": "^8.11.10",
    "vitest": "^2.1.8",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3"
  }
}
```

---

## 4. Phased Migration Roadmap

### Overview

We'll build `agent-graph` in parallel with `agent-core` to ensure:
- Zero downtime during migration
- Feature parity validation before cutover
- Rollback capability at any phase
- Gradual learning curve for team

### Timeline Estimate: 10-12 weeks

---

### Phase 1: Foundation & Infrastructure (Weeks 1-2)

**Goal**: Set up package structure, dependencies, and basic state management

#### Tasks

1. **Create package structure**
   ```bash
   mkdir -p packages/agent-graph/src/{graphs,nodes,state,rag,chains,tools,utils}
   npm init -w packages/agent-graph
   ```

2. **Install dependencies**
   ```bash
   cd packages/agent-graph
   npm install @langchain/core @langchain/langgraph @langchain/anthropic
   npm install @langchain/langgraph-checkpoint pg ioredis
   npm install zod uuid pino
   ```

3. **Implement state schema** (`state/schema.ts`)
   - Define `CVBuilderState` with Zod validation
   - Create state reducers for message concatenation
   - Add type inference helpers

4. **Implement checkpointer** (`state/checkpointer.ts`)
   - Choose backend: PostgreSQL (recommended) or Redis
   - Implement `BaseCheckpointSaver` interface
   - Add checkpoint serialization/deserialization
   - Test checkpoint persistence

5. **Implement thread manager** (`state/thread-manager.ts`)
   - Thread creation and lifecycle
   - Thread metadata management
   - Thread listing and search

6. **Set up configuration** (`utils/config.ts`)
   - Extend existing config with LangGraph settings
   - Add vector store configuration
   - Add checkpoint backend configuration

#### Deliverables

- [ ] Package created with all directories
- [ ] Dependencies installed and working
- [ ] State schema with Zod validation
- [ ] Working checkpointer (PostgreSQL or Redis)
- [ ] Thread manager with CRUD operations
- [ ] Configuration loading from env.json

#### Validation Criteria

- TypeScript compiles without errors
- Unit tests for state schema pass
- Checkpointer can save/load state
- Thread manager creates and retrieves threads

---

### Phase 2: Node Conversion - Core Agents (Weeks 2-4)

**Goal**: Convert specialized agents to LangGraph nodes

#### Tasks

1. **Create base node pattern** (`nodes/types.ts`)
   ```typescript
   import { RunnableConfig } from "@langchain/core/runnables";
   import { CVBuilderState } from "../state/schema";

   export type NodeFunction = (
     state: typeof CVBuilderState.State,
     config?: RunnableConfig
   ) => Promise<Partial<typeof CVBuilderState.State>>;
   ```

2. **Convert ResumeGeneratorAgent** → `resume-generator-node.ts`
   - Keep existing logic from `agent-core`
   - Adapt input/output to read from/write to blackboard state
   - Maintain streaming support
   - Preserve Zod validation

3. **Convert JobAnalysisAgent** → `job-analysis-node.ts`
   - Adapt to read job from state.currentJob
   - Write analysis to state.jobAnalysis
   - Maintain match score calculation

4. **Convert TailoringAgent** → `tailoring-node.ts`
   - Read bio, job, and analysis from state
   - Write tailored resume to state.outputs
   - Preserve keyword mirroring logic

5. **Convert SkillsGapAgent** → `skills-gap-node.ts`
   - Read bio, job, analysis from state
   - Write learning path to state.learningPath
   - Maintain resource recommendations

6. **Convert InterviewCoachAgent** → `interview-coach-node.ts`
   - Read bio and job from state
   - Write cover letter to state.outputs
   - Preserve talking points generation

#### Deliverables

- [ ] Base node type definitions
- [ ] 5 specialized nodes converted
- [ ] Unit tests for each node
- [ ] Integration tests with mock state

#### Validation Criteria

- Each node passes unit tests
- Nodes correctly read from state
- Nodes correctly write to state
- Output matches agent-core behavior

---

### Phase 3: Orchestrator & State Graph (Weeks 4-5)

**Goal**: Implement orchestrator node and assemble state graph

#### Tasks

1. **Create orchestrator node** (`nodes/orchestrator-node.ts`)
   - Port OrchestratorAgent system prompt
   - Implement routing logic (set `state.nextAction`)
   - Handle user requests
   - Maintain metadata format

2. **Implement routing function** (`graphs/cv-builder-graph.ts`)
   ```typescript
   function routeToAgent(state: CVBuilderState): string {
     switch (state.nextAction) {
       case "generate_resume": return "resumeGenerator";
       case "analyze_job": return "jobAnalysis";
       case "tailor_resume": return "tailoring";
       case "analyze_skills_gap": return "skillsGap";
       case "prepare_interview": return "interviewCoach";
       case "done": return END;
       default: return "orchestrator";
     }
   }
   ```

3. **Build state graph**
   - Add all nodes
   - Define conditional edges
   - Configure checkpointer
   - Set up streaming

4. **Create graph factory** (`graphs/cv-builder-graph.ts`)
   ```typescript
   export function createCVBuilderGraph(config: GraphConfig) {
     const checkpointer = createCheckpointer(config);

     const graph = new StateGraph(CVBuilderState)
       .addNode("orchestrator", createOrchestratorNode(config))
       .addNode("resumeGenerator", createResumeGeneratorNode(config))
       // ... add other nodes
       .addConditionalEdges("orchestrator", routeToAgent)
       // ... add edges back to orchestrator
       .compile({ checkpointer });

     return graph;
   }
   ```

5. **Implement streaming** (`graphs/cv-builder-graph.ts`)
   ```typescript
   export async function* streamGraph(
     graph: CompiledGraph,
     input: GraphInput,
     config: RunnableConfig
   ) {
     const stream = await graph.stream(input, config);

     for await (const event of stream) {
       yield transformEvent(event);
     }
   }
   ```

#### Deliverables

- [ ] Orchestrator node with routing
- [ ] Complete state graph assembled
- [ ] Graph factory function
- [ ] Streaming implementation
- [ ] Integration tests

#### Validation Criteria

- Graph compiles successfully
- Orchestrator routes to correct nodes
- State flows correctly through nodes
- Streaming works end-to-end
- Checkpoints saved at each step

---

### Phase 4: RAG Infrastructure (Weeks 5-7)

**Goal**: Implement vector stores, embeddings, and retrievers

#### Tasks

1. **Choose vector store backend**
   - **Option A**: Supabase (free tier, hosted)
   - **Option B**: Pinecone (generous free tier)
   - **Option C**: Self-hosted (Chroma, Qdrant)
   - **Recommendation**: Start with Supabase for simplicity

2. **Set up vector store** (`rag/vector-store.ts`)
   ```typescript
   import { SupabaseVectorStore } from "@langchain/supabase";
   import { OpenAIEmbeddings } from "@langchain/openai";

   export function createVectorStore(config: VectorStoreConfig) {
     const embeddings = new OpenAIEmbeddings({
       modelName: "text-embedding-3-small"
     });

     return new SupabaseVectorStore(embeddings, {
       client: createClient(config.supabaseUrl, config.supabaseKey),
       tableName: "cv_builder_embeddings"
     });
   }
   ```

3. **Implement retrievers** (`rag/retrievers/`)
   - **Resume templates**: High-quality resume examples
   - **Job requirements**: Common job requirement patterns
   - **Learning resources**: Skill development paths
   - **Interview prep**: Industry-specific questions

4. **Create RAG node** (`nodes/rag-retrieval-node.ts`)
   ```typescript
   export async function ragRetrievalNode(
     state: CVBuilderState,
     config: RunnableConfig
   ): Promise<Partial<CVBuilderState>> {
     const retriever = createRetriever(state.ragQuery);
     const docs = await retriever.getRelevantDocuments(state.ragQuery);

     return {
       ragResults: docs,
       messages: [
         new AIMessage(`Found ${docs.length} relevant documents`)
       ]
     };
   }
   ```

5. **Implement ingestion pipelines** (`rag/ingestion/`)
   - Ingest resume corpus for templates
   - Ingest job postings for requirements
   - Create embeddings and store in vector DB

6. **Integrate RAG into nodes**
   - Add RAG retrieval to tailoring node
   - Add RAG retrieval to skills gap node
   - Add RAG retrieval to interview coach node

#### Deliverables

- [ ] Vector store configured and tested
- [ ] 4 retrievers implemented
- [ ] RAG node with retrieval logic
- [ ] Ingestion pipelines working
- [ ] RAG integrated into 3+ nodes

#### Validation Criteria

- Vector store saves and retrieves embeddings
- Retrievers return relevant documents
- RAG node enriches state with context
- Query performance is acceptable (<2s)

---

### Phase 5: API Integration (Weeks 7-8)

**Goal**: Integrate agent-graph with API server

#### Tasks

1. **Create graph manager** (`packages/api/src/services/graph-manager.ts`)
   ```typescript
   import { createCVBuilderGraph } from "@cv-builder/agent-graph";

   class GraphManager {
     private graph: CompiledGraph;

     initialize() {
       this.graph = createCVBuilderGraph(getConfig());
     }

     async invoke(input, threadId) {
       return this.graph.invoke(input, {
         configurable: { thread_id: threadId }
       });
     }

     async stream(input, threadId) {
       return this.graph.stream(input, {
         configurable: { thread_id: threadId }
       });
     }
   }
   ```

2. **Create new API routes** (`packages/api/src/routes/graph-chat.ts`)
   - `/api/v2/chat` - Non-streaming with LangGraph
   - `/api/v2/chat/stream` - Streaming with LangGraph
   - `/api/v2/threads` - Thread management
   - `/api/v2/checkpoints` - Checkpoint access

3. **Maintain backward compatibility**
   - Keep `/api/chat` routes using agent-core
   - Add feature flag for LangGraph routes
   - Support gradual migration

4. **Implement thread management endpoints**
   ```typescript
   // POST /api/v2/threads
   router.post("/threads", async (req, res) => {
     const thread = await graphManager.createThread(req.body);
     res.json({ success: true, data: thread });
   });

   // GET /api/v2/threads/:id/checkpoints
   router.get("/threads/:id/checkpoints", async (req, res) => {
     const checkpoints = await graphManager.listCheckpoints(req.params.id);
     res.json({ success: true, data: checkpoints });
   });
   ```

5. **Update browser app** (optional in this phase)
   - Add feature flag to use v2 endpoints
   - Keep v1 as default
   - Prepare for cutover

#### Deliverables

- [ ] GraphManager service created
- [ ] v2 API routes implemented
- [ ] Thread management endpoints
- [ ] Checkpoint access endpoints
- [ ] Feature flag system

#### Validation Criteria

- v2 endpoints return correct responses
- Streaming works via SSE
- Thread creation/retrieval works
- Checkpoints are accessible
- v1 endpoints still work (backward compatibility)

---

### Phase 6: Feature Parity Validation (Weeks 8-9)

**Goal**: Ensure agent-graph matches all agent-core capabilities

#### Tasks

1. **Create comparison test suite** (`packages/agent-graph/tests/parity/`)
   ```typescript
   // Test that agent-core and agent-graph produce equivalent results
   describe("Feature Parity: Resume Generation", () => {
     it("produces equivalent resume output", async () => {
       const bio = loadTestBio();

       // Old system
       const agentCoreResult = await agentCore.generateResume(bio);

       // New system
       const agentGraphResult = await agentGraph.invoke({
         messages: [new HumanMessage("Generate my resume")],
         bio,
         nextAction: "generate_resume"
       });

       expect(agentGraphResult.outputs[0].content)
         .toMatchSemantically(agentCoreResult.content);
     });
   });
   ```

2. **Test all agent capabilities**
   - Resume generation (generic and tailored)
   - Job analysis (with and without bio)
   - Tailoring (with different strategies)
   - Skills gap analysis (with learning paths)
   - Interview coaching (cover letters and prep)

3. **Test all data flows**
   - Bio loading and validation
   - Job listing management
   - Output persistence
   - Conversation history

4. **Test streaming parity**
   - Compare streaming chunk format
   - Validate metadata blocks
   - Ensure equivalent latency

5. **Performance benchmarking**
   - Measure response times (agent-core vs agent-graph)
   - Measure token usage
   - Compare memory footprint

6. **Document differences**
   - List any behavior changes
   - Explain architectural improvements
   - Note any breaking changes

#### Deliverables

- [ ] Comprehensive parity test suite
- [ ] All tests passing
- [ ] Performance benchmark report
- [ ] Difference documentation

#### Validation Criteria

- 100% functional parity achieved
- Performance is equal or better
- No regressions in output quality
- All edge cases handled

---

### Phase 7: Advanced Features (Weeks 9-10)

**Goal**: Implement LangGraph-exclusive features

#### Tasks

1. **Human-in-the-loop** (`state/human-in-loop.ts`)
   ```typescript
   const graph = new StateGraph(CVBuilderState)
     // ... nodes
     .compile({
       checkpointer,
       interruptBefore: ["resumeGenerator", "tailoring"]
     });

   // Usage
   const result = await graph.invoke(input, config);
   // Graph pauses before resumeGenerator

   // User reviews and approves
   const finalResult = await graph.invoke(null, config);
   // Graph resumes from checkpoint
   ```

2. **Conversation branching**
   - Allow users to explore alternative paths
   - Implement checkpoint forking
   - Enable "what-if" scenarios

3. **Long-term memory** (`state/memory-manager.ts`)
   - Store user preferences
   - Track successful patterns
   - Personalize recommendations

4. **Advanced RAG patterns**
   - Multi-query retrieval
   - Hypothetical document embeddings
   - Self-query with metadata filters

5. **Observability** (LangSmith integration)
   ```typescript
   import { Client } from "langsmith";

   const client = new Client({
     apiKey: process.env.LANGSMITH_API_KEY
   });

   const graph = createCVBuilderGraph(config).compile({
     checkpointer,
     callbacks: [client]
   });
   ```

6. **Error recovery**
   - Automatic retry with exponential backoff
   - Graceful degradation
   - State rollback on errors

#### Deliverables

- [ ] Human-in-the-loop implementation
- [ ] Conversation branching
- [ ] Long-term memory system
- [ ] Advanced RAG patterns
- [ ] LangSmith observability
- [ ] Error recovery mechanisms

#### Validation Criteria

- HITL pauses and resumes correctly
- Branching creates independent checkpoints
- Memory persists across sessions
- RAG quality improves measurably
- Observability dashboards show traces

---

### Phase 8: Migration & Deprecation (Weeks 10-12)

**Goal**: Cutover to agent-graph and deprecate agent-core

#### Tasks

1. **Gradual rollout**
   - Enable agent-graph for internal testing (week 10)
   - Enable for 10% of production traffic (week 10)
   - Monitor metrics and errors
   - Increase to 50% if stable (week 11)
   - Increase to 100% if successful (week 11)

2. **Monitoring & alerting**
   - Set up error rate alerts
   - Monitor response time percentiles
   - Track token usage changes
   - Watch checkpoint storage growth

3. **User communication**
   - Document new features
   - Update API documentation
   - Announce deprecation timeline

4. **Deprecate agent-core**
   - Mark package as deprecated (week 11)
   - Add deprecation warnings to logs
   - Update imports to use agent-graph
   - Remove old API routes (week 12)

5. **Cleanup**
   - Remove agent-core package
   - Update monorepo dependencies
   - Archive old documentation
   - Celebrate! 🎉

#### Deliverables

- [ ] Rollout to 100% of traffic
- [ ] Monitoring dashboards
- [ ] Updated documentation
- [ ] agent-core removed
- [ ] Post-mortem document

#### Validation Criteria

- Zero increase in error rates
- Response times stable or improved
- User feedback is positive
- All old code removed

---

## 5. Architecture Decisions & Trade-offs

### Decision 1: Build in Parallel vs. Replace In-Place

**Decision**: Build `agent-graph` in parallel (Option B)

**Rationale**:
- ✅ Zero risk to production system
- ✅ Gradual learning curve
- ✅ Easy rollback if issues arise
- ✅ Feature parity validation before cutover
- ❌ Slightly longer timeline
- ❌ Temporary duplication

**Alternatives Considered**:
- Replace agent-core in-place: Too risky, no rollback
- Feature flagging: Complex, harder to test

---

### Decision 2: Blackboard Pattern vs. Sequential Pipeline

**Decision**: Blackboard architecture with shared state

**Rationale**:
- ✅ Natural fit for LangGraph state management
- ✅ Agents can work asynchronously
- ✅ Easy to add new agents
- ✅ Supports parallel execution (future)
- ❌ More complex than simple pipeline
- ❌ Requires careful state schema design

**Alternatives Considered**:
- Sequential pipeline: Too rigid for multi-agent
- Event-driven: Over-engineered for current needs

---

### Decision 3: PostgreSQL Checkpointer vs. Redis

**Decision**: PostgreSQL for checkpointing

**Rationale**:
- ✅ Durable persistence (survives restarts)
- ✅ ACID transactions
- ✅ Easy to query checkpoints
- ✅ Already in tech stack (likely)
- ❌ Slightly slower than Redis
- ❌ Requires database setup

**Alternatives Considered**:
- Redis: Fast but less durable
- In-memory: No persistence
- File-based: Not production-ready

---

### Decision 4: Supabase vs. Pinecone for Vector Store

**Decision**: Start with Supabase

**Rationale**:
- ✅ Free tier with generous limits
- ✅ Built on PostgreSQL (familiar)
- ✅ No vendor lock-in
- ✅ Good performance for MVP
- ❌ May need migration for scale
- ❌ Less optimized than Pinecone

**Alternatives Considered**:
- Pinecone: Better performance, more expensive
- Self-hosted Chroma: More work to maintain
- OpenAI embeddings API: No vector store

---

### Decision 5: OpenAI Embeddings vs. Open Source

**Decision**: Use OpenAI `text-embedding-3-small`

**Rationale**:
- ✅ Excellent quality
- ✅ Consistent with industry standards
- ✅ Fast inference
- ✅ Well-supported by LangChain
- ❌ Costs money (but cheap: $0.02/1M tokens)
- ❌ External dependency

**Alternatives Considered**:
- Anthropic embeddings: Not available yet
- Open source (BAAI/bge): Lower quality, harder to host

---

## 6. Risk Mitigation

### Risk 1: Performance Regression

**Mitigation**:
- Benchmark early and often (Phase 6)
- Set performance budgets (p95 latency, token usage)
- Monitor in production with gradual rollout
- Keep agent-core for fallback

### Risk 2: Feature Incompatibility

**Mitigation**:
- Comprehensive parity tests (Phase 6)
- Side-by-side comparison in staging
- User acceptance testing before cutover

### Risk 3: State Management Complexity

**Mitigation**:
- Start with simple state schema
- Add fields incrementally
- Use Zod for validation
- Document state transitions

### Risk 4: Vector Store Costs

**Mitigation**:
- Start with free tier (Supabase/Pinecone)
- Monitor embedding API costs
- Cache frequently retrieved docs
- Consider open-source alternatives for scale

### Risk 5: Team Learning Curve

**Mitigation**:
- Phased implementation (learn gradually)
- Comprehensive documentation
- Code examples and tutorials
- Pair programming sessions

---

## 7. Success Metrics

### Technical Metrics

- **Performance**: Response time ≤ current implementation (p95)
- **Reliability**: Error rate < 1%
- **State Persistence**: 100% conversation resumability
- **RAG Quality**: Match score improvement ≥ 15%
- **Token Efficiency**: Token usage within 10% of baseline

### Developer Metrics

- **Agent Creation Time**: Reduced by 40%
- **Test Coverage**: ≥ 80% for all nodes
- **Type Safety**: Zero runtime type errors
- **Documentation**: 100% of public APIs documented

### User Metrics

- **Resume Quality**: User satisfaction score ≥ 4.5/5
- **Time to Resume**: ≤ 2 minutes for first draft
- **Conversation Length**: Average turns ≤ 5 for task completion
- **Feature Adoption**: ≥ 70% use advanced features (HITL, branching)

---

## 8. Next Steps

### Immediate Actions

1. **Get stakeholder approval** on this plan
2. **Provision infrastructure**:
   - PostgreSQL database for checkpointing
   - Supabase account for vector store
   - OpenAI API key for embeddings
3. **Create agent-graph package** (Phase 1, Task 1)
4. **Set up project board** to track tasks

### Blockers to Address

- [ ] Database credentials for checkpointing
- [ ] Vector store account (Supabase/Pinecone)
- [ ] OpenAI API key for embeddings
- [ ] Budget approval for external services

### Team Alignment

- **Weekly sync**: Review progress and blockers
- **Demo sessions**: Show completed phases
- **Documentation reviews**: Keep docs updated
- **Pair programming**: Knowledge sharing

---

## 9. References

### Documentation

- [LangGraph.js Overview](https://langchain-ai.github.io/langgraphjs/)
- [Multi-Agent Systems](https://langchain-ai.github.io/langgraphjs/concepts/multi_agent/)
- [Mastering Persistence in LangGraph](https://medium.com/@vinodkrane/mastering-persistence-in-langgraph-checkpoints-threads-and-beyond-21e412aaed60)
- [LangGraph Checkpointing Best Practices](https://sparkco.ai/blog/mastering-langgraph-checkpointing-best-practices-for-2025)
- [@langchain/langgraph-checkpoint](https://www.npmjs.com/package/@langchain/langgraph-checkpoint)

### Code Examples

- [LangChain Next.js Template](https://github.com/langchain-ai/langchain-nextjs-template)
- [LangGraph TypeScript Agents](https://github.com/langchain-ai/agents-from-scratch-ts)

### Articles

- [LangGraph Multi-Agent Workflows](https://blog.langchain.com/langgraph-multi-agent-workflows/)
- [Building Multi-Agent Systems with LangGraph](https://medium.com/@sushmita2310/building-multi-agent-systems-with-langgraph-a-step-by-step-guide-d14088e90f72)

---

## 10. Appendix: Code Examples

### Example: Complete State Schema

```typescript
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { Bio, JobListing, Output } from "@cv-builder/agent-core";

// Define state schema with Zod validation
export const CVBuilderStateSchema = z.object({
  // Conversation
  messages: z.array(z.custom<BaseMessage>()),

  // User data
  bio: Bio.nullable(),
  currentJob: JobListing.nullable(),
  jobs: z.map(z.string(), JobListing),

  // Analysis
  jobAnalysis: z.object({
    jobId: z.string(),
    keyRequirements: z.array(z.any()),
    matchScore: z.number().optional()
  }).nullable(),

  // Outputs
  outputs: z.array(Output),

  // Control
  currentAgent: z.string(),
  nextAction: z.enum([
    "generate_resume",
    "analyze_job",
    "tailor_resume",
    "analyze_skills_gap",
    "prepare_interview",
    "done"
  ]),

  // Metadata
  threadId: z.string(),
  userId: z.string(),
  metadata: z.record(z.any())
});

// Create LangGraph annotation
export const CVBuilderState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (state, update) => state.concat(update)
  }),
  bio: Annotation<z.infer<typeof Bio> | null>(),
  currentJob: Annotation<z.infer<typeof JobListing> | null>(),
  jobs: Annotation<Map<string, z.infer<typeof JobListing>>>(),
  jobAnalysis: Annotation<any | null>(),
  outputs: Annotation<z.infer<typeof Output>[]>({
    reducer: (state, update) => state.concat(update)
  }),
  currentAgent: Annotation<string>(),
  nextAction: Annotation<string>(),
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  metadata: Annotation<Record<string, any>>()
});
```

### Example: Node Implementation

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { CVBuilderState } from "../state/schema";
import { ResumeOutput } from "@cv-builder/agent-core";

export async function resumeGeneratorNode(
  state: typeof CVBuilderState.State
): Promise<Partial<typeof CVBuilderState.State>> {
  const { bio, currentJob, messages } = state;

  if (!bio) {
    throw new Error("Bio is required for resume generation");
  }

  const llm = new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  const systemPrompt = `You are a professional resume writer...`;

  const response = await llm.invoke([
    { role: "system", content: systemPrompt },
    ...messages,
    { role: "user", content: `Generate resume for: ${JSON.stringify(bio)}` }
  ]);

  const resume: ResumeOutput = {
    id: crypto.randomUUID(),
    jobId: currentJob?.id,
    generatedAt: new Date().toISOString(),
    format: "markdown",
    content: response.content as string,
    metadata: {
      version: "1.0",
      tailored: !!currentJob,
      sections: ["experience", "education", "skills"]
    }
  };

  return {
    outputs: [resume],
    messages: [response],
    nextAction: "done"
  };
}
```

### Example: Checkpointer Implementation

```typescript
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { Pool } from "pg";

export class PostgresCheckpointer extends BaseCheckpointSaver {
  private pool: Pool;

  constructor(connectionString: string) {
    super();
    this.pool = new Pool({ connectionString });
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const { thread_id, thread_ts } = config.configurable || {};

    const result = await this.pool.query(
      `SELECT * FROM checkpoints
       WHERE thread_id = $1
       ORDER BY thread_ts DESC
       LIMIT 1`,
      [thread_id]
    );

    if (result.rows.length === 0) return undefined;

    return {
      config,
      checkpoint: result.rows[0].checkpoint,
      metadata: result.rows[0].metadata
    };
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const { thread_id } = config.configurable || {};
    const thread_ts = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO checkpoints (thread_id, thread_ts, checkpoint, metadata)
       VALUES ($1, $2, $3, $4)`,
      [thread_id, thread_ts, checkpoint, metadata]
    );

    return {
      configurable: {
        thread_id,
        thread_ts
      }
    };
  }

  async list(config: RunnableConfig): Promise<CheckpointTuple[]> {
    const { thread_id } = config.configurable || {};

    const result = await this.pool.query(
      `SELECT * FROM checkpoints
       WHERE thread_id = $1
       ORDER BY thread_ts DESC`,
      [thread_id]
    );

    return result.rows.map(row => ({
      config: {
        configurable: {
          thread_id: row.thread_id,
          thread_ts: row.thread_ts
        }
      },
      checkpoint: row.checkpoint,
      metadata: row.metadata
    }));
  }
}
```

---

**End of Migration Plan**
