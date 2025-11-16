import { z } from 'zod'

export const PersonalInfoSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().url().optional(),
  github: z.string().url().optional(),
  website: z.string().url().optional(),
})

export const ExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  description: z.string(),
  achievements: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
})

export const EducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  location: z.string().optional(),
  graduationDate: z.string().optional(),
  gpa: z.string().optional(),
  honors: z.array(z.string()).default([]),
})

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string().url().optional(),
  technologies: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
})

export const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  date: z.string(),
  expirationDate: z.string().optional(),
  credentialId: z.string().optional(),
  url: z.string().url().optional(),
})

export const PublicationSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  venue: z.string(),
  date: z.string(),
  url: z.string().url().optional(),
  doi: z.string().optional(),
})

export const SkillCategorySchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
})

export const BioSchema = z.object({
  personal: PersonalInfoSchema,
  summary: z.string(),
  experiences: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  skills: z.array(SkillCategorySchema),
  projects: z.array(ProjectSchema),
  certifications: z.array(CertificationSchema).optional(),
  publications: z.array(PublicationSchema).optional(),
})

export type PersonalInfo = z.infer<typeof PersonalInfoSchema>
export type Experience = z.infer<typeof ExperienceSchema>
export type Education = z.infer<typeof EducationSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Certification = z.infer<typeof CertificationSchema>
export type Publication = z.infer<typeof PublicationSchema>
export type SkillCategory = z.infer<typeof SkillCategorySchema>
export type Bio = z.infer<typeof BioSchema>

// File management schemas
export const ParsedResumeContentSchema = z.object({
  text: z.string(),
  wordCount: z.number(),
  pageCount: z.number().optional(),
  extractedAt: z.string(), // ISO date string
})

export const BioFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  originalName: z.string(),
  type: z.string(), // MIME type
  extension: z.string(),
  size: z.number(), // bytes
  sizeFormatted: z.string(), // human-readable (e.g., "245 KB")
  path: z.string(),
  modified: z.date(),
  created: z.date(),
  metadata: z.record(z.any()).optional(),
  parsedContent: ParsedResumeContentSchema.optional(), // Extracted resume text
})

export const FileUploadRequestSchema = z.object({
  overwrite: z.boolean().optional().default(false),
})

export const FileListQuerySchema = z.object({
  type: z.string().optional(), // filter by MIME type or extension
  sortBy: z.enum(['name', 'date', 'size']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
})

export type ParsedResumeContent = z.infer<typeof ParsedResumeContentSchema>
export type BioFile = z.infer<typeof BioFileSchema>
export type FileUploadRequest = z.infer<typeof FileUploadRequestSchema>
export type FileListQuery = z.infer<typeof FileListQuerySchema>
