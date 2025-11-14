# CV Builder API

Secure REST API for the CV Builder agent system.

## Overview

This package provides a production-ready Express API that:
- Runs all agent operations server-side
- Securely manages API keys via `env.json`
- Provides RESTful endpoints for all agent functionality
- Implements security best practices (rate limiting, validation, CORS)

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. Anthropic API key

### Setup

1. **Configure API key**:
   ```bash
   # From project root
   cp packages/agent-core/env.json.example packages/agent-core/env.json
   # Edit env.json and add your API key
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /api/health
```

### Chat
```
POST /api/chat
Body: { message: string, conversationHistory?: Array }

POST /api/chat/stream
Body: { message: string, conversationHistory?: Array }
Response: Server-Sent Events (SSE)
```

### Resume
```
POST /api/resume/generate
Body: { bio: Bio, jobListing?: JobListing, format?: 'markdown' | 'json' }

POST /api/resume/tailor
Body: { bio: Bio, jobListing: JobListing, existingResume?: string }
```

### Job Analysis
```
POST /api/job/analyze
Body: { jobListing: JobListing, bio?: Bio }

POST /api/job/skills-gap
Body: { bio: Bio, jobListing: JobListing }
```

### Interview Preparation
```
POST /api/interview/cover-letter
Body: { bio: Bio, jobListing: JobListing, tone?: string }

POST /api/interview/prepare
Body: { bio: Bio, jobListing: JobListing, resume?: string }
```

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet.js**: Security headers
- **CORS**: Configurable origin restrictions
- **Input Validation**: Zod schema validation
- **Error Handling**: Centralized error handling

## Configuration

### Environment Variables

```env
PORT=3001                          # API server port
CORS_ORIGIN=http://localhost:3000  # Allowed CORS origin
NODE_ENV=development              # Environment
```

### API Key Configuration

API keys are loaded from `packages/agent-core/env.json`:
```json
{
  "apiKey": "sk-ant-api03-...",
  "modelName": "claude-sonnet-4-20250514"
}
```

## Development

```bash
# Start with hot reload
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

## Production Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Configure environment**:
   - Set `NODE_ENV=production`
   - Configure `CORS_ORIGIN` for your domain
   - Ensure `env.json` is secure and not in version control

## Architecture

```
src/
├── server.ts              # Express app setup
├── services/
│   └── agent-manager.ts   # Singleton managing all agents
├── routes/
│   ├── chat.ts           # Chat endpoints
│   ├── resume.ts         # Resume generation
│   ├── job.ts            # Job analysis
│   ├── interview.ts      # Interview prep
│   └── health.ts         # Health check
└── middleware/
    ├── auth.ts           # Authentication (TODO)
    ├── validation.ts     # Request validation
    └── error-handler.ts  # Error handling
```

## Adding New Endpoints

1. Create route file in `src/routes/`
2. Implement validation schemas
3. Add route to `src/server.ts`
4. Update API client in `packages/browser-app/src/api/client.ts`

## Troubleshooting

### "Failed to initialize AgentManager"
- Check `packages/agent-core/env.json` exists
- Ensure API key is valid
- Verify file permissions

### CORS Errors
- Check `CORS_ORIGIN` environment variable
- Ensure browser app URL matches allowed origin

### Rate Limiting
- Adjust limits in `src/server.ts`
- Consider implementing per-user limits with authentication

## Future Enhancements

- [ ] JWT authentication
- [ ] User-specific rate limiting
- [ ] Request logging
- [ ] Metrics and monitoring
- [ ] WebSocket support
- [ ] Database integration
