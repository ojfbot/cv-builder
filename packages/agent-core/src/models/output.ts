import { z } from 'zod'

export const ResumeOutputSchema = z.object({
  id: z.string(),
  jobId: z.string().optional(),
  generatedAt: z.string(),
  format: z.enum(['markdown', 'html', 'pdf', 'json']),
  content: z.string(),
  metadata: z.object({
    version: z.number(),
    tailored: z.boolean(),
    sections: z.array(z.string()),
  }),
  notes: z.string().optional(),
})

export const SkillGapSchema = z.object({
  skill: z.string(),
  currentLevel: z.enum(['none', 'beginner', 'intermediate']),
  targetLevel: z.enum(['intermediate', 'advanced', 'expert']),
  priority: z.enum(['high', 'medium', 'low']),
})

export const LearningResourceSchema = z.object({
  skill: z.string(),
  type: z.enum(['documentation', 'tutorial', 'course', 'book', 'practice']),
  title: z.string(),
  url: z.string().url().optional(),
  estimatedHours: z.number().optional(),
})

export const ExerciseSchema = z.object({
  skill: z.string(),
  description: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  code: z.string().optional(),
})

export const LearningPathSchema = z.object({
  jobId: z.string(),
  createdAt: z.string(),
  gaps: z.array(SkillGapSchema),
  resources: z.array(LearningResourceSchema),
  exercises: z.array(ExerciseSchema),
})

export const CoverLetterSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  generatedAt: z.string(),
  content: z.string(),
  talkingPoints: z.array(z.string()),
  motivation: z.string(),
})

export type ResumeOutput = z.infer<typeof ResumeOutputSchema>
export type SkillGap = z.infer<typeof SkillGapSchema>
export type LearningResource = z.infer<typeof LearningResourceSchema>
export type Exercise = z.infer<typeof ExerciseSchema>
export type LearningPath = z.infer<typeof LearningPathSchema>
export type CoverLetter = z.infer<typeof CoverLetterSchema>
