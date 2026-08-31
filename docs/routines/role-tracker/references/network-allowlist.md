# Network allowlist for the role-tracker routine

The routine's values are only as good as its ability to read a posting. On an
environment with **Trusted** network access (the default), every job-board
domain is blocked by the egress proxy, so the routine falls back to search
snippets and every band and URL it writes is a lead rather than a fact. That is
what produced the pass-6 Denver/Columbus error.

Fix: run the routine in a cloud environment whose **Network access** is
**Custom**, with the domains below allowed.

## Setup

1. claude.ai → environment settings → create a new environment (recommended:
   leave **Default** on Trusted rather than loosening it). Name it something
   like `job-research`.
2. Set **Network access** to **Custom**.
3. Paste the list below into **Allowed domains**, one per line.
4. Check **Also include default list of common package managers** so GitHub,
   npm, and the rest keep working.
5. Point the role-tracker Routine at this environment.

Traffic that does **not** go through this allowlist, and keeps working at any
access level: GitHub (separate proxy), MCP connector traffic (so the Notion
tracker page is reachable regardless), and the Anthropic API.

## Allowed domains

A leading `*.` matches subdomains; apex domains are listed separately where the
site is served from the apex.

The **Allowed domains** field accepts domains only — no comments, no URLs. Do
not paste `#` headers or blank-line groupings into it; it rejects the whole
entry with "is not a valid domain."

Group 1, company career sites and ATS platforms — the primary sources, and the
only ones that reliably carry per-city bands:

```text
apply.deloitte.com
job-boards.greenhouse.io
boards.greenhouse.io
openai.com
*.openai.com
google.com
*.google.com
careers.google.com
okta.com
*.okta.com
salesforce.com
*.salesforce.com
careers.procore.com
careers.capgemini.com
accenture.com
*.accenture.com
careers.t-mobile.com
careers.wtwco.com
apply.workable.com
jobs.ashbyhq.com
jobs.lever.co
remote.com
*.remote.com
c3.ai
*.c3.ai
liatrio.ai
*.liatrio.ai
```

Group 2, aggregators and search boards — optional, and expect partial success
(see below):

```text
indeed.com
*.indeed.com
simplyhired.com
*.simplyhired.com
ziprecruiter.com
*.ziprecruiter.com
dice.com
*.dice.com
wellfound.com
*.wellfound.com
glassdoor.com
*.glassdoor.com
theladders.com
*.theladders.com
jobleads.com
*.jobleads.com
lensa.com
*.lensa.com
talent.com
*.talent.com
startup.jobs
*.startup.jobs
jobs.technyc.org
builtinchicago.org
*.builtinchicago.org
```

Group 3, FDE-specific trackers and market data:

```text
fdepulse.com
*.fdepulse.com
fwddeploy.com
*.fwddeploy.com
joinplank.com
*.joinplank.com
becomeanfde.com
*.becomeanfde.com
```

Add `*.frame.claudeusercontent.com` if sessions in this environment should read
Claude artifacts.

## Expectations after unblocking

An allowlist removes the *proxy* block; it does not defeat a site's own bot
protection. Expect a split:

- **Reliable:** ATS platforms and company career pages — Greenhouse, Ashby,
  Workable, Lever, `apply.deloitte.com`, `careers.google.com`, Okta, Procore,
  Salesforce. These carry the authoritative per-city bands, which is exactly
  what the geo-keyed comp rule needs.
- **Unreliable regardless:** Indeed, Glassdoor, ZipRecruiter and LinkedIn
  aggressively block automated fetches and may still return 403 or a captcha.
  Keep using them as discovery surfaces via search, and treat any value read
  from them as an estimate, not a posted band.

So the routine should still label its sources: a band read from an ATS page is
a posted band; anything from an aggregator or a search snippet stays
`UNVERIFIED` or is marked an estimate.

## Alternative: run it locally

The other path to unblocked fetches is running the pass on the workstation
where the selfco promoter already runs — a cron or launchd job invoking
`claude -p "<the routine prompt>"`. That has no egress proxy at all and no
environment to configure, at the cost of only running when the machine is on.
