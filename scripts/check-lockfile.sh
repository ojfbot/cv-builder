#!/usr/bin/env sh
# check-lockfile.sh
# Verifies pnpm-lock.yaml is staged whenever any package.json is staged with
# a specifier change. Prevents the CI frozen-lockfile cascade (TD-001).
#
# Used by: .husky/pre-commit
# Usage:   sh scripts/check-lockfile.sh

set -e

STAGED_PACKAGES=$(git diff --cached --name-only | grep 'package\.json$' | grep -v 'node_modules' || true)

if [ -z "$STAGED_PACKAGES" ]; then
  exit 0  # no package.json staged, nothing to check
fi

STAGED_LOCKFILE=$(git diff --cached --name-only | grep '^pnpm-lock\.yaml$' || true)

if [ -z "$STAGED_LOCKFILE" ]; then
  echo ""
  echo "❌ LOCKFILE DRIFT DETECTED"
  echo ""
  echo "The following package.json file(s) are staged:"
  echo "$STAGED_PACKAGES" | sed 's/^/  /'
  echo ""
  echo "But pnpm-lock.yaml is NOT staged."
  echo ""
  echo "If you changed a dependency specifier, run:"
  echo "  pnpm install"
  echo "  git add pnpm-lock.yaml"
  echo ""
  echo "If your package.json change was not a dependency change (e.g. scripts,"
  echo "version bump, description), you can bypass this check with:"
  echo "  SKIP_LOCKFILE_CHECK=1 git commit ..."
  echo ""
  exit 1
fi

echo "✅ Lockfile check passed"
