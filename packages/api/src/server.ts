import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { agentManager } from './services/agent-manager.js';
import { graphManager } from './services/graph-manager.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

// Import routes
import healthRouter from './routes/health.js';
import chatRouter from './routes/chat.js';
import resumeRouter from './routes/resume.js';
import jobRouter from './routes/job.js';
import interviewRouter from './routes/interview.js';
import bioFilesRouter from './routes/bio-files.js';
import v2Router from './routes/v2/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Feature flag for v2 API (LangGraph)
const ENABLE_V2_API = process.env.ENABLE_V2_API === 'true';

// Initialize agent manager on startup (v1 API - agent-core)
try {
  console.log('Initializing AgentManager (v1)...');
  agentManager.initialize();
  console.log('AgentManager (v1) initialized successfully');
} catch (error) {
  console.error('Failed to initialize AgentManager:', error);
  console.error('Server will start but v1 agent endpoints will not work.');
  console.error('Please check your env.json configuration in packages/agent-core/');
}

// Initialize graph manager on startup (v2 API - LangGraph)
if (ENABLE_V2_API) {
  try {
    console.log('Initializing GraphManager (v2 - LangGraph)...');
    graphManager.initialize();
    console.log('GraphManager (v2) initialized successfully');
  } catch (error) {
    console.error('Failed to initialize GraphManager:', error);
    console.error('Server will start but v2 endpoints will not work.');
    console.error('Set ENABLE_V2_API=false to disable v2 routes.');
  }
}

// Routes (v1 - agent-core)
app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/job', jobRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/bios', bioFilesRouter);

// V2 Routes (LangGraph) - feature flagged
if (ENABLE_V2_API) {
  app.use('/api/v2', v2Router);
  console.log('V2 API routes (LangGraph) mounted at /api/v2');
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`CV Builder API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log(`V1 API (agent-core): /api/*`);
  if (ENABLE_V2_API) {
    console.log(`V2 API (LangGraph): /api/v2/* ✅`);
  } else {
    console.log(`V2 API (LangGraph): Disabled (set ENABLE_V2_API=true to enable)`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
