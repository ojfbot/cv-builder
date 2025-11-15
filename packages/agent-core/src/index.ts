/**
 * Agent Core - Exports for CV Builder Agent System
 *
 * This is the main entry point that exports browser-compatible modules.
 * For Node.js-only utilities (FileStorage, getConfig), use specific imports:
 * - import { FileStorage } from '@cv-builder/agent-core/utils/file-storage'
 * - import { getConfig } from '@cv-builder/agent-core/utils/config'
 */

// Base Agent
export { BaseAgent } from './agents/base-agent.js'
export type { AgentMessage, AgentMetadata } from './agents/base-agent.js'

// Specialized Agents (browser-compatible)
export { ResumeGeneratorAgent } from './agents/resume-generator-agent.js'
export { JobAnalysisAgent } from './agents/job-analysis-agent.js'
export { TailoringAgent } from './agents/tailoring-agent.js'
export { SkillsGapAgent } from './agents/skills-gap-agent.js'
export { InterviewCoachAgent } from './agents/interview-coach-agent.js'

// NOTE: OrchestratorAgent is NOT exported here (uses FileStorage/getConfig)
// For Node.js environments, import it directly:
//   import { OrchestratorAgent } from '@cv-builder/agent-core/agents/orchestrator-agent'

// Models
export { BioSchema, type Bio } from './models/bio.js'
export { JobListingSchema, type JobListing } from './models/job.js'
export { ResearchEntrySchema, type ResearchEntry } from './models/research.js'

// NOTE: FileStorage and getConfig are NOT exported here to maintain browser compatibility
// They use Node.js fs module and should only be imported in Node.js environments
// Import them directly when needed:
//   import { FileStorage } from '@cv-builder/agent-core/utils/file-storage'
//   import { getConfig } from '@cv-builder/agent-core/utils/config'
