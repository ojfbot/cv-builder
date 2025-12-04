import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { Bio, JobListing } from "@cv-builder/agent-core";
import {
  ResumeOutputSchema,
  LearningPathSchema,
  CoverLetterSchema
} from "@cv-builder/agent-core/models/output";

/**
 * Generic output type (union of all output types)
 */
export const OutputSchema = z.union([
  ResumeOutputSchema,
  LearningPathSchema,
  CoverLetterSchema,
  z.object({ type: z.literal("unknown"), data: z.any() })
]);

export type Output = z.infer<typeof OutputSchema>;

/**
 * Actions that the orchestrator can route to
 */
export const NextActionSchema = z.enum([
  "generate_resume",
  "analyze_job",
  "tailor_resume",
  "analyze_skills_gap",
  "prepare_interview",
  "rag_retrieval",
  "done",
  "error"
]);

export type NextAction = z.infer<typeof NextActionSchema>;

/**
 * Job analysis result stored in state
 */
export const JobAnalysisResultSchema = z.object({
  jobId: z.string(),
  keyRequirements: z.array(z.object({
    skill: z.string(),
    importance: z.enum(["critical", "important", "nice-to-have"]),
    category: z.enum(["technical", "soft-skill", "experience", "education"])
  })),
  industryTerms: z.array(z.string()),
  matchScore: z.number().min(0).max(100).optional(),
  recommendations: z.array(z.string())
});

export type JobAnalysisResult = z.infer<typeof JobAnalysisResultSchema>;

/**
 * Learning path stored in state
 */
export const LearningPathResultSchema = z.object({
  jobId: z.string(),
  gaps: z.array(z.object({
    skill: z.string(),
    currentLevel: z.enum(["none", "beginner", "intermediate", "advanced", "expert"]),
    targetLevel: z.enum(["none", "beginner", "intermediate", "advanced", "expert"]),
    priority: z.enum(["high", "medium", "low"])
  })),
  resources: z.array(z.object({
    skill: z.string(),
    type: z.enum(["documentation", "tutorial", "course", "book", "practice"]),
    title: z.string(),
    url: z.string().optional(),
    estimatedHours: z.number().optional()
  })),
  exercises: z.array(z.object({
    skill: z.string(),
    description: z.string(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    code: z.string().optional()
  }))
});

export type LearningPathResult = z.infer<typeof LearningPathResultSchema>;

/**
 * RAG retrieval result
 */
export const RAGResultSchema = z.object({
  query: z.string(),
  documents: z.array(z.object({
    content: z.string(),
    metadata: z.record(z.any())
  })),
  retrievedAt: z.string()
});

export type RAGResult = z.infer<typeof RAGResultSchema>;
