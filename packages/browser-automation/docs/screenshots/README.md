# Test Screenshots

This directory contains screenshots organized by test run. Each subdirectory represents a different test scenario.

## Directory Structure

```
screenshots/
├── example-com-test/      # Basic navigation test on example.com
├── cv-builder-test/       # CV Builder app component verification
└── ui-navigation-test/    # Full UI navigation with chat expansion
```

## Test Runs

### 1. example-com-test/

**Test Script:** `test-workflow.sh`
**Target:** http://example.com
**Purpose:** Basic functionality test (navigation, element query, screenshot capture)

**Screenshots:**
- `example-homepage.png` - Full homepage
- `example-h1.png` - H1 element screenshot

### 2. cv-builder-test/

**Test Script:** `test-cv-builder.sh`
**Target:** http://localhost:3000 (CV Builder app)
**Purpose:** Verify CV Builder components are accessible

**Screenshots:**
- `cv-builder-dashboard.png` - Dashboard view
- `cv-builder-header.png` - Header component

### 3. ui-navigation-test/

**Test Script:** `test-ui-navigation.sh`
**Target:** http://localhost:3000 (CV Builder app)
**Purpose:** Comprehensive UI navigation testing with chat expansion verification

**Screenshots:** (11 total)
- `01-dashboard-initial.png` - Initial load
- `02-bio-tab.png` - Bio tab
- `03-jobs-tab.png` - Jobs tab
- `04-outputs-tab.png` - Outputs tab
- `05-condensed-chat-collapsed.png` - Floating chat (collapsed)
- `06-condensed-chat-expanded.png` - Floating chat (expanded) ✨
- `07-bio-with-expanded-chat.png` - Full page with expanded chat
- `08-interactive-chat-fullscreen.png` - Full-screen chat
- `09-mobile-view-mobile.png` - Mobile viewport
- `10-tablet-view-tablet.png` - Tablet viewport
- `11-desktop-view-desktop.png` - Desktop viewport

## Running Tests

```bash
# Basic example.com test
cd packages/browser-automation
npm run build
./test-workflow.sh

# CV Builder integration test
# (requires CV Builder app running on port 3000)
npm run dev:all  # in separate terminal
./test-cv-builder.sh

# Full UI navigation test
# (requires both app and automation service)
npm run dev --workspace=@cv-builder/browser-app  # terminal 1
HEADLESS=true PORT=3002 npm run dev              # terminal 2
./test-ui-navigation.sh                           # terminal 3
```

## All Tests Run in Headless Mode

All screenshots were captured with `HEADLESS=true` - no visible browser window.
