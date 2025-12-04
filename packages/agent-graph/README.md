# @cv-builder/agent-graph

LangGraph-based multi-agent system for CV Builder using a blackboard architecture pattern.

## Status

**Phase 1: Foundation** ✅ Complete
- State schema with Zod validation
- **SQLite checkpointer** for rapid prototyping (zero setup!)
- PostgreSQL checkpointer for production (optional)
- Thread manager for conversation lifecycle
- Configuration and logging utilities

**Phase 2: Core Agents** 🚧 Ready to Start
- Converting specialized agents to LangGraph nodes

## Architecture

This package implements a **blackboard pattern** where multiple specialized agents collaborate via shared state:

```
┌─────────────────────────────────────────┐
│         BLACKBOARD (Shared State)        │
│  • Messages  • Bio  • Jobs  • Analysis  │
└─────────────────────────────────────────┘
    ↕️        ↕️        ↕️        ↕️
Orchestrator  Resume   Job     Tailoring
   Node      Generator Analysis   Node
                Node     Node
```

## Installation

```bash
cd packages/agent-graph
npm install
```

## Quick Start (Zero Setup!)

### SQLite Mode (Default for Development)

**No database installation required!** SQLite is file-based and perfect for prototyping.

```bash
# Initialize database (creates cv_builder.db)
npx tsx src/utils/init-db.ts

# Run tests to verify
npx tsx scripts/test-sqlite.ts
```

That's it! You're ready to build. See [SQLITE_SETUP.md](./SQLITE_SETUP.md) for details.

### PostgreSQL Mode (Optional for Production)

For production deployments requiring concurrent access:

1. Install PostgreSQL
2. Create database and tables (see `docs/technical/06-phase-1-implementation-guide.md`)
3. Set environment variable:

```bash
export DATABASE_TYPE=postgres
export DATABASE_URL="postgresql://localhost:5432/cv_builder_prod"
```

## Usage

### Creating State

```typescript
import { createInitialState } from "@cv-builder/agent-graph";

const state = createInitialState("user-123", "thread-456");
```

### SQLite Checkpointing (Development)

```typescript
import { createSQLiteCheckpointer } from "@cv-builder/agent-graph";

const checkpointer = createSQLiteCheckpointer(); // Uses ./cv_builder.db

// Save checkpoint
await checkpointer.put(config, checkpoint, metadata);

// Retrieve checkpoint
const tuple = await checkpointer.getTuple(config);

// Get stats
const stats = checkpointer.getStats();
console.log(stats); // { checkpointCount: 42, threadCount: 7, dbSize: "0.15 MB" }
```

### SQLite Thread Management

```typescript
import { createSQLiteThreadManager } from "@cv-builder/agent-graph";

const threadManager = createSQLiteThreadManager(); // Uses ./cv_builder.db
await threadManager.initialize();

// Create thread
const thread = await threadManager.createThread({
  userId: "user-123",
  title: "Resume Generation Session"
});

// List threads
const threads = await threadManager.listThreads("user-123");
```

### PostgreSQL (Production)

```typescript
import { createCheckpointer, createThreadManager } from "@cv-builder/agent-graph";

const checkpointer = createCheckpointer(config.databaseUrl!);
const threadManager = createThreadManager(config.databaseUrl!);
// Same API as SQLite versions
```

## Development

```bash
# Type check
npm run type-check

# Run tests
npm test

# Watch mode
npm run dev
```

## Next Steps

- **Phase 2**: Convert specialized agents to nodes
- **Phase 3**: Implement orchestrator and state graph
- **Phase 4**: Add RAG capabilities with vector stores
- **Phase 5**: Integrate with API server

## Documentation

See `docs/technical/` for complete migration plan and architecture decisions.
