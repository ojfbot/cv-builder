#!/bin/bash

# Security verification script
# Comprehensive security audit of the repository

set -e

echo "🔐 CV Builder Security Audit"
echo "============================="
echo ""

ERRORS=0
WARNINGS=0

# Function to report findings
report_ok() {
  echo "✅ $1"
}

report_warning() {
  echo "⚠️  $1"
  ((WARNINGS++))
}

report_error() {
  echo "❌ $1"
  ((ERRORS++))
}

# Check 1: .gitignore configuration
echo "1. Checking .gitignore configuration..."
if grep -q "^dist/" .gitignore; then
  report_ok "dist/ is in .gitignore"
else
  report_error "dist/ missing from .gitignore"
fi

if grep -q "^env.json" .gitignore; then
  report_ok "env.json is in .gitignore"
else
  report_error "env.json missing from .gitignore"
fi
echo ""

# Check 2: Git tracking status
echo "2. Checking git tracking status..."
if git ls-files | grep -E "dist/.*\.(js|css|html)$" | grep -v "dist/README.md" > /dev/null; then
  report_error "Build artifacts are tracked by git"
  git ls-files | grep -E "dist/.*\.(js|css|html)$" | head -5
else
  report_ok "No build artifacts tracked"
fi

if git ls-files | grep "env.json$" | grep -v "env.json.example" > /dev/null; then
  report_error "env.json is tracked by git"
else
  report_ok "env.json is not tracked"
fi
echo ""

# Check 3: Search for API keys in codebase
echo "3. Scanning for API keys in source code..."
if git grep -n -E 'sk-ant-api[0-9]+-[a-zA-Z0-9_-]+' -- '*.ts' '*.js' '*.tsx' '*.jsx' '*.json' ':!*.example' ':!SECURITY.md' ':!.github/' ':!scripts/' > /dev/null 2>&1; then
  report_error "API keys found in source code!"
  git grep -n -E 'sk-ant-api[0-9]+-[a-zA-Z0-9_-]+' -- '*.ts' '*.js' '*.tsx' '*.jsx' '*.json' ':!*.example' ':!SECURITY.md' ':!.github/' ':!scripts/'
else
  report_ok "No API keys in source code"
fi
echo ""

# Check 4: Environment configuration
echo "4. Checking environment configuration..."
if [ -f "packages/agent-core/env.json" ]; then
  report_ok "env.json exists"
  if [ -f "packages/agent-core/env.json.example" ]; then
    report_ok "env.json.example exists"
  else
    report_warning "env.json.example missing (developers need a template)"
  fi
else
  report_warning "env.json not found (needed for API access)"
fi
echo ""

# Check 5: Security documentation
echo "5. Checking security documentation..."
if [ -f "SECURITY.md" ]; then
  report_ok "SECURITY.md exists"
else
  report_error "SECURITY.md missing"
fi
echo ""

# Check 6: GitHub Actions security scanning
echo "6. Checking GitHub Actions security..."
if [ -f ".github/workflows/security-scan.yml" ]; then
  report_ok "Security scanning workflow exists"
else
  report_warning "Security scanning workflow missing"
fi
echo ""

# Check 7: Pre-commit hooks
echo "7. Checking pre-commit hooks..."
if [ -f ".husky/pre-commit" ]; then
  report_ok "Pre-commit hook exists"
  if [ -x ".husky/pre-commit" ]; then
    report_ok "Pre-commit hook is executable"
  else
    report_warning "Pre-commit hook not executable (run: chmod +x .husky/pre-commit)"
  fi
else
  report_warning "Pre-commit hook missing (install husky: npm install husky --save-dev)"
fi
echo ""

# Summary
echo "============================="
echo "Security Audit Summary"
echo "============================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ Perfect! No security issues found."
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  $WARNINGS warning(s) found (see above)"
  echo "Consider addressing these for better security posture."
  exit 0
else
  echo "❌ $ERRORS error(s) and $WARNINGS warning(s) found"
  echo "Please fix the errors before proceeding."
  exit 1
fi
