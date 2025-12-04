import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple } from "@langchain/langgraph-checkpoint";
import { RunnableConfig } from "@langchain/core/runnables";
import Database from "better-sqlite3";
import { getLogger } from "../utils/logger";

const logger = getLogger("sqlite-checkpointer");

/**
 * Database row interfaces for type safety
 */
interface CheckpointRow {
  thread_id: string;
  thread_ts: string;
  parent_ts: string | null;
  checkpoint: string; // JSON string
  metadata: string; // JSON string
  created_at: string;
}

interface CountRow {
  count: number;
}

interface SizeRow {
  size: number;
}

/**
 * SQLite-based checkpoint saver for LangGraph (Development/Prototype)
 *
 * Stores conversation state at each step for:
 * - Resumability (recover from failures)
 * - Time travel (view conversation history)
 * - Branching (explore alternative paths)
 * - Human-in-the-loop (pause for approval)
 *
 * NOTE: This is designed for single-process development/prototyping.
 * For production with concurrent access, use PostgresCheckpointer instead.
 */
export class SQLiteCheckpointer extends BaseCheckpointSaver {
  private db: Database.Database;

  constructor(dbPath: string = "./cv_builder.db") {
    super();

    // Open database (creates if doesn't exist)
    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrent read performance
    this.db.pragma("journal_mode = WAL");

    // Initialize schema
    this.initializeSchema();

    logger.info({ dbPath }, "SQLiteCheckpointer initialized");
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        thread_id TEXT NOT NULL,
        thread_ts TEXT NOT NULL,
        parent_ts TEXT,
        checkpoint TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (thread_id, thread_ts)
      );

      CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id
        ON checkpoints(thread_id);

      CREATE INDEX IF NOT EXISTS idx_checkpoints_created_at
        ON checkpoints(created_at);
    `);

    logger.debug("Checkpoints schema initialized");
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
           WHERE thread_id = ? AND thread_ts = ?
           LIMIT 1`
        : `SELECT * FROM checkpoints
           WHERE thread_id = ?
           ORDER BY thread_ts DESC
           LIMIT 1`;

      const params = thread_ts ? [thread_id, thread_ts] : [thread_id];
      const row = this.db.prepare(query).get(...params) as CheckpointRow | undefined;

      if (!row) {
        logger.debug({ thread_id, thread_ts }, "No checkpoint found");
        return undefined;
      }

      logger.debug({ thread_id, thread_ts }, "Checkpoint retrieved");

      return {
        config: {
          configurable: {
            thread_id: row.thread_id,
            thread_ts: row.thread_ts
          }
        },
        checkpoint: JSON.parse(row.checkpoint),
        metadata: JSON.parse(row.metadata),
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
      const stmt = this.db.prepare(`
        INSERT INTO checkpoints (thread_id, thread_ts, parent_ts, checkpoint, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        thread_id,
        thread_ts,
        parent_ts,
        JSON.stringify(checkpoint),
        JSON.stringify(metadata)
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
   * List all checkpoints for a thread (returns async generator)
   */
  async *list(config: RunnableConfig): AsyncGenerator<CheckpointTuple> {
    const { thread_id } = config.configurable || {};

    if (!thread_id) {
      return;
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM checkpoints
        WHERE thread_id = ?
        ORDER BY thread_ts DESC
      `);

      const rows = stmt.all(thread_id) as CheckpointRow[];

      logger.debug({ thread_id, count: rows.length }, "Checkpoints listed");

      for (const row of rows) {
        yield {
          config: {
            configurable: {
              thread_id: row.thread_id,
              thread_ts: row.thread_ts
            }
          },
          checkpoint: JSON.parse(row.checkpoint),
          metadata: JSON.parse(row.metadata),
          parentConfig: row.parent_ts
            ? {
                configurable: {
                  thread_id: row.thread_id,
                  thread_ts: row.parent_ts
                }
              }
            : undefined
        };
      }
    } catch (error) {
      logger.error({ error, thread_id }, "Failed to list checkpoints");
      throw error;
    }
  }

  /**
   * Store intermediate writes/pending writes (required by BaseCheckpointSaver)
   */
  async putWrites(config: RunnableConfig, writes: Array<[string, unknown]>, taskId: string): Promise<void> {
    // For now, we don't persist intermediate writes
    // This can be implemented later for advanced recovery scenarios
    logger.debug({ taskId, writeCount: writes.length }, "Writes recorded (not persisted)");
  }

  /**
   * Clean up database connection
   */
  async close(): Promise<void> {
    this.db.close();
    logger.info("SQLiteCheckpointer connection closed");
  }

  /**
   * Utility: Get database statistics
   */
  getStats(): { checkpointCount: number; threadCount: number; dbSize: string } {
    const checkpointCount = this.db.prepare("SELECT COUNT(*) as count FROM checkpoints").get() as CountRow;
    const threadCount = this.db.prepare("SELECT COUNT(DISTINCT thread_id) as count FROM checkpoints").get() as CountRow;
    const dbSize = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as SizeRow;

    return {
      checkpointCount: checkpointCount.count,
      threadCount: threadCount.count,
      dbSize: `${(dbSize.size / 1024 / 1024).toFixed(2)} MB`
    };
  }

  /**
   * Utility: Clear all checkpoints (useful for testing)
   */
  clearAll(): void {
    this.db.prepare("DELETE FROM checkpoints").run();
    logger.info("All checkpoints cleared");
  }
}

/**
 * Factory function to create SQLite checkpointer
 */
export function createSQLiteCheckpointer(dbPath?: string): SQLiteCheckpointer {
  return new SQLiteCheckpointer(dbPath);
}
