# Module Federation Integration

cv-builder exposes its Dashboard as a Module Federation **remote** so the Frame shell
can mount it at runtime without an iframe.

## Remote entry

| Environment | URL |
|-------------|-----|
| Dev (local) | `http://localhost:3000/assets/remoteEntry.js` |
| Production  | Set `VITE_REMOTE_CV_BUILDER=https://cv.jim.software` in shell env |

The shell reads `VITE_REMOTE_CV_BUILDER` (see `shell/packages/shell-app/vite.config.ts`).
The env var is **shell-side** — cv-builder does not read it.

## Shell consumption

```ts
// shell/packages/shell-app/vite.config.ts (already configured)
federation({
  name: 'shell',
  remotes: {
    cv_builder: `${process.env.VITE_REMOTE_CV_BUILDER ?? 'http://localhost:3000'}/assets/remoteEntry.js`,
  },
  shared: ['react', 'react-dom', '@reduxjs/toolkit', 'react-redux', '@carbon/react'],
})
```

```tsx
// Lazy-load the remote component in the shell
const CvBuilderDashboard = React.lazy(() => import('cv_builder/Dashboard'))
```

## Shared singletons

Both the remote and shell must declare the same packages as `shared` to guarantee a single
runtime instance. Mismatches cause duplicate React/Provider trees and style conflicts.

| Package | Remote version | Shell must match |
|---------|---------------|-----------------|
| `react` / `react-dom` | `^18.3.1` | `^18.x` |
| `@reduxjs/toolkit` | (via agent-core) | same major |
| `react-redux` | (via agent-core) | same major |
| `@carbon/react` | `^1.67.0` | `^1.x` |

## Redux store contract

The exported `Dashboard` component is **self-contained** — it wraps itself in its own
`<Provider store={cvBuilderStore}>` and `<AgentProvider>`. The shell does **not** need to
configure or inject cv-builder's Redux slices.

```
Shell Provider (shell store)
  └── cv_builder/Dashboard
        └── Provider (cv-builder store)   ← innermost wins for cv-builder components
              └── AgentProvider
                    └── DashboardContent
```

This means cv-builder state (`navigation`, `chat`, `agent`, `threads`, `v2`) is fully
isolated from the shell's store. Cross-app state sharing (e.g. active theme, auth session)
must go through a shared store slice owned by the shell — see the follow-up issue for the
Frame-wide store strategy.

## Known limitations

### minify: false

`@originjs/vite-plugin-federation` ≤1.4.x mangles federation placeholder identifiers
(`__federation_expose_*`, `__federation_shared_*`) under esbuild/terser, breaking the
remote at runtime. `minify: false` is therefore applied to the entire build. This means
the production bundle ships unminified (~1.6 MB exposed chunk + main bundle).

Tracked in the follow-up issue. Re-evaluate when upgrading past 1.4.x or if upstream
ships a fix.

## Local dev checklist

1. `pnpm dev:all` in cv-builder (browser-app on `:3000`, api on `:3001`)
2. `pnpm dev` in shell (`:4000`)
3. Shell tile loads cv-builder Dashboard — no 404, no double-React warning in console
4. Redux DevTools shows two named stores: `CV Builder` and the shell store
