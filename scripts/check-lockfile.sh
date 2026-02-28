#!/usr/bin/env sh
# check-lockfile.sh
# Blocks commits that add/change dependency specifiers in package.json without
# also staging pnpm-lock.yaml. Prevents the CI frozen-lockfile cascade (TD-001).
#
# Only fires on actual specifier mutations (lines beginning with ^ ~ >= file: workspace:)
# — does NOT fire on scripts, description, version, or other metadata changes.
#
# Used by: .husky/pre-commit
# Usage:   sh scripts/check-lockfile.sh

set -e

# Detect added/changed lines in staged package.json files that look like
# dependency specifiers: semver ranges (^, ~, >=) or local refs (file:, workspace:)
DEP_CHANGE=$(git diff --cached -- '*/package.json' 'package.json' | \
  grep -v 'node_modules' | \
  grep -E '^\+\s+"[^"]+"\s*:\s*"(\^|~|>=|file:|workspace:)' | \
  grep -v '^+++' || true)

if [ -z "$DEP_CHANGE" ]; then
  exit 0  # no dependency specifier changes, nothing to check
fi

STAGED_LOCKFILE=$(git diff --cached --name-only | grep '^pnpm-lock\.yaml$' || true)

if [ -z "$STAGED_LOCKFILE" ]; then
  echo ""
  echo "❌ LOCKFILE DRIFT DETECTED"
  echo ""
  echo "Dependency specifier change(s) staged in package.json:"
  echo "$DEP_CHANGE" | sed 's/^/  /'
  echo ""
  echo "But pnpm-lock.yaml is NOT staged."
  echo ""
  echo "Run:"
  echo "  pnpm install"
  echo "  git add pnpm-lock.yaml"
  echo ""
  echo "To bypass (non-dep changes only — scripts, description, etc.):"
  echo "  SKIP_LOCKFILE_CHECK=1 git commit ..."
  echo ""
  exit 1
fi

echo "✅ Lockfile check passed"
