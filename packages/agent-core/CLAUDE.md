# agent-core — agent authoring guidance

Path-conditional guidance (ADR-0081 Layer 1): loads when editing the `packages/agent-core/`
package. Repo-wide policy is in the root `CLAUDE.md`; deep architecture reference is in
`docs/ARCHITECTURE.md` and `docs/claude-reference.md`.

All specialized agents extend `BaseAgent`, which provides Anthropic client setup, conversation
history management, streaming/non-streaming chat methods, and system-prompt abstraction. Agents
run **server-side only** (never in the browser; no `dangerouslyAllowBrowser`).

## Adding New Agents

When creating a new agent:

1. Create a new file in `packages/agent-core/src/agents/` extending `BaseAgent`
2. Implement `getSystemPrompt()` with the agent's role and responsibilities
3. Add public methods for the agent's functionality (use `chat()` or `streamChat()`)
4. Define input/output types in `packages/agent-core/src/models/` with Zod schemas
5. Export the agent from `packages/agent-core/src/index.ts` (if browser-compatible)
6. Integrate with `OrchestratorAgent` for coordination
7. Add API routes in `packages/api/src/routes/` for server-side execution
8. Update `docs/AGENTS_GUIDE.md` with usage examples

See `docs/how-to/01-building-features.md` and `docs/AGENTS_GUIDE.md` for detailed walkthroughs.

## Models

Data models use **Zod** for runtime validation and type inference, in
`packages/agent-core/src/models/` (Bio, JobListing, Output, ResearchEntry). Data is stored as JSON
files (CLI/API) or browser localStorage (browser app). Full schema detail: `docs/ARCHITECTURE.md`.
