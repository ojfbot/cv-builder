# Browser Integration Guide

This document explains how the agent system is integrated into the React web application.

## Overview

The CV Builder agent system now works in both environments:
- **CLI** (`npm run cli`) - Uses Node.js file system for data storage
- **Browser** (`npm run dev`) - Uses browser localStorage for data storage

## Architecture

### Browser-Specific Components

1. **BrowserOrchestrator** (`src/browser/services/browser-orchestrator.ts`)
   - Browser-compatible version of OrchestratorAgent
   - Uses BrowserStorage instead of FileStorage
   - All the same agent coordination capabilities

2. **BrowserStorage** (`src/browser/utils/browser-storage.ts`)
   - localStorage-based storage adapter
   - API compatible with FileStorage
   - Stores data as JSON in localStorage with prefixes

3. **AgentContext** (`src/browser/contexts/AgentContext.tsx`)
   - React context for agent state management
   - Handles API key configuration
   - Provides orchestrator instance to components

4. **Agent Service** (`src/browser/services/agent-service.ts`)
   - Singleton service for agent initialization
   - Manages BrowserOrchestrator instance lifecycle

### UI Components

1. **InteractiveChat** (`src/browser/components/InteractiveChat.tsx`)
   - Chat interface connected to BrowserOrchestrator
   - Real-time streaming responses
   - Error handling and loading states

2. **ApiKeySettings** (`src/browser/components/ApiKeySettings.tsx`)
   - Modal for API key configuration
   - Stores key in localStorage
   - Shows connection status

3. **App** (`src/browser/App.tsx`)
   - Wraps application with AgentProvider
   - Adds settings button to header
   - Manages modal state

## Data Storage

### Browser Storage Structure

All data is stored in localStorage with prefixed keys:

```
cv-builder:bio:bio.json          → User's bio data
cv-builder:jobs:job-id-1.json    → Job listing 1
cv-builder:jobs:job-id-2.json    → Job listing 2
cv-builder:output:resume-123.json → Generated resume
cv-builder:output:resume-123.md   → Resume content
anthropic_api_key                 → API key (for persistence)
```

### Adding Data via UI

Since the browser doesn't have file system access, users should:

1. **Add Bio Data**:
   - Go to the Bio tab in the dashboard
   - Use the form/editor to create their bio
   - Data is saved to `cv-builder:bio:bio.json`

2. **Add Job Listings**:
   - Go to the Jobs tab
   - Add job listings through the UI
   - Each job saved as `cv-builder:jobs:{job-id}.json`

3. **View Outputs**:
   - Generated resumes, analyses, etc. appear in the Outputs tab
   - Stored in `cv-builder:output:*`

## Using the Agent System in Browser

### 1. Configure API Key

Users must configure their Anthropic API key:

```typescript
// Click the Settings icon in the header
// Enter API key in the modal
// Key is stored in localStorage and used for all requests
```

**Security Note**:
- The API key is exposed in the browser (uses `dangerouslyAllowBrowser: true`)
- This is acceptable for development/demo but **NOT for production**
- For production:
  - Use a backend server to proxy requests
  - Keep API keys server-side only
  - Implement proper authentication

### 2. Using the Chat Interface

The InteractiveChat component connects to the BrowserOrchestrator:

```typescript
// User types a message
"Generate my resume"

// Component calls:
await orchestrator.processRequestStreaming(
  userMessage,
  (chunk) => {
    // Display chunk in real-time
    setStreamingContent(prev => prev + chunk)
  }
)
```

### 3. Direct Agent Access

Components can access agents directly:

```typescript
import { useAgent } from '../contexts/AgentContext'

function MyComponent() {
  const { orchestrator } = useAgent()

  const handleGenerateResume = async () => {
    const bio = await orchestrator.loadBio()
    const resumeGen = orchestrator.getResumeGenerator()
    const resume = await resumeGen.generateResume(bio, {
      format: 'markdown'
    })
    // ... save to output storage
  }
}
```

## Environment Variables

For development, you can set the API key via environment variable:

```bash
# .env
VITE_ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
```

The `VITE_` prefix makes it available to Vite/browser code.

**Warning**: This embeds the key in the built JavaScript bundle!

## Development Workflow

### Running the App

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Adding New Features

1. **Add UI Components** in `src/browser/components/`
2. **Use the AgentContext** to access orchestrator
3. **Call agent methods** as needed
4. **Save outputs** to BrowserStorage

Example:

```typescript
import { useAgent } from '../contexts/AgentContext'

function JobAnalysisPanel() {
  const { orchestrator } = useAgent()
  const [analysis, setAnalysis] = useState(null)

  const analyzeJob = async (jobId: string) => {
    const bio = await orchestrator.loadBio()
    const job = await orchestrator.loadJob(jobId)

    const analyzer = orchestrator.getJobAnalysis()
    const result = await analyzer.analyzeJobWithBio(job, bio)

    setAnalysis(result)

    // Save to storage
    await orchestrator.getOutputStorage().write(
      `analysis-${jobId}.json`,
      result
    )
  }

  return (/* UI */)
}
```

## Differences from CLI

| Feature | CLI | Browser |
|---------|-----|---------|
| Storage | File system (`bio/`, `jobs/`, `output/`) | localStorage (prefixed keys) |
| Orchestrator | `OrchestratorAgent` | `BrowserOrchestrator` |
| Config | `.env` file | `VITE_ANTHROPIC_API_KEY` + UI settings |
| Data Input | JSON files | UI forms/editors |
| API Key | Server-side only | Exposed in browser (use backend in production) |

## Production Considerations

### Security

**Current Setup (Development Only)**:
- API key stored in browser localStorage
- API key visible in network requests
- No authentication/authorization

**Production Recommendations**:
1. Create a backend API server
2. Move all agent logic to the server
3. Keep API keys server-side
4. Implement user authentication
5. Use session tokens for client requests
6. Add rate limiting
7. Validate all inputs server-side

Example production architecture:

```
React App (Browser)
    ↓ (HTTP/HTTPS)
Backend API Server
    ↓ (with API key)
Anthropic Claude API
```

### Data Persistence

Current: localStorage (limited, browser-specific)

Production options:
- PostgreSQL/MySQL for structured data
- MongoDB for document storage
- S3/Cloud Storage for generated files
- Redis for caching

### Scalability

For multiple users:
- Add user accounts and authentication
- Isolate user data in database
- Implement proper access controls
- Add job queuing for long-running tasks
- Consider serverless functions for agents

## Troubleshooting

### "Agent service not initialized"
- Click Settings icon and configure API key
- Check localStorage for `anthropic_api_key`

### "Bio not found"
- Add bio data in the Bio tab
- Check localStorage for `cv-builder:bio:bio.json`

### Build errors with Node.js modules
- Make sure you're using `BrowserOrchestrator`, not `OrchestratorAgent`
- Browser code cannot import `fs`, `path`, or other Node.js modules
- Use the browser-specific versions in `src/browser/`

### API errors
- Verify API key is correct
- Check browser console for detailed errors
- Ensure you have API credits in Anthropic console

## Testing

### Manual Testing

1. Start the dev server: `npm run dev`
2. Click Settings and add API key
3. Try chat commands:
   - "Generate my resume" (will fail if no bio)
   - "List available jobs"
   - "Help me get started"

### Automated Testing (Future)

Add tests for:
- BrowserStorage CRUD operations
- BrowserOrchestrator initialization
- AgentContext state management
- Component integration with agents

## Summary

The browser integration provides:
- ✅ Full agent system in the browser
- ✅ Real-time streaming responses
- ✅ localStorage-based data persistence
- ✅ API key management UI
- ✅ Same agent capabilities as CLI
- ⚠️ Development-only security model
- 📝 Requires backend for production use

For more details:
- [AGENTS_GUIDE.md](./AGENTS_GUIDE.md) - Complete agent system guide
- [QUICK_START.md](./QUICK_START.md) - Getting started
- [CLAUDE.md](../CLAUDE.md) - Project overview
