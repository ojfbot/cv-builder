# role-tracker — install notes

This directory is the **source of truth** for the `role-tracker` Claude Code
skill. It lives under `docs/routines/` because `.claude/skills/` is gitignored
in this repo ("managed by core — do not commit"): skills are distributed into
working copies by the operator's core tooling, not committed here.

**To install locally**, have core adopt this directory, or simply:

```bash
mkdir -p .claude/skills
cp -r docs/routines/role-tracker .claude/skills/role-tracker
```

Then invoke with `/role-tracker` (first run: `/role-tracker init`).

Contents:

- `SKILL.md` — the routine: modes (`init`, `targets`, `discover`,
  `promote`), posture, config resolution, cadence.
- `references/tracker-file-spec.md` — the contract for the tracker data file
  that lives in the operator's personal vault (never in this repo).

No personal data belongs in this directory — the skill is mechanics only.
Constraints, target lists, and search sources live in the vault tracker file
addressed by the gitignored `personal/role-tracker.config.json`.
