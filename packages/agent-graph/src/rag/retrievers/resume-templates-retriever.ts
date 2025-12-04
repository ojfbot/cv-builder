/**
 * Resume Templates Retriever
 *
 * Retrieves high-quality resume examples and best practices.
 *
 * CURRENT STATUS: Hardcoded seed data (prototype)
 *
 * TODO (Production): Replace hardcoded documents with dynamic content
 * - Load from markdown template library or database
 * - Add role-specific and industry-specific templates
 * - Implement template versioning and ATS compliance updates
 * - Consider user feedback loop to improve templates over time
 * - Add support for multiple resume formats (tech, creative, academic, etc.)
 */

import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "./base-retriever";
import { VectorStoreConfig } from "../vector-store";

export class ResumeTemplatesRetriever extends BaseRetriever {
  constructor(config: VectorStoreConfig) {
    super("ResumeTemplates", config);
  }

  protected async getSeedDocuments(): Promise<Document[]> {
    // Seed with resume best practices and examples
    return [
      new Document({
        pageContent: `Professional Resume Best Practices:
- Use clear, concise bullet points starting with action verbs (e.g., "Led", "Developed", "Implemented")
- Quantify achievements with metrics (e.g., "Improved performance by 40%", "Managed team of 5")
- Tailor content to the job description, emphasizing relevant experience
- Keep formatting clean and ATS-friendly (no tables, columns, or images)
- Use consistent tense: past tense for previous roles, present tense for current
- Include keywords from the job description naturally throughout
- Prioritize recent and relevant experience
- Limit to 1-2 pages for most positions`,
        metadata: {
          type: "best_practices",
          category: "general",
          source: "resume_guidelines",
        },
      }),

      new Document({
        pageContent: `Software Engineer Resume Achievement Examples:
- "Architected and implemented microservices platform serving 10M+ daily users, reducing latency by 45%"
- "Led migration from monolith to microservices, decreasing deployment time from 2 hours to 15 minutes"
- "Mentored 5 junior engineers, with 3 promoted to mid-level within 12 months"
- "Optimized database queries reducing page load time by 60% and infrastructure costs by $50K annually"
- "Designed and built CI/CD pipeline using GitHub Actions, increasing deployment frequency from weekly to daily"
- "Collaborated with product team to define technical requirements for feature serving 100K users"`,
        metadata: {
          type: "achievement_examples",
          category: "software_engineer",
          source: "resume_examples",
        },
      }),

      new Document({
        pageContent: `Technical Skills Section Formatting:
**Programming Languages:** JavaScript, TypeScript, Python, Go, Java
**Frameworks & Libraries:** React, Node.js, Express, Next.js, Django, FastAPI
**Databases:** PostgreSQL, MongoDB, Redis, MySQL
**Cloud & DevOps:** AWS (EC2, S3, Lambda), Docker, Kubernetes, GitHub Actions
**Tools:** Git, Jest, pytest, Webpack, Vite

Best practices:
- Group skills by category for easy scanning
- List most relevant/strongest skills first
- Include specific tools and versions if relevant to job
- Don't list outdated or beginner-level skills
- Match terminology used in job description`,
        metadata: {
          type: "formatting_guide",
          category: "technical_skills",
          source: "resume_guidelines",
        },
      }),

      new Document({
        pageContent: `Action Verbs for Resume Bullet Points:
**Leadership:** Led, Directed, Managed, Supervised, Mentored, Coordinated, Guided
**Development:** Developed, Engineered, Built, Implemented, Created, Designed, Architected
**Improvement:** Optimized, Enhanced, Improved, Streamlined, Refactored, Modernized
**Collaboration:** Collaborated, Partnered, Worked with, Coordinated with
**Problem-Solving:** Resolved, Debugged, Troubleshot, Diagnosed, Investigated
**Delivery:** Delivered, Shipped, Launched, Released, Deployed
**Analysis:** Analyzed, Evaluated, Assessed, Researched, Investigated
**Communication:** Presented, Documented, Communicated, Wrote, Published`,
        metadata: {
          type: "action_verbs",
          category: "writing_guide",
          source: "resume_guidelines",
        },
      }),

      new Document({
        pageContent: `Resume Summary Statement Examples for Software Engineers:
- "Senior Full-Stack Engineer with 8 years of experience building scalable web applications. Expert in React, Node.js, and cloud architecture. Track record of improving system performance and mentoring teams."
- "Backend Engineer specializing in microservices architecture and API design. 5 years experience with Python, Go, and Kubernetes. Passionate about developer productivity and clean code."
- "Frontend Developer with expertise in modern JavaScript frameworks and responsive design. 4 years building user-facing features for SaaS products serving 1M+ users."
Keep summary to 2-3 sentences, highlighting years of experience, key skills, and unique value.`,
        metadata: {
          type: "summary_examples",
          category: "professional_summary",
          source: "resume_examples",
        },
      }),

      new Document({
        pageContent: `ATS (Applicant Tracking System) Optimization:
- Use standard section headings: "Experience", "Education", "Skills"
- Avoid headers, footers, tables, columns, or text boxes
- Use standard fonts: Arial, Calibri, Helvetica, Times New Roman
- Save as .docx or .pdf (check job posting preference)
- Include keywords from job description verbatim when applicable
- Spell out acronyms on first use: "Application Programming Interface (API)"
- Use simple bullet points (•) not fancy symbols
- Avoid images, graphs, or charts
- Keep formatting simple and clean
- Use standard date formats: "Jan 2020 - Present" or "2020-01 - Present"`,
        metadata: {
          type: "ats_guide",
          category: "formatting",
          source: "resume_guidelines",
        },
      }),
    ];
  }
}
