# Environment File Change

## Issue

The presence of `.env` file was causing conflicts with Claude CLI startup.

## Solution

Renamed `.env` to `.env.local` to avoid conflicts.

## What Changed

1. **Environment file**: `.env` → `.env.local`
2. **Config loader**: Updated `packages/agent-core/src/utils/config.ts` to load `.env.local`
3. **Docker configs**: Updated `docker-compose.yml` and `Dockerfile` to use `.env.local`
4. **Package scripts**: Updated `docker:run` script to use `--env-file .env.local`
5. **.env.example**: Added instructions to copy to `.env.local`
6. **Documentation**: Updated README with new setup instructions

## Setup Instructions

### For New Users

```bash
# Copy the example file
cp .env.example .env.local

# Edit and add your API key
nano .env.local
```

### For Existing Users

Your `.env` has been renamed to `.env.local`. No action needed.

## Why .env.local?

- ✅ Avoids conflicts with Claude CLI
- ✅ Already in .gitignore (won't be committed)
- ✅ Standard convention for local overrides
- ✅ Supported by dotenv library

## Verification

Test that everything works:

```bash
# CLI should work now
npm run cli

# Browser app should work
npm run dev

# Docker should work
docker-compose up
```

## Technical Details

The config loader now tries multiple paths in order:
1. `<repo-root>/.env.local`
2. `<current-working-dir>/.env.local`
3. `.env` (fallback)

This ensures the API key is found regardless of where commands are run from.
