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
