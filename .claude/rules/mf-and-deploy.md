---
description: Module Federation remote surface + Vercel deployment rules for cv-builder
paths:
  - "packages/browser-app/**"
  - "packages/browser-app/vite.config.ts"
  - "vercel.json"
---

# Module Federation & deployment (cv-builder)

Path-conditional guidance (ADR-0081 Layer 1): loads when editing the browser-app MF surface or
the Vercel deploy config. Repo-wide policy is in the root `CLAUDE.md`.

## Frame OS / MF remote

Resume Builder is a **Module Federation remote** in the Frame OS cluster (see
`domain-knowledge/frame-os-context.md`). It exposes a `FrameBeadLike` implementation via
`GET /api/beads` (ADR-0016 / Gas Town Sprint 1), mapping `JobListing` entities to the universal
FrameBead shape for ShellAgent consumption (fields: `type`, `created_at`, `updated_at`,
`sourceApp` for Mayor compatibility). The AgentBead bridge (ADR-0043) maps Claude Code lifecycle
events to Gas Town bead emissions. The shell's `/api/beads` aggregation uses a Dolt-first strategy
with filesystem fallback.

### MF remote surface area
`packages/browser-app/vite.config.ts` exposes two components:
- `./Dashboard` — loaded by the shell as the main content view
- `./Settings` — bare settings panel loaded inside the shell's `SettingsModal`

### Shared singletons (must match shell exactly)
```typescript
shared: {
  react:              { singleton: true, requiredVersion: '^18.3.1' },
  'react-dom':        { singleton: true, requiredVersion: '^18.3.1' },
  '@reduxjs/toolkit': { singleton: true, requiredVersion: '^2.5.0' },
  'react-redux':      { singleton: true, requiredVersion: '^9.2.0' },
  '@carbon/react':    { singleton: true, requiredVersion: '^1.67.0' },
} as any   // 'as any' required — singleton/requiredVersion typed as commented-out in plugin types
```

### Local MF dev
`@originjs/vite-plugin-federation` only generates `remoteEntry.js` on `vite build`, NOT `vite dev`.
For MF local dev: `pnpm --filter @cv-builder/browser-app build && pnpm --filter @cv-builder/browser-app preview`

**Note**: `@originjs/vite-plugin-federation` 1.4.1 is the latest release and the plugin appears unmaintained. Per-chunk minification is not supported. Long-term, migration to Vite's native Module Federation (Vite 6+) is recommended.

## Deployment (Vercel)

cv.jim.software (Vercel) — auto-deploys on push to main.
Branch protection: PR required, rebase-only merge (GitHub Ruleset).

**Cache headers**: `vercel.json` header rules must list specific paths (e.g., `remoteEntry.js` with `no-store`) **before** the catch-all `(.*)` rule. Vercel evaluates later rules with higher priority, so the catch-all must come first to be overridden by specific paths. See commit `9b84f80`.
