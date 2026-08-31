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

**Consequence for sequencing:** the Greenhouse/Lever/Ashby path is the fast lane
for labs and platform vendors — exactly the Tier A and secondary-title set.

### DFW enterprises: resolved on Workday after all (2026-08-31)

Guessing Workday slugs is hopeless, but **searching for the board URL is not**.
`WebSearch` with `allowed_domains: ["myworkdayjobs.com"]` and the employer name
returns the real tenant and site from indexed job URLs. Seven DFW enterprises
resolved and verified this way — each returns JSON from a live POST:

| Employer | Tenant / site | Verified |
|---|---|---|
| Toyota North America | `toyota.wd503` / `TMNA` | 200, 84 eng matches |
| AT&T | `att.wd1` / `ATTGeneral` | 200, 125 |
| McKesson | `mckesson.wd3` / `External_Careers` | 200, 176 |
| Fidelity | `fmr.wd1` / `FidelityCareers` | 200, 142 |
| Southwest Airlines | `swa.wd1` / `external` | 200, 12 |
| Capital One | `capitalone.wd12` / `Capital_One` | 200, 1197 |
| USAA | `usaa.wd1` / `USAAJOBSWD` | 200, 30 |
| Sabre | `sabre.wd1` / `SabreJobs` | 200, 90 |
| Vistra | `vst.wd5` / `vistra_careers` | 200, 97 |
| Elevance Health | `elevancehealth.wd1` / `ANT` | 200, 46 |
| Johnson Controls | `jci.wd5` / `JCI` | 200, 1218 |
| PNC (Dallas Innovation Center) | `pnc.wd5` / `External` | 200, 241 |

Johnson Controls and PNC were not on the original list — both surfaced during
resolution and both hire AI/tech in DFW (JCI had an **Ai/ML Engineer, Dallas TX**
posting; PNC runs a Dallas Innovation Center). Twelve verified endpoints total.

### Wrong-company trap — verify the tenant belongs to the employer you searched

Search results conflate similarly-named employers, and a wrong tenant looks
exactly like a working one. Three caught during this pass:

- **Comerica** → search surfaced `commercebank.wd1` (Commerce Bank, a different
  bank). Comerica has no Workday board; it is own-site.
- **CBRE** → surfaced `cw.wd1` (Cushman & Wakefield) on a job that merely
  mentioned CBRE in its title. CBRE is own-site.
- **American Airlines** → `aaregional.wd5` is the *regional* carrier, a
  different employer. AA mainline is own-site (`jobs.aa.com`).

Always confirm the tenant string is the employer's own before recording a row.

**Own-site, no Workday board** — Charles Schwab, Texas Instruments,
PepsiCo/Frito-Lay, American Airlines mainline, JPMorgan Chase, Match Group,
CBRE, Comerica, Goldman Sachs, Jacobs. These only get covered by careers-page
fetches or the email-alert intake.

**Walmart** — `WalmartExternal` is the correct site (proven by a live Dallas
job URL) but the CXS endpoint returns 422 on every casing tried. Left
unresolved rather than recorded as broken; worth one more attempt with a
different request body.

First real yield: AT&T **Lead Data/AI Engineering – Applied AI** (Dallas) and
**Lead Tech Business Mgmt – AI Software Engineer** (Dallas); Fidelity Senior
Data Scientist and Principal SWE (Westlake).

**Own-site, no Workday board** — Charles Schwab (`careers.schwab.com`), Texas
Instruments (`careers.ti.com`), PepsiCo/Frito-Lay, American Airlines mainline
(`jobs.aa.com` — note `aaregional.wd5/Search` is the regional carrier, a
different employer; do not use it for AA).

**Resolution complete for the Phase 1 DFW tranche** — every employer on the
original list is now either a verified endpoint above, own-site, or (Walmart)
explicitly parked. Nothing is left in an unknown state.

### Workday query gotchas

- **The tenant number is not guessable** — Toyota is `wd503` not `wd5`, Capital
  One is `wd12`. Always take it from a real indexed URL, never a pattern.
- **Call shape:** `POST /wday/cxs/{tenant}/{site}/jobs`, headers
  `Content-Type: application/json` and `Accept: application/json`, body
  `{"limit":20,"offset":0,"searchText":"..."}`. A GET on the host returns 406
  and tells you nothing.
- **`searchText` is fuzzy and OR-ish.** `"AI"` returns 445 matches at McKesson;
  `"machine learning engineer"` returns 411 at Capital One. Treat the result as
  a candidate pool, then **filter titles client-side** against §1's grammar —
  do not trust the count as a relevance signal.
- **`total` is the match count, not the payload.** Only `limit` postings come
  back; paginate with `offset` when a filtered pass needs more.
- **Filter location client-side** on each posting's `locationsText`, which
  carries the city string (`Plano, Texas`, `Westlake, TX`).

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
