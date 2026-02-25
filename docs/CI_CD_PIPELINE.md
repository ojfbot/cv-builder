# CI/CD Pipeline Reference

Complete reference for the CV Builder browser automation, visual regression testing, and
GitHub Pages pipeline.

**Workflow file:** `.github/workflows/browser-automation-tests.yml`
**GitHub Pages URL:** <https://ojfbot.github.io/cv-builder/>

---

## Triggers

| Event | Condition |
|-------|-----------|
| `pull_request` → `main` | Any change under `packages/browser-app/**`, `packages/browser-automation/**`, `packages/api/**`, `packages/agent-core/**`, the workflow file, or `docker-compose.ci.yml` |
| `push` → `main` | All pushes (runs after PR merge) |
| `workflow_dispatch` | Manual trigger; supports `update_baselines: true` input |

Concurrent runs in the same PR are cancelled automatically (`cancel-in-progress: true` at
the workflow level, `cancel-in-progress: false` at the job level to prevent Docker resource
collisions).

---

## Job: `browser-tests`

### Permissions

| Permission | Reason |
|------------|--------|
| `contents: read` | Checkout source code (`actions/checkout@v4`) |
| `pull-requests: write` | Post / update PR comment |
| `issues: write` | Required by `actions/github-script` when posting comments |
| `id-token: write` | OIDC → AWS role assumption (no static keys stored) |
| `packages: none` | Principle of least privilege |
| `statuses: none` | Principle of least privilege |

> **Note:** `contents: write` and `pages: write` are granted only to the `deploy` job, not to `browser-tests`. Separating write access is a key security property of this workflow.

---

## Step-by-Step Walkthrough

### 1. Checkout + Install

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0   # full history for baseline comparison
- run: corepack enable && corepack prepare pnpm@9.15.4 --activate
- uses: actions/setup-node@v4
  with: { node-version: '24', cache: 'pnpm' }
- run: pnpm install --frozen-lockfile
- run: pnpm type-check || echo "::warning::..."
```

Type-check is non-blocking (warning only) so a type error in an unrelated package does not
prevent visual regression results from being reported.

### 2. Docker Compose — Start Services

```bash
docker compose -f docker-compose.ci.yml up -d
```

Three containers start:

| Container | Internal port | Purpose |
|-----------|--------------|---------|
| `browser-app` | 3000 | Vite dev server (React UI) |
| `api` | 3001 | Express API + agent manager |
| `browser-automation` | 3002 | Playwright test runner + health endpoint |

The workflow waits for all three `/health` (or root) endpoints before proceeding.

### 3. Run Tests

Two test suites run sequentially inside the `browser-automation` container:

```bash
# Suite 1: comprehensive interaction tests
pnpm test:comprehensive

# Suite 2: visual regression (screenshot comparison)
pnpm test:visual
```

Both steps use `continue-on-error: true` so a failure in one suite does not skip the other.
Their outcomes (`success` / `failure` / `skipped`) are captured as step outputs for the PR
comment.

### 4. Generate PR Comment

A bash script reads the screenshot manifest to produce `temp/test-results/pr-comment.md`:

```
## Browser Automation Test Results

| Step | Result |
|------|--------|
| Comprehensive tests | ✅ `success` |
| Visual regression   | ⚠️ `skipped` |

### Screenshot Baselines

11 / 14 baseline PNGs available in `test-baselines/cv-builder-visual/`

<details><summary>Missing baselines — re-run with update_baselines: true to generate</summary>

- `research-tab-desktop.png`
- `pipelines-tab-desktop.png`
- `toolbox-tab-desktop.png`

</details>
```

The manifest at
`packages/browser-automation/templates/drawio/screenshot-manifest.json`
defines the 14 expected baseline PNGs (one per draw.io cell). The script checks which files
actually exist under `test-baselines/cv-builder-visual/` and reports the gap.

### 5. Upload Artifacts

Three artifact bundles are retained:

| Artifact | Contents | Retention |
|----------|----------|-----------|
| `test-screenshots-{N}` | `temp/screenshots/` | 7 days |
| `visual-diffs-{N}` | `temp/test-results/visual-diffs/` + `test-baselines/**/diffs/` | 30 days |
| `test-report-{N}` | `temp/test-results/` | 30 days |

### 6. GitHub Pages — draw.io Viewer

```
Generate draw.io viewer page
  └─ Builds _site/index.html:
       full-viewport <iframe> wrapping viewer.diagrams.net
       with the raw GitHub URL of cvBuilder.drawio.xml as the ?url= parameter

Upload _site/ → actions/upload-pages-artifact@v3
Deploy        → actions/deploy-pages@v4
Output: page_url (e.g. https://ojfbot.github.io/cv-builder/)
```

The iframe URL is constructed as:

```
https://viewer.diagrams.net/?url=<encoded-raw-github-url>&nav=1&title=cvBuilder.drawio.xml
```

where `<encoded-raw-github-url>` points to the `cvBuilder.drawio.xml` file on the **current
branch** (not a fixed SHA), so the viewer always reflects the latest commit.

Both steps use `continue-on-error: true` — a Pages deployment failure does not fail the PR
check.

### 7. Post PR Comment

`actions/github-script` reads `pr-comment.md` and appends:

```markdown
### Draw.io Architecture Canvas

[Open interactive diagram →](https://viewer.diagrams.net/...)
[GitHub Pages viewer →](https://ojfbot.github.io/cv-builder/)

### Artifacts

- [Test Screenshots](https://github.com/.../actions/runs/...)
- [Visual Diffs](...)
- [Full Report](...)

**[View Full CI Run →](...)**
```

### 8. S3 Screenshot Pipeline (optional)

Runs only when the `S3_BUCKET` repository variable is set.

```
Configure AWS credentials (OIDC)
  └─ aws-actions/configure-aws-credentials@v4
       role: ${{ vars.AWS_ROLE_ARN }}
       region: ${{ vars.AWS_REGION || 'us-east-1' }}

Run screenshot pipeline
  └─ pnpm --filter @cv-builder/browser-automation pipeline:screenshots
       reads screenshot-manifest.json
       for each cell that has a matching baseline PNG:
         uploads {baseline}.png → s3://{bucket}/cv-builder/run-{N}/{baseline}.png
         maps the S3 URL → draw.io cell objectId
       injects all S3 URLs into cvBuilder.drawio.xml (replaces base64 / stale URLs)
       uploads updated cvBuilder.drawio.xml → s3://{bucket}/cv-builder/run-{N}/...

Commit updated draw.io canvas  ← only on main push, not on PR
  └─ commits cvBuilder.drawio.xml back to the branch [skip ci]
```

See [AWS_CI_SETUP.md](./AWS_CI_SETUP.md) for the one-time S3 + IAM OIDC setup.

### 9. Update Baselines (`workflow_dispatch` only)

When triggered manually with `update_baselines: true`:

```bash
# Re-run visual tests inside Docker with UPDATE_BASELINES=true
docker compose -f docker-compose.ci.yml exec -T \
  -e UPDATE_BASELINES=true \
  browser-automation pnpm test:visual

# Extract baselines from the container to the host
docker cp cv-builder-automation-ci:/app/packages/browser-automation/test-baselines/. \
  packages/browser-automation/test-baselines/

# Commit
git commit -m "chore: update visual regression baselines [skip ci]"
git push
```

---

## Screenshot Manifest

**File:** `packages/browser-automation/templates/drawio/screenshot-manifest.json`

Maps draw.io `<object>` cell IDs to Playwright baseline filenames:

```json
{
  "version": "1.0",
  "screenshotDir": "test-baselines/cv-builder-visual",
  "cells": [
    {
      "objectId": "S5uJ_xuYP76xC840Y5-A-1",
      "screenshotBaseline": "dashboard-initial-desktop",
      "description": "Initial app load — Interactive tab, sidebar collapsed, chat hidden",
      "testStep": "Dashboard - Initial Load",
      "uiState": {
        "TabPanel": "Interactive",
        "AppSidebar": "Collapsed",
        "ChatWindow": "Hidden"
      }
    },
    ...
  ]
}
```

The 14 baseline slots match the 14 `<object>` cells in `cvBuilder.drawio.xml`. The
screenshot pipeline uses this manifest to:

1. Find each baseline PNG under `test-baselines/cv-builder-visual/`
2. Upload to S3 (keyed by `screenshotBaseline`)
3. Inject the S3 URL into the matching draw.io cell

---

## draw.io Architecture Canvas

**File:** `packages/browser-automation/templates/drawio/cvBuilder.drawio.xml`

The canvas is a draw.io diagram with 14 screenshot slots (one per major UI state). After the
S3 pipeline runs, each slot contains a live S3 URL instead of a base64-encoded PNG, shrinking
the file from ~6 MB to ~5 KB.

Open the canvas:

- **In the browser (no install):** <https://ojfbot.github.io/cv-builder/>
- **In draw.io desktop:** File → Open → select `cvBuilder.drawio.xml`
- **Via viewer.diagrams.net:** load the raw GitHub URL directly

---

## Dependency Security Overrides

`pnpm.overrides` in `package.json` pins patched versions of transitive dependencies:

| Package | Constraint | Reason |
|---------|-----------|--------|
| `@langchain/core` | `>=1.1.8 <1.2.0` | Stay within `@langchain/langgraph` peer dep range while patching CVE |
| `langchain` | `>=1.2.3` | High-severity transitive vulnerability |
| `qs` | `>=6.14.1` | Prototype pollution (CVE) |
| `fast-xml-parser` | `>=5.3.6` | ReDoS / entity expansion (CVE) |

**Note on `@langchain/core` range:** The upper bound `<1.2.0` is intentional — v1.2.x breaks
`@langchain/langgraph`'s peer dep constraint. If you bump to v1.2.x, verify the entire
`agent-graph` package still type-checks and its checkpoint imports still resolve.

---

## Troubleshooting

### PR comment not posted

- Check `VIEWER_URL` output from the `viewer-page` step — if Pages deploy failed it will be empty.
- Ensure the workflow has `pull-requests: write` permission (added in PR #93).

### "No screenshot to inject — nothing to commit"

The S3 pipeline found zero baseline PNGs under `test-baselines/cv-builder-visual/`. This
happens when:
1. The visual regression tests were skipped or failed to produce output.
2. The `BASELINES_DIR` env var points to the wrong path.

Re-trigger with `update_baselines: true` to regenerate baselines inside Docker (where
font rendering matches the CI environment).

### "Cannot find module '@langchain/langgraph-checkpoint'"

pnpm's strict hoisting means transitive deps are not directly importable from a package's
`node_modules`. Import checkpoint types from `@langchain/langgraph` instead:

```typescript
// ✅ correct
import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata } from '@langchain/langgraph';

// ❌ broken after pnpm override update
import { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
```

### draw.io viewer shows blank / "This site can't be reached"

- GitHub Pages may take 1-2 minutes to propagate after the first deploy.
- The `pages: write` permission must be present on the job (added in PR #93).
- GitHub Pages must be configured as **"GitHub Actions"** build type in repo Settings → Pages.

### S3 images show as broken in draw.io

- The S3 bucket needs a public `GetObject` policy + CORS rule (`AllowedMethods: [GET]`).
- See [AWS_CI_SETUP.md](./AWS_CI_SETUP.md) §4 (bucket policy) and §4b (CORS).

---

## Related Documentation

- [AWS CI Setup](./AWS_CI_SETUP.md) — S3 bucket, IAM OIDC role, GitHub repo variables
- [Screenshot Storage](./SCREENSHOT_STORAGE.md) — Screenshot storage tiers and retention policy
- [Architecture](./ARCHITECTURE.md) — Overall system architecture
