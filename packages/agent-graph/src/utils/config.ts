import { getConfig as getAgentCoreConfig } from "@cv-builder/agent-core/utils/config";
import { z } from "zod";
import path from "path";

/**
 * Database type enum
 */
export const DatabaseTypeSchema = z.enum(["sqlite", "postgres"]);
export type DatabaseType = z.infer<typeof DatabaseTypeSchema>;

/**
 * Agent Graph configuration schema
 */
export const AgentGraphConfigSchema = z.object({
  // Database
  databaseType: DatabaseTypeSchema.default("sqlite"),
  databaseUrl: z.string().optional(), // Optional for SQLite (uses dbPath instead)
  dbPath: z.string().optional(), // SQLite database file path

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

  // Determine database type (default to SQLite for dev)
  const databaseType = (process.env.DATABASE_TYPE as DatabaseType) || "sqlite";

  // Get database configuration based on type
  let databaseUrl: string | undefined;
  let dbPath: string | undefined;

  if (databaseType === "postgres") {
    databaseUrl =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      "postgresql://localhost:5432/cv_builder_dev";
  } else {
    // SQLite (default for dev)
    dbPath = process.env.DB_PATH || path.join(process.cwd(), "cv_builder.db");
  }

  // Get OpenAI key (optional for now)
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const config = {
    databaseType,
    databaseUrl,
    dbPath,
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
