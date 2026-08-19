# Implementation notes

## Deviations

- 2026-08-18 (Opus 5 migration fixes): plan assumed the claude-opus-5 / max_tokens 16000 changes were already committed; territory: they existed only as uncommitted edits in the main checkout's working tree (branch `main`), not in this worktree. Ported the `packages/` portion of that diff into this branch (left the unrelated `.gitignore` `.serena/` hunk behind) so the fixes layer on top of the migration.
- 2026-08-18 (structured outputs): plan assumed the json_schema could be derived directly from `JobAnalysisSchema` (zod v3); territory: `@anthropic-ai/sdk` ≥0.117 `zodOutputFormat` is typed against `zod/v4` only. Kept models on classic zod v3 and mirrored the response shape with `zod/v4` inside `job-analysis-agent.ts`; canonical `JobAnalysisSchema.parse` still runs on the final object so drift between the two fails loudly at runtime.
- 2026-08-18 (cli args): plan assumed fixing the package.json script (`--headless` → `generate`) was sufficient; territory: pnpm (unlike npm) forwards the literal `--` separator into the script's argv, and commander then treats every flag after it as positional — `--job` was silently dropped. Added a bare-`--` strip in `src/cli/index.ts` before `program.parse()`.
