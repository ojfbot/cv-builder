---
name: role-tracker
description: >-
  Recurring, read-only job-listing tracker routine. Verifies the status of
  tracked job postings, diffs them against snapshots, runs discovery scans for
  new roles, triages results against the operator's filter, and writes results
  back to a tracker file in the operator's personal vault. Can promote a
  tracked role into a cv-builder job JSON for resume tailoring. Use when asked
  to "run the role tracker", "check my job targets", "scan for new FDE /
  consulting roles", or "promote a job target". All personal data lives
  outside this repository.
---

# Role Tracker — recurring listing-tracker routine

A repeatable Claude Code routine for tracking a curated list of job postings
over time. The routine is **mechanics only**: everything personal — the
operator's constraints, comp filter, target list, discovery search URLs — lives
in a **tracker file** in the operator's vault, never in this repository. The
tracker file's contract is defined in `references/tracker-file-spec.md`; read
it before the first run of a session.

## Posture (non-negotiable)

- **Read-only toward the outside world.** Fetch and read postings and search
  pages. Never apply, never message recruiters, never fill or submit forms,
  never create accounts.
- **Privacy.** Never commit the tracker file, the local config, snapshots, or
  emitted `/jobs/*.json` files to this repository — it is public. Those paths
  are already gitignored; keep them that way. Never paste tracker-file
  contents into commits, PRs, or issues.
- **Evidence over inference.** Every status change written to the tracker file
  must cite what was actually fetched (URL + what was seen). A fetch failure
  is not a closure — see status rules in the spec.
- **This routine does not run from the cv-builder API service or GitHub
  Actions.** It is a local Claude Code routine run against the operator's
  vault and, optionally, this repo's gitignored `/jobs/` directory.

## Config resolution

1. If the invocation passes a path argument, that is the tracker file.
2. Otherwise read `personal/role-tracker.config.json` (gitignored) from the
   repo root; its `trackerFile` field names the tracker file
   (e.g. `~/selfco/core/personal-knowledge/fde-job-target.md`).
3. If neither exists, run **init** (below) instead of failing.

The config may also set: `snapshotsDir` (default: `<trackerFile dir>/.snapshots/`),
`jobsDir` (default: `<repo>/jobs/`), `telemetrySink` (optional JSONL path for
a one-line run summary).

## Modes

Invocation: `/role-tracker [mode] [args]`. No mode = **full run**
(targets, then discover).

### `init` — first-run bootstrap

1. Ask the operator for the handoff report (or the path to it) and the vault
   path where the tracker file should live.
2. Restructure the report to conform to `references/tracker-file-spec.md`
   (section numbering, status + shape columns, discovery sources as data) and
   write it to the vault path.
3. Write `personal/role-tracker.config.json` pointing at it. Confirm the
   `personal/` gitignore rule covers it before writing.
4. If the report names a stale wiki reference to resolve, update that wiki
   file's link to the new path.
5. Run a first **targets** pass to resolve `RESOLVE` rows and initialize
   snapshots.

### `targets` — verify every tracked row

For each row in the tracker file's target tiers (skip rows already
`applied`/`loop`/`declined`/`offer` unless asked, and skip the Dropped table):

1. **Fetch the direct URL.** Classify: reachable posting → `open`; 404 /
   "no longer accepting" / removed → candidate-closed; fetch error →
   `check-failed` (see spec for the two-strike closure rule).
2. **Diff against the stored snapshot** (save page text to the snapshots dir,
   one file per row id). Emit `changed` on any diff to: location list, salary
   band, travel %, required qualifications, close date. Record the diff in the
   Changelog.
3. **`RESOLVE` rows:** query the row's listed search URL, find the matching
   posting, write the direct URL (and any posted band) back into the row,
   clear the flag.
4. **`UNVERIFIED` comp:** try to read a posted band from the posting; if
   found, write it back and re-evaluate the row's tier against the comp filter
   in the tracker file's constraints section.
5. **Shape check:** if the posting reveals the role's travel/customer posture,
   set or correct the row's `Shape` value per the spec vocabulary.

Never edit operator-owned sections (constraints, comp notes, sealed
calibration predictions, narrative/RFI sections) — the spec lists them.

### `discover` — scan for new roles

1. Run every search listed in the tracker file's discovery-sources section
   (they are data, not part of this skill).
2. Triage each hit with the filter grammar in the spec, using the values
   (title patterns, hard/soft blockers, band floor, locations, shape ranking)
   from the tracker file's constraints section.
3. Anything surviving that is not already in a tier, the Inbox, or the Dropped
   table → append to `## Inbox` with URL, one-line summary, shape tag, and the
   triggering search. Secondary-title-family hits get the `secondary` tag.
   The operator promotes Inbox rows to a tier manually — never auto-tier.
4. New hard-blocker hits worth remembering → append to the Dropped table with
   the reason, so they are not re-surfaced.

### `promote <row-id>` — hand a target to cv-builder

Bridge from tracking to tailoring:

1. Fetch the row's posting and extract title, company, location, salary band,
   posted/close dates, description, requirements, nice-to-haves.
2. Write `<jobsDir>/<row-id lowercased>.json` in the schema of
   `public/examples/job-example.json`. Put the row's tier, shape, blockers,
   and tracker notes into the `notes` field.
3. Tell the operator the tailoring command:
   `pnpm cli:headless -- --job <id>`.

### Wrap-up (every run)

1. Append a dated Changelog entry: rows checked, status changes (with
   evidence), resolves, inbox additions, fetch failures.
2. If the config names a `telemetrySink`, append one JSON line:
   `{ts, mode, checked, changed, closed, resolved, inbox, failures}`.
3. Report a short human summary: what changed, what needs the operator's
   decision (Inbox, tier changes, approaching deadlines).

## Remote routine variant (claude.ai Routines)

A Routine fired from the claude.ai Routines panel spawns a **fresh cloud
session with no repository and no local filesystem state** — it cannot read
this file, and it cannot see the operator's vault. Verified 2026-08-30: the
account's environments are plain `Default` cloud environments with no repo
bound, and a fired run failed on exactly that.

So for the scheduled variant:

- The **mechanics travel inline in the routine prompt**, not by reference to
  this file. This file is the source that prompt is written from; keep them
  in sync by hand when the mechanics change.
- The **tracker file is a Notion page**, not a vault markdown file — it is the
  only durable surface a fired session can both read and write. Address it by
  URL, never by title search.
- **No snapshots.** With no filesystem between runs, each row carries a
  `watch:` line holding its material fields (band, location, travel, close
  date, quals summary); diffing is `watch:` versus the live posting, and the
  routine updates `watch:` in place.
- `promote` stays interactive-only — it needs the repo's `/jobs/` directory
  and the operator's judgment about when to apply.

The local variant (this file, vault markdown, real snapshots) remains valid
for interactive `/role-tracker` runs inside a cv-builder checkout.

## Cadence and scheduling

Default cadence lives in the tracker file's config section (typical: every
3 days; daily while an interview loop is active). Ways to make it recur —
choose whatever the operator prefers, but never GitHub Actions and never the
cv-builder service:

- Manual: run `/role-tracker` when due; the Changelog's last entry shows when.
- A local scheduled Claude Code task / routine that invokes `/role-tracker`.
- `/loop` with a long interval during an active loop week.

If a run is overdue (last Changelog entry older than 2× cadence), say so in
the summary.
