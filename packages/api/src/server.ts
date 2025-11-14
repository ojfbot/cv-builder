import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { agentManager } from './services/agent-manager.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

// Import routes
import healthRouter from './routes/health.js';
import chatRouter from './routes/chat.js';
import resumeRouter from './routes/resume.js';
import jobRouter from './routes/job.js';
import interviewRouter from './routes/interview.js';

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

// Initialize agent manager on startup
try {
  console.log('Initializing AgentManager...');
  agentManager.initialize();
  console.log('AgentManager initialized successfully');
} catch (error) {
  console.error('Failed to initialize AgentManager:', error);
  console.error('Server will start but agent endpoints will not work.');
  console.error('Please check your env.json configuration in packages/agent-core/');
}

// Routes
app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/resume', resumeRouter);
app.use('/api/job', jobRouter);
app.use('/api/interview', interviewRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`CV Builder API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
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
