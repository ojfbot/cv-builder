# 🤖 Browser Automation Service

> **AI-Powered UI Testing & Screenshot Automation**
> Chat with your browser. Test your UI. Document your changes. All through natural language.

Playwright-based browser automation service designed for **AI dev tools** like Claude Code. Control browsers, capture screenshots, and test UIs through simple HTTP APIs or natural language prompts.

```bash
# You: "Capture the dashboard at mobile and desktop sizes"
# Claude Code → Browser Automation API → Screenshots captured ✅

# You: "Test if the Bio component is visible"
# Claude Code → Element Query API → Component verified ✅

# You: "Attach screenshots to PR #23"
# Claude Code → GitHub Integration → Screenshots posted ✅
```

---

## 🎯 Why This Exists

**Problem:** Developers need to manually test UI changes, capture screenshots for PRs, and verify component behavior. This is tedious and error-prone.

**Solution:** An HTTP API that AI tools can call to automate browser interactions. No manual clicking, no screenshot hunting, no copy-pasting.

**Use Cases:**
- 🤖 **AI-Assisted Testing:** Claude Code tests your UI through chat
- 📸 **Automated PR Documentation:** Generate screenshots during development
- 🔍 **Component Verification:** Query elements and validate states
- 📱 **Responsive Testing:** Capture multiple viewport sizes instantly
- 🎬 **User Flow Documentation:** Record multi-step workflows automatically

---

## ⚡ Quick Start

### 1. Start the Service

**Option A: Docker (Recommended)**
```bash
docker-compose up -d browser-automation browser-app
```

**Option B: Local Development**
```bash
cd packages/browser-automation
npm install
npm run dev
```

**Verify it's running:**
```bash
curl http://localhost:3002/health
# ✅ {"status":"ready","version":"0.3.0"}
```

### 2. Try It Out

**Interactive API Documentation:**
```
http://localhost:3002/api-docs
```

Click any endpoint → "Try it out" → Execute → See results!

**CLI (fastest for quick tasks):**
```bash
# Capture screenshot
npm run cli screenshot http://localhost:3000 dashboard

# Test element
npm run cli test http://localhost:3000 ".bio-component"

# Check health
npm run cli health
```

**Example Scripts (realistic workflows):**
```bash
cd examples
npm install

# Capture dashboard
npm run dashboard

# Test all components
npm run component

# Generate PR screenshots
npm run pr-docs 23
```

### 3. Use with Claude Code

**Just describe what you want:**

```
"Capture screenshots of the dashboard at mobile, tablet, and desktop sizes"

"Click the Add Job button and verify the modal opens"

"Test if the Bio component is visible and capture a screenshot"

"Generate documentation screenshots for PR #23 and attach them"
```

Claude Code will use the Browser Automation API to execute these tasks automatically.

---

## 🚀 Key Features

### 🎭 **Browser Control**
- Navigate to URLs with wait strategies (load, networkidle, domcontentloaded)
- Execute JavaScript in page context
- Manage browser sessions with auto-cleanup (5min timeout)

### 📸 **Screenshot Capture**
- Full-page and element-specific screenshots
- Multi-viewport support (desktop 1920x1080, tablet 768x1024, mobile 375x667)
- Format options (PNG, JPEG with quality control 0-100)
- Automatic organization by session
- **NEW:** Automatic manifest.json generation with metadata

### 🖱️ **User Interactions** (7 types)
- **Click:** Elements with position/modifier options
- **Type:** Text with configurable keystroke delay
- **Fill:** Form inputs (faster than type)
- **Hover:** Trigger hover states and tooltips
- **Press:** Keyboard keys (Enter, Escape, Tab, etc.)
- **Select:** Dropdown options
- **Check:** Checkboxes and radio buttons

### ⏳ **Waiting Strategies** (6 conditions)
- **Selector:** Wait for CSS selector to appear
- **Text:** Wait for text content to appear
- **Network:** Wait for network idle
- **Timeout:** Simple time-based delay
- **URL:** Wait for URL pattern match
- **Function:** Wait for custom JavaScript condition
- **Element States:** visible, hidden, attached, detached

### 🔍 **Element Querying**
- Check existence by selector, text, or role
- Get visibility and enabled state
- Extract text content
- Read element attributes
- Count matching elements

### 🐙 **GitHub Integration** (NEW)
- Attach screenshots to PRs/Issues programmatically
- List and manage screenshot sessions
- Integrates with screenshot-commenter agent
- Automatic markdown generation

### 🧹 **Auto-Cleanup** (NEW)
- Deletes screenshot sessions older than 30 days
- Runs daily automatically
- Configurable via `SCREENSHOT_MAX_AGE_DAYS`
- Logs freed space and deleted files

### 📚 **Developer Experience**
- **Interactive Swagger UI** at `/api-docs` - try APIs in browser
- **Full OpenAPI 3.0 spec** - import into any API client
- **CLI wrapper** - quick commands without curl
- **TypeScript examples** - copy-paste ready workflows
- **Comprehensive guides** - AI integration, troubleshooting, best practices

---

## 📖 Documentation

### For Developers

| Resource | Description | Link |
|----------|-------------|------|
| **API Docs (Interactive)** | Try all endpoints in browser | [http://localhost:3002/api-docs](http://localhost:3002/api-docs) |
| **OpenAPI Spec** | Import into Postman/Insomnia | [/openapi.yaml](http://localhost:3002/openapi.yaml) |
| **Test Authoring Guide** | Complete guide to writing tests | [docs/TEST_AUTHORING_GUIDE.md](./docs/TEST_AUTHORING_GUIDE.md) |
| **Migration Guide** | Converting shell scripts to TypeScript | [docs/MIGRATION_GUIDE.md](./docs/MIGRATION_GUIDE.md) |
| **Claude Code Guide** | AI integration workflows | [docs/CLAUDE_CODE_INTEGRATION.md](../../docs/CLAUDE_CODE_INTEGRATION.md) |
| **Example Scripts** | Ready-to-run TypeScript examples | [examples/README.md](./examples/README.md) |
| **CLI Reference** | Command-line usage | `npm run cli --help` |

### Quick Links

- 🏥 **Health Check:** `http://localhost:3002/health`
- 📚 **API Docs:** `http://localhost:3002/api-docs/`
- 📄 **OpenAPI YAML:** `http://localhost:3002/openapi.yaml`
- 📋 **OpenAPI JSON:** `http://localhost:3002/openapi.json`
- ℹ️ **Service Info:** `http://localhost:3002/`

---

## 🎓 Usage Examples

### Example 1: Capture Dashboard Screenshot

**Using CLI:**
```bash
npm run cli screenshot http://localhost:3000 dashboard --viewport desktop
```

**Using API:**
```bash
curl -X POST http://localhost:3002/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dashboard",
    "viewport": "desktop",
    "sessionDir": "temp/screenshots/my-test"
  }'
```

**Using Claude Code:**
```
"Capture a screenshot of the CV Builder dashboard"
```

**Result:**
```
✅ Screenshot saved: temp/screenshots/my-test/dashboard-desktop.png
   File size: 78.23 KB
   Viewport: 1920x1080
```

---

### Example 2: Test Component Presence

**Using CLI:**
```bash
npm run cli test http://localhost:3000 ".bio-component"
```

**Using API:**
```bash
curl "http://localhost:3002/api/element/exists?selector=.bio-component"
```

**Response:**
```json
{
  "exists": true,
  "visible": true,
  "enabled": true,
  "count": 1
}
```

---

### Example 3: Multi-Viewport Responsive Testing

**Using Example Script:**
```bash
cd examples
npm run responsive
```

**What it does:**
1. Navigates to dashboard
2. Captures screenshots at mobile (375x667), tablet (768x1024), desktop (1920x1080)
3. Shows file size comparison
4. Saves to `temp/screenshots/responsive-test/`

**Output:**
```
Viewport          | Dimensions  | File Size
------------------|-------------|----------
mobile            | 375x667     | 49.12 KB
tablet            | 768x1024    | 111.45 KB
desktop           | 1920x1080   | 127.89 KB
```

---

### Example 4: User Flow Documentation

**Using Example Script:**
```bash
cd examples
npm run user-flow
```

**What it does:**
1. Captures initial dashboard state
2. Clicks through all tabs (Bio, Jobs, Outputs, Chat)
3. Tests chat expansion
4. Creates numbered sequence: `01-dashboard.png`, `02-bio-tab.png`, etc.
5. Ready for PR attachment

**Result:** 7 screenshots documenting complete UI navigation flow

---

### Example 5: Generate PR Documentation

**Using Example Script:**
```bash
cd examples
npm run pr-docs 23  # PR number
```

**What it does:**
1. Captures all main views (dashboard, tabs)
2. Captures mobile view for responsive proof
3. Organizes in `temp/screenshots/pr-23/`
4. Shows next steps for attachment

**Then attach to PR:**
```
"Attach screenshots to PR #23"
```

Claude Code + screenshot-commenter agent will:
1. Auto-detect screenshots in temp/screenshots/*
2. Copy to temp/pr-23/
3. Commit files to current branch
4. Generate rich markdown comment with metadata
5. Post to GitHub PR

---

## 🔌 API Reference

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health and status |
| GET | `/` | API information and endpoints |
| GET | `/api-docs/` | Interactive Swagger UI |
| GET | `/openapi.yaml` | OpenAPI specification (YAML) |
| GET | `/openapi.json` | OpenAPI specification (JSON) |

### Navigation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/navigate` | Navigate to URL |
| GET | `/api/navigate/current` | Get current URL and title |
| POST | `/api/navigate/back` | Navigate back in history |
| POST | `/api/navigate/reload` | Reload current page |

### Element Query

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/element/exists` | Check if element exists |
| GET | `/api/element/text` | Get element text content |
| GET | `/api/element/attribute` | Get element attribute value |

### Screenshots

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/screenshot` | Capture full-page or element screenshot |
| GET | `/api/screenshot/sessions` | List all screenshot sessions |
| GET | `/api/screenshot/sessions/:id` | List screenshots in session |

**Screenshot Options:**
- `name` - Filename (without extension)
- `viewport` - Preset: `desktop`, `tablet`, `mobile`, `mobile-landscape`
- `format` - Image format: `png`, `jpeg`
- `quality` - JPEG quality (0-100)
- `selector` - CSS selector for element screenshot
- `fullPage` - Capture full scrollable page (default: true)
- `sessionDir` - Custom directory for organized storage

### Interactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interact/click` | Click element |
| POST | `/api/interact/type` | Type text with delay |
| POST | `/api/interact/fill` | Fill input (faster) |
| POST | `/api/interact/hover` | Hover over element |
| POST | `/api/interact/press` | Press keyboard key |
| POST | `/api/interact/select` | Select dropdown option |
| POST | `/api/interact/check` | Check/uncheck checkbox |

### Waiting

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/wait` | Wait for condition (selector, text, network, timeout, url, function) |
| POST | `/api/wait/load` | Wait for page load state |
| POST | `/api/wait/element` | Wait for element state (visible, hidden, attached, detached) |

### GitHub Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/github/attach-screenshots` | Attach screenshots to PR/Issue |
| GET | `/api/github/sessions` | List available screenshot sessions |
| GET | `/api/github/sessions/:id` | Get session details with manifest |

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `3002` |
| `NODE_ENV` | Environment mode | `development` |
| `BROWSER_APP_URL` | Target application URL | `http://browser-app:3000` |
| `HEADLESS` | Run browser in headless mode | `true` |
| `SCREENSHOTS_DIR` | Screenshot output directory | `temp/screenshots` |
| `SCREENSHOT_MAX_AGE_DAYS` | Auto-cleanup age threshold | `30` |

### Docker Compose

```yaml
browser-automation:
  build: ./packages/browser-automation
  ports:
    - "3002:3002"
  environment:
    - HEADLESS=true
    - BROWSER_APP_URL=http://browser-app:3000
  volumes:
    - ./temp/screenshots:/app/screenshots
  networks:
    - cv-builder-network
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│ User / AI Tool (Claude Code)               │
│                                             │
│ "Capture dashboard at mobile size"         │
└───────────────┬─────────────────────────────┘
                │
                │ Natural Language
                ▼
┌─────────────────────────────────────────────┐
│ Claude Code                                 │
│ - Parses intent                             │
│ - Maps to API calls                         │
│ - Formats results                           │
└───────────────┬─────────────────────────────┘
                │
                │ HTTP/REST API
                ▼
┌─────────────────────────────────────────────┐
│ Browser Automation Service (Port 3002)     │
│ ├─ Express API Server                      │
│ ├─ Playwright Browser Manager              │
│ ├─ Screenshot System + Manifest Tracking   │
│ ├─ Interaction Engine (7 types)            │
│ ├─ Waiting Strategies (6 conditions)       │
│ ├─ GitHub Integration                      │
│ └─ Auto-Cleanup Scheduler                  │
└───────────────┬─────────────────────────────┘
                │
                │ WebSocket/CDP
                ▼
┌─────────────────────────────────────────────┐
│ Playwright Chromium Browser                │
│ - Viewport control (mobile/tablet/desktop) │
│ - Element interaction                      │
│ - Screenshot capture (PNG/JPEG)            │
│ - Network monitoring                       │
└───────────────┬─────────────────────────────┘
                │
                │ HTTP
                ▼
┌─────────────────────────────────────────────┐
│ Browser App (localhost:3000)               │
│ - CV Builder React App                     │
│ - Your application under test              │
└─────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
packages/browser-automation/
├── src/
│   ├── server.ts                    # Express API server + route registration
│   ├── automation/
│   │   ├── browser.ts               # Browser lifecycle + session management
│   │   ├── actions.ts               # User interactions (click, type, etc.)
│   │   ├── screenshots.ts           # Screenshot capture + manifest updates
│   │   ├── viewport.ts              # Viewport presets + management
│   │   ├── manifest.ts              # Manifest system
│   │   └── cleanup.ts               # Auto-cleanup scheduler
│   ├── routes/
│   │   ├── navigate.ts              # Navigation endpoints
│   │   ├── query.ts                 # Element query endpoints
│   │   ├── capture.ts               # Screenshot endpoints
│   │   ├── interact.ts              # Interaction endpoints (7 types)
│   │   ├── wait.ts                  # Waiting strategy endpoints (6 conditions)
│   │   ├── docs.ts                  # Swagger UI
│   │   └── github.ts                # GitHub integration
│   ├── test-runner/                 # 🎯 NEW: TypeScript test framework
│   │   ├── index.ts                 # Main exports + helper functions
│   │   ├── TestRunner.ts            # Test orchestration + execution
│   │   ├── TestSuite.ts             # Test grouping + lifecycle hooks
│   │   ├── TestCase.ts              # Individual test execution
│   │   ├── types.ts                 # Type definitions
│   │   ├── assertions/
│   │   │   └── index.ts             # 15+ assertion methods
│   │   └── reporters/
│   │       ├── ConsoleReporter.ts   # Colored console output
│   │       ├── JsonReporter.ts      # JSON test results
│   │       └── MarkdownReporter.ts  # Markdown reports
│   ├── client/
│   │   └── BrowserAutomationClient.ts  # Type-safe API client wrapper
│   └── cli/
│       └── index.ts                 # CLI wrapper (5 commands)
├── tests/                           # 🧪 NEW: TypeScript test suites
│   ├── integration/
│   │   └── basic-workflow.test.ts   # 7 tests - basic functionality
│   ├── features/
│   │   └── phase3-features.test.ts  # 17 tests - advanced features
│   ├── apps/
│   │   └── cv-builder-integration.test.ts  # 11 tests - app integration
│   └── ui/
│       └── cv-builder-navigation.test.ts   # 19 tests - UI navigation
├── archive/
│   └── shell-scripts/               # 📦 Archived shell scripts (migrated)
│       ├── README.md                # Migration documentation
│       ├── test-workflow.sh
│       ├── test-cv-builder.sh
│       ├── test-phase3.sh
│       └── test-ui-navigation.sh
├── docs/
│   ├── openapi.yaml                 # OpenAPI 3.0 specification (800+ lines)
│   ├── TEST_AUTHORING_GUIDE.md      # 📚 NEW: Complete test writing guide
│   └── MIGRATION_GUIDE.md           # 📚 NEW: Shell → TypeScript migration
├── examples/                        # TypeScript example scripts
│   ├── package.json
│   ├── README.md
│   ├── capture-dashboard.ts
│   ├── test-component-presence.ts
│   ├── user-flow-screenshots.ts
│   ├── multi-viewport-capture.ts
│   └── pr-documentation.ts
├── temp/
│   └── screenshots/                 # Local screenshot output + manifests
├── Dockerfile                       # Playwright v1.40.0 base image
├── package.json                     # Dependencies + scripts + CLI bin
├── tsconfig.json                    # TypeScript strict config
└── README.md                        # This file
```

---

## 🧪 Testing

### TypeScript Test Framework

The browser automation service includes a **production-ready TypeScript test framework** with type-safe APIs, comprehensive assertions, and detailed reporting.

**Run All Tests:**
```bash
npm run test:all
```

**Run Individual Test Suites:**
```bash
# Basic workflow (7 tests)
npm test

# Phase 3 features (17 tests)
npm run test:phase3

# CV Builder integration (11 tests)
npm run test:cv-builder

# UI navigation (19 tests)
npm run test:ui-nav
```

**Watch Mode (for development):**
```bash
npm run test:watch
```

### Test Coverage

**1. Basic Workflow Test** (`tests/integration/basic-workflow.test.ts`)
- ✅ Health check and browser status
- ✅ Navigation to Example.com
- ✅ Element existence queries
- ✅ Element visibility checks
- ✅ Full-page screenshots
- ✅ Element-specific screenshots

**2. Phase 3 Features Test** (`tests/features/phase3-features.test.ts`)
- ✅ Screenshot viewports (mobile, tablet, desktop, landscape)
- ✅ User interactions (click, type, fill, hover, press)
- ✅ Waiting strategies (selector, text, network, navigation)
- ✅ Session management and listing

**3. CV Builder Integration Test** (`tests/apps/cv-builder-integration.test.ts`)
- ✅ Dashboard components (Bio, Jobs, Outputs, Chat)
- ✅ Carbon Design System elements
- ✅ App-specific navigation

**4. UI Navigation Test** (`tests/ui/cv-builder-navigation.test.ts`)
- ✅ Tab panel navigation (Bio, Jobs, Outputs, Chat)
- ✅ Chat window expansion/collapse
- ✅ Multi-viewport screenshots
- ✅ Responsive design validation

### Writing Tests

**Quick Start:**
```typescript
import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';

const API_URL = process.env.API_URL || 'http://localhost:3002';

async function main() {
  const { suite, client } = createTestSuite('My Test Suite', API_URL);

  suite.test('My first test', async ({ assert }) => {
    await client.navigate('https://example.com');
    await assert.elementExists('h1');
  });

  const runner = createTestRunner({ reporters: ['console'], verbose: true });
  const result = await runner.run(suite);
  process.exit(result.summary.failed > 0 ? 1 : 0);
}

main().catch(console.error);
```

**For comprehensive guides, see:**
- `docs/TEST_AUTHORING_GUIDE.md` - Complete guide to writing tests
- `docs/MIGRATION_GUIDE.md` - Migrating from shell scripts

### Assertion API

```typescript
// Element assertions
await assert.elementExists(selector)
await assert.elementVisible(selector)
await assert.elementHidden(selector)
await assert.elementEnabled(selector)
await assert.elementDisabled(selector)
await assert.elementCount(selector, count)

// Text assertions
await assert.textContains(selector, text)
await assert.textEquals(selector, text)

// Attribute assertions
await assert.attributeEquals(selector, attr, value)

// Screenshot assertions
assert.screenshotCaptured(result)
assert.screenshotSize(result, minBytes)
assert.screenshotPath(result, expectedPath)

// Navigation assertions
await assert.urlEquals(url)
await assert.urlContains(fragment)
```

### Test Lifecycle Hooks

```typescript
suite.beforeAll(async () => {
  // Runs once before all tests
  await client.navigate(APP_URL);
});

suite.beforeEach(async () => {
  // Runs before each test
});

suite.afterEach(async () => {
  // Runs after each test
});

suite.afterAll(async () => {
  // Runs once after all tests
});
```

### Migrating from Shell Scripts

All legacy shell scripts have been migrated to TypeScript and archived in `archive/shell-scripts/`. The TypeScript framework offers:
- ✅ **60% code reduction** (1,068 lines → 427 lines)
- ✅ **87% faster execution**
- ✅ **Type safety** with IDE autocomplete
- ✅ **Better error messages** with detailed stack traces
- ✅ **Cross-platform** compatibility

See `docs/MIGRATION_GUIDE.md` for conversion patterns.

### Example Scripts

```bash
cd examples
npm install

# Test each workflow
npm run dashboard      # Basic screenshot
npm run component      # Element verification
npm run user-flow      # Multi-step workflow
npm run responsive     # Viewport testing
npm run pr-docs 23     # PR documentation
```

### CLI Testing

```bash
# Health check
npm run cli health

# Screenshot capture
npm run cli screenshot http://localhost:3000 test

# Element verification
npm run cli test http://localhost:3000 ".cds--content"

# Navigation
npm run cli navigate http://localhost:3000
```

### Interactive Testing (Swagger UI)

1. Open http://localhost:3002/api-docs/
2. Click any endpoint
3. Click "Try it out"
4. Modify parameters
5. Click "Execute"
6. See live results

---

## 🎯 Implementation Status

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | ✅ Complete | Infrastructure (Docker, Express, Health check) |
| **Phase 2** | ✅ Complete | Core API (Navigation, Element queries, Screenshots) |
| **Phase 3** | ✅ Complete | Advanced (Interactions, Viewports, Waiting, Sessions) |
| **Phase 4** | ✅ Complete | Documentation (OpenAPI, Swagger UI, CLI, Examples, AI Guide) |
| **Phase 5** | ✅ Complete | GitHub (API wrapper, Manifests, Auto-cleanup) |

**Total Features Implemented:**
- ✅ 23 API endpoints
- ✅ 7 interaction types
- ✅ 6 waiting conditions
- ✅ 4 viewport presets
- ✅ 2 screenshot formats (PNG, JPEG)
- ✅ 5 CLI commands
- ✅ 5 example scripts
- ✅ 3 GitHub integration endpoints
- ✅ Automatic manifest generation
- ✅ Auto-cleanup scheduler
- ✅ Interactive API documentation
- ✅ 800+ line OpenAPI specification
- ✅ Comprehensive AI integration guide

---

## 🛠️ Development

### Setup

```bash
cd packages/browser-automation
npm install
npm run build
```

### Run Modes

```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start

# Type checking
npm run type-check

# CLI
npm run cli -- <command>
```

### Adding New Endpoints

1. Create route file in `src/routes/`
2. Implement handler logic
3. Register in `src/server.ts`
4. Update `docs/openapi.yaml`
5. Add example in `examples/`
6. Update this README

### Adding New Examples

1. Create `.ts` file in `examples/`
2. Add npm script to `examples/package.json`
3. Document in `examples/README.md`
4. Reference in this README

---

## 🐛 Troubleshooting

### Service Won't Start

**Symptom:** `ERR_CONNECTION_REFUSED` on port 3002

**Solutions:**
```bash
# Check if service is running
curl http://localhost:3002/health

# Check Docker status
docker-compose ps browser-automation

# Check local process
lsof -i :3002

# Restart service
docker-compose restart browser-automation
# OR
npm run dev
```

### Can't Connect to Browser App

**Symptom:** Navigation fails or times out

**Solutions:**
```bash
# Verify browser-app is running
docker-compose ps browser-app
curl http://localhost:3000

# Check network (Docker)
docker exec cv-builder-browser-automation ping browser-app

# Verify environment variable
echo $BROWSER_APP_URL
# Should be: http://browser-app:3000 (Docker) or http://localhost:3000 (local)
```

### Screenshots Not Captured

**Symptom:** Screenshot endpoint returns error

**Solutions:**
```bash
# Check screenshots directory exists
ls -la temp/screenshots

# Check permissions
ls -ld temp/screenshots

# Create directory if missing
mkdir -p temp/screenshots

# Check manifest generation (shouldn't block screenshot)
cat temp/screenshots/<session>/manifest.json
```

### Swagger UI Not Loading

**Symptom:** `/api-docs` shows 404 or blank page

**Solutions:**
```bash
# Verify endpoint exists
curl http://localhost:3002/api-docs/
# Note the trailing slash!

# Check OpenAPI spec loads
curl http://localhost:3002/openapi.yaml | head -20

# Rebuild and restart
npm run build
npm run dev
```

### Element Not Found

**Symptom:** `Element not found: .selector`

**Solutions:**
```bash
# Add wait before query
curl -X POST http://localhost:3002/api/wait/element \
  -d '{"selector": ".my-element", "state": "visible", "timeout": 10000}'

# Verify selector in browser DevTools
# Open localhost:3000 → F12 → Console
# Type: document.querySelector('.my-element')

# Try different selector strategies
# Instead of: .css-class-123 (fragile)
# Use: [data-testid="my-element"] (semantic)
# Or: button:has-text("Click Me") (semantic)
```

### Cleanup Not Running

**Symptom:** Old screenshots not deleted

**Solutions:**
```bash
# Check server logs for scheduler message
# Should see: "Screenshot cleanup scheduled (runs daily...)"

# Check age threshold
echo $SCREENSHOT_MAX_AGE_DAYS
# Default: 30 days

# Manually trigger cleanup (restart server)
# Cleanup runs on first daily cycle after restart
```

---

## 📊 Performance & Resources

### Resource Usage

| Resource | Development | Production |
|----------|-------------|------------|
| Memory | ~200-300 MB | ~150-200 MB |
| CPU | 5-10% idle | 2-5% idle |
| Disk | ~100 MB + screenshots | ~100 MB + screenshots |
| Network | Minimal | Minimal |

### Screenshot Storage

**Typical sizes:**
- Mobile (375x667): 40-60 KB
- Tablet (768x1024): 100-120 KB
- Desktop (1920x1080): 120-150 KB

**With auto-cleanup (30 days):**
- Average: 50-100 screenshots/month
- Storage: 5-10 MB/month
- Auto-deleted after 30 days

### Session Management

- **Timeout:** 5 minutes of inactivity
- **Impact:** Minimal (browser closes, memory freed)
- **Behavior:** Next request auto-creates new session

---

## 🤝 Contributing

### Code Style

- TypeScript with strict mode
- ESLint + Prettier (configured in repo root)
- Meaningful variable names
- Comments for complex logic
- Error handling on all async operations

### Adding Features

1. Create issue describing feature
2. Implement with tests
3. Update OpenAPI spec
4. Add example script
5. Update documentation
6. Create PR

### Documentation Standards

- Keep README in sync with code
- Update OpenAPI spec for API changes
- Add examples for new features
- Update Claude Code guide for AI workflows

---

## 📄 License

MIT

---

## 🙏 Acknowledgments

- Built with [Playwright](https://playwright.dev/)
- Powered by [Express.js](https://expressjs.com/)
- Documented with [Swagger UI](https://swagger.io/tools/swagger-ui/)
- Designed for [Claude Code](https://claude.ai/code)

---

## 📞 Support

**Issues:** https://github.com/ojfbot/cv-builder/issues

**Parent Issue:** [#16 - Browser automation tool implementation](https://github.com/ojfbot/cv-builder/issues/16)

**Phase Issues:**
- ✅ [#17 - Phase 1: Infrastructure](https://github.com/ojfbot/cv-builder/issues/17)
- ✅ [#18 - Phase 2: Core API](https://github.com/ojfbot/cv-builder/issues/18)
- ✅ [#19 - Phase 3: Advanced Features](https://github.com/ojfbot/cv-builder/issues/19)
- ✅ [#20 - Phase 4: Documentation](https://github.com/ojfbot/cv-builder/issues/20)
- ✅ [#21 - Phase 5: GitHub Integration](https://github.com/ojfbot/cv-builder/issues/21)

---

**Version:** 0.3.0
**Last Updated:** 2025-11-16
**Status:** Production Ready ✅
