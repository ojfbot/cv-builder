/**
 * V2 API Routes - LangGraph-powered endpoints
 *
 * All v2 routes use agent-graph instead of agent-core
 */

import { Router } from 'express';
import chatRouter from './chat';
import threadsRouter from './threads';

const v2Router = Router();

// Mount v2 routes
v2Router.use('/', chatRouter);
v2Router.use('/', threadsRouter);

export default v2Router;
