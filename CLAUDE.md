# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Loading discipline (ADR-0081):** this root file is the always-loaded Layer 0 — project identity, the command quick-start, and must-keep invariants (security, deployment safety). Deeper material is routed out: agent authoring → `packages/agent-core/CLAUDE.md`; Module Federation + Vercel deploy → `.claude/rules/mf-and-deploy.md` (auto-loads when editing the MF surface); env/tooling/ESLint/hooks + architecture detail → `docs/claude-reference.md`; canonical architecture narrative → `docs/ARCHITECTURE.md`.

## Project Overview

Resume Builder is an AI-powered resume and career development tool that uses Claude AI agents to help users create tailored resumes, prepare for interviews, and develop professional skills. The system uses a **secure client-server architecture** with a multi-agent system where specialized agents run **server-side only** and communicate with the browser through a REST API.

Invariants (durable):
- All agents run **server-side only** via the Express API (`packages/api/`); the browser never holds API keys.
- API keys live in `env.json` on the server (gitignored, never exposed to the browser).
- No `dangerouslyAllowBrowser` anywhere.

For detailed architecture, see `docs/ARCHITECTURE.md` and `docs/claude-reference.md`.

## Package Manager

This project uses **pnpm** (version pinned in `package.json`'s `packageManager`; Node pinned via `.nvmrc`). Full prerequisites (Node/pnpm versions, optional `uv` for the AWS MCP server) → `docs/claude-reference.md`.

## Development Commands

```bash
# Run API server (3001) + browser app (3000) together
pnpm dev:all
# Or separately:
pnpm dev:api          # API server (port 3001)
pnpm dev              # Browser app (port 3000)

# CLI
pnpm cli                                   # interactive
pnpm cli:headless -- --job <jobId>         # headless generate (<jobId> = filename in the jobs dir, without .json)

# Build / quality
pnpm build            # production build (runs security checks first)
pnpm type-check       # type-check without building
pnpm preview          # preview production build
pnpm lint             # ESLint (@frame/eslint-plugin custom rules)
pnpm lint:fix         # ESLint with auto-fix

# Security
pnpm security:verify  # comprehensive audit
pnpm security:scan    # scan source for API keys
pnpm security:check   # checks used by prebuild
```

ESLint custom-rule catalog, the Claude Code hook wiring, and env setup → `docs/claude-reference.md`.

## Security (must-keep)

**NEVER commit `env.json` or `.env.local`** — they hold API keys and must remain local (the repo is configured to prevent it). Store all secrets in `env.json` (gitignored). Full security practices + incident response → `docs/claude-reference.md`; `SECURITY.md`.

## Testing Philosophy

The project emphasizes iterative development: Plan → Implement → Test → Refine → Document. Focus on type safety (Zod validation), error handling, and streaming responses for better UX.

## Privacy

Personal data (bio, jobs, outputs) is gitignored. Only example data in `public/examples/` should be committed.

## Deployment (must-keep)

**NEVER deploy directly to production** via CLI (`vercel deploy --prod`, `vercel promote`, etc.).
All production deployments go through the GitHub PR → CI → merge → automated deploy pipeline.
The only exception is `workflow_dispatch` for manual CI triggers. Local Vercel CLI usage is restricted to preview deploys only. MF/Vercel cache-header rules → `.claude/rules/mf-and-deploy.md`.

## Agents

- **Authoring a new agent** → `packages/agent-core/CLAUDE.md` (loads when editing that package).
- **Multi-agent system, communication flow, the `.agents/` capability catalog** → `docs/claude-reference.md`.
