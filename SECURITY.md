# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in CV Builder, please report it by:

1. **GitHub Security Advisory**: Create a security advisory at https://github.com/ojfbot/cv-builder/security/advisories/new
2. **Issues**: For non-critical security concerns, create an issue with the `security` label

**Please do NOT:**
- Post security vulnerabilities in public issues
- Share exploit details publicly before they are fixed

## Security Best Practices

### API Key Management

**CRITICAL**: Never commit API keys or secrets to the repository.

- Store API keys in `packages/agent-core/env.json` (gitignored)
- Use environment variables in production
- Rotate keys immediately if exposed
- Never commit `dist/` or `build/` directories

### Configuration Files

The following files should NEVER be committed:
- `env.json` (except `env.json.example`)
- `.env` or `.env.local`
- Any file containing `sk-ant-api*` keys
- Build artifacts in `dist/` or `build/`

### Lockfile Strategy

This project gitignores `pnpm-lock.yaml` to enhance security:

**Why lockfiles are gitignored:**
1. **Prevent dependency tree exposure**: Lockfiles reveal the complete dependency graph, including transitive dependencies and their versions, which could help attackers identify known vulnerabilities
2. **Avoid massive diffs**: Lockfiles can contain thousands of lines, making PRs harder to review
3. **Enable security updates**: Allows contributors to receive patch updates automatically

**Mitigations:**
- Critical dependencies are pinned via `pnpm.overrides` in `package.json`
- Node version enforced via `.nvmrc` (v24.11.1 LTS)
- pnpm version pinned via `packageManager` field (pnpm@9.15.4)
- Docker builds use `--frozen-lockfile` with committed lockfile in production images

**For contributors:**
```bash
# Install dependencies (will resolve fresh from package.json)
pnpm install

# Verify installation worked
pnpm type-check
pnpm build
```

**Note**: You may see slightly different dependency versions than other contributors, but critical packages are pinned to ensure compatibility.

### Pre-commit Checks

Before committing, verify:

```bash
# Check for API keys
git diff --cached | grep -i "sk-ant-api" && echo "⚠️ API key detected!"

# Check for secrets
git grep -i "sk-ant-api" -- '*.ts' '*.js' '*.json' ':!*.example'

# Verify dist/ not staged
git diff --cached --name-only | grep "dist/"
```

### Automated Security

This repository uses:
- **GitHub Secret Scanning**: Automatically detects committed secrets
- **TruffleHog**: CI/CD pipeline scans for credentials
- **Dependabot**: Automated dependency security updates

## Security Incidents

### Recent Incidents

#### 2025-12-04: API Key Exposure in dist/ Directory
- **Severity**: Critical
- **Status**: Resolved
- **Details**: Build artifacts containing API keys were committed to git history
- **Resolution**:
  - Old API key deactivated
  - New key rotated
  - `dist/` removed from git tracking
  - `.gitignore` updated
  - CI/CD security scanning added
- **Issue**: #47

## Security Features

### Server-Side Architecture

CV Builder uses a secure client-server architecture:

- **API keys NEVER exposed to browser**: All keys stored server-side in `env.json`
- **REST API**: Browser app communicates through authenticated API endpoints
- **No client-side secrets**: Browser code contains zero credentials

### Data Privacy

- User data stored in gitignored directories (`personal/`, `bio/`, `jobs/`, `output/`)
- Example data only in `public/examples/` and `dev/`
- All personal information excluded from version control

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ Yes             |
| < 1.0   | ❌ No              |

## Security Contacts

- **Maintainer**: @ojfbot
- **Security Advisories**: https://github.com/ojfbot/cv-builder/security/advisories

## Acknowledgments

We appreciate responsible disclosure of security vulnerabilities. Contributors who report valid security issues will be credited in release notes (with permission).
