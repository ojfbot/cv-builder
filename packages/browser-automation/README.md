# Browser Automation Service

Playwright-based browser automation service for UI testing and screenshot capture. Enables AI dev tools (like Claude Code) to interact with the CV Builder application programmatically.

## Features

- **Browser Automation**: Navigate, interact, and test UI components
- **Screenshot Capture**: Full-page and element-specific screenshots
- **Docker Integration**: Runs alongside development services
- **REST API**: Simple HTTP endpoints for automation commands
- **AI Tool Ready**: Designed for Claude Code integration

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start all services (browser-app + browser-automation)
docker-compose up browser-app browser-automation

# Or start in background
docker-compose up -d browser-app browser-automation

# View logs
docker-compose logs -f browser-automation
```

### Local Development

```bash
# Navigate to package
cd packages/browser-automation

# Install dependencies
npm install

# Start in development mode
npm run dev

# Build for production
npm run build
npm start
```

## API Endpoints

### Health Check

```bash
GET http://localhost:3002/health
```

**Response:**
```json
{
  "status": "ready",
  "service": "browser-automation",
  "version": "0.1.0",
  "environment": "development",
  "config": {
    "browserAppUrl": "http://browser-app:3000",
    "headless": true,
    "port": 3002
  }
}
```

### Service Info

```bash
GET http://localhost:3002/
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3002` |
| `NODE_ENV` | Environment mode | `development` |
| `BROWSER_APP_URL` | Target application URL | `http://browser-app:3000` |
| `HEADLESS` | Run browser in headless mode | `true` |

## Directory Structure

```
packages/browser-automation/
├── src/
│   ├── server.ts           # Express API server
│   ├── automation/         # (Phase 2)
│   │   ├── browser.ts      # Browser instance manager
│   │   ├── actions.ts      # UI interaction methods
│   │   └── screenshots.ts  # Screenshot utilities
│   ├── routes/             # (Phase 2-3)
│   │   ├── navigate.ts     # Navigation endpoints
│   │   ├── interact.ts     # Interaction endpoints
│   │   └── capture.ts      # Screenshot endpoints
│   └── cli/                # (Phase 4)
│       └── index.ts        # CLI wrapper
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

## Docker Configuration

The service runs in a Docker container based on `mcr.microsoft.com/playwright:v1.40.0-jammy` which includes:
- Node.js 20
- Playwright with Chromium pre-installed
- All required system dependencies

### Volume Mounts

- `./packages/browser-automation:/app` - Source code (hot reload in dev)
- `./temp/screenshots:/app/screenshots` - Screenshot output directory
- `automation-node-modules:/app/node_modules` - Cached dependencies

### Network

The service is connected to `cv-builder-network` and can communicate with:
- `browser-app:3000` - The React application under test
- Other services in the compose network

## Development

### TypeScript

The project uses TypeScript with strict mode enabled:

```bash
# Type check only
npm run type-check

# Build TypeScript
npm run build
```

### Testing

### Test Scripts

**Test with Example.com:**
```bash
cd packages/browser-automation
npm run build
./test-workflow.sh
```

This tests basic functionality:
- Navigate to example.com
- Query for elements
- Capture screenshots

**Test with CV Builder App:**
```bash
# Terminal 1: Start dev services
npm run dev:all

# Terminal 2: Run browser automation tests
cd packages/browser-automation
npm run build
./test-cv-builder.sh
```

This tests integration with the actual CV Builder application:
- Navigate to CV Builder dashboard
- Query for app components (Bio, Jobs, etc.)
- Capture dashboard screenshots
- Verify component presence

### Manual Testing

```bash
# From host machine
curl http://localhost:3002/health

# Navigate to a page
curl -X POST http://localhost:3002/api/navigate \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3000"}'

# Query for element
curl "http://localhost:3002/api/element/exists?selector=h1"

# Capture screenshot
curl -X POST http://localhost:3002/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "fullPage": true}'
```

## Implementation Status

### Phase 1: Core Infrastructure ✅ (Current)
- [x] Directory structure
- [x] package.json with Playwright dependencies
- [x] TypeScript configuration
- [x] Dockerfile with Playwright image
- [x] Docker Compose integration
- [x] Basic Express server
- [x] Health check endpoint
- [x] README documentation

### Phase 2: Basic Automation (Next)
- [ ] Browser instance manager
- [ ] Navigation endpoints
- [ ] Element query methods
- [ ] Screenshot capture (full page)

### Phase 3: Advanced Features
- [ ] User interactions (click, type, hover)
- [ ] Element-specific screenshots
- [ ] Viewport control
- [ ] Waiting strategies

### Phase 4: Documentation & Integration
- [ ] OpenAPI/Swagger spec
- [ ] AI tool integration guide
- [ ] CLI wrapper
- [ ] Example scripts

### Phase 5: GitHub Integration
- [ ] Screenshot uploads
- [ ] PR/Issue commenting
- [ ] Markdown generation

## Troubleshooting

### Service won't start

```bash
# Check logs
docker-compose logs browser-automation

# Rebuild container
docker-compose build browser-automation
docker-compose up browser-automation
```

### Can't connect to browser-app

```bash
# Verify browser-app is running
docker-compose ps

# Check network connectivity
docker exec cv-builder-browser-automation ping browser-app

# Verify browser-app is accessible
docker exec cv-builder-browser-automation curl http://browser-app:3000
```

### Port 3002 already in use

```bash
# Find process using port
lsof -i :3002

# Change port in docker-compose.yml
ports:
  - "3003:3002"  # Map to different host port
```

## Related Issues

- **Parent Issue:** #16 - Browser automation tool implementation
- **Phase 1 Issue:** #17 - Setup Playwright infrastructure (current)
- **Phase 2 Issue:** #18 - Core automation API
- **Phase 3 Issue:** #19 - Advanced features
- **Phase 4 Issue:** #20 - Documentation
- **Phase 5 Issue:** #21 - GitHub integration

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Docker Guide](https://playwright.dev/docs/docker)
- [Express.js Documentation](https://expressjs.com/)
