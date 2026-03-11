import { Router, Request, Response, NextFunction } from 'express';
import { agentManager } from '../services/agent-manager.js';
import { mapJobToBead } from '../beads/index.js';
import { type CVJobBeadStatus } from '../beads/types.js';

const router: Router = Router();

/**
 * GET /api/beads
 *
 * Returns all saved job listings mapped to the FrameBeadLike shape (ADR-0016).
 * Enables ShellAgent's Mayor/Deacon aggregation layer to query Resume Builder
 * work items without knowledge of the internal JobListing schema.
 *
 * Query params:
 *   status  — filter by bead status: "active" | "complete" | "archived"
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orchestrator = agentManager.getOrchestrator();

    // Load all job ids then fetch each listing
    const jobIds = await orchestrator.listJobs();
    const jobs = await Promise.all(jobIds.map((id: string) => orchestrator.loadJob(id)));

    // Map to FrameBeadLike shape
    let beads = jobs.map(mapJobToBead);

    // Optional status filter
    const statusParam = req.query.status as string | undefined;
    if (statusParam) {
      const validStatuses: CVJobBeadStatus[] = ['active', 'complete', 'archived'];
      if (!validStatuses.includes(statusParam as CVJobBeadStatus)) {
        res.status(400).json({
          success: false,
          error: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }
      beads = beads.filter((b: ReturnType<typeof mapJobToBead>) => b.status === statusParam);
    }

    res.json({
      beads,
      count: beads.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
