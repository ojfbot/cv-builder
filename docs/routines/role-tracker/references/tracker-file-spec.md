# Tracker file — contract

The tracker file is a markdown file in the operator's personal vault. It is
the single source of truth for both the *data* (targets, constraints, search
sources) and the *history* (statuses, diffs, changelog). The `role-tracker`
skill supplies the mechanics; this spec defines what the file must contain and
which parts the routine may write to.

## Required sections

| Section | Owner | Routine may… |
|---|---|---|
| `## 0. Tracker config` | shared | read; update `last run` line only |
| `## 1. Operator constraints` (the filter) | operator | read only |
| `## 2. Target list` (tiers + Dropped table) | shared | update Status/Shape/URL/Comp cells; clear `RESOLVE`/`UNVERIFIED` flags; append Dropped rows |
| Comp / market notes | operator | read only |
| Discovery sources | operator | read; may annotate a source as `dead` if it 404s twice |
| Calibration predictions (sealed) | operator | **never edit**; append actuals only when the operator reports them |
| Narrative / RFI sections | operator | read only |
| `## Inbox` | routine | append rows; the operator promotes/deletes them |
| `## Changelog` | routine | append dated entries |

If `## Inbox` or `## Changelog` are missing, create them at the end of the
file. Never renumber or reorder operator-owned sections.

## Config section (`## 0. Tracker config`)

Key–value lines the routine reads each run:

- `cadence:` e.g. `3d` (and optionally `1d during active loop`)
- `snapshots:` directory for per-row posting snapshots
- `telemetry:` optional JSONL sink path (omit or mark `UNVERIFIED` to skip)
- `cv-builder jobs dir:` where `promote` writes job JSONs
- `last run:` ISO date — the routine updates this line every run (the only line it
  edits in this section)

## Target rows

Each tier is a markdown table. Required columns: row id (`A1`, `B3`, …),
Company · Title, Location, URL, Comp, Travel/presence, Shape, Status,
Blockers/Notes. Row ids are permanent — never reuse an id, even for a dropped
row.

### Status vocabulary

`open` · `closed` · `changed` · `check-failed` · `applied` · `loop` ·
`declined` · `offer`

- `changed` — the posting body diff hit a material field (location list,
  salary band, travel %, required qualifications, close date). Store the diff
  in the Changelog; status returns to `open` on the next clean run.
- `check-failed` — the fetch errored (network, bot-wall, timeout). **Two-strike
  rule:** a row becomes `closed` only after closure evidence (404, "no longer
  accepting", gone from the source's own search index) on **two consecutive
  runs**, or one unambiguous "position filled/closed" page. A `check-failed`
  is never promoted straight to `closed`.
- `applied` / `loop` / `declined` / `offer` are operator-set; the routine
  still snapshots these rows but only flags material changes, never rewrites
  the status.

### Flags (inline in cells)

- `RESOLVE` — no direct posting URL yet; the row carries a search URL instead.
  The routine finds the direct URL, writes it back, clears the flag.
- `UNVERIFIED` — the cell's value was not read from the posting itself. The
  routine replaces it with a posted value when one is found, then re-tiers the
  row against the comp filter.

### Shape vocabulary (travel/customer posture)

The operator's ranking preference lives in §1; the vocabulary is fixed:

- `pre-sales` — travel in support of sales: solutions architect/engineer
  motion, pre-sale scoping, demos, POCs.
- `customer-delivery` — post-sale forward-deployed delivery at the customer:
  embed, build, deploy, own adoption. Classic FDE.
- `internal-embed` — deployed into an internal business unit, not an external
  customer.
- `platform-config` — configuring a vendor platform rather than building.
- `unknown` — posting doesn't say; the routine should try to resolve it.

Rows discovered via the secondary title family (Solutions Architect /
Solutions Engineer / Applied AI at labs and platform vendors) also carry a
`secondary` tag in the Inbox.

## Triage grammar (for `discover`)

The *values* come from the tracker file's §1; the mechanics are:

1. **Title match** against the primary title patterns; secondary title family
   only for the companies §1 names for it.
2. **Hard blockers** — a required-qualifications hit on any hard-blocker
   keyword rejects the req (append to Dropped if it would otherwise keep
   resurfacing).
3. **Band floor** — reject if the posted band max is below the §1 floor; flag
   (don't reject) inside the §1 flag range; treat no posted band as
   `UNVERIFIED`, not as a rejection.
4. **Location** — must match a §1 location, or be a multi-city list containing
   one.
5. **Soft blockers** — never reject; record in the Blockers column.
6. **Shape ranking** — when summarizing or ordering candidates at comparable
   comp, apply §1's shape preference order.

Survivors go to `## Inbox`: `id-less` rows with URL, one-line summary, shape
tag, triggering search, date. Only the operator moves a row from Inbox into a
tier (assigning the next free row id).

## Changelog entries

One dated bullet per run, compact:

```
- 2026-09-01 · targets: 21 checked, A3 changed (band added: $220–305k, diff below), B2 closed (404 ×2), B1 RESOLVE→ https://… · discover: 2 inbox (1 secondary) · 1 check-failed (A7, bot-wall)
```

Material diffs go directly under the entry as an indented sub-bullet quoting
before → after.

## Snapshots

One plain-text file per row id in the snapshots directory, overwritten on
each successful fetch *after* diffing. Keep the previous version as
`<id>.prev` so one historical diff is always reconstructible.
