import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { agentManager } from '../services/agent-manager.js';
import { validateBody } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { BioSchema, JobListingSchema } from '@cv-builder/agent-core';

const router = Router();

// Request schemas
const GenerateCoverLetterRequestSchema = z.object({
  bio: BioSchema,
  jobListing: JobListingSchema,
  tone: z.enum(['professional', 'enthusiastic', 'formal', 'casual']).optional(),
});

const PrepareInterviewRequestSchema = z.object({
  bio: BioSchema,
  jobListing: JobListingSchema,
  resume: z.string().optional(),
});

/**
 * POST /api/interview/cover-letter
 * Generate a cover letter for a job application
 */
router.post(
  '/cover-letter',
  authenticate,
  validateBody(GenerateCoverLetterRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bio, jobListing, tone } = req.body;

      const interviewCoach = agentManager.getInterviewCoach();

      const coverLetter = await interviewCoach.generateCoverLetter(
        bio,
        jobListing,
        tone
      );

      res.json({
        success: true,
        data: {
          coverLetter,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/interview/prepare
 * Prepare interview materials and guidance
 */
router.post(
  '/prepare',
  authenticate,
  validateBody(PrepareInterviewRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bio, jobListing } = req.body;

      const interviewCoach = agentManager.getInterviewCoach();

      // Combine interview preparation materials
      const questions = await interviewCoach.prepareInterviewQuestions(bio, jobListing);
      const talkingPoints = await interviewCoach.getTalkingPoints(bio, jobListing);
      const motivation = await interviewCoach.analyzeMotivation(bio, jobListing);

      const preparation = `# Interview Preparation\n\n## Likely Interview Questions\n\n${questions}\n\n## Talking Points\n\n${talkingPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}\n\n## Motivation Analysis\n\n${motivation}`;

      res.json({
        success: true,
        data: {
          preparation,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
