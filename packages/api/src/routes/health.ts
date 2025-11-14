import { Router, Request, Response } from 'express';
import { agentManager } from '../services/agent-manager.js';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', (_req: Request, res: Response) => {
  const isAgentManagerInitialized = agentManager.isInitialized();

  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        agentManager: isAgentManagerInitialized ? 'initialized' : 'not initialized',
      },
    },
  });
});

export default router;
