import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata, CheckpointTuple } from "@langchain/langgraph-checkpoint";
import { RunnableConfig } from "@langchain/core/runnables";
import { Pool } from "pg";
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
   * List all checkpoints for a thread (returns async generator)
   */
  async *list(config: RunnableConfig): AsyncGenerator<CheckpointTuple> {
    const { thread_id } = config.configurable || {};

    if (!thread_id) {
      return;
    }

    try {
      const result = await this.pool.query(
        `SELECT * FROM checkpoints
         WHERE thread_id = $1
         ORDER BY thread_ts DESC`,
        [thread_id]
      );

      logger.debug({ thread_id, count: result.rows.length }, "Checkpoints listed");

      for (const row of result.rows) {
        yield {
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
      }
    } catch (error) {
      logger.error({ error, thread_id }, "Failed to list checkpoints");
      throw error;
    }
  }

  /**
   * Store intermediate writes/pending writes (required by BaseCheckpointSaver)
   */
  async putWrites(config: RunnableConfig, writes: any[], taskId: string): Promise<void> {
    // For now, we don't persist intermediate writes
    // This can be implemented later for advanced recovery scenarios
    logger.debug({ taskId, writeCount: writes.length }, "Writes recorded (not persisted)");
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
