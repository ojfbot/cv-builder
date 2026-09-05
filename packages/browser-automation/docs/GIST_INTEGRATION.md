# GitHub Gist Integration for PR Comments

**Version**: 1.0.0
**Status**: ✅ Complete (Sub-Issue #75)
**Dependencies**: Screenshot Capture (#73)

This document describes the GitHub Gist integration for posting visual regression test results to pull request comments with embedded screenshots.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Usage](#usage)
5. [PR Comment Format](#pr-comment-format)
6. [Gist Management](#gist-management)
7. [Rate Limiting](#rate-limiting)
8. [CI/CD Integration](#cicd-integration)

---

## Overview

The GitHub Gist integration automates visual regression reporting by:

1. **Uploading screenshots** to GitHub Gists
2. **Generating markdown** with embedded Gist images
3. **Posting PR comments** with visual diff statistics
4. **Managing gist lifecycle** (cleanup after 30 days or PR merge)
5. **Handling rate limits** gracefully

**Key Features**:

- **Gist Upload**: Uploads before/after/diff screenshots to private gists
- **PR Comments**: Posts formatted comments with embedded images and statistics
- **Update Detection**: Updates existing comments instead of creating duplicates
- **Baseline Instructions**: Provides commands to update baselines when needed
- **Rate Limit Handling**: Checks and respects GitHub API rate limits
- **Gist Cleanup**: Automatic cleanup of old gists

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    GitHub Integration                         │
│                                                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────┐ │
│  │  Capture │ →  │  Upload  │ →  │ Generate │ →  │  Post  │ │
│  │   Tests  │    │   Gists  │    │ Markdown │    │   PR   │ │
│  └──────────┘    └──────────┘    └──────────┘    └────────┘ │
│        ↓              ↓                ↓              ↓       │
│   Screenshots   Private Gists    PR Comment      GitHub API  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────┐                  ┌──────────────────┐
│ Gist Uploader    │                  │ PR Reporter      │
│                  │                  │                  │
│ - Upload files   │                  │ - Generate       │
│ - List gists     │                  │   markdown       │
│ - Delete gists   │                  │ - Post comment   │
│ - Cleanup old    │                  │ - Update existing│
│ - Rate limiting  │                  │ - Statistics     │
└──────────────────┘                  └──────────────────┘
```

---

## Components

### 1. Gist Uploader

**File**: `src/github/gist-uploader.ts` (400 LOC)

Handles all Gist-related operations.

**Key Methods**:

```typescript
class GistUploader {
  // Upload screenshots to a single gist
  async uploadScreenshots(
    beforePath?: string,
    afterPath?: string,
    diffPath?: string,
    description?: string
  ): Promise<ScreenshotUploadResult>

  // Upload arbitrary files to a gist
  async uploadGist(options: GistUploadOptions): Promise<UploadedGist>

  // Delete a gist by ID
  async deleteGist(gistId: string): Promise<void>

  // List user's gists
  async listGists(limit?: number): Promise<GistInfo[]>

  // Cleanup gists older than N days
  async cleanupOldGists(daysOld?: number, pattern?: string): Promise<number>

  // Check GitHub API rate limit
  async checkRateLimit(): Promise<RateLimitInfo>
}
```

**Upload Result**:

```typescript
interface ScreenshotUploadResult {
  beforeUrl?: string;        // Gist raw URL for before screenshot
  afterUrl?: string;         // Gist raw URL for after screenshot
  diffUrl?: string;          // Gist raw URL for diff image
  gistId: string;           // Gist ID for management
  gistUrl: string;          // Gist web URL
  markdown: string;         // Generated markdown snippet
}
```

**Usage Example**:

```typescript
import { GistUploader } from './github/gist-uploader';

const uploader = new GistUploader();

// Upload screenshots
const result = await uploader.uploadScreenshots(
  'screenshots/before.png',
  'screenshots/after.png',
  'screenshots/diff.png',
  'Step 1: Login form validation'
);

console.log(`Gist created: ${result.gistUrl}`);
console.log(`Markdown:\n${result.markdown}`);
```

**Gist Structure**:

Each uploaded gist contains up to 3 files:
- `before.png` - Baseline screenshot (if exists)
- `after.png` - Current screenshot
- `diff.png` - Visual diff image (if exists)

**Authentication**:

The uploader uses `gh` CLI for authentication:

```typescript
// Auto-detects token from:
// 1. GITHUB_TOKEN environment variable
// 2. gh auth status

const uploader = new GistUploader(); // Uses auto-detected token
// or
const uploader = new GistUploader('ghp_token...'); // Explicit token
```

---

### 2. PR Reporter

**File**: `src/github/pr-reporter.ts` (500 LOC)

Posts visual regression results to pull request comments.

**Key Methods**:

```typescript
class GitHubPRReporter {
  // Post complete test results to PR
  async postResults(options: PRCommentOptions): Promise<PRCommentResult>

  // Delete a PR comment
  async deleteComment(owner: string, repo: string, commentId: string): Promise<void>

  // Private: find existing visual regression comment
  private async findExistingComment(owner, repo, prNumber): Promise<Comment | null>

  // Private: generate markdown sections
  private generateSummary(manifest): string
  private generateInteractionSection(interaction, screenshotDir): Promise<string>
  private generateDetailedResults(manifest): string
  private generateUpdateBaselineInstructions(manifest): string
  private generateFooter(manifest): string
}
```

**Comment Options**:

```typescript
interface PRCommentOptions {
  prNumber: number;              // PR number
  owner: string;                 // Repository owner
  repo: string;                  // Repository name
  manifest: TestManifest;        // Test results
  screenshotDir: string;         // Screenshot directory
  uploadScreenshots?: boolean;   // Upload to Gists (default: true)
  includeDiffs?: boolean;        // Include diff images (default: true)
  header?: string;               // Custom header
}
```

**Comment Result**:

```typescript
interface PRCommentResult {
  commentId: string;            // GitHub comment ID
  commentUrl: string;           // Comment web URL
  screenshotsUploaded: number;  // Count of screenshots
  gistUrls: string[];           // Created gist URLs
  markdown: string;             // Posted markdown
}
```

**Usage Example**:

```typescript
import { GitHubPRReporter } from './github/pr-reporter';
import type { TestManifest } from './drawio/metadata';

const reporter = new GitHubPRReporter();

// Post results to PR
const result = await reporter.postResults({
  prNumber: 123,
  owner: 'ojfbot',
  repo: 'cv-builder',
  manifest,
  screenshotDir: './screenshots',
  uploadScreenshots: true,
  includeDiffs: true,
});

console.log(`Comment posted: ${result.commentUrl}`);
console.log(`Uploaded ${result.screenshotsUploaded} screenshots`);
```

**Update Detection**:

The reporter automatically:
1. Searches for existing visual regression comments
2. Updates the existing comment if found
3. Creates a new comment if none exists

This prevents comment spam on subsequent test runs.

---

## Usage

### Basic Workflow

```typescript
import { captureFlow } from './drawio/screenshot-orchestrator';
import { GitHubPRReporter } from './github/pr-reporter';

// 1. Capture screenshots
const captureResult = await captureFlow(schema, {
  baseUrl: 'http://localhost:3000',
  outputDir: './screenshots',
  viewport: 'desktop',
  compareWithBaselines: true,
});

// 2. Post results to PR
const reporter = new GitHubPRReporter();
const prResult = await reporter.postResults({
  prNumber: parseInt(process.env.PR_NUMBER || ''),
  owner: 'ojfbot',
  repo: 'cv-builder',
  manifest: captureResult.manifest,
  screenshotDir: './screenshots',
});

console.log(`✅ Results posted: ${prResult.commentUrl}`);
```

### Dry Run Mode

Test without posting to PR:

```bash
tsx src/github/test-pr-reporter.ts --dry-run
```

This will:
- ✅ Authenticate with GitHub
- ✅ Load test manifest
- ✅ Verify screenshots
- ✅ Generate markdown preview
- ❌ Skip actual Gist uploads
- ❌ Skip PR comment posting

Output:
```
🧪 Testing GitHub PR Reporter
Mode: DRY RUN

✅ Authenticated (Rate limit: 4998/5000)
✅ Loaded manifest: form-interaction.drawio
✅ Found 2 screenshots
✅ Markdown generated (1278 characters)
💾 Preview saved: temp/pr-comment-preview.md
```

### Live Mode

Test with actual uploads:

```bash
tsx src/github/test-pr-reporter.ts
```

This will:
- Upload one test screenshot to verify Gist API works
- Clean up the test gist immediately
- Generate full markdown preview

---

## PR Comment Format

### Structure

The PR comment has the following sections:

```markdown
## 🎨 Visual Regression Test Results

### ✅ Summary
[Table with status, steps, screenshots, duration, pass/fail counts]

---

## 📸 Screenshots
[For each interaction step:]
### ✅ Step 1: Description
[Before/After/Diff images from Gists]
**Diff Statistics:**
- Difference: 0.05%
- Pixels changed: 234
- Passed: ✅

---

## 📋 Detailed Results
[Table with all steps, status, duration, diff %]

---

## 🔄 Update Baselines
[Instructions if tests failed]

---

<details>
<summary>📊 Test Metadata</summary>
[Diagram source, timestamp, git commit, version]
</details>

*Automated visual regression testing powered by CV Builder*
```

### Example Comment

```markdown
## 🎨 Visual Regression Test Results

### ✅ Summary

| Metric | Value |
|--------|-------|
| **Status** | ✅ PASSED |
| **Total Steps** | 5 |
| **Screenshots** | 10 |
| **Duration** | 4523ms |
| **Passed** | 5 |
| **Failed** | 0 |
| **Avg Diff** | 0.03% |

---

## 📸 Screenshots

### ✅ Step 1: user types name into name field

![Before](https://gist.githubusercontent.com/abc123/raw/before.png)

![After](https://gist.githubusercontent.com/abc123/raw/after.png)

**Diff Statistics:**
- Difference: 0.02%
- Pixels changed: 42
- Passed: ✅

📎 [View full gist](https://gist.github.com/abc123)

---

## 📋 Detailed Results

| Step | Description | Status | Duration | Diff % |
|------|-------------|--------|----------|--------|
| 1 | user types name into name field | ✅ | 450ms | 0.02% |
| 2 | user types email into email field | ✅ | 420ms | 0.01% |
| 3 | user clicks Submit button | ✅ | 380ms | 0.05% |
| 4 | Form submitted successfully | ✅ | 310ms | 0.03% |
| 5 | Success message shown | ✅ | 290ms | 0.04% |

---

<details>
<summary>📊 Test Metadata</summary>

- **Diagram Source:** `form-interaction.drawio`
- **Generated:** 12/14/2025, 2:45:12 AM
- **Git Commit:** `c7b32fe2ac2a4d353e402c9346aaf3ae6cf4b7ce`
- **Version:** 1.0.0

</details>

*Automated visual regression testing powered by CV Builder*
```

### Failed Tests Comment

When tests fail:

```markdown
## 🎨 Visual Regression Test Results

### ❌ Summary

| Metric | Value |
|--------|-------|
| **Status** | ❌ FAILED |
| **Total Steps** | 3 |
| **Screenshots** | 6 |
| **Duration** | 2100ms |
| **Passed** | 1 |
| **Failed** | 2 |
| **Avg Diff** | 2.34% |

[... screenshots with diffs ...]

---

## 🔄 Update Baselines

If these changes are intentional, update the baselines:

\`\`\`bash
# Update all baselines
pnpm exec tsx src/visual/update-baselines.ts

# Or update specific test
pnpm exec tsx src/visual/update-baselines.ts --test "form-interaction.drawio"
\`\`\`

Then commit the updated baselines:

\`\`\`bash
git add test-baselines/
git commit -m "chore: update visual regression baselines"
git push
\`\`\`
```

---

## Gist Management

### Listing Gists

```typescript
const uploader = new GistUploader();
const gists = await uploader.listGists(100);

gists.forEach(gist => {
  console.log(`${gist.id}: ${gist.description} (${gist.createdAt})`);
});
```

### Deleting a Gist

```typescript
await uploader.deleteGist('abc123def456');
```

### Cleanup Old Gists

```typescript
// Delete gists older than 30 days
const deletedCount = await uploader.cleanupOldGists(30);
console.log(`Deleted ${deletedCount} old gists`);

// Delete only visual regression gists
const deletedCount = await uploader.cleanupOldGists(30, 'Visual Regression');
console.log(`Deleted ${deletedCount} old visual regression gists`);
```

### Automated Cleanup

Run cleanup on a schedule:

```yaml
# .github/workflows/cleanup-gists.yml
name: Cleanup Old Gists

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - name: Cleanup Gists
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          tsx -e "
          import { cleanupOldGists } from './src/github/gist-uploader';
          const count = await cleanupOldGists(30, 'Visual Regression');
          console.log(\`Deleted \${count} gists\`);
          "
```

---

## Rate Limiting

### Checking Rate Limit

```typescript
const uploader = new GistUploader();
const rateLimit = await uploader.checkRateLimit();

console.log(`Remaining: ${rateLimit.remaining}/${rateLimit.limit}`);
console.log(`Resets: ${rateLimit.reset}`);

if (rateLimit.remaining < 100) {
  console.warn('⚠️  Approaching rate limit!');
  const waitTime = rateLimit.reset.getTime() - Date.now();
  console.log(`Wait ${Math.ceil(waitTime / 60000)} minutes`);
}
```

### GitHub API Limits

| Action | Limit (per hour) |
|--------|-----------------|
| API calls (authenticated) | 5,000 |
| API calls (unauthenticated) | 60 |
| Gist creation | Part of API limit |
| Gist deletion | Part of API limit |

### Best Practices

1. **Check before bulk operations**:
   ```typescript
   const rateLimit = await uploader.checkRateLimit();
   if (rateLimit.remaining < gistsToUpload) {
     throw new Error('Insufficient rate limit');
   }
   ```

2. **Batch uploads**:
   ```typescript
   // Good: Upload all screenshots to one gist
   await uploader.uploadScreenshots(before, after, diff);

   // Bad: Upload each screenshot separately
   await uploader.uploadGist({ files: new Map([['before.png', before]]) });
   await uploader.uploadGist({ files: new Map([['after.png', after]]) });
   await uploader.uploadGist({ files: new Map([['diff.png', diff]]) });
   ```

3. **Handle rate limit errors**:
   ```typescript
   try {
     await uploader.uploadScreenshots(...);
   } catch (error) {
     if (error.message.includes('rate limit')) {
       console.error('Rate limit exceeded. Retry later.');
     }
     throw error;
   }
   ```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Visual Regression Tests

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  visual-regression:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '24'

      - name: Install dependencies
        run: pnpm install

      - name: Start application
        run: |
          pnpm dev:all &
          sleep 10

      - name: Run visual regression tests
        run: pnpm exec tsx src/drawio/test-capture-flow.ts

      - name: Post results to PR
        if: always()
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          tsx -e "
          import { GitHubPRReporter } from './src/github/pr-reporter';
          import fs from 'fs';

          const manifest = JSON.parse(fs.readFileSync('./temp/capture-test/manifest.json', 'utf-8'));
          const reporter = new GitHubPRReporter();

          await reporter.postResults({
            prNumber: ${{ github.event.pull_request.number }},
            owner: '${{ github.repository_owner }}',
            repo: '${{ github.event.repository.name }}',
            manifest,
            screenshotDir: './temp/capture-test',
          });
          "
```

### Environment Variables

Required:
- `GITHUB_TOKEN` - GitHub API token (auto-provided in Actions)

Optional:
- `PR_NUMBER` - Pull request number (auto-detected in Actions)
- `GITHUB_REPOSITORY` - Repository (auto-detected in Actions)

---

## Troubleshooting

### Authentication Issues

**Problem**: `GitHub token required`

**Solution**:
```bash
# Login with gh CLI
gh auth login

# Or set token
export GITHUB_TOKEN=ghp_...
```

**Verify**:
```bash
gh auth status
```

### Rate Limit Exceeded

**Problem**: `API rate limit exceeded`

**Solution**:
```typescript
const uploader = new GistUploader();
const rateLimit = await uploader.checkRateLimit();
console.log(`Wait until ${rateLimit.reset}`);
```

### Gist Upload Fails

**Problem**: `Failed to create gist`

**Possible causes**:
1. No GitHub authentication
2. Rate limit exceeded
3. File too large (>100MB gist limit)
4. Network issues

**Debug**:
```bash
# Test gh CLI
gh gist list

# Check rate limit
gh api rate_limit

# Test manual gist creation
gh gist create test.txt
```

### PR Comment Not Posting

**Problem**: Comment not appearing on PR

**Possible causes**:
1. Missing `pull-requests: write` permission
2. PR number incorrect
3. Repository name incorrect

**Debug**:
```bash
# Test PR comment
gh pr comment <number> --body "Test"

# Check PR number
gh pr view <number>
```

---

## See Also

- [Screenshot Capture Pipeline](./SCREENSHOT_CAPTURE.md) - Capture workflow
- [Visual Regression Architecture](../../../docs/VISUAL_REGRESSION_ARCHITECTURE.md) - Overall system
- [GitHub CLI Documentation](https://cli.github.com/manual/) - gh command reference
- [GitHub Gists API](https://docs.github.com/en/rest/gists) - Gist API reference

---

**Completion**: Sub-Issue #75 ✅ COMPLETE
**Implementation**: 900 LOC (gist-uploader, pr-reporter, tests)
**Testing**: Validated with dry-run mode
**Documentation**: Comprehensive (this document)
