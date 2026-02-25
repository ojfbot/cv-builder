import { Router } from 'express';

const router = Router();

/**
 * GET /api/tools
 *
 * Returns the capability manifest for cv-builder-api.
 * Used by frame-agent to discover available domain tools.
 *
 * Routes marked deprecated: true are being migrated to frame-agent.
 * frame-agent will call cv-builder domain tools via this manifest pattern.
 */
router.get('/', (_req, res) => {
  res.json({
    service: 'cv-builder',
    version: '1.0.0',
    description: 'AI-powered resume and career development tools',
    tools: [
      {
        name: 'generate_resume',
        endpoint: 'POST /api/resume/generate',
        description: 'Generate a formatted resume from bio data',
        input: { bio: 'Bio object', format: 'pdf | markdown | json' },
        deprecated: false,
      },
      {
        name: 'tailor_resume',
        endpoint: 'POST /api/resume/tailor',
        description: 'Customize a resume for a specific job description',
        input: { bio: 'Bio object', jobListing: 'JobListing object', existingResume: 'string (optional)' },
        deprecated: false,
      },
      {
        name: 'analyze_job',
        endpoint: 'POST /api/job/analyze',
        description: 'Analyze a job listing and calculate match score against a bio',
        input: { jobListing: 'JobListing object', bio: 'Bio object (optional)' },
        deprecated: false,
      },
      {
        name: 'skills_gap',
        endpoint: 'POST /api/job/skills-gap',
        description: 'Identify skills gaps and create a learning path for a target role',
        input: { bio: 'Bio object', jobListing: 'JobListing object' },
        deprecated: false,
      },
      {
        name: 'cover_letter',
        endpoint: 'POST /api/interview/cover-letter',
        description: 'Generate a tailored cover letter for a job application',
        input: { bio: 'Bio object', jobListing: 'JobListing object', tone: 'professional | casual (optional)' },
        deprecated: false,
      },
      {
        name: 'interview_prep',
        endpoint: 'POST /api/interview/prepare',
        description: 'Generate interview questions, talking points, and motivation analysis',
        input: { bio: 'Bio object', jobListing: 'JobListing object', resume: 'string (optional)' },
        deprecated: false,
      },
      {
        name: 'chat',
        endpoint: 'POST /api/chat',
        description: 'Direct orchestrator chat (natural language)',
        deprecated: true,
        replacedBy: 'POST /frame-api/api/chat with context.activeAppType=cv-builder — handled by frame-agent MetaOrchestratorAgent → CvBuilderDomainAgent',
      },
    ],
    dataEndpoints: {
      bios: 'GET/POST /api/bios',
      jobs: 'GET/POST /api/job',
      resumes: 'GET /api/resume',
    },
  });
});

export default router;
