# @resume-builder/agent-graph

The V2 runtime: a LangGraph state graph whose nodes share one state object and persist through a SQLite (or Postgres) checkpointer. The API server mounts it at `/api/v2/*` when `ENABLE_V2_API=true`.

## As built (2026-09-24)

Verified against `main` @ `b670930`. Tracking: [ojfbot/cv-builder#154](https://github.com/ojfbot/cv-builder/issues/154).

**Delivered**

- Foundation: Zod-validated state schema, SQLite checkpointer (default) and Postgres checkpointer, thread managers for both, config and logging.
- Nodes: `orchestrator` plus five specialists — `resumeGeneratorNode`, `jobAnalysisNode`, `tailoringNode`, `skillsGapNode`, `interviewCoachNode` (`src/nodes/`).
- Graph (`src/graphs/cv-builder-graph.ts`): hub-and-spoke.

```
START → orchestrator ──(routeToAgent on state.nextAction)──▶ specialist ──▶ orchestrator ──▶ … ──▶ END
                     └──(done | error)──▶ END
```

How it behaves today:

- The orchestrator makes one model call per visit and reads the next action from a `**Next Action**: <action>` line by regex. If the line is missing it guesses from keywords. The parsed value isn't validated against `NextActionSchema`.
- Every specialist edge goes back to the orchestrator, so each request costs a second orchestrator call. That call reads the specialist's reply as if it were the user's request.
- `temperature` is set with `||`, so passing `0` gives you `0.7`. No explicit `recursionLimit` is passed.
- Checkpointer `putWrites` is a no-op in both backends. `interrupt`-based human-in-the-loop won't work until it persists.

**Present in source, not wired**

- `src/nodes/rag-retrieval-node.ts` and `src/rag/` (three retrievers over an in-memory `MemoryVectorStore` with hard-coded seed documents; embeddings need `OPENAI_API_KEY`). The node is exported but never added to the graph. `rag_retrieval` is in the action enum but not in `routeToAgent`, so it falls through to the orchestrator. No node reads `ragResults`.

**Designed, not built** — tracked as slices in [`.claude/roadmap.md`](../../.claude/roadmap.md):

| Item | Slice |
|------|-------|
| Input-existence rules, specialist → END edge, action validation, `?? 0.7`, `recursionLimit`, graph-compile + routing tests | `rm:rm-l1-cv-builder#S1` |
| RAG wired with a persistent store and a consumer — or removed | `rm:rm-l1-cv-builder#S2` |
| Classifier node, parallel fan-out, aggregator, routing confidence (`docs/ARCHITECTURE_V2.md` § Original design) | not scheduled |

**Tests:** none in this package yet. Vitest is configured; `scripts/test-*.ts` are manual smoke scripts that call the live model.

## Quick start

SQLite is the default (`DATABASE_TYPE` unset) and needs no install.

```bash
# from the repo root
pnpm --filter @resume-builder/agent-graph exec tsx src/utils/init-db.ts   # creates cv_builder.db
pnpm --filter @resume-builder/agent-graph exec tsx scripts/test-sqlite.ts  # checkpointer smoke run
```

See [SQLITE_SETUP.md](./SQLITE_SETUP.md). For Postgres, set:

```bash
export DATABASE_TYPE=postgres
export DATABASE_URL="postgresql://localhost:5432/cv_builder_prod"
```

## Usage

```typescript
import {
  createInitialState,
  createSQLiteCheckpointer,
  createSQLiteThreadManager,
  createCVBuilderGraph,
} from "@resume-builder/agent-graph";

const state = createInitialState("user-123", "thread-456");

const checkpointer = createSQLiteCheckpointer(); // ./cv_builder.db
const tuple = await checkpointer.getTuple(config);
console.log(checkpointer.getStats()); // { checkpointCount, threadCount, dbSize }

const threadManager = createSQLiteThreadManager();
await threadManager.initialize();
const thread = await threadManager.createThread({ userId: "user-123", title: "Resume session" });

const graph = createCVBuilderGraph({ apiKey });
```

`createCheckpointer(databaseUrl)` and `createThreadManager(databaseUrl)` are the Postgres equivalents and have the same API.

## Development

```bash
pnpm --filter @resume-builder/agent-graph type-check
pnpm --filter @resume-builder/agent-graph exec vitest run   # no test files yet — fails until S1 lands
pnpm --filter @resume-builder/agent-graph dev
```
