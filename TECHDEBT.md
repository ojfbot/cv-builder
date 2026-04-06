# Technical Debt

Last updated: 2026-04-06

| ID | Severity | Kind | Location | Description | Effort | Status |
|----|----------|------|----------|-------------|--------|--------|
| TD-001 | HIGH | configuration | `packages/browser-app/package.json` + `pnpm-lock.yaml` | package.json specifier bumped without regenerating lockfile — CI frozen-lockfile fails, cascades to no pipeline-result.json, overwrites PR accordion comments with bare "skipped" | S | resolved #100 |
| TD-002 | HIGH | architecture | `packages/agent-core/src/models/bio.ts` | ExperienceSchema has no fields for cross-functional collaboration, stakeholder context, or adjacent-skill experience — agents can only match on flat `achievements` strings and `technologies` arrays, causing false-negative gap scores | M | open |
| TD-003 | HIGH | architecture | `packages/agent-core/src/models/bio.ts` | SkillCategorySchema stores skills as flat string arrays with no proficiency level, recency, or context — agents cannot distinguish "Swift (beginner, 2018)" from "TypeScript (expert, daily)" | M | open |
| TD-004 | HIGH | architecture | `packages/agent-core/src/agents/job-analysis-agent.ts` | analyzeJobWithBio prompt dumps raw JSON with no instruction to challenge "Not Evident" scores by probing for adjacent experience, cross-functional context, or transferable skills hidden in achievement descriptions | S | open |
| TD-005 | HIGH | architecture | `packages/agent-core/src/agents/skills-gap-agent.ts` | No adversarial review step — gaps are surfaced without attempting to disprove them. No gap classification (True Gap vs. Framing Gap) and no prompt to cross-reference gaps against the full bio for hidden coverage | M | open |
| TD-006 | MEDIUM | architecture | `packages/agent-core/src/models/output.ts` | JobAnalysisSchema has no structured comparison matrix, gap classification, or audit trail — analysis results are flat arrays of requirements with no evidence mapping, no rating scale, and no framing-gap detection | M | open |
| TD-007 | MEDIUM | architecture | pipeline (orchestrator + agents) | No pre-submission validation step in the pipeline — no agent or checkpoint that runs an adversarial audit (hiring-manager sniff test, false-negative probe) before materials are finalized | L | open |

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

**Fix implemented in #100:** Pre-commit guard in `scripts/check-lockfile.sh` (wired via `.husky/pre-commit`) detects when a dependency specifier changes in `package.json` without a corresponding `pnpm-lock.yaml` update and blocks the commit with a clear message.

**Effort:** S
**Status:** Resolved — [PR #100](https://github.com/ojfbot/cv-builder/pull/100)

---

### TD-002 · HIGH · architecture: ExperienceSchema lacks cross-functional collaboration fields

**Location:** `packages/agent-core/src/models/bio.ts:13-23`
**Discovered:** 2026-04-06
**Incident:** Airbnb application scored "Not Evident" for R5 (cross-platform collaboration with Android/iOS engineers). In reality, a major part of the candidate's SAP Concur work involved liaising with iOS mobile devs about GraphQL schema changes (CDS = Client Data Services). The experience existed but `ExperienceSchema` had nowhere to express it.

**Root cause:** `ExperienceSchema` captures `achievements` (flat strings) and `technologies` (flat strings) but has no structured fields for:
- Cross-functional stakeholders (who did you collaborate with?)
- Communication patterns (how did you work across teams?)
- Adjacent skills used in a role but not the primary responsibility

When agents analyze the bio against a JD, they can only pattern-match on achievement text and technology lists. If the candidate didn't happen to write "collaborated with iOS engineers" in an achievement bullet, the skill is invisible.

**Proposed fix:** Add optional structured fields to `ExperienceSchema`:
```typescript
collaborators: z.array(z.string()).default([]),
// e.g., ["iOS engineering team", "backend platform team", "UX design"]

adjacentSkills: z.array(z.object({
  skill: z.string(),
  context: z.string(),
  proficiency: z.enum(['familiar', 'working', 'proficient']).default('working'),
})).default([]),
// e.g., [{ skill: "Swift", context: "reviewed iOS team's GraphQL client code", proficiency: "familiar" }]
```

**Effort:** M (schema change + bio.json migration + agent prompt updates)
**Status:** Open

---

### TD-003 · HIGH · architecture: SkillCategorySchema has no proficiency or recency metadata

**Location:** `packages/agent-core/src/models/bio.ts:60-63`
**Discovered:** 2026-04-06
**Incident:** Same Airbnb incident. The candidate has Swift fundamentals (iOS Dev Boot Camp, 2016) but this was invisible because `SkillCategorySchema` stores skills as `items: z.array(z.string())` — no proficiency level, no date, no context.

**Root cause:** A flat string array can't distinguish:
- "TypeScript" (expert, used daily for 4 years)
- "Swift" (beginner, bootcamp 2016, read iOS team code at SAP Concur)
- "Python" (intermediate, FastAPI gateway, scripting)

Without this metadata, agents treat all listed skills as equally current and equally deep, or worse, miss skills that aren't listed because the candidate didn't think to include beginner-level items.

**Proposed fix:** Add an enriched skill variant:
```typescript
export const EnrichedSkillSchema = z.object({
  name: z.string(),
  proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  lastUsed: z.string().optional(), // year or "current"
  context: z.string().optional(), // e.g., "FastAPI gateway for advisory platform"
})

export const SkillCategorySchema = z.object({
  category: z.string(),
  items: z.union([
    z.array(z.string()),                // backwards compatible
    z.array(EnrichedSkillSchema),       // enriched variant
  ]),
})
```

**Effort:** M (schema change + backward compat + bio.json enrichment + agent prompt updates)
**Status:** Open

---

### TD-004 · HIGH · architecture: Job analysis agent doesn't challenge false-negative gaps

**Location:** `packages/agent-core/src/agents/job-analysis-agent.ts:107-162`
**Discovered:** 2026-04-06
**Incident:** `analyzeJobWithBio()` sends raw bio JSON + job JSON to the model with a generic prompt. The model scored "Not Evident" for cross-platform mobile collaboration because:
1. The prompt doesn't instruct the model to probe for adjacent/hidden experience
2. The prompt doesn't distinguish True Gaps from Framing Gaps
3. No follow-up query asks "could this requirement be met by experience described differently?"

**Root cause:** The prompt says "Calculate a match score based on requirements met" and "Identify gaps" — but never says "Before marking a requirement as 'Not Met', check whether any achievement or technology could plausibly cover it through adjacent experience, cross-functional work, or transferable skills."

**Proposed fix:** Add adversarial probing instructions to the `analyzeJobWithBio` prompt:
```
IMPORTANT — Gap Verification:
Before scoring any requirement as "not met" or "not evident":
1. Search ALL achievements for adjacent/indirect evidence
2. Check if any listed technology implies the skill (e.g., "GraphQL" implies working with API consumers including mobile)
3. Check if any role title or description implies cross-functional exposure
4. Classify each gap as:
   - "true_gap": No evidence exists in the bio
   - "framing_gap": Experience likely exists but isn't explicitly stated — RECOMMEND asking the candidate
   - "adjacent_gap": Related experience exists that could be reframed

For framing_gaps, generate a specific follow-up question to ask the candidate.
```

**Effort:** S (prompt change only — no schema changes needed)
**Status:** Open

---

### TD-005 · HIGH · architecture: Skills gap agent has no gap classification or adversarial review

**Location:** `packages/agent-core/src/agents/skills-gap-agent.ts:59-150`
**Discovered:** 2026-04-06
**Incident:** `SkillsGapAgent.analyzeSkillsGap()` identifies gaps and outputs them directly to a `LearningPath`. There's no step that asks "is this actually a gap?" The Airbnb application generated a learning path for "cross-platform collaboration" when the candidate already had the experience.

**Root cause:** The agent's system prompt says "Identify transferable skills that may apply" but the structured output (`LearningPath`) has no field for "experience that partially covers this gap" or "framing recommendation to surface existing experience." Every gap goes straight to "here's how to learn this" rather than first asking "do you already know this?"

**Proposed fix:**
1. Add `gapClassification` to `SkillGapSchema`:
```typescript
export const SkillGapSchema = z.object({
  skill: z.string(),
  currentLevel: z.enum(['none', 'beginner', 'intermediate']),
  targetLevel: z.enum(['intermediate', 'advanced', 'expert']),
  priority: z.enum(['high', 'medium', 'low']),
  classification: z.enum(['true_gap', 'framing_gap', 'adjacent_gap']).default('true_gap'),
  existingEvidence: z.string().optional(),  // what in the bio might already cover this
  followUpQuestion: z.string().optional(),  // question to ask candidate to verify
})
```

2. Update the agent prompt to classify gaps before generating learning resources
3. For `framing_gap` items, generate reframing suggestions instead of learning resources

**Effort:** M (schema change + prompt update + output handling)
**Status:** Open

---

### TD-006 · MEDIUM · architecture: JobAnalysisSchema lacks structured audit trail

**Location:** `packages/agent-core/src/models/job.ts:32-45`
**Discovered:** 2026-04-06
**Description:** `JobAnalysisSchema` outputs flat arrays of `keyRequirements` and `recommendations` with no structured comparison matrix, no evidence mapping, no rating scale ("Strongly Met" vs "Not Evident"), and no gap classification. The manual audit framework built for Airbnb (`zesty-watching-curry.md`) and Anthropic (`anthropic-swe-claude-code-analysis.json`) demonstrates the structure that should exist in the schema:

- Numbered requirements (R1–Rn) with type (Hard/Soft/Bonus)
- Evidence mapping per requirement
- Rating scale per requirement
- Gap classification (true vs. framing)
- Hiring manager sniff test
- Tuning knobs

**Proposed fix:** Create an `AuditSchema` that extends `JobAnalysisSchema`:
```typescript
export const RequirementAuditSchema = z.object({
  id: z.string(),                    // R1, R2, etc.
  skill: z.string(),
  type: z.enum(['hard', 'soft', 'preferred', 'bonus', 'implicit']),
  rating: z.enum(['strongly_met', 'met', 'partially_met', 'not_evident']),
  evidence: z.string(),
  gapClassification: z.enum(['true_gap', 'framing_gap', 'adjacent_gap', 'not_applicable']).optional(),
  proposedFix: z.string().optional(),
})

export const ApplicationAuditSchema = z.object({
  jobId: z.string(),
  auditedAt: z.string(),
  requirements: z.array(RequirementAuditSchema),
  scorecard: z.object({
    stronglyMet: z.number(),
    met: z.number(),
    partiallyMet: z.number(),
    notEvident: z.number(),
  }),
  hiringManagerAssessment: z.string().optional(),
  tuningKnobs: z.array(z.object({
    name: z.string(),
    currentScore: z.string(),
    adjustmentGuide: z.string(),
  })).optional(),
})
```

**Effort:** M (new schema + new agent or agent method + pipeline integration)
**Status:** Open

---

### TD-007 · MEDIUM · architecture: No pre-submission validation in the pipeline

**Location:** Pipeline (orchestrator + agent coordination)
**Discovered:** 2026-04-06
**Description:** The pipeline generates materials (resume, cover letter, interview prep, learning path) and outputs them directly. There is no adversarial review step that:

1. Runs the audit framework (TD-006) against the generated resume
2. Challenges each "Not Evident" gap with adversarial probing (TD-004)
3. Flags framing gaps that can be fixed before submission
4. Runs a hiring-manager sniff test
5. Validates that all Hard requirements score "Met" or above

The Airbnb mobile gap would have been caught if a validation agent had asked: "R5 is scored Not Evident — but the bio mentions GraphQL work serving 'browser and mobile surfaces.' Is this actually a gap?"

**Proposed fix:** Add an `ApplicationAuditAgent` (or a new method on the orchestrator):
1. Takes the generated resume + job analysis + bio as input
2. Runs the structured audit framework (TD-006)
3. For each "Not Evident" or "Partially Met" requirement, runs adversarial probing (TD-004)
4. Outputs an audit report with:
   - Confirmed true gaps (with learning path recommendations)
   - Framing gaps (with specific rewrite suggestions)
   - Follow-up questions to ask the candidate before finalizing
5. Blocks pipeline completion until all Hard requirements score "Met" or above, or the user explicitly acknowledges the gaps

**Effort:** L (new agent + pipeline integration + UI for review step)
**Status:** Open
