# Browser Automation Service

Playwright-based browser automation service for UI testing and screenshot capture. Enables AI dev tools (like Claude Code) to interact with the CV Builder application programmatically.

## Features

- **Browser Automation**: Navigate, interact, and test UI components
- **Screenshot Capture**: Full-page, element-specific, multi-viewport screenshots with format options
- **User Interactions**: Click, type, hover, fill forms, press keys, and more
- **Waiting Strategies**: Wait for elements, network, page load, and custom conditions
- **Session Management**: Auto-cleanup of inactive sessions after 5 minutes
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
  "version": "0.3.0",
  "environment": "development",
  "browser": {
    "running": true,
    "currentUrl": "http://example.com",
    "connected": true,
    "session": {
      "id": "session-1234567890",
      "createdAt": "2025-01-16T...",
      "lastActivity": "2025-01-16T...",
      "url": "http://example.com"
    }
  },
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

### Navigation

```bash
POST http://localhost:3002/api/navigate
Content-Type: application/json

{
  "url": "http://localhost:3000",
  "waitFor": "load"  # Optional: "load" | "networkidle" | "domcontentloaded"
}
```

### Element Query

```bash
GET http://localhost:3002/api/element/exists?selector=h1

# Response
{
  "exists": true,
  "visible": true,
  "enabled": true
}
```

### Screenshot Capture

**Basic Screenshot:**
```bash
POST http://localhost:3002/api/screenshot
Content-Type: application/json

{
  "name": "dashboard",
  "fullPage": true
}
```

**Viewport-Specific Screenshot:**
```bash
POST http://localhost:3002/api/screenshot
Content-Type: application/json

{
  "name": "mobile-view",
  "viewport": "mobile",  # "desktop" | "tablet" | "mobile" | "mobile-landscape"
  "fullPage": true
}
```

**Element Screenshot with JPEG:**
```bash
POST http://localhost:3002/api/screenshot
Content-Type: application/json

{
  "name": "bio-component",
  "selector": ".bio-sidebar",
  "format": "jpeg",  # "png" | "jpeg"
  "quality": 80,     # 0-100 (JPEG only)
  "sessionDir": "temp/screenshots/pr-123"
}
```

### User Interactions

**Click:**
```bash
POST http://localhost:3002/api/interact/click
Content-Type: application/json

{
  "selector": "button.submit",
  "options": {
    "timeout": 5000,
    "force": false
  }
}
```

**Type Text:**
```bash
POST http://localhost:3002/api/interact/type
Content-Type: application/json

{
  "selector": "input[name='email']",
  "text": "user@example.com",
  "options": {
    "delay": 100,  # ms between keystrokes
    "clear": true  # Clear existing text first
  }
}
```

**Fill (faster than type):**
```bash
POST http://localhost:3002/api/interact/fill
Content-Type: application/json

{
  "selector": "input[name='name']",
  "text": "John Doe"
}
```

**Hover:**
```bash
POST http://localhost:3002/api/interact/hover
Content-Type: application/json

{
  "selector": ".tooltip-trigger"
}
```

**Press Key:**
```bash
POST http://localhost:3002/api/interact/press
Content-Type: application/json

{
  "key": "Enter"  # Any key: "Enter", "Escape", "Tab", etc.
}
```

**Select Dropdown:**
```bash
POST http://localhost:3002/api/interact/select
Content-Type: application/json

{
  "selector": "select#country",
  "value": "US"  # or ["US", "CA"] for multiple
}
```

**Check/Uncheck:**
```bash
POST http://localhost:3002/api/interact/check
Content-Type: application/json

{
  "selector": "input[type='checkbox']",
  "checked": true
}
```

### Waiting Strategies

**Wait for Element:**
```bash
POST http://localhost:3002/api/wait/element
Content-Type: application/json

{
  "selector": ".loading-complete",
  "state": "visible",  # "attached" | "detached" | "visible" | "hidden"
  "timeout": 30000
}
```

**Wait for Load State:**
```bash
POST http://localhost:3002/api/wait/load
Content-Type: application/json

{
  "state": "networkidle",  # "load" | "domcontentloaded" | "networkidle"
  "timeout": 30000
}
```

**Generic Wait:**
```bash
POST http://localhost:3002/api/wait
Content-Type: application/json

{
  "condition": "selector",  # "selector" | "text" | "network" | "timeout" | "url" | "function"
  "value": "h1",
  "timeout": 5000
}
```

### Session Management

**List Screenshot Sessions:**
```bash
GET http://localhost:3002/api/screenshot/sessions

# Response
{
  "success": true,
  "sessions": ["2025-11-16T07-25-33", "phase3-test", "pr-22"],
  "count": 3
}
```

**List Screenshots in Session:**
```bash
GET http://localhost:3002/api/screenshot/sessions/pr-22

# Response
{
  "success": true,
  "sessionId": "pr-22",
  "screenshots": ["example-homepage.png", "example-h1.png"],
  "count": 2
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3002` |
| `NODE_ENV` | Environment mode | `development` |
| `BROWSER_APP_URL` | Target application URL | `http://browser-app:3000` |
| `HEADLESS` | Run browser in headless mode | `true` |
| `SCREENSHOTS_DIR` | Screenshot output directory | `/app/screenshots` (Docker) or `temp/screenshots` (local) |

## Directory Structure

```
packages/browser-automation/
├── src/
│   ├── server.ts              # Express API server
│   ├── automation/
│   │   ├── browser.ts         # Browser instance manager with session management
│   │   ├── actions.ts         # UI interaction methods (click, type, hover, etc.)
│   │   ├── screenshots.ts     # Screenshot utilities with viewport/format support
│   │   └── viewport.ts        # Viewport presets and management
│   ├── routes/
│   │   ├── navigate.ts        # Navigation endpoints
│   │   ├── query.ts           # Element query endpoints
│   │   ├── capture.ts         # Screenshot endpoints
│   │   ├── interact.ts        # Interaction endpoints (click, type, hover, etc.)
│   │   └── wait.ts            # Waiting strategy endpoints
│   └── cli/                   # (Phase 4)
│       └── index.ts           # CLI wrapper
├── temp/
│   └── screenshots/           # Local screenshot output
├── test-workflow.sh           # Example.com test script
├── test-cv-builder.sh         # CV Builder integration test
├── test-phase3.sh             # Phase 3 feature tests
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

**Test Phase 3 Features:**
```bash
# Terminal 1: Start browser automation service
cd packages/browser-automation
HEADLESS=true PORT=3002 SCREENSHOTS_DIR=/Users/yuri/ojfbot/cv-builder/packages/browser-automation/temp/screenshots npm run dev

# Terminal 2: Run Phase 3 tests
./test-phase3.sh
```

This comprehensive test covers:
- ✅ Advanced screenshots (viewport presets, JPEG format, quality settings)
- ✅ User interactions (click, hover, key press)
- ✅ Waiting strategies (element, load state, timeout)
- ✅ Session management (tracking and listing)

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

### Phase 1: Core Infrastructure ✅ Completed
- [x] Directory structure
- [x] package.json with Playwright dependencies
- [x] TypeScript configuration
- [x] Dockerfile with Playwright image
- [x] Docker Compose integration
- [x] Basic Express server
- [x] Health check endpoint
- [x] README documentation

### Phase 2: Basic Automation ✅ Completed
- [x] Browser instance manager
- [x] Navigation endpoints
- [x] Element query methods
- [x] Screenshot capture (full page)
- [x] Session directory management

### Phase 3: Advanced Features ✅ Completed (Current)
- [x] User interactions (click, type, hover, fill, press, select, check)
- [x] Element-specific screenshots
- [x] Viewport control (desktop, tablet, mobile, mobile-landscape)
- [x] Screenshot format options (PNG, JPEG with quality)
- [x] Waiting strategies (element, load, network, timeout, URL, function)
- [x] Session management with auto-cleanup (5 min timeout)
- [x] Comprehensive test suite (test-phase3.sh)

### Phase 4: Documentation & Integration (Next)
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
