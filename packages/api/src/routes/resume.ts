import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { agentManager } from '../services/agent-manager.js';
import { validateBody } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { BioSchema, JobListingSchema } from '@cv-builder/agent-core';

const router = Router();

// Request schemas
const GenerateResumeRequestSchema = z.object({
  bio: BioSchema,
  jobListing: JobListingSchema.optional(),
  format: z.enum(['markdown', 'json']).optional().default('markdown'),
});

const TailorResumeRequestSchema = z.object({
  bio: BioSchema,
  jobListing: JobListingSchema,
  existingResume: z.string().optional(),
});

/**
 * POST /api/resume/generate
 * Generate a new resume
 */
router.post(
  '/generate',
  authenticate,
  validateBody(GenerateResumeRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bio, format } = req.body;

      const resumeGenerator = agentManager.getResumeGenerator();

      const resume = await resumeGenerator.generateResume(bio, { format: format as 'markdown' | 'json' });

      res.json({
        success: true,
        data: {
          resume,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/resume/tailor
 * Tailor an existing resume to a specific job
 */
router.post(
  '/tailor',
  authenticate,
  validateBody(TailorResumeRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bio, jobListing, existingResume } = req.body;

      const tailoring = agentManager.getTailoring();

      const tailoredResume = await tailoring.tailorResume(
        bio,
        jobListing,
        existingResume
      );

      res.json({
        success: true,
        data: {
          resume: tailoredResume,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
