# @frame/eslint-plugin

Custom ESLint rules for Frame OS monorepos. Five rules enforcing source map safety, API key protection, Module Federation consistency, workspace boundary integrity, and API input validation.

## Rules

### `no-source-maps-in-production` (error)

Errors if `sourceMap: true` appears in tsconfig or `sourcemap: true` in Vite build config. Source maps in production expose internal code structure — the exact class of misconfiguration that caused the Claude Code source map leak (March 2026, v2.1.88).

### `no-api-keys-in-client` (error)

Errors on `dangerouslyAllowBrowser: true`, API key string literals (`sk-ant-*`), and sensitive `process.env` access in browser-facing code. Catches the security issue fixed in CV Builder's server-side migration.

### `enforce-singleton-versions` (warn)

Warns when Module Federation shared configs use hardcoded version strings instead of dynamically reading from package.json. Prevents silent runtime failures from version drift between shell and remotes.

### `no-cross-package-relative-imports` (error)

Errors on relative imports like `../../agent-core/src/foo` that bypass pnpm workspace package boundaries. Use `@cv-builder/agent-core` instead.

### `require-zod-validation-at-boundaries` (warn)

Warns when Express route handlers access `req.body`, `req.params`, or `req.query` without Zod `.parse()` or `.safeParse()` in the same function scope. Enforces input validation at API boundaries.

## Usage

```js
// eslint.config.js
import tseslint from 'typescript-eslint'
import framePlugin from './packages/eslint-plugin/src/index.ts'

export default [
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { '@frame': framePlugin },
    rules: {
      '@frame/no-source-maps-in-production': 'error',
      '@frame/no-api-keys-in-client': 'error',
      '@frame/enforce-singleton-versions': 'warn',
      '@frame/no-cross-package-relative-imports': 'error',
      '@frame/require-zod-validation-at-boundaries': 'warn',
    },
  },
]
```

## Testing

```bash
pnpm --filter @frame/eslint-plugin test
```

12 tests across 5 rule suites using ESLint's `RuleTester` and vitest.
