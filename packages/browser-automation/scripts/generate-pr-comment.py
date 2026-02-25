#!/usr/bin/env python3
"""Generate the PR comment markdown for browser automation test results.

Reads the screenshot manifest and test-baselines directory to build a
table of which baselines are present vs missing, then writes the result
to temp/test-results/pr-comment.md.

Environment variables (all optional, defaults shown):
  MANIFEST      path to screenshot-manifest.json
  BASELINES     path to test-baselines directory
  TESTS_OUTCOME outcome string from the comprehensive-tests step
  VISUAL_OUTCOME outcome string from the visual-regression step
"""

import json
import os

manifest_path = os.environ.get(
    "MANIFEST",
    "packages/browser-automation/templates/drawio/screenshot-manifest.json",
)
baselines_dir = os.environ.get(
    "BASELINES",
    "packages/browser-automation/test-baselines/cv-builder-visual",
)
tests_outcome = os.environ.get("TESTS_OUTCOME", "skipped")
visual_outcome = os.environ.get("VISUAL_OUTCOME", "skipped")


def icon(s):
    return {
        "success": "✅",
        "failure": "❌",
        "skipped": "⏭️",   # intentionally not run (e.g. conditional step)
        "cancelled": "🚫", # externally interrupted mid-run
    }.get(s, "⚠️")


def escape_md(s: str) -> str:
    """Escape characters that would break a GFM table cell."""
    return (s.replace('|', r'\|')
             .replace('[', r'\[')
             .replace(']', r'\]')
             .replace('`', r'\`'))


cells = []
manifest_missing = not os.path.exists(manifest_path)
if not manifest_missing:
    try:
        with open(manifest_path) as f:
            cells = json.load(f)["cells"]
    except (json.JSONDecodeError, KeyError, OSError) as exc:
        manifest_missing = True
        print(f"Warning: could not parse manifest ({exc}) — baseline table unavailable.")

rows = []
available = 0
for c in cells:
    name = c.get("screenshotBaseline")
    if not name:
        continue
    exists = os.path.exists(f"{baselines_dir}/{name}.png")
    if exists:
        available += 1
    status = "✅ captured" if exists else "⬜ missing"
    test_step = escape_md(c.get("testStep", name))
    ui_state = c.get("uiState", {})
    state_str = escape_md(", ".join(f"{k}={v}" for k, v in ui_state.items() if v))
    rows.append(f"| {status} | `{name}` | {test_step} | {state_str} |")

total = len(cells)
missing = total - available

lines = []
lines.append("## Browser Automation Test Results")
lines.append("")
lines.append("| Suite | Result |")
lines.append("|-------|--------|")
lines.append(f"| Comprehensive tests | {icon(tests_outcome)} `{tests_outcome}` |")
lines.append(f"| Visual regression   | {icon(visual_outcome)} `{visual_outcome}` |")
lines.append("")

if manifest_missing:
    lines.append(f"> ⚠️ Manifest not found at `{manifest_path}` — baseline table unavailable.")
elif available == total:
    lines.append(f"### Screenshot Baselines — {available}/{total} ✅ Complete")
else:
    lines.append(f"### Screenshot Baselines — {available}/{total} ({missing} missing)")

if not manifest_missing:
    lines.append("")
    lines.append("| Status | Baseline | Test Step | UI State |")
    lines.append("|--------|----------|-----------|----------|")
    lines.extend(rows)

if not manifest_missing and missing > 0:
    lines.append("")
    lines.append("<details>")
    lines.append(
        f"<summary>Re-run with <code>update_baselines: true</code> to generate"
        f" {missing} missing baseline(s)</summary>"
    )
    lines.append("")
    lines.append("Trigger the workflow manually:")
    lines.append("1. Go to **Actions → Browser Automation Tests (Docker)**")
    lines.append("2. Click **Run workflow**")
    lines.append("3. Set **Update visual regression baselines** → `true`")
    lines.append("</details>")

out_path = os.environ.get("OUT_PATH", "temp/test-results/pr-comment.md")
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w") as f:
    f.write("\n".join(lines) + "\n")

print(f"PR comment written to {out_path} ({available}/{total} baselines available)")
