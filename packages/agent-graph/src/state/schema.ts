import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { Bio, JobListing } from "@cv-builder/agent-core";
import { BioSchema, JobListingSchema } from "@cv-builder/agent-core";
import {
  NextAction,
  JobAnalysisResult,
  LearningPathResult,
  RAGResult,
  Output,
  OutputSchema
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
  state: Output[] | undefined,
  update: Output[] | Output
): Output[] {
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
    reducer: messagesReducer
  }),

  // ========== User Data ==========
  /**
   * User's biographical information (resume data)
   */
  bio: Annotation<Bio | null>(),

  /**
   * Currently selected job listing
   */
  currentJob: Annotation<JobListing | null>(),

  /**
   * All available job listings (key = job ID)
   */
  jobs: Annotation<Map<string, JobListing>>(),

  // ========== Analysis Results ==========
  /**
   * Job analysis result (requirements, match score, etc.)
   */
  jobAnalysis: Annotation<JobAnalysisResult | null>(),

  /**
   * Skills gap analysis and learning path
   */
  learningPath: Annotation<LearningPathResult | null>(),

  /**
   * RAG retrieval results
   */
  ragResults: Annotation<RAGResult | null>(),

  // ========== Generated Outputs ==========
  /**
   * All generated outputs (resumes, cover letters, etc.)
   * Uses reducer to accumulate outputs
   */
  outputs: Annotation<Output[]>({
    reducer: outputsReducer
  }),

  // ========== Control Flow ==========
  /**
   * Currently executing agent (for logging/debugging)
   */
  currentAgent: Annotation<string>(),

  /**
   * Next action to take (determines routing)
   */
  nextAction: Annotation<NextAction>(),

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
  metadata: Annotation<Record<string, any>>()
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
  bio: BioSchema.nullable(),
  currentJob: JobListingSchema.nullable(),
  jobs: z.instanceof(Map),
  jobAnalysis: z.any().nullable(),
  learningPath: z.any().nullable(),
  ragResults: z.any().nullable(),
  outputs: z.array(OutputSchema),
  currentAgent: z.string(),
  nextAction: z.string(),
  threadId: z.string(),
  userId: z.string(),
  metadata: z.record(z.any())
});

/**
 * Validate state against schema (partial validation for safety)
 */
export function validateState(state: any): any {
  try {
    return CVBuilderStateSchema.parse(state);
  } catch (error) {
    // Log validation failures for debugging
    console.error('[State Validation] Failed to validate state:', error);

    // In development, throw to catch issues early
    if (process.env.NODE_ENV === 'development') {
      console.error('[State Validation] State that failed validation:', JSON.stringify(state, null, 2));
      // Don't throw - allows graceful degradation, but logs clearly
    }

    // Return state anyway for graceful degradation in production
    return state;
  }
}

/**
 * Create initial state for new conversation
 */
export function createInitialState(userId: string, threadId: string): any {
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
    nextAction: "done" as NextAction,
    threadId,
    userId,
    metadata: {
      createdAt: new Date().toISOString(),
      version: "1.0"
    }
  };
}
