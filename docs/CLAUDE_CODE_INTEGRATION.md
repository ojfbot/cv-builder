# Claude Code Integration Guide

## Overview

This guide explains how AI dev tools (specifically Claude Code) can use the Browser Automation service to test, document, and interact with the CV Builder UI programmatically.

The browser automation service provides a REST API for controlling a headless Playwright browser, enabling automated UI testing, screenshot capture, and component verification—all perfect for AI-assisted development workflows.

## Prerequisites

### 1. Start the Browser Automation Service

```bash
# Using Docker Compose (recommended)
docker-compose up -d browser-automation browser-app

# Or run locally
cd packages/browser-automation
npm run dev
```

The service will be available at `http://localhost:3002`

### 2. Verify Service is Running

```bash
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "ready",
  "service": "browser-automation",
  "version": "0.3.0",
  "browser": {
    "running": true,
    "currentUrl": "about:blank"
  }
}
```

### 3. Access Interactive Documentation

Open `http://localhost:3002/api-docs` in your browser to explore the full API with interactive examples.

---

## Common Workflows

### Workflow 1: Capture Dashboard Screenshot

**User Request:** "Capture a screenshot of the dashboard"

**Claude Code Actions:**

1. Navigate to the dashboard
2. Wait for the dashboard to load
3. Capture a screenshot

**Implementation:**

```bash
# Navigate to dashboard
curl -X POST http://localhost:3002/api/navigate \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3000", "waitFor": "load"}'

# Wait for dashboard element to be visible
curl -X POST http://localhost:3002/api/wait \
  -H "Content-Type: application/json" \
  -d '{"condition": "selector", "value": ".cds--content", "timeout": 10000}'

# Capture screenshot
curl -X POST http://localhost:3002/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dashboard",
    "viewport": "desktop",
    "sessionDir": "temp/screenshots/demo"
  }'
```

**Result:** Screenshot saved to `temp/screenshots/demo/dashboard-desktop.png`

---

### Workflow 2: Verify Component Presence

**User Request:** "Check if the Bio component is visible on the page"

**Claude Code Actions:**

1. Navigate to the application
2. Query for the Bio component
3. Return existence and visibility status

**Implementation:**

```bash
# Navigate
curl -X POST http://localhost:3002/api/navigate \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3000"}'

# Check if Bio component exists
curl "http://localhost:3002/api/element/exists?selector=[data-component='bio']"
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

### Workflow 3: Test User Flow with Screenshots

**User Request:** "Click 'Add Job' and capture the modal that opens"

**Claude Code Actions:**

1. Navigate to the dashboard
2. Capture initial state
3. Click the "Add Job" button
4. Wait for the modal to appear
5. Capture the modal

**Implementation:**

```bash
# Navigate
curl -X POST http://localhost:3002/api/navigate \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3000"}'

# Capture initial state
curl -X POST http://localhost:3002/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"name": "01-before-click", "sessionDir": "temp/screenshots/user-flow"}'

# Click "Add Job" button
curl -X POST http://localhost:3002/api/interact/click \
  -H "Content-Type: application/json" \
  -d '{"selector": "button:has-text(\"Add Job\")"}'

# Wait for modal to appear
curl -X POST http://localhost:3002/api/wait \
  -H "Content-Type: application/json" \
  -d '{"condition": "selector", "value": "[role=\"dialog\"]", "timeout": 5000}'

# Capture modal screenshot
curl -X POST http://localhost:3002/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "name": "02-add-job-modal",
    "selector": "[role=\"dialog\"]",
    "sessionDir": "temp/screenshots/user-flow"
  }'
```

**Result:** Two screenshots documenting the before/after state

---

### Workflow 4: Multi-Viewport Testing

**User Request:** "Capture the dashboard at mobile, tablet, and desktop sizes"

**Claude Code Actions:**

1. Navigate to the dashboard
2. Capture screenshots at each viewport size

**Implementation:**

```bash
# Navigate once
curl -X POST http://localhost:3002/api/navigate \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3000"}'

# Capture mobile viewport
curl -X POST http://localhost:3002/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dashboard",
    "viewport": "mobile",
    "sessionDir": "temp/screenshots/responsive"
  }'

# Capture tablet viewport
curl -X POST http://localhost:3002/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dashboard",
    "viewport": "tablet",
    "sessionDir": "temp/screenshots/responsive"
  }'

# Capture desktop viewport
curl -X POST http://localhost:3002/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dashboard",
    "viewport": "desktop",
    "sessionDir": "temp/screenshots/responsive"
  }'
```

**Result:** Three screenshots:
- `dashboard-mobile.png` (375x667)
- `dashboard-tablet.png` (768x1024)
- `dashboard-desktop.png` (1920x1080)

---

### Workflow 5: Form Input Testing

**User Request:** "Type 'Software Engineer' into the job title search field and verify it appears"

**Claude Code Actions:**

1. Navigate to jobs page
2. Type into the search field
3. Verify the typed text
4. Capture the result

**Implementation:**

```bash
# Navigate
curl -X POST http://localhost:3002/api/navigate \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3000"}'

# Click Jobs tab
curl -X POST http://localhost:3002/api/interact/click \
  -H "Content-Type: application/json" \
  -d '{"selector": "[data-tab=\"jobs\"]"}'

# Type into search field
curl -X POST http://localhost:3002/api/interact/type \
  -H "Content-Type: application/json" \
  -d '{
    "selector": "input[name=\"search\"]",
    "text": "Software Engineer",
    "options": {"delay": 50, "clear": true}
  }'

# Get the input value to verify
curl "http://localhost:3002/api/element/attribute?selector=input[name='search']&attribute=value"

# Capture screenshot showing the search
curl -X POST http://localhost:3002/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{"name": "search-entered", "sessionDir": "temp/screenshots/form-test"}'
```

---

### Workflow 6: Component State Verification

**User Request:** "Verify that clicking the Bio tab shows the bio component"

**Claude Code Actions:**

1. Navigate to dashboard
2. Click Bio tab
3. Wait for bio component to be visible
4. Verify component state

**Implementation:**

```bash
# Navigate
curl -X POST http://localhost:3002/api/navigate \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3000"}'

# Click Bio tab
curl -X POST http://localhost:3002/api/interact/click \
  -H "Content-Type: application/json" \
  -d '{"selector": "[data-tab=\"bio\"]"}'

# Wait for bio component to be visible
curl -X POST http://localhost:3002/api/wait/element \
  -H "Content-Type: application/json" \
  -d '{"selector": "[data-component=\"bio\"]", "state": "visible", "timeout": 5000}'

# Verify visibility
curl "http://localhost:3002/api/element/exists?selector=[data-component='bio']"
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

## Example Prompts for Claude Code

Here are effective prompts you can use with Claude Code:

### Screenshot Capture
```
"Capture a screenshot of the CV Builder dashboard"
"Take screenshots of the Bio component at mobile and desktop sizes"
"Screenshot the full Jobs page with the filter panel expanded"
```

### Component Verification
```
"Check if the Bio component is present on the page"
"Verify that the Outputs tab has a list of generated resumes"
"Test if the chat window is visible and interactive"
```

### User Interaction
```
"Click 'Upload Resume' and capture the file dialog"
"Type 'Python Developer' into the job search and show the results"
"Hover over the first job card and capture the tooltip"
```

### Multi-Step Workflows
```
"Test the job application workflow: click Add Job, fill out the form, and capture each step"
"Document the chat expansion feature with before/after screenshots"
"Verify the responsive behavior of the dashboard across all viewport sizes"
```

### PR Documentation
```
"Generate screenshots for PR #23 showing the new Phase 3 features"
"Capture before/after screenshots for the UI redesign"
"Document all tab navigation states for the PR"
```

---

## Best Practices

### 1. Always Wait for Elements

Don't interact with elements immediately after navigation. Always wait for them to be ready:

```bash
# Good: Wait before interacting
curl -X POST http://localhost:3002/api/navigate -d '{"url": "..."}'
curl -X POST http://localhost:3002/api/wait -d '{"condition": "selector", "value": "button"}'
curl -X POST http://localhost:3002/api/interact/click -d '{"selector": "button"}'

# Bad: Interact immediately (may fail)
curl -X POST http://localhost:3002/api/navigate -d '{"url": "..."}'
curl -X POST http://localhost:3002/api/interact/click -d '{"selector": "button"}'
```

### 2. Use Semantic Selectors

Prefer selectors that are less likely to break with UI changes:

```bash
# Good: Semantic selectors
"button:has-text('Add Job')"
"[data-testid='bio-component']"
"[role='dialog']"
"[aria-label='Search jobs']"

# Bad: Fragile selectors
".css-1234567"
"div > div > button:nth-child(3)"
"#root > div:first-child > button"
```

### 3. Organize Screenshots by Session

Use descriptive session directories to keep screenshots organized:

```bash
# Good: Organized by purpose
"sessionDir": "temp/screenshots/pr-23-phase3"
"sessionDir": "temp/screenshots/bio-component-test"
"sessionDir": "temp/screenshots/responsive-testing"

# Bad: Generic names
"sessionDir": "temp/screenshots/test1"
"sessionDir": "temp/screenshots/screenshots"
```

### 4. Use Descriptive Screenshot Names

Include what, when, and context in screenshot names:

```bash
# Good: Descriptive names
"name": "dashboard-initial-load"
"name": "bio-tab-with-data"
"name": "add-job-modal-open"
"name": "search-results-filtered"

# Bad: Generic names
"name": "screenshot1"
"name": "test"
"name": "pic"
```

### 5. Capture at Multiple Viewports for Responsive Testing

Always test responsive components at different sizes:

```bash
# Capture mobile, tablet, and desktop
for viewport in mobile tablet desktop; do
  curl -X POST http://localhost:3002/api/screenshot \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"component\", \"viewport\": \"$viewport\", \"sessionDir\": \"temp/screenshots/responsive\"}"
done
```

### 6. Include Context in Multi-Step Workflows

Number screenshots in sequence and use descriptive names:

```bash
"01-initial-state.png"
"02-button-clicked.png"
"03-modal-opened.png"
"04-form-filled.png"
"05-submission-success.png"
```

---

## Error Handling

### Common Errors and Solutions

#### 404: Element Not Found

**Error:**
```json
{
  "success": false,
  "elementFound": false,
  "error": "Element not found: .bio-component"
}
```

**Solutions:**
- Wait longer for the element to appear
- Check if the selector is correct
- Verify you're on the correct page
- Check browser console for JavaScript errors

**Fix:**
```bash
# Add wait before interaction
curl -X POST http://localhost:3002/api/wait \
  -d '{"condition": "selector", "value": ".bio-component", "timeout": 10000}'
```

#### 500: Timeout

**Error:**
```json
{
  "success": false,
  "error": "Timeout 30000ms exceeded"
}
```

**Solutions:**
- Increase timeout parameter
- Check if the condition can actually be met
- Verify the application is responding

**Fix:**
```bash
# Increase timeout
curl -X POST http://localhost:3002/api/wait \
  -d '{"condition": "selector", "value": ".slow-component", "timeout": 60000}'
```

#### Browser Not Connected

**Error:**
```json
{
  "status": "error",
  "browser": {
    "connected": false
  }
}
```

**Solutions:**
- Check if Docker services are running
- Restart browser-automation service
- Check logs for errors

**Fix:**
```bash
# Restart services
docker-compose restart browser-automation

# Check logs
docker-compose logs browser-automation
```

#### Session Timeout

**Error:**
```json
{
  "error": "Session expired after inactivity"
}
```

**Solution:**
- Sessions auto-cleanup after 5 minutes of inactivity
- Simply make a new request to start a new session

---

## Integration with screenshot-commenter Agent

After capturing screenshots with the browser automation service, use the `screenshot-commenter` agent to attach them to Pull Requests or Issues.

### Complete Workflow

1. **Capture screenshots** using browser automation:
   ```bash
   curl -X POST http://localhost:3002/api/screenshot \
     -d '{"name": "feature", "sessionDir": "temp/screenshots/pr-23"}'
   ```

2. **Run screenshot-commenter agent**:
   ```
   "Attach screenshots to PR #23"
   ```

3. **Agent automatically**:
   - Detects screenshots in temp/screenshots/*
   - Copies to temp/pr-23/
   - Commits files to current branch
   - Generates rich markdown comment
   - Posts to GitHub PR

### Example Prompt for End-to-End Documentation

```
"Capture screenshots of the new chat expansion feature (before and after states) and attach them to PR #23"
```

**What happens:**
1. Claude Code uses browser automation to:
   - Navigate to Bio tab
   - Capture condensed chat (collapsed)
   - Click chat input to expand
   - Wait for animation
   - Capture condensed chat (expanded)
2. Claude Code invokes screenshot-commenter agent
3. Screenshots appear in PR comment with metadata

---

## API Quick Reference

### Navigation
- `POST /api/navigate` - Navigate to URL
- `GET /api/navigate/current` - Get current URL
- `POST /api/navigate/back` - Go back
- `POST /api/navigate/reload` - Reload page

### Element Queries
- `GET /api/element/exists` - Check if element exists
- `GET /api/element/text` - Get element text
- `GET /api/element/attribute` - Get element attribute

### Screenshots
- `POST /api/screenshot` - Capture screenshot
- `GET /api/screenshot/sessions` - List all sessions
- `GET /api/screenshot/sessions/{id}` - List session screenshots

### Interactions
- `POST /api/interact/click` - Click element
- `POST /api/interact/type` - Type text with delay
- `POST /api/interact/fill` - Fill input (fast)
- `POST /api/interact/hover` - Hover over element
- `POST /api/interact/press` - Press keyboard key
- `POST /api/interact/select` - Select dropdown option
- `POST /api/interact/check` - Check/uncheck checkbox

### Waiting
- `POST /api/wait` - Wait for condition (selector, text, network, timeout, url, function)
- `POST /api/wait/load` - Wait for page load state
- `POST /api/wait/element` - Wait for element state (visible, hidden, attached, detached)

### System
- `GET /health` - Service health check
- `GET /api-docs` - Interactive API documentation (Swagger UI)
- `GET /openapi.yaml` - OpenAPI specification

---

## Advanced Usage

### Custom Viewports

Beyond the presets (mobile, tablet, desktop), you can specify custom viewports:

```bash
curl -X POST http://localhost:3002/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom-viewport",
    "viewport": {
      "width": 1366,
      "height": 768,
      "deviceScaleFactor": 1,
      "isMobile": false,
      "hasTouch": false
    },
    "sessionDir": "temp/screenshots/custom"
  }'
```

### JPEG Screenshots with Quality Control

For smaller file sizes, use JPEG format:

```bash
curl -X POST http://localhost:3002/api/screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "name": "dashboard",
    "format": "jpeg",
    "quality": 80,
    "sessionDir": "temp/screenshots/jpeg-test"
  }'
```

### Wait for Network Idle

Useful for single-page apps that load data asynchronously:

```bash
curl -X POST http://localhost:3002/api/wait \
  -H "Content-Type: application/json" \
  -d '{"condition": "network", "timeout": 10000}'
```

### Wait for Custom JavaScript Condition

```bash
curl -X POST http://localhost:3002/api/wait \
  -H "Content-Type: application/json" \
  -d '{
    "condition": "function",
    "value": "() => document.querySelectorAll(\".job-card\").length > 5",
    "timeout": 10000
  }'
```

---

## Troubleshooting

### Screenshots are blank

**Problem:** Screenshots capture before content loads

**Solution:** Add wait condition before screenshot:
```bash
curl -X POST http://localhost:3002/api/wait -d '{"condition": "networkidle"}'
```

### Element not found but it exists

**Problem:** Element not yet rendered when query executes

**Solution:** Wait for element first:
```bash
curl -X POST http://localhost:3002/api/wait/element \
  -d '{"selector": ".my-element", "state": "visible"}'
```

### Screenshots don't show hover states

**Problem:** Hover effect not captured in screenshot

**Solution:** Hover first, then screenshot:
```bash
curl -X POST http://localhost:3002/api/interact/hover -d '{"selector": ".card"}'
curl -X POST http://localhost:3002/api/screenshot -d '{"name": "hover-state"}'
```

### Browser session expired

**Problem:** Session auto-cleanup after 5 minutes of inactivity

**Solution:** This is normal behavior. The next request will start a new session automatically.

---

## Resources

- **Interactive API Docs:** http://localhost:3002/api-docs
- **OpenAPI Spec:** http://localhost:3002/openapi.yaml
- **Health Check:** http://localhost:3002/health
- **Example Scripts:** `packages/browser-automation/examples/`
- **Test Scripts:** `packages/browser-automation/test-*.sh`

---

**Last Updated:** 2025-11-16
**Version:** 0.3.0
