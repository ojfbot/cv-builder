# Visual Regression Testing Architecture

## Overview

This document explains how screenshots flow through the visual regression system, from capture to GitHub PR comments.

## Screenshot Storage Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VISUAL REGRESSION TEST FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

1. TEST EXECUTION (Playwright captures screenshots)
   │
   ├─ Current Screenshots (Ephemeral - 7 day retention)
   │  └─ temp/screenshots/YYYY-MM-DDTHH-MM-SS/
   │     ├─ dashboard-initial-desktop.png
   │     ├─ bio-tab-layout-desktop.png
   │     ├─ jobs-tab-layout-desktop.png
   │     └─ chat-component-desktop.png
   │
   ├─ Comparison (pixelmatch algorithm)
   │  ├─ Loads baseline from: test-baselines/{suite}/{name}.png
   │  ├─ Compares pixel-by-pixel with threshold (default: 0.1% = STANDARD)
   │  └─ Generates diff if difference exceeds threshold
   │
   └─ Visual Diffs (Ephemeral - 30 day retention)
      └─ test-baselines/{suite}/diffs/
         ├─ dashboard-initial-desktop.diff.png (red highlights)
         ├─ bio-tab-desktop.diff.png
         └─ ...

2. BASELINES (Git-tracked, permanent)
   └─ packages/browser-automation/test-baselines/
      ├─ index.json (metadata: dimensions, timestamps, git commits)
      ├─ README.md (usage instructions)
      ├─ .gitignore (exclude diffs and temp files)
      └─ {test-suite}/
         ├─ dashboard-initial-desktop.png (baseline)
         ├─ bio-tab-desktop.png
         └─ platform-specific baselines:
            ├─ font-rendering.darwin.png (macOS)
            ├─ font-rendering.linux.png (Ubuntu/CI)
            └─ font-rendering.win32.png (Windows)

3. CI ARTIFACTS (GitHub Actions storage)
   ├─ test-screenshots-{run_number}
   │  └─ Retention: 7 days
   │  └─ All captured screenshots organized by timestamp
   │
   ├─ visual-diffs-{run_number}
   │  └─ Retention: 30 days
   │  └─ Diff images showing pixel-level differences
   │
   └─ test-report-{run_number}
      └─ Retention: 30 days
      └─ Markdown reports, PR comments, metadata

4. GITHUB PR COMMENTS (GitHubPRReporter)
   ├─ Automatically generated in CI
   ├─ Contains:
   │  ├─ Test summary (passed/failed/skipped)
   │  ├─ Visual diff details (pixels changed, % difference)
   │  ├─ Artifact download links
   │  ├─ Update baseline instructions
   │  └─ Collapsible error details
   │
   └─ Example:
      ## ❌ Browser Automation Test Results

      ### 📊 Summary
      | Metric | Count |
      |--------|-------|
      | ✅ Passed | 1 |
      | ❌ Failed | 6 |

      ### 🎨 Visual Regression Differences
      #### Dashboard - Initial Load
      | Metric | Value |
      |--------|-------|
      | Different Pixels | 27,183 |
      | Difference | 1.31% |

      📸 View the diff: Download the `visual-diffs` artifact below
```

## How Screenshots Become PR Comment Attachments

### Current Implementation (PR #62)

GitHub Actions **cannot directly embed artifact images** into PR comments due to authentication requirements. Instead, we use a hybrid approach:

1. **Artifacts Upload** → Screenshots saved to GitHub Actions artifacts
2. **Metadata Extraction** → PR reporter parses visual diff results
3. **Markdown Generation** → Rich markdown with tables, collapsible sections, and download links
4. **PR Comment** → Posted via `actions/github-script` with artifact URLs

### Example PR Comment Structure

```markdown
## ❌ Browser Automation Test Results

### 📊 Summary

| Metric | Count |
|--------|-------|
| ✅ Passed | 1 |
| ❌ Failed | 6 |
| ⏱️ Duration | 13.5s |

### 🎨 Visual Regression Differences

Found 6 visual regression(s):

#### Dashboard - Initial Load

| Metric | Value |
|--------|-------|
| Different Pixels | 27,183 |
| Difference | 1.3109% |
| Threshold | 0.1% (STANDARD) |

> 📸 **View the diff**: Download the `visual-diffs` artifact below to see the side-by-side comparison.

<details>
<summary>📁 File Paths</summary>

\`\`\`
Baseline: dashboard-initial-desktop.png
Current:  dashboard-initial-desktop.png
Diff:     dashboard-initial-desktop.diff.png
\`\`\`

</details>

---

### 📦 Artifacts

Download artifacts from the [CI run](https://github.com/ojfbot/cv-builder/actions/runs/...):

- 📸 **[Test Screenshots](...)** - All captured screenshots
- 🎯 **[Visual Diffs](...)** - Side-by-side comparison images
- 📊 **[Test Report](...)** - Detailed test results

> 💡 **Tip**: Download the `visual-diffs` artifact to see highlighted pixel differences.

---

### 🔄 Updating Baselines

If the visual changes are intentional:

**Option 1: Update all baselines locally**
\`\`\`bash
UPDATE_BASELINES=true pnpm --filter @cv-builder/browser-automation test:visual
git add packages/browser-automation/test-baselines/
git commit -m "chore: update visual regression baselines"
git push
\`\`\`

**Option 2: Trigger workflow to update baselines in CI**
\`\`\`bash
gh workflow run "Browser Automation Tests (No Docker)" \\
  --field update_baselines=true
\`\`\`
```

## Future Enhancement: Direct Image Embedding

To embed screenshots directly in PR comments, we have three options:

### Option 1: Cloud Storage (Recommended)

Upload screenshots to S3/GCS/Azure Blob and use public URLs:

```typescript
// Upload diff to cloud storage
const diffUrl = await uploadToS3(diffPath);

// Embed in markdown
markdown += `![Visual Diff](${diffUrl})\n`;
```

**Pros**: Direct embedding, permanent storage, works everywhere
**Cons**: Requires cloud provider setup, additional cost

### Option 2: GitHub Gists

Upload screenshots as gists and use raw URLs:

```typescript
const gist = await github.rest.gists.create({
  files: {
    'diff.png': { content: base64Image }
  }
});

markdown += `![Diff](${gist.files['diff.png'].raw_url})\n`;
```

**Pros**: No external dependencies, free
**Cons**: Gist pollution, rate limits, requires cleanup

### Option 3: Inline Base64 (Not Recommended)

Embed images as base64 data URLs:

```markdown
![Diff](data:image/png;base64,iVBORw0KGgoAAAANS...)
```

**Pros**: No external dependencies
**Cons**: Massive comment size, GitHub may truncate, poor performance

## Platform-Specific Baselines

Font rendering and anti-aliasing differ across platforms:

```
darwin (macOS)   → Retina displays, San Francisco font
linux (Ubuntu)   → Standard DPI, Liberation fonts
win32 (Windows)  → ClearType, Segoe UI
```

The system automatically selects the correct baseline:

1. Check for `{name}.{platform}.png`
2. Fall back to generic `{name}.png`

**CI Strategy**: Create baselines on Linux (GitHub Actions runner) to match CI environment.

## Threshold Configuration

Visual regression thresholds are defined in `src/visual/constants.ts`:

```typescript
export const VISUAL_THRESHOLDS = {
  PIXEL_PERFECT: 0,      // 0% tolerance (exact match)
  STRICT: 0.01,          // 0.01% tolerance
  STANDARD: 0.1,         // 0.1% tolerance (default)
  LENIENT: 0.25,         // 0.25% tolerance
  PERMISSIVE: 0.5,       // 0.5% tolerance
} as const;
```

**Current Issue**: Baselines created on macOS, CI runs on Linux → 1-3% differences due to font rendering.

**Solution**: Re-create baselines in Linux CI environment.

## Baseline Update Workflow

### Manual Update (Local)

```bash
# Update all baselines
UPDATE_BASELINES=true pnpm --filter @cv-builder/browser-automation test:visual

# Update specific baseline
pnpm test:visual:update -- "cv-builder-visual" "dashboard-initial-desktop"

# Commit changes
git add packages/browser-automation/test-baselines/
git commit -m "chore: update visual regression baselines"
git push
```

### Automated Update (CI)

```bash
# Trigger workflow with baseline update flag
gh workflow run "Browser Automation Tests (No Docker)" \
  --field update_baselines=true
```

The workflow will:
1. Run visual tests
2. Save new screenshots as baselines
3. Commit changes with `github-actions[bot]`
4. Push to branch

## Security Considerations

### Development-Only Endpoints

Certain endpoints are restricted to prevent production abuse:

- `/api/storage/clear` - Clears browser storage
- `/api/context/reset` - Resets browser context
- `/api/console/*` - Browser console access
- `/api/state/*` - Code evaluation

**Allowed Environments**: `development`, `test`
**Blocked in**: `production`

### Artifact Retention

- Screenshots: 7 days (ephemeral testing data)
- Diffs: 30 days (debugging recent regressions)
- Reports: 30 days (audit trail)

### Sensitive Data

Screenshots may contain:
- API keys in console logs
- User data in forms
- Session tokens in cookies

**Mitigation**:
- Use mock data in tests
- Sanitize artifacts before public sharing
- Set appropriate retention periods

## Troubleshooting

### Visual Diffs in CI (Expected)

**Symptom**: Tests pass locally but fail in CI with 1-3% differences

**Cause**: Font rendering differences between macOS (local) and Linux (CI)

**Solution**:
```bash
# Re-create baselines in CI environment
gh workflow run "Browser Automation Tests (No Docker)" \
  --field update_baselines=true
```

### No Screenshots in Artifacts

**Symptom**: Artifacts are empty or missing

**Causes**:
1. Tests failed before screenshot capture
2. `temp/screenshots/` directory not created
3. Workflow upload step failed

**Check**:
```bash
# Verify temp directory exists
ls -la temp/screenshots/

# Check workflow logs
gh run view {run_id} --log | grep "Upload test screenshots"
```

### PR Comment Not Generated

**Symptom**: No PR comment appears

**Causes**:
1. `pr-comment.md` not generated
2. GitHub script permissions missing
3. Not a pull_request event

**Check**:
```yaml
permissions:
  pull-requests: write  # Required for PR comments
```

## Implementation Details

### GitHubPRReporter Class

Located: `packages/browser-automation/src/test-runner/reporters/GitHubPRReporter.ts`

**Key Methods**:
- `onTestComplete(result)` - Tracks test results, extracts visual diff info
- `onSuiteComplete(summary)` - Generates final markdown report
- `generateVisualDiffSection()` - Creates diff comparison tables
- `generateArtifactLinks()` - Adds download links for artifacts

**Usage**:
```typescript
const prReporter = new GitHubPRReporter({
  outputPath: './temp/test-results/pr-comment.md',
  runId: process.env.GITHUB_RUN_ID,
  repository: process.env.GITHUB_REPOSITORY,
  includeVisualDiffs: true,
});

runner.use(prReporter);
```

### Workflow Integration

The workflow reads the generated markdown and posts it:

```yaml
- name: Comment PR with results
  if: github.event_name == 'pull_request' && always()
  uses: actions/github-script@v7
  with:
    script: |
      const fs = require('fs');
      const comment = fs.readFileSync('temp/test-results/pr-comment.md', 'utf8');

      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: comment
      });
```

## Next Steps

1. ✅ **Fix CI failures** - Re-create baselines in Linux environment
2. 🚧 **Add screenshot embedding** - Implement cloud storage option
3. 🔮 **Interactive diff viewer** - HTML report with image sliders
4. 📊 **Trend analysis** - Track visual stability over time
5. 🎨 **Ignore regions** - Exclude dynamic content (dates, counters)

---

**Last Updated**: 2025-12-10
**Author**: Claude Code
**PR**: #62 - Visual Regression Testing Infrastructure
