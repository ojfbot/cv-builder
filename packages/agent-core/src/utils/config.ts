import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync } from 'fs'
import { z } from 'zod'

// Zod schema for env.json validation
const EnvJsonSchema = z.object({
  anthropicApiKey: z.string().min(1, 'Anthropic API key is required'),
  directories: z.object({
    bio: z.string().default('bio'),
    jobs: z.string().default('jobs'),
    output: z.string().default('output'),
    public: z.string().default('public'),
    research: z.string().default('research'),
    pipelines: z.string().default('pipelines'),
    toolbox: z.string().default('toolbox'),
    temp: z.string().default('temp'),
  }).default({}),
  model: z.string().default('claude-sonnet-4-20250514'),
})

export type EnvJson = z.infer<typeof EnvJsonSchema>

export interface Config {
  anthropicApiKey: string
  bioDir: string
  jobsDir: string
  outputDir: string
  publicDir: string
  researchDir: string
  pipelinesDir: string
  toolboxDir: string
  tempDir: string
  model: string
}

/**
 * Load configuration from env.json in agent-core package
 * Falls back to .env.local and environment variables if env.json is not found
 */
function loadEnvJson(): EnvJson | null {
  // Try to find env.json in agent-core package directory
  const agentCoreDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
  const envJsonPath = path.join(agentCoreDir, 'env.json')

  if (existsSync(envJsonPath)) {
    try {
      const rawData = readFileSync(envJsonPath, 'utf-8')
      const jsonData = JSON.parse(rawData)
      const validated = EnvJsonSchema.parse(jsonData)
      return validated
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid env.json format:', error.errors)
        throw new Error('env.json validation failed. Check the file format.')
      }
      console.error('Error reading env.json:', error)
      throw new Error('Failed to read env.json')
    }
  }

  return null
}

/**
 * Get configuration from env.json or environment variables
 * Priority: env.json > .env.local > .env
 */
export function getConfig(): Config {
  // First, try to load from env.json
  const envJson = loadEnvJson()

  if (envJson) {
    // Use env.json configuration
    const baseDir = process.cwd()
    return {
      anthropicApiKey: envJson.anthropicApiKey,
      bioDir: path.join(baseDir, envJson.directories.bio),
      jobsDir: path.join(baseDir, envJson.directories.jobs),
      outputDir: path.join(baseDir, envJson.directories.output),
      publicDir: path.join(baseDir, envJson.directories.public),
      researchDir: path.join(baseDir, envJson.directories.research),
      pipelinesDir: path.join(baseDir, envJson.directories.pipelines),
      toolboxDir: path.join(baseDir, envJson.directories.toolbox),
      tempDir: path.join(baseDir, envJson.directories.temp),
      model: envJson.model,
    }
  }

  // Fallback to .env.local for backwards compatibility
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
  config({ path: path.join(rootDir, '.env.local') })
  config({ path: path.join(process.cwd(), '.env.local') })
  config() // Fallback to default .env if needed

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicApiKey) {
    throw new Error(
      'Configuration not found. Please create env.json in packages/agent-core/ ' +
      'or set ANTHROPIC_API_KEY environment variable. ' +
      'See env.json.example for the expected format.'
    )
  }

  const baseDir = process.cwd()

  return {
    anthropicApiKey,
    bioDir: path.join(baseDir, process.env.BIO_DIR || 'bio'),
    jobsDir: path.join(baseDir, process.env.JOBS_DIR || 'jobs'),
    outputDir: path.join(baseDir, process.env.OUTPUT_DIR || 'output'),
    publicDir: path.join(baseDir, process.env.PUBLIC_DIR || 'public'),
    researchDir: path.join(baseDir, process.env.RESEARCH_DIR || 'research'),
    pipelinesDir: path.join(baseDir, process.env.PIPELINES_DIR || 'pipelines'),
    toolboxDir: path.join(baseDir, process.env.TOOLBOX_DIR || 'toolbox'),
    tempDir: path.join(baseDir, process.env.TEMP_DIR || 'temp'),
    model: process.env.MODEL || 'claude-sonnet-4-20250514',
  }
}
