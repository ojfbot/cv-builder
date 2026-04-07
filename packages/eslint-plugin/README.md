# @frame/eslint-plugin

Custom ESLint rules for Frame OS monorepos. Eight rules enforcing source map safety, API key protection, Module Federation consistency, workspace boundary integrity, API input validation, production code quality, schema richness, and test coverage.

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

### `no-console-in-production` (warn)

Warns on `console.log`, `console.debug`, `console.warn`, `console.info` in production source files. Allows `console.error`. Skips test files, scripts, and configs. Designed to work with the PreToolUse lint hook — when Claude is about to edit a file with console.log, it sees the warning and removes it proactively.

### `no-untyped-schema-fields` (warn)

Warns when Zod schemas use `z.array(z.string())` for fields like `skills`, `technologies`, `items`, or `achievements` that benefit from enriched metadata (proficiency, recency, context). Addresses TECHDEBT TD-002/TD-003.

### `require-test-for-new-exports` (warn)

Warns when source files in `src/` export functions or classes without a corresponding test file. Prompts Claude to generate tests alongside implementation.

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

15 tests across 8 rule suites using ESLint's `RuleTester` and vitest.

## Hook Integration

These rules are designed to work as **LLM instructions** via Claude Code hooks:

- **PreToolUse hook** (`lint-before-edit.sh`): Before Claude edits a file, runs ESLint on it and injects violations as `additionalContext`. Claude sees the warnings and fixes them alongside its intended edit.
- **PostToolUse hook** (`lint-after-edit.sh`): After Claude edits a file, compares violation count before/after. If the edit introduced new violations, injects a regression warning.
- **`/lint-audit` skill**: Runs all rules + artifact scanner, cross-references with TECHDEBT.md, produces structured quality report.
- **`/validate` skill (Step 4.5)**: Automated lint check as part of the pre-merge quality gate.
