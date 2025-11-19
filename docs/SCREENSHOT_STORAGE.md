# Screenshot Storage System

**Version:** 2.1
**Updated:** 2025-11-18
**Status:** ✅ Production Ready (Now with @octokit/rest)

## Overview

This document describes the screenshot storage architecture for the CV Builder monorepo, designed to balance regression testing needs with repository cleanliness.

## Quick Reference

```bash
# Promote latest PR screenshots to docs/ (for regression testing baseline)
npm run screenshots:promote

# Clean up old screenshots (keeps last 3 merged PRs)
npm run screenshots:cleanup

# Preview operations
npm run screenshots:promote:dry-run
npm run screenshots:cleanup:dry-run
```

## Critical Workflow: Complete Screenshot Coverage

**Every PR MUST include a complete set of screenshots covering all test suites.**

This ensures:
- ✅ Complete regression testing baseline in docs/
- ✅ No gaps in visual documentation
- ✅ Every PR can serve as a rollback point
- ✅ Historical comparison across PRs

### PR Workflow for Screenshot Coverage

**1. Run Complete Test Suite**
```bash
npm run test:ui  # Or whatever runs all UI tests
```

**2. Verify Complete Coverage**
```bash
# Check screenshot count
find temp/screenshots/pr-{number} -name "*.png" | wc -l

# Should match expected coverage:
# - All test suites
# - All viewports (desktop, mobile, tablet)
# - All critical UI states
```

**3. Commit Screenshots to PR**
```bash
git add temp/screenshots/pr-{number}/
git commit -m "test: add complete screenshot coverage for PR #{number}"
git push
```

**4. After PR Merges - Promote to Docs**
```bash
# Promote to permanent baseline
npm run screenshots:promote

# Commit updated docs
git add docs/screenshots/
git commit -m "docs: update screenshot baseline from PR #{number}"
git push
```

## Storage Tiers

### 1. Ephemeral (Local Development)

**Location:** `temp/screenshots/ephemeral/{timestamp}/`

**Purpose:**
- Local development and testing
- Quick screenshot capture without PR context
- Experiments and debugging

**Git Tracking:** ❌ Never committed (gitignored)

**Retention:** 7 days (auto-cleanup)

**File Structure:**
```
temp/screenshots/ephemeral/
└── 2025-11-17T14-30-00/
    ├── cv-builder/
    │   ├── dashboard/
    │   │   ├── initial-load-desktop.png
    │   │   └── sidebar-collapsed-mobile.png
    │   └── bio-form/
    │       └── validation-error-desktop.png
    └── manifest.json
```

**Usage:**
```typescript
await client.screenshot({
  test: {
    app: 'cv-builder',
    suite: 'dashboard',
    case: 'initial-load'
  },
  viewport: 'desktop',
  tier: 'ephemeral'  // Default if no PR context
});
```

---

### 2. PR Documentation (Regression Testing)

**Location:** `temp/screenshots/pr-{number}/{app}/{suite}/{case}-{viewport}.png`

**Purpose:**
- PR review screenshots for human and LLM reviewers
- Visual regression testing during PR lifecycle
- Historical comparison (last 3 merged PRs)
- GitHub-linkable images for PR comments

**Git Tracking:** ✅ Yes (committed and pushed)

**Retention:** 3-PR sliding window
- ✅ Keep ALL open/active PRs
- ✅ Keep last 3 merged PRs (sorted by merge date)
- ❌ Delete closed PRs (never merged)
- ❌ Delete merged PRs beyond 3-PR window

**File Structure:**
```
temp/screenshots/
├── pr-29/                          # Current PR (open)
│   ├── cv-builder/
│   │   ├── dashboard/
│   │   │   ├── initial-load-desktop.png
│   │   │   ├── initial-load-mobile.png
│   │   │   └── sidebar-toggle-desktop.png
│   │   └── bio-form/
│   │       └── validation-desktop.png
│   └── manifest.json
├── pr-32/                          # Recent merged PR #1
├── pr-30/                          # Recent merged PR #2
└── pr-28/                          # Recent merged PR #3
```

**Usage:**
```typescript
await client.screenshot({
  test: {
    app: 'cv-builder',
    suite: 'dashboard',
    case: 'initial-load'
  },
  viewport: 'desktop',
  tier: 'pr',
  prNumber: 29  // Auto-detected from branch/env
});
```

**Git History Preservation:**
- Screenshots remain accessible in git history even after cleanup
- Commit SHAs in PR comment URLs ensure permanent access
- Historical commits preserve all files at that point in time

---

### 3. Permanent Documentation (Golden Baseline)

**Location:** `docs/screenshots/{app}/{suite}/`

**Purpose:**
- **Golden reference** screenshots for visual regression testing
- **Baseline** for comparing new PRs against
- **Complete coverage** of all test suites
- UI documentation for onboarding

**Git Tracking:** ✅ Yes (never deleted)

**Retention:** Permanent

**Source:** Promoted from most recent PR with complete screenshot coverage

**File Structure:**
```
docs/screenshots/
├── cv-builder/
│   ├── dashboard/
│   │   ├── initial-load-desktop.png
│   │   └── README.md
│   └── bio-form/
│       └── validation-states.png
└── browser-automation/
    └── api-examples/
        └── capture-element.png
```

**How to Promote:**

After merging a PR with complete screenshot coverage:

```bash
# Promote latest PR to docs/
npm run screenshots:promote

# Or promote specific PR
npm run screenshots:promote -- --pr=36

# Preview what will be promoted
npm run screenshots:promote:dry-run
```

This will:
1. Copy all screenshots from `temp/screenshots/pr-{number}/` to `docs/screenshots/`
2. Maintain semantic structure: `{app}/{suite}/{case}.png`
3. Generate README.md files with metadata and visual documentation
4. Update baseline for regression testing

**When to Promote:**
- After merging any PR with complete test coverage
- When updating visual regression baseline
- After significant UI changes that should become the new standard

---

## Screenshot Path Format

### Semantic Path Pattern

All screenshots follow this pattern:

```
{app}/{suite}/{case}-{viewport}.{ext}
```

**Examples:**
- ✅ `cv-builder/dashboard/initial-load-desktop.png`
- ✅ `cv-builder/bio-form/validation-error-mobile.png`
- ✅ `browser-automation/swagger-ui/api-docs-tablet.png`

**Benefits:**
- Human-readable file paths
- LLM agents understand purpose from path
- Easy to find specific test screenshots
- Predictable locations for GitHub PR comments
- Clear test → screenshot mapping

---

## Git Configuration

### .gitignore Rules

**Root `.gitignore`:**
```gitignore
# Ignore all temp directories by default
temp/

# But track PR screenshot directories
!temp/screenshots/
!temp/screenshots/pr-*/
!temp/screenshots/pr-*/**
```

**`temp/.gitignore`:**
```gitignore
*                                # Ignore everything
!screenshots/                    # Except screenshots directory
!screenshots/pr-*/               # And all pr-* subdirectories
!screenshots/pr-*/**             # And files within
!.gitignore
```

**Result:**
- ❌ `temp/screenshots/ephemeral/` → Gitignored (never tracked)
- ✅ `temp/screenshots/pr-29/` → Tracked in git
- ✅ `docs/screenshots/` → Tracked in git

---

## GitHub Screenshot URLs

### Critical Requirements

**URL Format:**
```
https://github.com/{owner}/{repo}/blob/{COMMIT-SHA}/{path}?raw=true
```

**Example (Correct):**
```markdown
![Dashboard](https://github.com/ojfbot/cv-builder/blob/1ba7ff2e15dcd90654fa751905e2fe361f9656c2/temp/screenshots/pr-29/cv-builder/dashboard/initial-load-desktop.png?raw=true)
```

**Example (Wrong - will 404):**
```markdown
![Dashboard](https://github.com/ojfbot/cv-builder/blob/my-branch/temp/screenshots/pr-29/cv-builder/dashboard/initial-load-desktop.png?raw=true)
```

### The 4 Critical Rules

1. **MUST use blob URLs with `?raw=true`** (NOT `raw.githubusercontent.com`)
2. **MUST use COMMIT SHA** (NOT branch name)
3. **MUST push to remote BEFORE generating URLs** (images 404 if not pushed)
4. **MUST get commit SHA AFTER push completes** (ensures correct SHA)

### Execution Order

```bash
# 1. Commit screenshot files
git add temp/screenshots/pr-29/
git commit -m "docs: add screenshots for PR #29"

# 2. Push to remote (CRITICAL - do this BEFORE generating URLs)
git push

# 3. Get commit SHA (AFTER push)
commitSha=$(git rev-parse HEAD)

# 4. Generate blob URL
imageUrl="https://github.com/ojfbot/cv-builder/blob/${commitSha}/temp/screenshots/pr-29/dashboard.png?raw=true"

# 5. Post PR comment
gh pr comment 29 --body "![Screenshot](${imageUrl})"
```

### Why Commit SHA, Not Branch Name?

| Aspect | Commit SHA | Branch Name |
|--------|------------|-------------|
| **Permanence** | ✅ Works forever | ❌ 404s after branch deleted |
| **Stability** | ✅ Immutable | ❌ Changes on force-push/rebase |
| **Git History** | ✅ Always accessible | ❌ Lost when branch deleted |
| **PR Comments** | ✅ Links never break | ❌ Links break after merge |

**Bottom line:** Commit SHAs ensure screenshot URLs work forever, even after branch deletion, rebase, or force-push.

---

## Retention Policy

### 3-PR Sliding Window

**Keep:**
- ✅ All open/active PRs (unlimited)
- ✅ Last 3 merged PRs (sorted by merge date)

**Delete:**
- ❌ Merged PRs beyond 3-PR window
- ❌ Closed PRs that were never merged
- ❌ Ephemeral screenshots older than 7 days

**Rationale:**
- 3 PRs provides sufficient regression testing history
- Typical PR has ~10-20 screenshots (~2-3 MB)
- Total tracked: ~5-10 MB (open + 3 merged)
- Storage impact is negligible
- Historical screenshots remain in git history

### Storage Estimates

**Per PR:**
- Average screenshots: 15-20 images
- Average size per PNG: ~150 KB
- **Total per PR: ~2-3 MB**

**Total Tracked Storage:**
- 3 merged PRs: ~6-9 MB
- 2-3 open PRs: ~4-6 MB
- **Total: ~10-15 MB** ✅ Very reasonable

---

## Automated Cleanup

### Cleanup Script

**Location:** `scripts/cleanup-screenshots.ts`

**Features:**
- Queries GitHub API for PR states
- Identifies open, merged, and closed PRs
- Calculates 3-PR retention window
- Removes old merged PRs and closed PRs
- Cleans ephemeral screenshots >7 days
- Reports storage freed

**Usage:**

```bash
# Execute cleanup
npm run screenshots:cleanup

# Dry run (preview without deleting)
npm run screenshots:cleanup:dry-run

# View current status
npm run screenshots:status
```

**Example Output:**

```
🧹 Screenshot Cleanup Started
📁 Base directory: temp/screenshots
📋 Retention policy: Keep last 3 merged PRs + all open PRs
⏰ Ephemeral age limit: 7 days

📊 Screenshot Storage Status
────────────────────────────────────────────────────────
Open PRs: 2
Merged PRs: 5
Closed (not merged) PRs: 1
────────────────────────────────────────────────────────

✅ Keeping 3 most recent merged PRs:
  - PR #32 (merged 2 days ago)
  - PR #30 (merged 5 days ago)
  - PR #28 (merged 8 days ago)

🗑️  Deleting 2 older merged PRs:
  - PR #25 (merged 15 days ago, 2.3 MB)
  - PR #23 (merged 22 days ago, 1.8 MB)

🗑️  Deleting 1 closed (unmerged) PRs:
  - PR #27 (closed without merge, 0.9 MB)

✨ Freed 5.0 MB from 3 PR directories
📦 Keeping 5 PR screenshot directories (2 open + 3 merged)

✅ Screenshot cleanup complete!
```

### GitHub Actions Workflow

**Location:** `.github/workflows/cleanup-screenshots.yml` (to be created)

**Triggers:**
- Weekly schedule (Sundays at 2am)
- Manual workflow dispatch
- When PR is closed/merged

**Permissions Required:**
- `contents: write` - To commit cleanup changes
- `pull-requests: read` - To query PR states

**Example Workflow:**

```yaml
name: Cleanup Screenshots

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2am
  workflow_dispatch:       # Manual trigger
  pull_request:
    types: [closed]        # When PR closes

jobs:
  cleanup:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: read

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci

      - name: Run cleanup script
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run screenshots:cleanup

      - name: Commit cleanup
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add temp/screenshots/
          if git diff --staged --quiet; then
            echo "No changes"
          else
            git commit -m "chore: cleanup screenshots (3-PR retention) [skip ci]"
            git push
          fi
```

---

## Agent Integration

### screenshot-commenter Agent

**Location:** `.agents/github/screenshot-commenter.json`

**Purpose:** Attach screenshots to GitHub PR/issue comments

**Key Features:**
- Auto-detects screenshot directories (no manual path needed)
- Copies to `temp/pr-{number}/` with semantic paths
- Commits and pushes to remote
- Gets commit SHA AFTER push
- Generates blob URLs with commit SHA
- Posts markdown comment to PR/issue

**Correct Usage Pattern:**

```typescript
// The agent handles this internally, but the flow is:

// 1. Auto-detect screenshots (most recent modified)
const screenshotDir = autoDetectScreenshots();

// 2. Copy to PR directory with semantic paths
copyScreenshots(screenshotDir, `temp/pr-${prNumber}/`);

// 3. Commit files
git add temp/pr-${prNumber}/
git commit -m "docs: add screenshots for PR #${prNumber}"

// 4. Push to remote (CRITICAL)
git push

// 5. Get commit SHA (AFTER push)
const commitSha = execSync('git rev-parse HEAD').toString().trim();

// 6. Generate URLs with commit SHA
const imageUrl = `https://github.com/${owner}/${repo}/blob/${commitSha}/${path}?raw=true`;

// 7. Post comment
gh pr comment ${prNumber} --body "![Screenshot](${imageUrl})"
```

### Common Agent Failures (FIXED)

| Issue | Cause | Fix |
|-------|-------|-----|
| Images 404 in PR comments | Used branch name instead of commit SHA | ✅ Now uses commit SHA |
| Images 404 until manual push | Generated URLs before pushing | ✅ Now pushes BEFORE generating URLs |
| Wrong commit SHA in URLs | Got SHA before committing | ✅ Now gets SHA AFTER push |
| GitHub serves HTML not image | Missing `?raw=true` parameter | ✅ Now includes `?raw=true` |

---

## Testing Screenshot URLs

After posting a PR comment with screenshots:

**1. Verify in Browser**
- Open the PR comment in GitHub
- Check that images render (not 404)

**2. If Images Don't Load, Check:**
- ✅ Commit is pushed to remote (`git push` completed)
- ✅ Path in URL is correct (matches file location)
- ✅ `?raw=true` parameter is present in URL
- ✅ Using commit SHA, not branch name
- ✅ Commit SHA matches the commit that contains the images

**3. Inspect URL Format:**

**Correct:**
```
https://github.com/ojfbot/cv-builder/blob/1ba7ff2e15dcd90654fa751905e2fe361f9656c2/temp/screenshots/pr-29/dashboard.png?raw=true
                                            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                            Commit SHA (40 characters)
```

**Wrong:**
```
https://github.com/ojfbot/cv-builder/blob/screenshot-refactor/temp/screenshots/pr-29/dashboard.png?raw=true
                                            ^^^^^^^^^^^^^^^^^^^^
                                            Branch name (ephemeral)
```

---

## Migration from Old System

If you have screenshots in old locations (timestamp directories, etc.), run:

```bash
# Preview migration
npm run screenshots:cleanup:dry-run

# Execute migration (will organize into new structure)
npm run screenshots:cleanup
```

The cleanup script will:
1. Identify all PR screenshot directories
2. Query GitHub for PR states
3. Apply 3-PR retention policy
4. Clean up old/closed PRs
5. Report storage freed

---

## Best Practices

### For Developers

1. **Use semantic paths** - `app/suite/case-viewport.png`
2. **Let tests auto-detect PR context** - No hardcoded PR numbers
3. **Run cleanup weekly** - `npm run screenshots:cleanup`
4. **Promote important screenshots to docs/** - Manual curation

### For CI/CD

1. **Set `PR_NUMBER` env var** - Enables PR tier auto-detection
2. **Push commits before posting comments** - Required for blob URLs
3. **Use commit SHA in URLs** - Never use branch names
4. **Include `?raw=true` parameter** - Required for image rendering

### For LLM Agents

1. **Always push BEFORE generating URLs** - Critical for working links
2. **Get commit SHA AFTER push** - Ensures correct SHA
3. **Use blob URL format** - Not raw.githubusercontent.com
4. **Verify execution order** - Commit → Push → Get SHA → Generate URLs

---

## Troubleshooting

### Images 404 in PR Comments

**Symptoms:** Screenshot URLs return 404 in GitHub PR comments

**Causes:**
1. ❌ Used branch name instead of commit SHA
2. ❌ Commit not pushed to remote
3. ❌ Wrong commit SHA (got SHA before committing)
4. ❌ File path incorrect

**Solutions:**
1. ✅ Use commit SHA: `git rev-parse HEAD` AFTER push
2. ✅ Ensure `git push` completed successfully
3. ✅ Get SHA AFTER committing and pushing
4. ✅ Verify file exists at path in URL

### Missing ?raw=true Parameter

**Symptoms:** GitHub serves HTML page instead of image

**Cause:** URL missing `?raw=true` parameter

**Solution:** Always append `?raw=true` to blob URLs:
```
https://github.com/.../blob/{sha}/{path}?raw=true
```

### Cleanup Script Fails

**Symptoms:** `gh` command errors or permission denied

**Causes:**
1. ❌ GitHub CLI not authenticated
2. ❌ No permissions to query PR states

**Solutions:**
1. ✅ Run `gh auth login`
2. ✅ Ensure `GH_TOKEN` has `pull_requests:read` permission

---

## Summary

### Storage Tiers

| Tier | Location | Git Tracked | Retention | Purpose |
|------|----------|-------------|-----------|---------|
| **Ephemeral** | `temp/screenshots/ephemeral/` | ❌ No | 7 days | Local dev/testing |
| **PR** | `temp/screenshots/pr-{number}/` | ✅ Yes | 3-PR window | Regression testing |
| **Docs** | `docs/screenshots/` | ✅ Yes | Permanent | Curated reference |

### Critical URL Requirements

1. ✅ Use blob URLs with `?raw=true`
2. ✅ Use commit SHA (NOT branch name)
3. ✅ Push to remote BEFORE generating URLs
4. ✅ Get commit SHA AFTER push completes

### Retention Policy

- ✅ Keep ALL open PRs
- ✅ Keep last 3 merged PRs
- ❌ Delete old merged PRs (>3)
- ❌ Delete closed/unmerged PRs
- ❌ Delete ephemeral screenshots >7 days

### Cleanup Commands

```bash
npm run screenshots:cleanup           # Execute cleanup
npm run screenshots:cleanup:dry-run   # Preview
npm run screenshots:status            # View status
```

---

**Last Updated:** 2025-11-17
**Retention Policy:** 3 merged PRs
**Status:** ✅ Production Ready

---

## GitHub API Integration (@octokit/rest)

### Overview

The screenshot upload system uses **@octokit/rest** (GitHub's official JavaScript API client) for all GitHub operations.

**Migration from gh CLI (completed 2025-11-18):**
- ✅ Replaced `gh` CLI with @octokit/rest
- ✅ Better error handling (typed status codes)
- ✅ Type-safe implementation with TypeScript
- ✅ Rate limit handling with automatic retries
- ✅ No external CLI dependency

### Authentication Setup

1. **Create a GitHub Personal Access Token:**
   ```bash
   # Go to: https://github.com/settings/tokens
   # Create token with 'repo' scope
   ```

2. **Set environment variable:**
   ```bash
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxx
   # Add to .env.local (see .env.example)
   ```

3. **Repository auto-detection:**
   - Parses `git config --get remote.origin.url`
   - Supports SSH and HTTPS formats
   - No manual configuration needed

### Implementation

**Modules:**
- `src/github/client.ts` - @octokit singleton with rate limiting
- `src/github/utils.ts` - Git operations (add, commit, push)
- `src/github/service.ts` - High-level GitHub methods

**Hybrid Approach:**
- GitHub API operations → @octokit/rest
- Git operations → shell commands (proven reliable)

**Error Handling:**
- 404: PR/issue not found
- 403: Permission denied (check GITHUB_TOKEN)
- 422: Validation failed
- All errors have detailed messages

---

**Last Updated:** 2025-11-18 (v2.1 - @octokit/rest migration)
