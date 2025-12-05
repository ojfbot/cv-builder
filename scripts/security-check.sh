#!/bin/bash

# Security check script - runs before builds
# Ensures no API keys or sensitive data in the codebase

set -e

echo "🔍 Running security checks..."
echo ""

# Check 1: Search for API keys in code
echo "1️⃣  Checking for API keys in source code..."
if git grep -n -E 'sk-ant-api[0-9]{2}-[A-Za-z0-9_-]{90,}' -- '*.ts' '*.js' '*.tsx' '*.jsx' '*.json' ':!*.example' ':!SECURITY.md' ':!.github/' ':!scripts/'; then
  echo ""
  echo "❌ ERROR: API keys found in source code!"
  echo "Please remove API keys and store them in env.json (gitignored)"
  exit 1
else
  echo "   ✅ No API keys found in source code"
fi

# Check 2: Verify env.json is gitignored
echo ""
echo "2️⃣  Checking env.json configuration..."
if git ls-files | grep -q "^packages/agent-core/env\.json$"; then
  echo "   ❌ ERROR: env.json is tracked by git!"
  echo "   Run: git rm --cached packages/agent-core/env.json"
  exit 1
else
  echo "   ✅ env.json is properly gitignored"
fi

# Check 3: Verify dist/ is not tracked
echo ""
echo "3️⃣  Checking for build artifacts..."
if git ls-files | grep -E "dist/.*\.(js|css|html)$" | grep -v "dist/README.md"; then
  echo "   ❌ ERROR: Build artifacts are tracked by git!"
  echo "   Run: git rm --cached <files>"
  git ls-files | grep -E "dist/.*\.(js|css|html)$"
  exit 1
else
  echo "   ✅ No build artifacts tracked"
fi

# Check 4: Verify .gitignore has proper entries
echo ""
echo "4️⃣  Checking .gitignore configuration..."
if grep -q "^dist/" .gitignore && grep -q "^env.json" .gitignore; then
  echo "   ✅ .gitignore properly configured"
else
  echo "   ⚠️  WARNING: .gitignore may be missing entries"
  echo "   Expected: dist/, env.json"
fi

echo ""
echo "✅ All security checks passed!"
echo ""
