import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { agentManager } from '../services/agent-manager.js';
import { validateBody } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Request schemas
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional(),
});

const StreamChatRequestSchema = ChatRequestSchema;

/**
 * POST /api/chat
 * Process a chat message through the orchestrator agent
 */
router.post(
  '/',
  authenticate,
  validateBody(ChatRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, conversationHistory } = req.body;

      const orchestrator = agentManager.getOrchestrator();

      // Set conversation history if provided
      if (conversationHistory && conversationHistory.length > 0) {
        orchestrator.setConversationHistory(conversationHistory);
      }

      const response = await orchestrator.processRequest(message);

      res.json({
        success: true,
        data: {
          response,
          conversationHistory: orchestrator.getConversationHistory(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/chat/stream
 * Stream a chat message response through the orchestrator agent
 */
router.post(
  '/stream',
  authenticate,
  validateBody(StreamChatRequestSchema),
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const { message, conversationHistory } = req.body;

      const orchestrator = agentManager.getOrchestrator();

      // Set conversation history if provided
      if (conversationHistory && conversationHistory.length > 0) {
        orchestrator.setConversationHistory(conversationHistory);
      }

      // Set headers for SSE (Server-Sent Events)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream the response
      await orchestrator.processRequestStreaming(message, (chunk: string) => {
        // Send chunk as SSE event
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      });

      // Send completion event with final conversation history
      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          conversationHistory: orchestrator.getConversationHistory(),
        })}\n\n`
      );

      res.end();
    } catch (error) {
      // Send error as SSE event
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })}\n\n`
      );
      res.end();
    }
  }
);

export default router;
