/**
 * V2 Chat Routes - LangGraph-powered chat endpoints
 *
 * New endpoints using agent-graph instead of agent-core:
 * - POST /api/v2/chat - Non-streaming chat
 * - POST /api/v2/chat/stream - Server-sent events streaming
 */

import { Router, Request, Response } from 'express';
import { graphManager } from '../../services/graph-manager';

// Type augmentation for compression middleware
declare module 'express-serve-static-core' {
  interface Response {
    flush?: () => void;
  }
}

const router = Router();

// Simple logger for API routes
const logger = {
  error: (message: string, error: unknown) => {
    console.error(`[V2/Chat] ${message}`, error);
  },
  info: (message: string, data?: unknown) => {
    console.log(`[V2/Chat] ${message}`, data || '');
  }
};

/**
 * POST /api/v2/chat
 * Non-streaming chat endpoint
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, threadId, stateUpdates } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string',
      });
    }

    if (!threadId || typeof threadId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Thread ID is required',
      });
    }

    // Invoke graph
    const result = await graphManager.invoke(threadId, message, stateUpdates);

    // Extract last AI message
    const lastMessage = result.messages[result.messages.length - 1];
    const messageContent =
      typeof lastMessage?.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage?.content);

    res.json({
      success: true,
      data: {
        message: messageContent,
        threadId: result.threadId,
        currentAgent: result.currentAgent,
        nextAction: result.nextAction,
        outputs: result.outputs,
        jobAnalysis: result.jobAnalysis,
        learningPath: result.learningPath,
        messageCount: result.messages.length,
      },
    });
  } catch (error) {
    logger.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

/**
 * POST /api/v2/chat/stream
 * Server-sent events streaming endpoint
 */
router.post('/chat/stream', async (req: Request, res: Response) => {
  try {
    const { message, threadId, stateUpdates } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string',
      });
    }

    if (!threadId || typeof threadId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Thread ID is required',
      });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connected event
    res.write('event: connected\n');
    res.write('data: {"status":"connected"}\n\n');

    try {
      // Stream graph execution
      for await (const state of graphManager.stream(
        threadId,
        message,
        stateUpdates
      )) {
        // Send state update
        res.write('event: state\n');
        res.write(
          `data: ${JSON.stringify({
            currentAgent: state.currentAgent,
            nextAction: state.nextAction,
            messageCount: state.messages.length,
            outputCount: state.outputs.length,
          })}\n\n`
        );

        // Send message updates if there are new messages
        if (state.messages && state.messages.length > 0) {
          const lastMessage = state.messages[state.messages.length - 1];
          if (lastMessage.content) {
            const content =
              typeof lastMessage.content === 'string'
                ? lastMessage.content
                : JSON.stringify(lastMessage.content);

            res.write('event: message\n');
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }

        // Flush the response to send data immediately
        // Available when using compression middleware
        res.flush?.();
      }

      // Send completion event
      res.write('event: done\n');
      res.write('data: {"status":"completed"}\n\n');
      res.end();
    } catch (streamError) {
      logger.error('Stream error:', streamError);
      res.write('event: error\n');
      res.write(
        `data: ${JSON.stringify({
          error:
            streamError instanceof Error
              ? streamError.message
              : 'Stream error',
        })}\n\n`
      );
      res.end();
    }
  } catch (error) {
    logger.error('Chat stream setup error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
});

export default router;
