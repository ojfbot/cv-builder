/**
 * V2 API Routes - LangGraph-powered endpoints
 *
 * All v2 routes use agent-graph instead of agent-core.
 * Rate limiting is applied per-route based on resource intensity.
 */

import { Router } from 'express';
import { getRateLimiter } from '../../middleware/rate-limit';
import chatRouter from './chat';
import threadsRouter from './threads';

const v2Router = Router();

// Apply rate limiting to V2 routes
// Chat endpoints are more resource-intensive (LangGraph execution)
v2Router.use('/chat', getRateLimiter('v2-chat'));

// Thread management has moderate limits
v2Router.use('/threads', getRateLimiter('v2-thread'));

// Mount v2 routes
v2Router.use('/', chatRouter);
v2Router.use('/', threadsRouter);

export default v2Router;
