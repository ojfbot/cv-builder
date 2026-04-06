# @frame/tsconfig

Shared TypeScript configuration presets for Frame OS monorepos. Eliminates duplicated tsconfig settings across packages and enforces consistent compiler behavior.

## Presets

| Preset | Extends | Use For |
|--------|---------|---------|
| `base.json` | — | All packages (ES2022 target, strict, bundler resolution) |
| `node.json` | base | Node.js packages (types: node, esModuleInterop) |
| `browser.json` | base | React/browser packages (DOM libs, JSX, noUnusedLocals) |
| `node-emit.json` | node | Node packages that emit JS (declaration, declarationMap, **sourceMap: false**) |

## Usage

```json
{
  "extends": "@frame/tsconfig/browser.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"]
}
```

## Source Map Safety

`node-emit.json` explicitly sets `sourceMap: false`. Production builds should never ship source maps — they expose internal code structure. This is enforced by the `@frame/eslint-plugin` rule `no-source-maps-in-production` and the post-build artifact scanner.

## Installation

Workspace dependency (pnpm):
```bash
pnpm add -D @frame/tsconfig --workspace
```

Cross-repo (file: protocol):
```bash
pnpm add -D @frame/tsconfig@file:../cv-builder/packages/tsconfig
```
