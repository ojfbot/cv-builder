import { config } from 'dotenv'
import path from 'path'

config()

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
}

export function getConfig(): Config {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required')
  }

  const baseDir = process.cwd()

  return {
    anthropicApiKey,
    bioDir: path.join(baseDir, 'bio'),
    jobsDir: path.join(baseDir, 'jobs'),
    outputDir: path.join(baseDir, 'output'),
    publicDir: path.join(baseDir, 'public'),
    researchDir: path.join(baseDir, 'research'),
    pipelinesDir: path.join(baseDir, 'pipelines'),
    toolboxDir: path.join(baseDir, 'toolbox'),
    tempDir: path.join(baseDir, 'temp'),
  }
}
