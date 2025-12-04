import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import { getLogger } from "../utils/logger";
import { Thread, CreateThreadOptions } from "./thread-manager";

const logger = getLogger("sqlite-thread-manager");

/**
 * SQLite Thread Manager (Development/Prototype)
 *
 * Manages conversation threads (sessions) for users.
 * Each thread represents an independent conversation with its own checkpoint history.
 *
 * NOTE: This is designed for single-process development/prototyping.
 * For production with concurrent access, use PostgreSQL ThreadManager instead.
 */
export class SQLiteThreadManager {
  private db: Database.Database;

  constructor(dbPath: string = "./cv_builder.db") {
    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrent read performance
    this.db.pragma("journal_mode = WAL");

    // Initialize tables
    this.initializeSync();

    logger.info({ dbPath }, "SQLiteThreadManager initialized");
  }

  /**
   * Initialize threads table synchronously (called from constructor)
   */
  private initializeSync(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        metadata TEXT DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id);
    `);

    logger.debug("Threads table initialized");
  }

  /**
   * Initialize threads table
   */
  async initialize(): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        metadata TEXT DEFAULT '{}'
      );

      CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id);
    `);

    logger.info("Threads table initialized");
  }

  /**
   * Create a new thread
   */
  async createThread(options: CreateThreadOptions): Promise<Thread> {
    const id = uuidv4();
    const title = options.title || `Conversation ${new Date().toLocaleDateString()}`;
    const metadata = JSON.stringify(options.metadata || {});

    const stmt = this.db.prepare(`
      INSERT INTO threads (id, user_id, title, metadata)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, options.userId, title, metadata);

    logger.info({ threadId: id, userId: options.userId }, "Thread created");

    return this.getThread(id) as Promise<Thread>;
  }

  /**
   * Get thread by ID
   */
  async getThread(threadId: string): Promise<Thread | null> {
    const stmt = this.db.prepare("SELECT * FROM threads WHERE id = ?");
    const row = stmt.get(threadId) as any;

    if (!row) {
      logger.warn({ threadId }, "Thread not found");
      return null;
    }

    return this.mapRowToThread(row);
  }

  /**
   * List threads for a user
   */
  async listThreads(userId: string, limit = 50, offset = 0): Promise<Thread[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM threads
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(userId, limit, offset) as any[];

    logger.debug({ userId, count: rows.length }, "Threads listed");

    return rows.map(this.mapRowToThread);
  }

  /**
   * Update thread metadata or title
   */
  async updateThread(
    threadId: string,
    updates: Partial<Pick<Thread, "title" | "metadata">>
  ): Promise<Thread | null> {
    const setClauses: string[] = ["updated_at = datetime('now')"];
    const values: any[] = [];

    if (updates.title !== undefined) {
      setClauses.push("title = ?");
      values.push(updates.title);
    }

    if (updates.metadata !== undefined) {
      setClauses.push("metadata = ?");
      values.push(JSON.stringify(updates.metadata));
    }

    values.push(threadId); // WHERE clause parameter

    const stmt = this.db.prepare(`
      UPDATE threads
      SET ${setClauses.join(", ")}
      WHERE id = ?
    `);

    const result = stmt.run(...values);

    if (result.changes === 0) {
      logger.warn({ threadId }, "Thread not found for update");
      return null;
    }

    logger.info({ threadId }, "Thread updated");

    return this.getThread(threadId);
  }

  /**
   * Delete thread (soft delete - keeps checkpoints)
   */
  async deleteThread(threadId: string): Promise<boolean> {
    const stmt = this.db.prepare("DELETE FROM threads WHERE id = ?");
    const result = stmt.run(threadId);

    const deleted = result.changes > 0;

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
    const stmt = this.db.prepare(`
      UPDATE threads
      SET updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(threadId);
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    this.db.close();
    logger.info("SQLiteThreadManager connection closed");
  }

  /**
   * Utility: Get thread statistics
   */
  getStats(): { totalThreads: number; threadsByUser: Record<string, number> } {
    const totalStmt = this.db.prepare("SELECT COUNT(*) as count FROM threads");
    const total = totalStmt.get() as any;

    const byUserStmt = this.db.prepare(`
      SELECT user_id, COUNT(*) as count
      FROM threads
      GROUP BY user_id
    `);
    const byUser = byUserStmt.all() as any[];

    const threadsByUser: Record<string, number> = {};
    for (const row of byUser) {
      threadsByUser[row.user_id] = row.count;
    }

    return {
      totalThreads: total.count,
      threadsByUser
    };
  }

  /**
   * Utility: Clear all threads (useful for testing)
   */
  clearAll(): void {
    this.db.prepare("DELETE FROM threads").run();
    logger.info("All threads cleared");
  }

  /**
   * Map database row to Thread object
   */
  private mapRowToThread(row: any): Thread {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: JSON.parse(row.metadata)
    };
  }
}

/**
 * Factory function to create SQLite thread manager
 */
export function createSQLiteThreadManager(dbPath?: string): SQLiteThreadManager {
  return new SQLiteThreadManager(dbPath);
}
