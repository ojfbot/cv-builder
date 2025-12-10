# Visual Regression Testing Guide

> Deterministic screenshot comparison for CI/CD pipelines

## Overview

The CV Builder browser automation system includes a **deterministic visual regression testing framework** that detects unintended UI changes automatically. Tests run in Docker containers on GitHub Actions with pixel-perfect comparison against versioned baselines.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions CI/CD Pipeline                               │
│                                                              │
│  ┌────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │ Pull       │──▶│ Docker       │──▶│ Visual Regression│  │
│  │ Request    │   │ Containers   │   │ Tests            │  │
│  └────────────┘   └──────────────┘   └──────────────────┘  │
│                           │                     │            │
│                           │                     ▼            │
│                           │            ┌──────────────────┐  │
│                           │            │ Compare against  │  │
│                           │            │ Git Baselines    │  │
│                           │            └──────────────────┘  │
│                           │                     │            │
│                           ▼                     ▼            │
│                  ┌──────────────┐      ┌──────────────────┐ │
│                  │ Screenshot   │      │ Pixel Diff       │ │
│                  │ Capture      │      │ (pixelmatch)     │ │
│                  └──────────────┘      └──────────────────┘ │
│                                                 │            │
│                                                 ▼            │
│                                        ┌──────────────────┐ │
│                                        │ Visual Diff      │ │
│                                        │ Report + Images  │ │
│                                        └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Comparison Engine** (`src/visual/comparison-engine.ts`)
   - Pixel-perfect diff using pixelmatch
   - Configurable thresholds (0-1 scale)
   - Anti-aliasing detection
   - RGB diff visualization

2. **Baseline Manager** (`src/visual/baseline-manager.ts`)
   - Git-tracked baseline storage
   - Platform-specific baselines (macOS, Linux, Windows)
   - Metadata indexing
   - Version control integration

3. **Visual Diff Reporter** (`src/test-runner/reporters/VisualDiffReporter.ts`)
   - GitHub-friendly markdown reports
   - Embedded baseline/current/diff images
   - PR comment summaries
   - Artifact management

4. **Visual Assertions** (`src/test-runner/assertions/visual.ts`)
   - `matchesBaseline()` - Exact pixel match
   - `diffWithinThreshold()` - Percentage-based tolerance
   - `hasChangedFromBaseline()` - Detect intentional changes
   - Auto-baseline creation

## Quick Start

### 1. Run Visual Tests Locally

```bash
# Start services
pnpm dev:all

# In another terminal, run visual regression tests
pnpm --filter @cv-builder/browser-automation test:visual
```

### 2. First Run (Create Baselines)

On the first run, baselines will be auto-created:

```bash
pnpm --filter @cv-builder/browser-automation test:visual
# Output:
# 📸 Created new baseline: dashboard-initial-desktop
# 📸 Created new baseline: bio-tab-desktop
# ...
# ✅ All tests passed (baselines created)
```

Baselines are saved to `packages/browser-automation/test-baselines/`:

```
test-baselines/
├── index.json                        # Metadata index
├── cv-builder-visual/
│   ├── dashboard-initial-desktop.png
│   ├── bio-tab-desktop.png
│   ├── jobs-tab-desktop.png
│   ├── dashboard-mobile.png
│   └── dashboard-tablet.png
└── README.md
```

**Commit baselines to git:**

```bash
git add packages/browser-automation/test-baselines/
git commit -m "chore: add visual regression baselines"
```

### 3. Detect Visual Changes

When UI changes occur, tests will fail and show diff details:

```bash
pnpm --filter @cv-builder/browser-automation test:visual

# Output:
# ❌ Visual regression detected in "dashboard-initial-desktop":
#   - Different pixels: 1,247
#   - Difference: 0.0634%
#   - Baseline: test-baselines/cv-builder-visual/dashboard-initial-desktop.png
#   - Current: temp/screenshots/visual-test/dashboard-initial.png
#   - Diff: test-baselines/cv-builder-visual/diffs/dashboard-initial-desktop.diff.png
#
# To update baseline:
#   pnpm test:visual:update -- "cv-builder-visual" "dashboard-initial-desktop"
```

### 4. Review and Update Baselines

**View the diff images:**

```bash
# Open diff image
open test-baselines/cv-builder-visual/diffs/dashboard-initial-desktop.diff.png
```

**If changes are intentional, update baselines:**

```bash
# Update specific baseline
pnpm --filter @cv-builder/browser-automation test:visual:update

# Or update all baselines at once
pnpm --filter @cv-builder/browser-automation test:visual:update:all
```

**Commit updated baselines:**

```bash
git add packages/browser-automation/test-baselines/
git commit -m "chore: update visual baselines for new dashboard design"
```

## Writing Visual Regression Tests

### Basic Example

```typescript
import { createTestSuite, createTestRunner } from '@cv-builder/browser-automation/test-runner';
import { VisualDiffReporter } from '@cv-builder/browser-automation/test-runner/reporters/VisualDiffReporter';
import { createVisualAssertions } from '@cv-builder/browser-automation/test-runner/assertions/visual';

const { suite, client } = createTestSuite('My Visual Tests', API_URL);

// Initialize visual reporter and assertions
const visualReporter = new VisualDiffReporter('./temp/test-results');
const visual = createVisualAssertions('my-test-suite', visualReporter);

suite.test('Homepage - Desktop', async ({ assert }) => {
  await client.navigate('https://myapp.com');
  await client.wait({ type: 'selector', selector: '.content' });

  // Capture screenshot
  const result = await client.screenshot({
    name: 'homepage',
    viewport: 'desktop',
    fullPage: true,
    path: 'temp/screenshots/visual-test',
  });

  assert.screenshotCaptured(result);

  // Compare against baseline
  await visual.matchesBaseline(result.path, 'homepage-desktop', {
    threshold: 0.1, // 0.1 = 10% tolerance
  });
});

// Run with visual reporter
const runner = createTestRunner({
  reporters: ['console', visualReporter],
});
await runner.run(suite);
```

### Advanced Options

```typescript
// Pixel-perfect comparison (no tolerance)
await visual.matchesBaseline(result.path, 'logo', {
  threshold: 0, // 0 = exact match
});

// Lenient comparison (for text rendering)
await visual.matchesBaseline(result.path, 'paragraph', {
  threshold: 0.2, // 20% tolerance
  includeAA: true, // Ignore anti-aliasing differences
});

// Percentage-based threshold
await visual.diffWithinThreshold(result.path, 'button', 2.5); // Max 2.5% diff

// Test for intentional changes
await visual.hasChangedFromBaseline(result.path, 'new-feature');

// Manual baseline management
await visual.saveBaseline(result.path, 'custom-baseline');
```

### Multi-Viewport Testing

```typescript
const viewports = ['desktop', 'tablet', 'mobile'];

for (const viewport of viewports) {
  suite.test(`Dashboard - ${viewport}`, async ({ assert }) => {
    const result = await client.screenshot({
      name: 'dashboard',
      viewport,
      fullPage: true,
      path: 'temp/screenshots/visual-test',
    });

    await visual.matchesBaseline(
      result.path,
      `dashboard-${viewport}`,
      { threshold: 0.1 }
    );
  });
}
```

## CI/CD Integration

### GitHub Actions Workflow

Visual regression tests run automatically on every PR:

**.github/workflows/browser-automation-tests.yml**

```yaml
name: Browser Automation Tests

on:
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      update_baselines:
        description: 'Update visual regression baselines'
        type: boolean
        default: false

jobs:
  browser-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run visual regression tests
        run: pnpm --filter @cv-builder/browser-automation test:visual

      - name: Upload visual diffs
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: visual-diffs
          path: test-baselines/**/diffs/

      - name: Comment PR with results
        uses: actions/github-script@v7
        # ... (see full workflow file)
```

### Docker Container Setup

Tests run in Docker containers for deterministic behavior:

**docker-compose.ci.yml**

```yaml
services:
  browser-automation:
    build: ./packages/browser-automation
    environment:
      - CI=true
      - HEADLESS=true
      - DISABLE_ANIMATIONS=true
    volumes:
      # Mount baselines as read-only
      - ./packages/browser-automation/test-baselines:/app/test-baselines:ro
```

### Deterministic Rendering

To ensure consistent screenshots across environments:

1. **Fixed viewport sizes**
   ```typescript
   viewport: 'desktop' // Always 1920x1080
   ```

2. **Wait for stability**
   ```typescript
   await client.wait({ type: 'timeout', timeout: 1000 });
   ```

3. **Disable animations**
   ```typescript
   // Injected via CSS in Docker container
   * { animation: none !important; transition: none !important; }
   ```

4. **Platform-specific baselines**
   ```
   dashboard-desktop.linux.png   # Used in CI (Linux)
   dashboard-desktop.darwin.png  # Used locally (macOS)
   dashboard-desktop.png         # Fallback
   ```

## Baseline Management

### Directory Structure

```
packages/browser-automation/test-baselines/
├── index.json                    # Metadata index
├── README.md                     # Usage instructions
├── .gitignore                    # Ignore diffs, keep baselines
├── cv-builder-visual/            # Test suite directory
│   ├── dashboard-initial-desktop.png
│   ├── bio-tab-desktop.png
│   ├── jobs-tab-desktop.png
│   ├── dashboard-mobile.png
│   ├── dashboard-tablet.png
│   └── diffs/                    # Generated diffs (gitignored)
│       ├── dashboard-initial-desktop.diff.png
│       └── bio-tab-desktop.diff.png
└── another-test-suite/
    └── ...
```

### Index Metadata

**test-baselines/index.json**

```json
{
  "version": "1.0.0",
  "updatedAt": "2025-11-17T10:30:00Z",
  "baselines": {
    "cv-builder-visual/dashboard-initial-desktop": {
      "id": "cv-builder-visual/dashboard-initial-desktop",
      "testName": "cv-builder-visual",
      "name": "dashboard-initial-desktop",
      "createdAt": "2025-11-01T08:00:00Z",
      "updatedAt": "2025-11-17T10:30:00Z",
      "dimensions": {
        "width": 1920,
        "height": 1080
      },
      "fileSize": 245678,
      "platform": "linux"
    }
  }
}
```

### Updating Baselines

**When to update:**
- ✅ Intentional UI changes (new design, feature)
- ✅ Bug fixes that affect appearance
- ✅ Responsive breakpoint adjustments
- ❌ Accidental regressions

**How to update:**

```bash
# Method 1: Run tests with update flag
UPDATE_BASELINES=true pnpm test:visual

# Method 2: Use npm script
pnpm test:visual:update

# Method 3: Workflow dispatch in GitHub Actions
# Go to Actions → Browser Automation Tests → Run workflow
# Check "Update visual regression baselines"
```

**Best practices:**
1. Review diffs carefully before updating
2. Update baselines in a separate commit
3. Include before/after screenshots in PR
4. Document reason for baseline changes

## GitHub Actions Integration

### Workflow Features

1. **Automatic PR Comments**
   - Test summary with pass/fail status
   - Visual diff count and percentage
   - Links to artifacts

2. **Artifact Uploads**
   - `test-screenshots-{run}` - All captured screenshots
   - `visual-diffs-{run}` - Baseline/current/diff images
   - `test-report-{run}` - Markdown reports

3. **Matrix Testing**
   - Parallel tests across viewports (desktop, tablet, mobile)
   - Independent artifact uploads per viewport
   - Fast feedback (< 10 minutes)

4. **Baseline Updates**
   - Manual workflow dispatch
   - Auto-commit updated baselines
   - Skip CI on baseline commits

### Example PR Comment

```markdown
## 🤖 Browser Automation Test Results

**Status:** ❌ TESTS FAILED

| Category | Passed | Failed | Total |
|----------|--------|--------|-------|
| Functional Tests | 22 | 0 | 22 |
| Visual Regression | 5 | 2 | 7 |

### ⚠️ Visual Changes Detected

2 screenshot(s) differ from baseline. See full report for details.

---

📊 **[View Full Report](#)** | 🎯 **[View Visual Diffs](#)**
```

## Best Practices

### Test Organization

```typescript
// Group related tests by feature
suite.test('Dashboard - Initial Load', async () => { ... });
suite.test('Dashboard - After Interaction', async () => { ... });

// Use descriptive baseline names
await visual.matchesBaseline(result.path, 'dashboard-initial-desktop');
await visual.matchesBaseline(result.path, 'dashboard-after-click-desktop');
```

### Screenshot Stability

```typescript
// Wait for animations to complete
await client.wait({ type: 'timeout', timeout: 500 });

// Wait for network idle
await client.wait({ type: 'network', timeout: 3000 });

// Wait for specific element
await client.wait({ type: 'selector', selector: '.loaded' });
```

### Threshold Selection

- **Critical UI (logos, buttons):** `threshold: 0` (pixel-perfect)
- **Text content:** `threshold: 0.1` with `includeAA: true`
- **Complex layouts:** `threshold: 0.2`
- **Dynamic content:** Consider excluding from visual tests

### Platform Differences

```typescript
// Create platform-specific baselines
const platform = process.platform;
await visual.saveBaseline(
  result.path,
  `dashboard-${platform}` // dashboard-darwin, dashboard-linux
);
```

## Troubleshooting

### Tests Fail Locally But Pass in CI

**Cause:** Platform rendering differences (fonts, anti-aliasing)

**Solution:** Create platform-specific baselines

```bash
# On macOS
pnpm test:visual:update  # Creates *.darwin.png

# In CI (Linux)
# Creates *.linux.png automatically
```

### Diff Shows Only Anti-Aliasing Changes

**Cause:** Font rendering differences

**Solution:** Enable anti-aliasing detection

```typescript
await visual.matchesBaseline(result.path, 'text-content', {
  threshold: 0.1,
  includeAA: true, // Ignore AA differences
});
```

### Screenshots Have Dynamic Content

**Cause:** Timestamps, user IDs, random data

**Solution:** Exclude dynamic regions or use higher threshold

```typescript
// Option 1: Capture specific element only
const result = await client.screenshot({
  name: 'static-content',
  selector: '.static-container', // Exclude dynamic areas
});

// Option 2: Use higher threshold
await visual.matchesBaseline(result.path, 'dynamic', {
  threshold: 0.3, // Tolerate 30% difference
});
```

### CI Takes Too Long

**Cause:** Too many screenshots or large images

**Solution:** Optimize test coverage

```typescript
// Test critical paths only in visual regression
// Use viewport-specific tests sparingly

// Good: Test one representative viewport
await visual.matchesBaseline(result.path, 'critical-desktop');

// Avoid: Testing every viewport for every component
```

## API Reference

### ComparisonEngine

```typescript
import { ComparisonEngine } from '@cv-builder/browser-automation/visual/comparison-engine';

const engine = new ComparisonEngine();

const result = await engine.compare(
  baselinePath,
  currentPath,
  diffOutputPath,
  {
    threshold: 0.1,
    includeAA: false,
    diffColor: [255, 0, 0, 255], // Red
    alpha: 0.1,
  }
);

// result: {
//   matches: boolean,
//   diffPixelCount: number,
//   diffPercentage: number,
//   totalPixels: number,
//   baselinePath: string,
//   currentPath: string,
//   diffPath?: string,
//   timestamp: string,
//   dimensions: { width, height }
// }
```

### BaselineManager

```typescript
import { BaselineManager } from '@cv-builder/browser-automation/visual/baseline-manager';

const manager = new BaselineManager();

// Initialize baselines directory
await manager.initialize();

// Save baseline
await manager.saveBaseline('test-suite', 'screenshot-name', sourcePath);

// Check if baseline exists
const exists = manager.hasBaseline('test-suite', 'screenshot-name');

// Get baseline path
const path = manager.getBaselinePath('test-suite', 'screenshot-name');

// List all baselines
const baselines = manager.listBaselines('test-suite');

// Get diff output path
const diffPath = manager.getDiffPath('test-suite', 'screenshot-name');
```

### VisualAssertions

```typescript
import { createVisualAssertions } from '@cv-builder/browser-automation/test-runner/assertions/visual';

const visual = createVisualAssertions('test-suite', visualReporter);

// Assert exact match
await visual.matchesBaseline(screenshotPath, 'name', { threshold: 0 });

// Assert within threshold
await visual.diffWithinThreshold(screenshotPath, 'name', 5.0); // Max 5% diff

// Assert has changed (for testing intentional changes)
await visual.hasChangedFromBaseline(screenshotPath, 'name');

// Save baseline
await visual.saveBaseline(screenshotPath, 'name');

// Check baseline existence
const exists = visual.hasBaseline('name');
```

## Related Documentation

- [Test Authoring Guide](./TEST_AUTHORING_GUIDE.md) - Writing tests
- [Migration Guide](./MIGRATION_GUIDE.md) - Migrating from shell scripts
- [GitHub Actions](./.github/workflows/browser-automation-tests.yml) - CI/CD setup
- [Docker Compose](./docker-compose.ci.yml) - Container configuration

## Support

For issues or questions:
- **GitHub Issues:** https://github.com/ojfbot/cv-builder/issues/37
- **Documentation:** This file and related docs
- **Examples:** `tests/visual/cv-builder-visual.test.ts`
