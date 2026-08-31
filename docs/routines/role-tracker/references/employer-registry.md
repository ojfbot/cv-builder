# Employer registry — polling boards instead of searching them

For a fixed set of metros, **polling a curated list of employer ATS endpoints
beats querying job boards**. It is higher recall (nothing depends on an
aggregator having indexed the req), higher precision (no keyword noise), and it
does not break — these endpoints are built for machine consumption, so there is
no bot-wall and no HTML to parse. Several return compensation as a typed field,
which is exactly what the geo-keyed comp rule needs.

This replaces aggregator sweeps as the primary discovery mechanism. Aggregators
stay as a thin backstop for employers not yet in the registry.

## Why four metros doesn't multiply the work

The registry is **employer-keyed, not metro-keyed**. One employer has one
endpoint that returns every location it is hiring in; the metro filter applies
to the *results*, not to the polling. Adding Seattle, Chicago and New York does
not quadruple the poll cost — you still call Deloitte once and filter its jobs
by location.

What does grow is the employer list, and only for metro-native employers:

- **National employers** — one entry each, covers all four metros (Deloitte,
  Google, Anthropic, OpenAI, Okta, Salesforce, Accenture, Capital One, JPMorgan,
  Fidelity, Schwab, McKesson, EY, SAP, WTW…).
- **Metro-native employers** — additive per metro (Toyota North America is DFW;
  Zillow, Expedia, Smartsheet are Seattle; Tempus, Grubhub, Cameo are Chicago;
  Ramp, Datadog, Peloton are NYC).

So the growth is roughly 20 national + 10–15 per metro, not 20 × 4.

## Rollout — iterate, don't boil the ocean

1. **Phase 1 (now): DFW only.** Resolve slugs for the employers below, prove the
   poll mechanic and measure per-pass cost. Do not add metros until a DFW pass
   runs clean.
2. **Phase 2: national employers.** Every one of these covers all four metros at
   once, so this is the cheapest recall per entry.
3. **Phase 3: one metro at a time**, in target order — Seattle, then Chicago,
   then New York. Add a metro only after the previous one's pass is stable.

## Poll efficiency (matters once the list is long)

Request the *index*, not the bodies. Greenhouse's `?content=true` returns every
full job description and will swamp a routine's context. Poll without content,
filter by title grammar and location first, then fetch the full posting only
for the handful that survive triage.

## Endpoint patterns

```
Greenhouse   https://boards-api.greenhouse.io/v1/boards/{org}/jobs
             add ?content=true only for a specific job
Lever        https://api.lever.co/v0/postings/{org}?mode=json
Ashby        https://api.ashbyhq.com/posting-api/job-board/{org}?includeCompensation=true
Workable     https://apply.workable.com/api/v1/widget/accounts/{org}?details=true
SmartRecruiters  https://api.smartrecruiters.com/v1/companies/{org}/postings
Workday      https://{tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs  (POST)
```

## Registry schema

One row per employer: `name · ats · org slug · endpoint · metros · track
(fde / ai-eng / both) · slug status (verified / unresolved) · last polled`.

Never invent a slug. An unresolved employer stays `unresolved` until a real
endpoint returns 200 — a guessed slug that 404s looks identical to an employer
with no open roles, which is exactly the failure the two-strike rule exists to
prevent.

## Probe results, 2026-08-31 — read this before planning work

**The ATS-API play works for tech employers, not for the DFW enterprise set.**

Probed 24 DFW-native enterprises (Toyota NA, AT&T, Schwab, Fidelity, Capital
One, JPMorgan, Goldman, McKesson, TI, Sabre, Southwest, American, Match,
PepsiCo, Vistra, CBRE, Jacobs, Comerica, USAA, Elevance) across Greenhouse,
Lever and Ashby: **zero hits**. Large enterprises run Workday, Oracle or
SuccessFactors.

A Workday tenant-host probe was **inconclusive, not positive** — every
`*.wd{N}.myworkdayjobs.com` host returned 406 including deliberately wrong
slugs, so the wildcard answers everything and the result carries no
information. Workday tenants still need per-employer discovery of the tenant
and site name from each careers page. Do not record a Workday row on the
strength of a host responding.

**Verified working endpoints (200, non-trivial payload):**

| ATS | Confirmed slugs |
|---|---|
| Greenhouse | `anthropic` · `databricks` · `stripe` · `cloudflare` · `datadog` · `scaleai` · `vercel` · `figma` |
| Ashby | `openai` · `snowflake` · `sierra` · `cohere` · `ramp` · `writer` |
| Lever | `palantir` |

**`openai` is the headline.** `openai.com` has been bot-walled every pass since
6, but the employer's own Ashby feed returns 758 live jobs including 18 Forward
Deployed roles **with typed compensation** — which is what finally verified the
A3/A4/A5/A6 rows. Reading the ATS feed instead of the marketing site bypasses
the wall entirely and legitimately.

**Consequence for sequencing:** the API path is the fast lane for labs and
platform vendors — exactly the Tier A and secondary-title set. DFW *enterprise*
coverage does not come from here; it needs careers-page fetches or the deferred
email-alert intake. Do not spend more effort probing enterprise slugs.

## Phase 1 — DFW tranche

**Slug evidence already in hand** (URLs seen in tracked rows, so these resolve
with high confidence — still confirm each returns 200 on first poll):

| Employer | ATS | Slug / host | Track |
|---|---|---|---|
| Anthropic | Greenhouse | `anthropic` | both |
| Glean | Greenhouse | `gleanwork` | fde |
| Gradial | Greenhouse | `gradial` | fde |
| C3 AI | Greenhouse | (via `gh_jid` on c3.ai) | fde |
| HappyRobot | Ashby | `happyrobot.ai` | fde |
| Tiger Analytics | Workable | `tiger-analytics` | fde |
| RingCentral | Workday | `ringcentral.wd1` | fde |

**Own-site careers, no public ATS API** — keep fetching these directly; they
already work through the allowlist: Deloitte, Okta, Procore, Capgemini,
T-Mobile, Accenture, SAP, EY, WTW, Salesforce, Google.

**DFW-native employers to resolve (Phase 1 work):** Toyota North America
(Plano), AT&T (Dallas), Charles Schwab (Westlake), Fidelity (Westlake), Capital
One (Plano), JPMorgan Chase (Plano), Goldman Sachs (Dallas), McKesson (Irving),
Texas Instruments (Dallas), Sabre (Southlake), Southwest Airlines (Dallas),
American Airlines (Fort Worth), Match Group (Dallas), PepsiCo/Frito-Lay
(Plano), Vistra (Irving), CBRE (Dallas), Jacobs (Dallas), Comerica (Dallas),
USAA (Plano), Elevance (Grand Prairie).

For each: find the careers page, identify the ATS from the apply-link host,
record the slug, confirm the endpoint returns 200, then add the row.

## Fast follow — email alerts as a second intake

Deferred, scheduled separately. Destination: **hi@jim.software** for now,
moving to a dedicated `@jim.software` address later — so keep the intake
address a single configurable value, not hardcoded across alert setups.

The point is inversion: LinkedIn, Indeed and Glassdoor block automated pulls but
will happily *email* job alerts, which restores the coverage scraping can't
reach. Set up per-metro alerts on the title grammar, plus Google Alerts for
employer-specific hiring news, all landing in one inbox that an agent reads via
a mail connector.

Open question before building it: confirm a mail connector is actually available
to the routine. Without one, the alert mail has no reader and this stays manual.
