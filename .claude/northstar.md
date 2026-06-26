---
type: northstar
slug: l1-cv-builder
tier: L1
app: cv-builder
ladders_up_to: l2-ojfbot
status: active
properties:
  - id: P1
    name: "Tailoring a resume is keyless and zero-friction"
    target: "A user pastes a job description, uploads a CV, and gets a tailored resume — no API key, no signup, no setup. The keyless path is the default and it works end-to-end."
    current: 40
    verification: "E2E test green on the keyless path; a recorded run from paste → tailored output with no credentials."
    ladders_up_to: "ns:l2-ojfbot#P1"
    okr_drivers: []
  - id: P2
    name: "The tailoring is trustworthy, not hallucinated"
    target: "Every claim in the tailored resume traces to the user's actual CV — no invented employers, dates, or skills. Edits are grounded and auditable."
    current: 20
    verification: "Grounding check: each generated bullet maps to a source CV span; an eval scenario flags fabricated content."
    ladders_up_to: "ns:l2-ojfbot#P1"
    okr_drivers: []
---

# Northstar — cv-builder (L1)

**Vision.** cv-builder is the proof that a Frame OS app can do real, daily-useful work with zero
friction: paste a job description, upload a CV, get a tailored resume you can trust. It advances the
ojfbot fleet's "ships demoable surfaces" property by being the most demoable single app — and it
sharpens the cluster's honesty bet by refusing to fabricate.

## P1 — Tailoring a resume is keyless and zero-friction

Ladders to `ns:l2-ojfbot#P1` (the fleet ships demoable surfaces). The keyless path *is* the demo: no
credential wall between a stranger and a working tailored resume. 40% reflects a working pipeline that
still has setup friction on the default path.

## P2 — The tailoring is trustworthy, not hallucinated

Also ladders to `ns:l2-ojfbot#P1` — a demoable surface that lies isn't demoable. This is cv-builder's
local instance of the cluster-wide "work is legible / not confabulated" bet: generated resume content
must trace to the user's real CV. The RAG/eval depth work (grounding checks, eval scenarios) moves this.
