#!/bin/bash

# Security scan for API keys
# Returns exit code 1 if keys are found, 0 if not

echo "Checking for hardcoded API keys..."

# Search for Anthropic API keys
if git grep -n -E 'sk-ant-api[0-9]{2}-[A-Za-z0-9_-]{90,}' -- \
  '*.ts' '*.js' '*.tsx' '*.jsx' '*.json' \
  ':!*.example' ':!SECURITY.md' ':!.github/' ':!scripts/'; then
  echo ""
  echo "❌ ERROR: API keys found in tracked files!"
  echo "Please remove these keys and rotate them immediately."
  exit 1
else
  echo "✅ No API keys found"
  exit 0
fi
