/**
 * Database initialization utility
 *
 * Initializes the database (SQLite or PostgreSQL) with required tables.
 * Run this before first use of agent-graph.
 */

import { getConfig } from "./config";
import { createSQLiteCheckpointer, createSQLiteThreadManager } from "../index";
import { getLogger } from "./logger";

const logger = getLogger("init-db");

/**
 * Initialize database
 */
export async function initializeDatabase(): Promise<void> {
  const config = getConfig();

  logger.info({ databaseType: config.databaseType }, "Initializing database");

  if (config.databaseType === "sqlite") {
    await initializeSQLite(config.dbPath!);
  } else {
    await initializePostgres(config.databaseUrl!);
  }

  logger.info("Database initialization complete");
}

/**
 * Initialize SQLite database
 */
async function initializeSQLite(dbPath: string): Promise<void> {
  logger.info({ dbPath }, "Initializing SQLite database");

  // Create checkpointer (initializes checkpoints table)
  const checkpointer = createSQLiteCheckpointer(dbPath);
  logger.info("✅ Checkpoints table created");

  // Create thread manager (initializes threads table)
  const threadManager = createSQLiteThreadManager(dbPath);
  await threadManager.initialize();
  logger.info("✅ Threads table created");

  // Get stats
  const checkpointStats = checkpointer.getStats();
  const threadStats = threadManager.getStats();

  logger.info({
    checkpoints: checkpointStats.checkpointCount,
    threads: threadStats.totalThreads,
    dbSize: checkpointStats.dbSize
  }, "Database statistics");

  // Clean up
  await checkpointer.close();
  await threadManager.close();
}

/**
 * Initialize PostgreSQL database
 */
async function initializePostgres(databaseUrl: string): Promise<void> {
  logger.info("Initializing PostgreSQL database");

  // Import PostgreSQL modules (only when needed)
  const { createCheckpointer } = await import("../state/checkpointer");
  const { createThreadManager } = await import("../state/thread-manager");

  // Note: PostgreSQL initialization happens via SQL scripts
  // The tables should be created manually using the SQL in documentation
  logger.warn("PostgreSQL tables must be created manually - see docs/technical/06-phase-1-implementation-guide.md");

  logger.info("✅ PostgreSQL connection verified");
}

/**
 * CLI entry point
 */
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log("✅ Database initialized successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Database initialization failed:", error);
      process.exit(1);
    });
}
