# Phase 1 Implementation Guide: Foundation & Infrastructure

**Related**: [LangGraph Migration Plan](./04-langgraph-migration-plan.md) | [Architecture Decisions](./05-architecture-decisions.md)

**Timeline**: Weeks 1-2
**Status**: Ready to Start

---

## Overview

Phase 1 establishes the foundational infrastructure for the new `agent-graph` package. By the end of this phase, we'll have:

- ✅ Package structure and dependencies configured
- ✅ State schema with Zod validation
- ✅ Working checkpointer (PostgreSQL)
- ✅ Thread manager for conversation lifecycle
- ✅ Configuration system integrated with existing env.json

---

## Prerequisites

### Required Infrastructure

1. **PostgreSQL Database**
   - Version: 14+
   - Extensions: None required initially (pgvector in Phase 4)
   - Access: Connection string with read/write permissions

2. **Development Environment**
   - Node.js 18+
   - npm workspaces configured (already set up)
   - TypeScript 5.6+

3. **API Keys**
   - Anthropic API key (already configured in env.json)
   - Will add OpenAI key in Phase 4 (RAG)

### Database Setup

#### Option A: Local PostgreSQL (Development)

```bash
# Install PostgreSQL (macOS)
brew install postgresql@14

# Start service
brew services start postgresql@14

# Create database
createdb cv_builder_dev

# Connection string
postgresql://localhost:5432/cv_builder_dev
```

#### Option B: Supabase (Recommended)

```bash
# 1. Sign up at https://supabase.com (free tier)
# 2. Create new project
# 3. Get connection string from Settings > Database
# 4. Add to env.json
```

#### Create Checkpoints Table

```sql
-- Run this in PostgreSQL
CREATE TABLE IF NOT EXISTS checkpoints (
  thread_id TEXT NOT NULL,
  thread_ts TEXT NOT NULL,
  parent_ts TEXT,
  checkpoint JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (thread_id, thread_ts)
);

CREATE INDEX idx_checkpoints_thread_id ON checkpoints(thread_id);
CREATE INDEX idx_checkpoints_created_at ON checkpoints(created_at);
```

---

## Task 1: Create Package Structure

### 1.1 Initialize Package

```bash
# From repo root
mkdir -p packages/agent-graph/src/{graphs,nodes,state,rag,chains,tools,utils,tests}

# Initialize package.json
cd packages/agent-graph
npm init -y
```

### 1.2 Configure package.json

**File**: `packages/agent-graph/package.json`

```json
{
  "name": "@cv-builder/agent-graph",
  "version": "0.1.0",
  "description": "LangGraph-based multi-agent system for CV Builder",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./graphs/*": "./src/graphs/*.ts",
    "./nodes/*": "./src/nodes/*.ts",
    "./state/*": "./src/state/*.ts",
    "./chains/*": "./src/chains/*.ts",
    "./utils/*": "./src/utils/*.ts"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:watch": "vitest watch"
  },
  "dependencies": {
    "@langchain/core": "^0.3.19",
    "@langchain/langgraph": "^0.2.19",
    "@langchain/langgraph-checkpoint": "^0.0.11",
    "@langchain/anthropic": "^0.3.9",
    "@cv-builder/agent-core": "file:../agent-core",
    "pg": "^8.13.1",
    "uuid": "^11.0.3",
    "pino": "^9.5.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "@types/pg": "^8.11.10",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.8"
  }
}
```

### 1.3 Configure TypeScript

**File**: `packages/agent-graph/tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "references": [
    { "path": "../agent-core" }
  ]
}
```

### 1.4 Install Dependencies

```bash
cd packages/agent-graph
npm install

# Verify installation
npm run type-check
```

### 1.5 Create Directory Structure

```bash
# Create all subdirectories
mkdir -p src/{graphs,nodes,state,rag/{retrievers,ingestion},chains,tools,utils}
mkdir -p tests/{graphs,nodes,state,integration}

# Create placeholder files
touch src/index.ts
touch src/graphs/cv-builder-graph.ts
touch src/state/schema.ts
touch src/state/checkpointer.ts
touch src/state/thread-manager.ts
touch src/utils/config.ts
touch src/utils/logger.ts
```

---

## Task 2: Implement State Schema

### 2.1 Define State Types

**File**: `packages/agent-graph/src/state/types.ts`

```typescript
import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { Bio, JobListing, Output } from "@cv-builder/agent-core";

/**
 * Actions that the orchestrator can route to
 */
export const NextActionSchema = z.enum([
  "generate_resume",
  "analyze_job",
  "tailor_resume",
  "analyze_skills_gap",
  "prepare_interview",
  "rag_retrieval",
  "done",
  "error"
]);

export type NextAction = z.infer<typeof NextActionSchema>;

/**
 * Job analysis result stored in state
 */
export const JobAnalysisResultSchema = z.object({
  jobId: z.string(),
  keyRequirements: z.array(z.object({
    skill: z.string(),
    importance: z.enum(["critical", "important", "nice-to-have"]),
    category: z.enum(["technical", "soft-skill", "experience", "education"])
  })),
  industryTerms: z.array(z.string()),
  matchScore: z.number().min(0).max(100).optional(),
  recommendations: z.array(z.string())
});

export type JobAnalysisResult = z.infer<typeof JobAnalysisResultSchema>;

/**
 * Learning path stored in state
 */
export const LearningPathResultSchema = z.object({
  jobId: z.string(),
  gaps: z.array(z.object({
    skill: z.string(),
    currentLevel: z.enum(["none", "beginner", "intermediate", "advanced", "expert"]),
    targetLevel: z.enum(["none", "beginner", "intermediate", "advanced", "expert"]),
    priority: z.enum(["high", "medium", "low"])
  })),
  resources: z.array(z.object({
    skill: z.string(),
    type: z.enum(["documentation", "tutorial", "course", "book", "practice"]),
    title: z.string(),
    url: z.string().optional(),
    estimatedHours: z.number().optional()
  })),
  exercises: z.array(z.object({
    skill: z.string(),
    description: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    code: z.string().optional()
  }))
});

export type LearningPathResult = z.infer<typeof LearningPathResultSchema>;

/**
 * RAG retrieval result
 */
export const RAGResultSchema = z.object({
  query: z.string(),
  documents: z.array(z.object({
    content: z.string(),
    metadata: z.record(z.any())
  })),
  retrievedAt: z.string()
});

export type RAGResult = z.infer<typeof RAGResultSchema>;
```

### 2.2 Define State Schema

**File**: `packages/agent-graph/src/state/schema.ts`

```typescript
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { Bio, JobListing, Output } from "@cv-builder/agent-core";
import {
  NextAction,
  JobAnalysisResult,
  LearningPathResult,
  RAGResult
} from "./types";

/**
 * Message reducer: Concatenates new messages to existing array
 */
function messagesReducer(
  state: BaseMessage[] | undefined,
  update: BaseMessage[] | BaseMessage
): BaseMessage[] {
  const existing = state || [];
  const newMessages = Array.isArray(update) ? update : [update];
  return existing.concat(newMessages);
}

/**
 * Output reducer: Concatenates new outputs to existing array
 */
function outputsReducer(
  state: z.infer<typeof Output>[] | undefined,
  update: z.infer<typeof Output>[] | z.infer<typeof Output>
): z.infer<typeof Output>[] {
  const existing = state || [];
  const newOutputs = Array.isArray(update) ? update : [update];
  return existing.concat(newOutputs);
}

/**
 * CV Builder State - The "Blackboard"
 *
 * All agents read from and write to this shared state.
 * State is persisted via checkpointing for durability and resumability.
 */
export const CVBuilderState = Annotation.Root({
  // ========== Conversation ==========
  /**
   * Full message history (user + assistant messages)
   * Uses reducer to accumulate messages
   */
  messages: Annotation<BaseMessage[]>({
    reducer: messagesReducer,
    default: () => []
  }),

  // ========== User Data ==========
  /**
   * User's biographical information (resume data)
   */
  bio: Annotation<z.infer<typeof Bio> | null>({
    default: () => null
  }),

  /**
   * Currently selected job listing
   */
  currentJob: Annotation<z.infer<typeof JobListing> | null>({
    default: () => null
  }),

  /**
   * All available job listings (key = job ID)
   */
  jobs: Annotation<Map<string, z.infer<typeof JobListing>>>({
    default: () => new Map()
  }),

  // ========== Analysis Results ==========
  /**
   * Job analysis result (requirements, match score, etc.)
   */
  jobAnalysis: Annotation<JobAnalysisResult | null>({
    default: () => null
  }),

  /**
   * Skills gap analysis and learning path
   */
  learningPath: Annotation<LearningPathResult | null>({
    default: () => null
  }),

  /**
   * RAG retrieval results
   */
  ragResults: Annotation<RAGResult | null>({
    default: () => null
  }),

  // ========== Generated Outputs ==========
  /**
   * All generated outputs (resumes, cover letters, etc.)
   * Uses reducer to accumulate outputs
   */
  outputs: Annotation<z.infer<typeof Output>[]>({
    reducer: outputsReducer,
    default: () => []
  }),

  // ========== Control Flow ==========
  /**
   * Currently executing agent (for logging/debugging)
   */
  currentAgent: Annotation<string>({
    default: () => "orchestrator"
  }),

  /**
   * Next action to take (determines routing)
   */
  nextAction: Annotation<NextAction>({
    default: () => "done"
  }),

  // ========== Metadata ==========
  /**
   * Thread ID for conversation persistence
   */
  threadId: Annotation<string>(),

  /**
   * User ID for multi-tenancy
   */
  userId: Annotation<string>(),

  /**
   * Additional metadata (timestamps, version, etc.)
   */
  metadata: Annotation<Record<string, any>>({
    default: () => ({})
  })
});

/**
 * Type inference helper for state
 */
export type CVBuilderStateType = typeof CVBuilderState.State;

/**
 * Zod schema for runtime validation
 */
export const CVBuilderStateSchema = z.object({
  messages: z.array(z.custom<BaseMessage>()),
  bio: Bio.nullable(),
  currentJob: JobListing.nullable(),
  jobs: z.instanceof(Map),
  jobAnalysis: z.any().nullable(),
  learningPath: z.any().nullable(),
  ragResults: z.any().nullable(),
  outputs: z.array(Output),
  currentAgent: z.string(),
  nextAction: z.string(),
  threadId: z.string(),
  userId: z.string(),
  metadata: z.record(z.any())
});

/**
 * Validate state against schema
 */
export function validateState(state: any): CVBuilderStateType {
  return CVBuilderStateSchema.parse(state);
}

/**
 * Create initial state for new conversation
 */
export function createInitialState(userId: string, threadId: string): Partial<CVBuilderStateType> {
  return {
    messages: [],
    bio: null,
    currentJob: null,
    jobs: new Map(),
    jobAnalysis: null,
    learningPath: null,
    ragResults: null,
    outputs: [],
    currentAgent: "orchestrator",
    nextAction: "done",
    threadId,
    userId,
    metadata: {
      createdAt: new Date().toISOString(),
      version: "1.0"
    }
  };
}
```

### 2.3 Write Unit Tests

**File**: `packages/agent-graph/tests/state/schema.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import {
  CVBuilderState,
  createInitialState,
  validateState
} from "../../src/state/schema";

describe("CVBuilderState", () => {
  it("creates initial state correctly", () => {
    const state = createInitialState("user-123", "thread-456");

    expect(state.userId).toBe("user-123");
    expect(state.threadId).toBe("thread-456");
    expect(state.messages).toEqual([]);
    expect(state.bio).toBeNull();
    expect(state.currentJob).toBeNull();
    expect(state.outputs).toEqual([]);
    expect(state.nextAction).toBe("done");
  });

  it("accumulates messages with reducer", () => {
    const initial = createInitialState("user-1", "thread-1");

    // First message
    const state1 = {
      ...initial,
      messages: [new HumanMessage("Hello")]
    };

    // Second message (should concatenate)
    const state2 = {
      ...state1,
      messages: state1.messages!.concat([new AIMessage("Hi there!")])
    };

    expect(state2.messages).toHaveLength(2);
    expect(state2.messages![0].content).toBe("Hello");
    expect(state2.messages![1].content).toBe("Hi there!");
  });

  it("validates state schema", () => {
    const state = createInitialState("user-1", "thread-1");

    // Should not throw
    expect(() => validateState(state)).not.toThrow();
  });

  it("rejects invalid state", () => {
    const invalidState = {
      messages: "not an array", // Invalid
      userId: "user-1"
    };

    expect(() => validateState(invalidState)).toThrow();
  });
});
```

---

## Task 3: Implement Checkpointer

### 3.1 PostgreSQL Checkpointer

**File**: `packages/agent-graph/src/state/checkpointer.ts`

```typescript
import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple } from "@langchain/langgraph-checkpoint";
import { RunnableConfig } from "@langchain/core/runnables";
import { Pool, PoolClient } from "pg";
import { v4 as uuidv4 } from "uuid";
import { getLogger } from "../utils/logger";

const logger = getLogger("checkpointer");

/**
 * PostgreSQL-based checkpoint saver for LangGraph
 *
 * Stores conversation state at each step for:
 * - Resumability (recover from failures)
 * - Time travel (view conversation history)
 * - Branching (explore alternative paths)
 * - Human-in-the-loop (pause for approval)
 */
export class PostgresCheckpointer extends BaseCheckpointSaver {
  private pool: Pool;

  constructor(connectionString: string) {
    super();
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    logger.info("PostgresCheckpointer initialized");
  }

  /**
   * Retrieve the most recent checkpoint for a thread
   */
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const { thread_id, thread_ts } = config.configurable || {};

    if (!thread_id) {
      logger.warn("getTuple called without thread_id");
      return undefined;
    }

    try {
      const query = thread_ts
        ? `SELECT * FROM checkpoints
           WHERE thread_id = $1 AND thread_ts = $2
           LIMIT 1`
        : `SELECT * FROM checkpoints
           WHERE thread_id = $1
           ORDER BY thread_ts DESC
           LIMIT 1`;

      const params = thread_ts ? [thread_id, thread_ts] : [thread_id];
      const result = await this.pool.query(query, params);

      if (result.rows.length === 0) {
        logger.debug({ thread_id, thread_ts }, "No checkpoint found");
        return undefined;
      }

      const row = result.rows[0];
      logger.debug({ thread_id, thread_ts }, "Checkpoint retrieved");

      return {
        config: {
          configurable: {
            thread_id: row.thread_id,
            thread_ts: row.thread_ts
          }
        },
        checkpoint: row.checkpoint,
        metadata: row.metadata,
        parentConfig: row.parent_ts
          ? {
              configurable: {
                thread_id: row.thread_id,
                thread_ts: row.parent_ts
              }
            }
          : undefined
      };
    } catch (error) {
      logger.error({ error, thread_id }, "Failed to retrieve checkpoint");
      throw error;
    }
  }

  /**
   * Save a checkpoint to the database
   */
  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<RunnableConfig> {
    const { thread_id } = config.configurable || {};

    if (!thread_id) {
      throw new Error("thread_id is required to save checkpoint");
    }

    const thread_ts = new Date().toISOString();
    const parent_ts = config.configurable?.thread_ts || null;

    try {
      await this.pool.query(
        `INSERT INTO checkpoints (thread_id, thread_ts, parent_ts, checkpoint, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [thread_id, thread_ts, parent_ts, checkpoint, metadata]
      );

      logger.debug({ thread_id, thread_ts }, "Checkpoint saved");

      return {
        configurable: {
          thread_id,
          thread_ts
        }
      };
    } catch (error) {
      logger.error({ error, thread_id }, "Failed to save checkpoint");
      throw error;
    }
  }

  /**
   * List all checkpoints for a thread
   */
  async list(config: RunnableConfig): Promise<CheckpointTuple[]> {
    const { thread_id } = config.configurable || {};

    if (!thread_id) {
      return [];
    }

    try {
      const result = await this.pool.query(
        `SELECT * FROM checkpoints
         WHERE thread_id = $1
         ORDER BY thread_ts DESC`,
        [thread_id]
      );

      logger.debug({ thread_id, count: result.rows.length }, "Checkpoints listed");

      return result.rows.map(row => ({
        config: {
          configurable: {
            thread_id: row.thread_id,
            thread_ts: row.thread_ts
          }
        },
        checkpoint: row.checkpoint,
        metadata: row.metadata,
        parentConfig: row.parent_ts
          ? {
              configurable: {
                thread_id: row.thread_id,
                thread_ts: row.parent_ts
              }
            }
          : undefined
      }));
    } catch (error) {
      logger.error({ error, thread_id }, "Failed to list checkpoints");
      throw error;
    }
  }

  /**
   * Clean up database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info("PostgresCheckpointer connection closed");
  }
}

/**
 * Factory function to create checkpointer from config
 */
export function createCheckpointer(connectionString: string): PostgresCheckpointer {
  return new PostgresCheckpointer(connectionString);
}
```

### 3.2 Write Unit Tests

**File**: `packages/agent-graph/tests/state/checkpointer.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { PostgresCheckpointer } from "../../src/state/checkpointer";

// Test database setup
const TEST_DB = process.env.TEST_DATABASE_URL || "postgresql://localhost:5432/cv_builder_test";

describe("PostgresCheckpointer", () => {
  let checkpointer: PostgresCheckpointer;
  let pool: Pool;

  beforeAll(async () => {
    // Set up test database
    pool = new Pool({ connectionString: TEST_DB });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        thread_id TEXT NOT NULL,
        thread_ts TEXT NOT NULL,
        parent_ts TEXT,
        checkpoint JSONB NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (thread_id, thread_ts)
      )
    `);

    checkpointer = new PostgresCheckpointer(TEST_DB);
  });

  afterAll(async () => {
    // Clean up
    await pool.query("DROP TABLE IF EXISTS checkpoints");
    await checkpointer.close();
    await pool.end();
  });

  it("saves and retrieves a checkpoint", async () => {
    const config = {
      configurable: { thread_id: "test-thread-1" }
    };

    const checkpoint = {
      v: 1,
      id: "checkpoint-1",
      ts: new Date().toISOString(),
      channel_values: {
        messages: [],
        nextAction: "done"
      }
    };

    const metadata = { step: 1, source: "test" };

    // Save checkpoint
    const savedConfig = await checkpointer.put(config, checkpoint, metadata);

    expect(savedConfig.configurable?.thread_id).toBe("test-thread-1");
    expect(savedConfig.configurable?.thread_ts).toBeDefined();

    // Retrieve checkpoint
    const retrieved = await checkpointer.getTuple(config);

    expect(retrieved).toBeDefined();
    expect(retrieved!.checkpoint.id).toBe("checkpoint-1");
    expect(retrieved!.metadata).toEqual(metadata);
  });

  it("lists checkpoints in descending order", async () => {
    const config = {
      configurable: { thread_id: "test-thread-2" }
    };

    // Save multiple checkpoints
    await checkpointer.put(config, { v: 1, id: "cp-1" } as any, { step: 1 });
    await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
    await checkpointer.put(config, { v: 1, id: "cp-2" } as any, { step: 2 });
    await new Promise(resolve => setTimeout(resolve, 10));
    await checkpointer.put(config, { v: 1, id: "cp-3" } as any, { step: 3 });

    // List checkpoints
    const list = await checkpointer.list(config);

    expect(list).toHaveLength(3);
    expect(list[0].checkpoint.id).toBe("cp-3"); // Most recent first
    expect(list[1].checkpoint.id).toBe("cp-2");
    expect(list[2].checkpoint.id).toBe("cp-1");
  });
});
```

---

## Task 4: Implement Thread Manager

**File**: `packages/agent-graph/src/state/thread-manager.ts`

```typescript
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import { getLogger } from "../utils/logger";

const logger = getLogger("thread-manager");

/**
 * Thread metadata stored in database
 */
export interface Thread {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
}

/**
 * Thread creation options
 */
export interface CreateThreadOptions {
  userId: string;
  title?: string;
  metadata?: Record<string, any>;
}

/**
 * Thread Manager
 *
 * Manages conversation threads (sessions) for users.
 * Each thread represents an independent conversation with its own checkpoint history.
 */
export class ThreadManager {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000
    });

    logger.info("ThreadManager initialized");
  }

  /**
   * Initialize threads table
   */
  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
      )
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id)
    `);

    logger.info("Threads table initialized");
  }

  /**
   * Create a new thread
   */
  async createThread(options: CreateThreadOptions): Promise<Thread> {
    const id = uuidv4();
    const title = options.title || `Conversation ${new Date().toLocaleDateString()}`;
    const metadata = options.metadata || {};

    const result = await this.pool.query(
      `INSERT INTO threads (id, user_id, title, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, options.userId, title, metadata]
    );

    logger.info({ threadId: id, userId: options.userId }, "Thread created");

    return this.mapRowToThread(result.rows[0]);
  }

  /**
   * Get thread by ID
   */
  async getThread(threadId: string): Promise<Thread | null> {
    const result = await this.pool.query(
      `SELECT * FROM threads WHERE id = $1`,
      [threadId]
    );

    if (result.rows.length === 0) {
      logger.warn({ threadId }, "Thread not found");
      return null;
    }

    return this.mapRowToThread(result.rows[0]);
  }

  /**
   * List threads for a user
   */
  async listThreads(userId: string, limit = 50, offset = 0): Promise<Thread[]> {
    const result = await this.pool.query(
      `SELECT * FROM threads
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    logger.debug({ userId, count: result.rows.length }, "Threads listed");

    return result.rows.map(this.mapRowToThread);
  }

  /**
   * Update thread metadata or title
   */
  async updateThread(
    threadId: string,
    updates: Partial<Pick<Thread, "title" | "metadata">>
  ): Promise<Thread | null> {
    const setClauses: string[] = ["updated_at = CURRENT_TIMESTAMP"];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }

    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(updates.metadata);
    }

    values.push(threadId); // WHERE clause parameter

    const result = await this.pool.query(
      `UPDATE threads
       SET ${setClauses.join(", ")}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      logger.warn({ threadId }, "Thread not found for update");
      return null;
    }

    logger.info({ threadId }, "Thread updated");

    return this.mapRowToThread(result.rows[0]);
  }

  /**
   * Delete thread (soft delete - keeps checkpoints)
   */
  async deleteThread(threadId: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM threads WHERE id = $1`,
      [threadId]
    );

    const deleted = result.rowCount! > 0;

    if (deleted) {
      logger.info({ threadId }, "Thread deleted");
    } else {
      logger.warn({ threadId }, "Thread not found for deletion");
    }

    return deleted;
  }

  /**
   * Touch thread (update updated_at timestamp)
   */
  async touchThread(threadId: string): Promise<void> {
    await this.pool.query(
      `UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [threadId]
    );
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info("ThreadManager connection closed");
  }

  /**
   * Map database row to Thread object
   */
  private mapRowToThread(row: any): Thread {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      metadata: row.metadata
    };
  }
}

/**
 * Factory function to create thread manager
 */
export function createThreadManager(connectionString: string): ThreadManager {
  return new ThreadManager(connectionString);
}
```

---

## Task 5: Configuration System

**File**: `packages/agent-graph/src/utils/config.ts`

```typescript
import { getConfig as getAgentCoreConfig } from "@cv-builder/agent-core/utils/config";
import { z } from "zod";

/**
 * Agent Graph configuration schema
 */
export const AgentGraphConfigSchema = z.object({
  // Database
  databaseUrl: z.string().url("Invalid database URL"),

  // Anthropic (reuse from agent-core)
  anthropicApiKey: z.string().min(1, "Anthropic API key required"),

  // OpenAI (for embeddings in Phase 4)
  openaiApiKey: z.string().optional(),

  // Model settings
  model: z.string().default("claude-sonnet-4-20250514"),
  temperature: z.number().min(0).max(1).default(0.7),

  // Directories (reuse from agent-core)
  directories: z.object({
    bio: z.string(),
    jobs: z.string(),
    output: z.string(),
    research: z.string()
  })
});

export type AgentGraphConfig = z.infer<typeof AgentGraphConfigSchema>;

/**
 * Get configuration for agent-graph
 *
 * Extends agent-core config with LangGraph-specific settings
 */
export function getConfig(): AgentGraphConfig {
  // Get base config from agent-core
  const baseConfig = getAgentCoreConfig();

  // Get database URL from environment
  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    "postgresql://localhost:5432/cv_builder_dev";

  // Get OpenAI key (optional for now)
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const config = {
    databaseUrl,
    anthropicApiKey: baseConfig.anthropicApiKey,
    openaiApiKey,
    model: baseConfig.model,
    temperature: 0.7,
    directories: {
      bio: baseConfig.bioDir,
      jobs: baseConfig.jobsDir,
      output: baseConfig.outputDir,
      research: baseConfig.researchDir
    }
  };

  // Validate and return
  return AgentGraphConfigSchema.parse(config);
}
```

**File**: `packages/agent-graph/src/utils/logger.ts`

```typescript
import pino from "pino";

/**
 * Create logger instance with pretty printing in development
 */
export function getLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss",
              ignore: "pid,hostname"
            }
          }
        : undefined
  });
}
```

---

## Task 6: Public Exports

**File**: `packages/agent-graph/src/index.ts`

```typescript
// State management
export { CVBuilderState, createInitialState, validateState } from "./state/schema";
export type { CVBuilderStateType } from "./state/schema";
export * from "./state/types";

// Checkpointing
export { PostgresCheckpointer, createCheckpointer } from "./state/checkpointer";

// Thread management
export { ThreadManager, createThreadManager } from "./state/thread-manager";
export type { Thread, CreateThreadOptions } from "./state/thread-manager";

// Configuration
export { getConfig } from "./utils/config";
export type { AgentGraphConfig } from "./utils/config";

// Logging
export { getLogger } from "./utils/logger";

// Graphs (will be added in Phase 3)
// export { createCVBuilderGraph } from "./graphs/cv-builder-graph";
```

---

## Validation Checklist

Before moving to Phase 2, verify:

- [ ] Package structure created with all directories
- [ ] Dependencies installed successfully
- [ ] TypeScript compiles without errors (`npm run type-check`)
- [ ] State schema tests pass (`npm test`)
- [ ] Checkpointer connects to PostgreSQL
- [ ] Checkpointer saves and retrieves state
- [ ] Thread manager creates threads
- [ ] Configuration loads from env.json
- [ ] Logger writes structured logs

---

## Next Steps

Once Phase 1 is complete:

1. **Review with team**: Get feedback on architecture
2. **Update env.json**: Add `DATABASE_URL` configuration
3. **Document learnings**: Update this guide with any blockers/solutions
4. **Begin Phase 2**: Start converting specialized agents to nodes

---

## Troubleshooting

### PostgreSQL Connection Errors

**Problem**: Cannot connect to database

**Solutions**:
1. Verify PostgreSQL is running: `pg_isready`
2. Check connection string format
3. Verify user has permissions
4. Check firewall rules (cloud databases)

### TypeScript Errors

**Problem**: Module resolution errors

**Solutions**:
1. Ensure workspace dependencies: `npm install` from repo root
2. Check `tsconfig.json` references
3. Restart TypeScript server in IDE

### Import Errors from agent-core

**Problem**: Cannot import from `@cv-builder/agent-core`

**Solutions**:
1. Build agent-core: `npm run build --workspace=@cv-builder/agent-core`
2. Check package.json references
3. Use `file:../agent-core` path

---

**Ready to start Phase 1!** 🚀
