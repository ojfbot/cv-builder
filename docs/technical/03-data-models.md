# Data Models

All data models are defined using Zod for runtime validation and TypeScript type inference.

## Bio Model

Represents your professional background and experiences.

```typescript
interface Bio {
  personal: {
    name: string
    email: string
    phone?: string
    location?: string
    linkedin?: string
    github?: string
    website?: string
  }

  summary: string

  experiences: Experience[]

  education: Education[]

  skills: {
    category: string
    items: string[]
  }[]

  projects: Project[]

  certifications?: Certification[]

  publications?: Publication[]
}
```

## Job Listing Model

Represents a job you're applying for.

```typescript
interface JobListing {
  id: string
  title: string
  company: string
  location?: string
  salary?: {
    min?: number
    max?: number
    currency: string
  }
  postedDate?: string
  applicationDeadline?: string

  description: string
  requirements: string[]
  niceToHave?: string[]

  companyInfo?: {
    size?: string
    industry?: string
    culture?: string
    website?: string
  }

  applicationUrl?: string
  notes?: string
}
```

## Analysis Result Model

Output from job analysis agent.

```typescript
interface JobAnalysis {
  jobId: string
  analyzedAt: string

  keyRequirements: {
    skill: string
    importance: 'critical' | 'important' | 'nice-to-have'
    category: 'technical' | 'soft-skill' | 'experience' | 'education'
  }[]

  industryTerms: string[]

  matchScore?: number

  recommendations: string[]
}
```

## Resume Output Model

Generated resume in various formats.

```typescript
interface ResumeOutput {
  id: string
  jobId?: string
  generatedAt: string

  format: 'markdown' | 'html' | 'pdf' | 'json'
  content: string

  metadata: {
    version: number
    tailored: boolean
    sections: string[]
  }

  notes?: string
}
```

## Learning Path Model

Generated learning recommendations.

```typescript
interface LearningPath {
  jobId: string
  createdAt: string

  gaps: {
    skill: string
    currentLevel: 'none' | 'beginner' | 'intermediate'
    targetLevel: 'intermediate' | 'advanced' | 'expert'
    priority: 'high' | 'medium' | 'low'
  }[]

  resources: {
    skill: string
    type: 'documentation' | 'tutorial' | 'course' | 'book' | 'practice'
    title: string
    url?: string
    estimatedHours?: number
  }[]

  exercises: {
    skill: string
    description: string
    difficulty: 'easy' | 'medium' | 'hard'
    code?: string
  }[]
}
```

## Storage

Data is stored as JSON files in respective directories:

- `bio/bio.json` - Your main bio
- `jobs/{job-id}.json` - Individual job listings
- `output/{output-id}.json` - Generated outputs
- `output/{output-id}.{format}` - Rendered outputs (md, html, pdf)

All paths are configurable via environment variables.
