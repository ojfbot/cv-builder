import { z } from 'zod'

export const ResearchEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum([
    'company_intelligence',
    'industry_analysis',
    'role_research',
    'salary_data',
    'interview_prep',
    'market_trends',
    'best_practices',
    'other'
  ]),
  content: z.string(), // Markdown content
  tags: z.array(z.string()),
  source: z.string().optional(), // URL or reference
  createdAt: z.string(),
  updatedAt: z.string(),
  jobId: z.string().optional(), // Link to specific job if relevant
  metadata: z.record(z.any()).optional(), // Flexible metadata storage
})

export type ResearchEntry = z.infer<typeof ResearchEntrySchema>
