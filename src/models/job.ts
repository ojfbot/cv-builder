import { z } from 'zod'

export const SalaryRangeSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  currency: z.string().default('USD'),
})

export const CompanyInfoSchema = z.object({
  size: z.string().optional(),
  industry: z.string().optional(),
  culture: z.string().optional(),
  website: z.string().url().optional(),
})

export const JobListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  salary: SalaryRangeSchema.optional(),
  postedDate: z.string().optional(),
  applicationDeadline: z.string().optional(),
  description: z.string(),
  requirements: z.array(z.string()),
  niceToHave: z.array(z.string()).default([]),
  companyInfo: CompanyInfoSchema.optional(),
  applicationUrl: z.string().url().optional(),
  notes: z.string().optional(),
})

export const RequirementSchema = z.object({
  skill: z.string(),
  importance: z.enum(['critical', 'important', 'nice-to-have']),
  category: z.enum(['technical', 'soft-skill', 'experience', 'education']),
})

export const JobAnalysisSchema = z.object({
  jobId: z.string(),
  analyzedAt: z.string(),
  keyRequirements: z.array(RequirementSchema),
  industryTerms: z.array(z.string()),
  matchScore: z.number().min(0).max(100).optional(),
  recommendations: z.array(z.string()),
})

export type SalaryRange = z.infer<typeof SalaryRangeSchema>
export type CompanyInfo = z.infer<typeof CompanyInfoSchema>
export type JobListing = z.infer<typeof JobListingSchema>
export type Requirement = z.infer<typeof RequirementSchema>
export type JobAnalysis = z.infer<typeof JobAnalysisSchema>
