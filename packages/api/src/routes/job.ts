import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { agentManager } from '../services/agent-manager.js';
import { validateBody } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { BioSchema, JobListingSchema } from '@cv-builder/agent-core';

const router = Router();

// Request schemas
const AnalyzeJobRequestSchema = z.object({
  jobListing: JobListingSchema,
  bio: BioSchema.optional(),
});

const SkillsGapRequestSchema = z.object({
  bio: BioSchema,
  jobListing: JobListingSchema,
});

/**
 * POST /api/job/analyze
 * Analyze a job listing and calculate match score
 */
router.post(
  '/analyze',
  authenticate,
  validateBody(AnalyzeJobRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobListing, bio } = req.body;

      const jobAnalysis = agentManager.getJobAnalysis();

      const analysis = bio
        ? await jobAnalysis.analyzeJobWithBio(jobListing, bio)
        : await jobAnalysis.analyzeJob(jobListing);

      res.json({
        success: true,
        data: {
          analysis,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/job/skills-gap
 * Analyze skills gap and generate learning path
 */
router.post(
  '/skills-gap',
  authenticate,
  validateBody(SkillsGapRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bio, jobListing } = req.body;

      const skillsGap = agentManager.getSkillsGap();
      const jobAnalysis = agentManager.getJobAnalysis();

      const analysis = await jobAnalysis.analyzeJob(jobListing);
      const learningPath = await skillsGap.analyzeSkillsGap(bio, jobListing, analysis);

      res.json({
        success: true,
        data: {
          learningPath,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
