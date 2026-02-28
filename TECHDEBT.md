# Technical Debt

Last updated: 2026-02-28

| ID | Severity | Kind | Location | Description | Effort | Status |
|----|----------|------|----------|-------------|--------|--------|
| TD-001 | HIGH | configuration | `packages/browser-app/package.json` + `pnpm-lock.yaml` | package.json specifier bumped without regenerating lockfile — CI frozen-lockfile fails, cascades to no pipeline-result.json, overwrites PR accordion comments with bare "skipped" | S | open |

---

### TD-001 · HIGH · configuration: lockfile drift silently breaks CI and destroys PR test reports

**Location:** `packages/browser-app/package.json`, `pnpm-lock.yaml`
**Discovered:** 2026-02-28
**Description:**
When a devDependency specifier is bumped in `package.json` (e.g. `^1.3.5 → ^1.4.1`) without running `pnpm install` to regenerate `pnpm-lock.yaml`, CI fails at the `pnpm install --frozen-lockfile` step. The cascade:

1. Install fails → all downstream steps (tests, pipeline) are skipped
2. `pipeline-result.json` is never written
3. The PR comment script runs in fallback mode with no screenshot data
4. The `<!-- browser-automation-results -->` comment is **overwritten** with a bare "skipped" report — permanently replacing any previously-good accordion/diff output

The damage is invisible locally (install succeeds without `--frozen-lockfile`) and only surfaces after the branch is pushed. By the time CI posts the degraded comment, the prior good comment is gone.

**Root cause incident:** commit `c0dd2b4` bumped `@originjs/vite-plugin-federation` from `^1.3.5` to `^1.4.1` in PR #98 without updating the lockfile. Two CI runs failed; the PR #98 accordion (run #123) and the PR #100 first run were both overwritten.

**Proposed fix:** Add a pre-commit guard that detects when `package.json` is staged with a specifier change but `pnpm-lock.yaml` is not also staged. Block the commit with a clear message. See `scripts/check-lockfile.sh`.

**Effort:** S
