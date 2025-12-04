/**
 * V2 Thread Routes - Thread management for LangGraph
 *
 * Endpoints:
 * - POST /api/v2/threads - Create new thread
 * - GET /api/v2/threads/:id - Get thread by ID
 * - GET /api/v2/threads/user/:userId - List user's threads
 * - PATCH /api/v2/threads/:id - Update thread
 * - DELETE /api/v2/threads/:id - Delete thread
 * - GET /api/v2/threads/:id/state - Get thread state
 * - PATCH /api/v2/threads/:id/state - Update thread state
 */

import { Router, Request, Response } from 'express';
import { graphManager } from '../../services/graph-manager';

const router = Router();

/**
 * POST /api/v2/threads
 * Create a new thread
 */
router.post('/threads', async (req: Request, res: Response) => {
  try {
    const { userId, metadata } = req.body;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const thread = await graphManager.createThread(userId, metadata);

    res.json({
      success: true,
      data: thread,
    });
  } catch (error) {
    console.error('Thread creation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * GET /api/v2/threads/:id
 * Get thread by ID
 */
router.get('/threads/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const thread = await graphManager.getThread(id);

    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Thread not found',
      });
    }

    res.json({
      success: true,
      data: thread,
    });
  } catch (error) {
    console.error('Thread retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * GET /api/v2/threads/user/:userId
 * List all threads for a user
 */
router.get('/threads/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const threads = await graphManager.listThreads(userId);

    res.json({
      success: true,
      data: threads,
      count: threads.length,
    });
  } catch (error) {
    console.error('Thread list error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * PATCH /api/v2/threads/:id
 * Update thread metadata
 */
router.patch('/threads/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, metadata } = req.body;

    await graphManager.updateThread(id, { title, metadata });

    // Get updated thread
    const thread = await graphManager.getThread(id);

    res.json({
      success: true,
      data: thread,
    });
  } catch (error) {
    console.error('Thread update error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * DELETE /api/v2/threads/:id
 * Delete a thread
 */
router.delete('/threads/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await graphManager.deleteThread(id);

    res.json({
      success: true,
      message: 'Thread deleted successfully',
    });
  } catch (error) {
    console.error('Thread deletion error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * GET /api/v2/threads/:id/state
 * Get current state for a thread
 */
router.get('/threads/:id/state', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const state = await graphManager.getState(id);

    if (!state) {
      return res.status(404).json({
        success: false,
        error: 'Thread state not found',
      });
    }

    res.json({
      success: true,
      data: {
        threadId: state.threadId,
        userId: state.userId,
        currentAgent: state.currentAgent,
        nextAction: state.nextAction,
        messageCount: state.messages.length,
        outputCount: state.outputs.length,
        hasBio: !!state.bio,
        hasJob: !!state.currentJob,
        hasJobAnalysis: !!state.jobAnalysis,
        hasLearningPath: !!state.learningPath,
        metadata: state.metadata,
      },
    });
  } catch (error) {
    console.error('State retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * PATCH /api/v2/threads/:id/state
 * Update state for a thread (e.g., load bio, job)
 */
router.patch('/threads/:id/state', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stateUpdates = req.body;

    await graphManager.updateState(id, stateUpdates);

    // Get updated state
    const state = await graphManager.getState(id);

    res.json({
      success: true,
      data: state
        ? {
            threadId: state.threadId,
            currentAgent: state.currentAgent,
            nextAction: state.nextAction,
            messageCount: state.messages.length,
            outputCount: state.outputs.length,
          }
        : null,
    });
  } catch (error) {
    console.error('State update error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * GET /api/v2/threads/stats
 * Get thread statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await graphManager.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Stats retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

export default router;
