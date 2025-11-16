# Browser Automation Examples

TypeScript examples demonstrating common automation workflows with the Browser Automation service.

## Prerequisites

### 1. Install Dependencies

```bash
cd packages/browser-automation/examples
npm install
```

### 2. Start Services

```bash
# From project root
docker-compose up -d browser-automation browser-app

# Or run locally
cd packages/browser-automation && npm run dev
cd packages/browser-app && npm run dev
```

### 3. Verify Service is Running

```bash
curl http://localhost:3002/health
```

---

## Examples

### 1. Capture Dashboard (`capture-dashboard.ts`)

**Purpose:** Simple screenshot capture workflow

**What it does:**
- Navigates to the CV Builder dashboard
- Waits for content to load
- Captures a desktop screenshot

**Run:**
```bash
npm run dashboard
# or
npx tsx capture-dashboard.ts
```

**Output:**
```
=== Capture Dashboard Screenshot ===

1. Navigating to dashboard...
   ✓ Navigated to: http://localhost:3000/
   ✓ Page title: CV Builder

2. Waiting for dashboard content...
   ✓ Dashboard loaded

3. Capturing screenshot...
   ✓ Screenshot saved: temp/screenshots/examples/dashboard-capture-desktop.png
   ✓ File size: 78.23 KB
   ✓ Viewport: 1920x1080

✅ Dashboard screenshot captured successfully!
```

---

### 2. Test Component Presence (`test-component-presence.ts`)

**Purpose:** Element verification and querying

**What it does:**
- Navigates to the application
- Checks for multiple UI components
- Reports visibility and state

**Run:**
```bash
npm run component
# or
npx tsx test-component-presence.ts
```

**Output:**
```
=== Test Component Presence ===

1. Navigating to application...
   ✓ Navigation complete

2. Testing component presence...

   ✓ Main Content
     - Visible: true
     - Enabled: true
     - Count: 1
   ✓ Dashboard Header
     - Visible: true
     - Enabled: true
     - Count: 1
   ✓ Bio Tab
     - Visible: true
     - Enabled: true
     - Count: 1
   ...

✅ Component presence test complete!
```

---

### 3. User Flow Screenshots (`user-flow-screenshots.ts`)

**Purpose:** Multi-step workflow documentation

**What it does:**
- Navigates through all application tabs
- Captures screenshot at each step
- Tests chat expansion feature
- Creates numbered sequence of screenshots

**Run:**
```bash
npm run user-flow
# or
npx tsx user-flow-screenshots.ts
```

**Output:**
```
=== User Flow Screenshots ===

1. Navigating to application...
   ✓ Navigation complete

2. Capturing initial dashboard state...
   ✓ Initial state captured

3. Navigating through tabs...
   → Clicking Bio tab...
   ✓ Bio tab captured
   → Clicking Jobs tab...
   ✓ Jobs tab captured
   ...

4. Testing chat expansion...
   ✓ Collapsed chat captured
   ✓ Expanded chat captured

✅ User flow complete! Screenshots saved to: temp/screenshots/user-flow-example

To attach these to a PR, run:
  "Attach screenshots to PR #<number>"
```

**Screenshots created:**
- `01-initial-dashboard.png`
- `02-bio-tab.png`
- `03-jobs-tab.png`
- `04-outputs-tab.png`
- `05-chat-tab.png`
- `06-chat-collapsed.png`
- `07-chat-expanded.png`

---

### 4. Multi-Viewport Capture (`multi-viewport-capture.ts`)

**Purpose:** Responsive testing across device sizes

**What it does:**
- Captures the same page at different viewport sizes
- Compares file sizes and dimensions
- Validates responsive behavior

**Run:**
```bash
npm run responsive
# or
npx tsx multi-viewport-capture.ts
```

**Output:**
```
=== Multi-Viewport Screenshot Capture ===

1. Navigating to application...
   ✓ Navigation complete

2. Capturing screenshots at different viewports...
   → Capturing mobile viewport...
   ✓ mobile: 375x667 - 49.12 KB
   → Capturing tablet viewport...
   ✓ tablet: 768x1024 - 111.45 KB
   → Capturing desktop viewport...
   ✓ desktop: 1920x1080 - 127.89 KB
   → Capturing mobile-landscape viewport...
   ✓ mobile-landscape: 667x375 - 52.34 KB

3. Viewport Comparison:

   Viewport          | Dimensions  | File Size
   ------------------|-------------|----------
   mobile            | 375x667     | 49.12 KB
   tablet            | 768x1024    | 111.45 KB
   desktop           | 1920x1080   | 127.89 KB
   mobile-landscape  | 667x375     | 52.34 KB

✅ Responsive testing complete! Screenshots saved to: temp/screenshots/responsive-test

Viewport presets used:
  - mobile: 375x667 (iPhone SE)
  - mobile-landscape: 667x375 (iPhone SE landscape)
  - tablet: 768x1024 (iPad)
  - desktop: 1920x1080 (Full HD)
```

---

### 5. PR Documentation (`pr-documentation.ts`)

**Purpose:** Automated PR documentation generation

**What it does:**
- Captures comprehensive set of screenshots for PR documentation
- Organizes screenshots by PR number
- Creates desktop and mobile views
- Provides instructions for attaching to GitHub PR

**Run:**
```bash
npm run pr-docs
# or with PR number
npx tsx pr-documentation.ts 23
```

**Output:**
```
=== PR #23 Documentation Generator ===

1. Navigating to application...
   ✓ Navigation complete

2. Capturing main dashboard...
   ✓ Dashboard overview captured

3. Capturing tab views...
   → Bio tab...
   ✓ Bio captured
   → Jobs tab...
   ✓ Jobs captured
   ...

4. Capturing mobile view...
   ✓ Mobile view captured

═══════════════════════════════════════════════════
✅ PR #23 documentation complete!
═══════════════════════════════════════════════════

Screenshots saved to: temp/screenshots/pr-23

Captured views:
  00-dashboard-overview.png - Main dashboard (desktop)
  01-bio-view.png - Bio tab
  02-jobs-view.png - Jobs tab
  03-outputs-view.png - Outputs tab
  04-chat-view.png - Chat tab
  05-mobile-view.png - Mobile responsive view

📸 To attach these screenshots to the PR, use:

  "Attach screenshots to PR #23"

The screenshot-commenter agent will:
  1. Auto-detect screenshots in temp/screenshots/*
  2. Copy to temp/pr-23/
  3. Commit files to current branch
  4. Generate rich markdown comment
  5. Post to GitHub PR
```

---

## Environment Variables

You can customize the API and app URLs:

```bash
export BROWSER_AUTOMATION_URL=http://localhost:3002/api
export BROWSER_APP_URL=http://localhost:3000
```

## Common Issues

### Service not running

**Error:** `Error: connect ECONNREFUSED ::1:3002`

**Solution:**
```bash
# Check if service is running
docker-compose ps browser-automation

# Start service if not running
docker-compose up -d browser-automation
```

### Browser app not accessible

**Error:** Navigation fails or times out

**Solution:**
```bash
# Check if browser-app is running
docker-compose ps browser-app

# Start browser-app if not running
docker-compose up -d browser-app
```

### Element not found

**Error:** `Element not found: .selector`

**Solution:**
- Check if you're on the correct page
- Increase timeout in wait conditions
- Verify selector is correct
- Use browser DevTools to test selectors

## Integration with screenshot-commenter

After running any example that generates screenshots, you can attach them to a GitHub PR or issue:

```bash
# Run example to generate screenshots
npx tsx pr-documentation.ts 23

# Then use Claude Code to attach
"Attach screenshots to PR #23"
```

The screenshot-commenter agent will:
1. Auto-detect recent screenshots
2. Copy to PR-specific directory
3. Commit to current branch
4. Generate rich markdown comment
5. Post to GitHub

## Next Steps

- Explore the [Claude Code Integration Guide](../../../docs/CLAUDE_CODE_INTEGRATION.md)
- Check the [API Documentation](http://localhost:3002/api-docs)
- Review the [OpenAPI Specification](http://localhost:3002/openapi.yaml)
- Read the [main README](../README.md)

## Contributing

Feel free to add more examples! Follow the existing pattern:

1. Create a new `.ts` file in this directory
2. Add a script to `package.json`
3. Document in this README
4. Include clear console output
5. Handle errors gracefully
