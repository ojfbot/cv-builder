---
type: roadmap
slug: rm-l1-cv-builder
northstar: l1-cv-builder
status: active
phases:
  - id: PH1
    name: "Make the shipped V2 path honest and tested"
    goal: "The agent-graph package has graph-compile + routing tests that pass in CI, every action the orchestrator can emit has a route, the browser and server agree on the V2 wire contract, and RAG is either wired with a persistent store and a consumer or gone."
  - id: PH2
    name: "Grounding floor — P2 can move at all"
    goal: "A deterministic check maps every generated resume bullet to a span of the user's source CV and fails on an unmatched one; an eval scenario with a fabricated bullet is flagged. The northstar's P2 verification clause is met at its floor."
  - id: PH3
    name: "Keyless path a stranger can reach"
    goal: "The public site talks to a hosted API that holds the key server-side, and a recorded end-to-end run goes paste → upload → tailored resume with no credentials on the user side. The northstar's P1 verification clause is met."
  - id: PH4
    name: "Trustworthy analysis — the open TECHDEBT gap items"
    goal: "Job analysis and skills-gap output distinguish true gaps from framing gaps and survive an adversarial pass before materials are finalized (TD-004, TD-005, TD-007)."
slices:
  - id: S1
    phase: PH1
    title: "Orchestrator hygiene + V2 wire contract + first graph tests"
    advances: "ns:l1-cv-builder#P1"
    moves_from: 15
    moves_to: 20
    deliverable: "PR in cv-builder: input-existence rules in code (a specialist is not routed to when its required state is absent); conditional edge specialist → END on done|error so the second orchestrator model call per turn is gone (update scripts/test-graph.ts:269 expectations and chat-service.ts consumers for one fewer message); temperature ?? 0.7; parsed action validated against NextActionSchema; rag_retrieval registered or removed from the enum; explicit recursionLimit; client-v2.ts stream parser matched to the server's event: frames; GET /api/v2/threads/:id served or the client call removed; graph-compile + routing unit tests under packages/agent-graph."
    entrance: "rm-l1-cv-builder registered in core and this roadmap merged (ojfbot/cv-builder#154)."
    success: "Tests assert: the graph compiles; each NextAction routes to the expected node or END; an unknown/unparseable action goes to END with an error, not back to the orchestrator; a specialist returning done reaches END without a second orchestrator call. A V2 stream request in the browser receives a done event."
    check: "pnpm --filter @resume-builder/agent-graph type-check && pnpm --filter @resume-builder/agent-graph exec vitest run"
    autonomy: gate-0
    claimable_by: either
    kind: m
    status: queued
  - id: S2
    phase: PH1
    title: "Wire RAG with a persistent store and a consumer — or delete it"
    advances: "ns:l1-cv-builder#P2"
    moves_from: 5
    moves_to: 5
    deliverable: "PR in cv-builder, one of: (a) rag-retrieval node added to the graph over a persistent store (sqlite-vec per the shared-stack RAG invariant), indexing the user's own CV so retrieval can later back grounding, with at least one node reading ragResults; or (b) src/rag/, rag-retrieval-node.ts, the rag_retrieval action, ragResults and the @langchain/openai dependency removed."
    entrance: "S1 merged, and the operator has ruled (a) vs (b) — (a) adds a new persistent dependency and an embeddings key, so it is not an agent's call."
    success: "No exported graph component is unreachable: either rag_retrieval routes to a node whose output a later node consumes (test proves it), or no RAG symbol remains in packages/agent-graph/src. MemoryVectorStore does not appear in any runtime path."
    check: "pnpm --filter @resume-builder/agent-graph type-check && pnpm --filter @resume-builder/agent-graph exec vitest run"
    autonomy: gate-0
    claimable_by: human_only
    kind: m
    status: queued
    depends_on: "rm:rm-l1-cv-builder#S1"
  - id: S3
    phase: PH2
    title: "Deterministic bullet → source-CV span matcher + one fabricated-bullet eval"
    advances: "ns:l1-cv-builder#P2"
    moves_from: 5
    moves_to: 35
    deliverable: "PR in cv-builder: a runtime-agnostic grounding check (takes a generated resume + the source bio, returns per-bullet matched span or unmatched) usable from both V1 (agent-core, the path that runs today) and V2; a pnpm eval:grounding script running it over a fixture with one invented employer/date/skill."
    entrance: "None beyond this roadmap being merged — the check operates on outputs and does not depend on the graph work."
    success: "pnpm eval:grounding exits 0 only when the fabricated bullet is flagged and every bullet in the clean fixture matches a source span; the matcher is deterministic (no model call)."
    check: "pnpm eval:grounding"
    autonomy: gate-0
    claimable_by: either
    kind: m
    status: queued
  - id: S4
    phase: PH3
    title: "Hosted API reachable from the public site"
    advances: "ns:l1-cv-builder#P1"
    moves_from: 20
    moves_to: 50
    deliverable: "The API deployed to a host the operator chooses, with the model key held server-side, a spend cap and per-client rate limit, and the Vercel build's VITE_API_URL pointed at it (today the shipped bundle hard-codes http://localhost:3001/api). Shipped via PR → CI → merge; no CLI production deploy."
    entrance: "Operator has chosen the host and a monthly spend cap — a public keyless path spends the operator's key on strangers' requests."
    success: "From a clean browser profile, cv.jim.software reaches the hosted API health endpoint and completes one tailoring request; rate limiting rejects a burst beyond the configured limit."
    autonomy: gate-0
    claimable_by: human_only
    kind: l
    status: queued
  - id: S5
    phase: PH3
    title: "Keyless end-to-end test + recorded run"
    advances: "ns:l1-cv-builder#P1"
    moves_from: 50
    moves_to: 70
    deliverable: "An end-to-end browser test (paste job description → upload CV → tailored resume, no user credentials) runnable against a preview deployment, plus a recording of one run attached to the PR — the northstar's P1 verification artifacts."
    entrance: "S4 merged."
    success: "The E2E test is green against the hosted API from CI; the recording shows no credential prompt anywhere on the path."
    check: "pnpm test:e2e:keyless"
    autonomy: gate-0
    claimable_by: either
    kind: m
    status: queued
    depends_on: "rm:rm-l1-cv-builder#S4"
  - id: S6
    phase: PH4
    title: "TD-004 — job analysis challenges false-negative gaps"
    advances: "ns:l1-cv-builder#P2"
    moves_from: 35
    moves_to: 40
    deliverable: "PR resolving TD-004: the job-analysis prompt probes adjacent experience before scoring a requirement Not Evident; TECHDEBT.md row flipped to resolved."
    entrance: "S3 merged (so the change is measured against a grounding baseline)."
    success: "A fixture with an adjacent-experience match that previously scored Not Evident now cites the supporting bio span; the grounding eval still passes."
    check: "pnpm eval:grounding"
    autonomy: gate-0
    claimable_by: either
    kind: s
    status: queued
    depends_on: "rm:rm-l1-cv-builder#S3"
  - id: S7
    phase: PH4
    title: "TD-005 — skills-gap classification (true vs framing) with an adversarial pass"
    advances: "ns:l1-cv-builder#P2"
    moves_from: 40
    moves_to: 45
    deliverable: "PR resolving TD-005: skills-gap output classifies each gap as true or framing and records the bio evidence checked; TECHDEBT.md row flipped to resolved."
    entrance: "S6 merged."
    success: "A fixture with a known framing gap is classified framing with a cited span; a known true gap stays true."
    check: "pnpm eval:grounding"
    autonomy: gate-0
    claimable_by: either
    kind: m
    status: queued
    depends_on: "rm:rm-l1-cv-builder#S6"
  - id: S8
    phase: PH4
    title: "TD-007 — pre-submission audit step before materials are finalized"
    advances: "ns:l1-cv-builder#P2"
    moves_from: 45
    moves_to: 55
    deliverable: "PR resolving TD-007: a validation step that runs the grounding check plus the gap audit on final materials and blocks finalization on failure; TECHDEBT.md row flipped to resolved."
    entrance: "S7 merged, and the operator has scoped it — the audit agent is a distinct design decision (flagged out of scope in the originating brief)."
    success: "Finalizing a resume containing the fabricated fixture bullet is blocked with the unmatched bullet named; a clean resume finalizes."
    check: "pnpm eval:grounding"
    autonomy: gate-0
    claimable_by: human_only
    kind: l
    status: queued
    depends_on: "rm:rm-l1-cv-builder#S7"
---

# Roadmap — cv-builder (L1)

**Route.** This roadmap starts from where the evidence puts cv-builder on 2026-09-24. That's P1 ≈ 15 and P2 ≈ 5, proposed down from the asserted 40 / 20 in ojfbot/cv-builder#154; the operator records the correction. Each phase ends when one of the northstar's own verification clauses becomes checkable. PH1 fixes the V2 path so the pipeline we build on is tested and does what its docs say. PH2 builds the grounding floor. Without it, P2 has no way to move except by assertion. PH3 builds the path a stranger can actually reach, which is what P1's target describes. PH4 folds the open TECHDEBT gap-analysis items in as P2 depth. PH2 doesn't depend on PH1: the grounding check runs on outputs from either runtime, so S1 and S3 can run in parallel.

## PH1 — Make the shipped V2 path honest and tested

**S1** is the hygiene pass. It adds in-code routing rules, ends the turn at `END` after a specialist, validates parsed actions, fixes the two browser↔server contract breaks, and adds the first tests in `packages/agent-graph`. It also meets the entrance criterion for the fleet's "calibrate judge #2 — cv-builder route" pilot. That judge is built elsewhere, not here. **S2** settles the RAG code, which ships but isn't wired. Wiring it means adding a persistent store (sqlite-vec) and an embeddings key. Deleting it removes the dead path. The operator picks one, which is why S2 is `human_only`. It moves no percentage on its own. If RAG is wired over the user's CV, it becomes the substrate S3 could use later.

## PH2 — Grounding floor

**S3** is the northstar's P2 verification clause built directly: a deterministic span matcher plus one fabricated-bullet eval. It's deterministic on purpose. A model-graded check would bring back the confabulation risk it's meant to catch.

## PH3 — Keyless path a stranger can reach

The public bundle currently calls `http://localhost:3001/api`, so nobody else can use the pipeline. **S4** hosts the API. It's `human_only` because it spends the operator's key and touches deployment. **S5** adds the E2E test and the recorded run that P1's verification clause names.

## PH4 — Trustworthy analysis

**S6–S8** are TD-004, TD-005 and TD-007, in dependency order. Each is measured against S3's grounding eval so it can't regress grounding. S8 (the audit step) is `human_only` because its design is still open.
