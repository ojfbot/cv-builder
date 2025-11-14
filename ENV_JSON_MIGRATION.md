# Migration to env.json Configuration

## Overview

The CV Builder project now supports a centralized `env.json` configuration file located in the `agent-core` package. This provides better type safety, validation, and a cleaner configuration experience.

## What Changed

1. **New Configuration Method**: `env.json` in `packages/agent-core/`
2. **Schema Validation**: Zod-based validation for configuration
3. **Backwards Compatibility**: `.env.local` still works as a fallback
4. **Type Safety**: Full TypeScript types for configuration

## Migration Steps

### For New Users

Simply create `env.json`:

```bash
# Copy the example file
cp packages/agent-core/env.json.example packages/agent-core/env.json

# Edit and add your API key
nano packages/agent-core/env.json
```

### For Existing Users

You have two options:

#### Option 1: Migrate to env.json (Recommended)

Create `packages/agent-core/env.json`:

```json
{
  "anthropicApiKey": "your_api_key_here",
  "directories": {
    "bio": "bio",
    "jobs": "jobs",
    "output": "output",
    "public": "public"
  },
  "model": "claude-sonnet-4-20250514"
}
```

After creating this file, you can optionally remove `.env.local`.

#### Option 2: Keep Using .env.local

No action needed! The system will continue to use `.env.local` if `env.json` doesn't exist.

## Configuration Priority

The system checks for configuration in this order:

1. `packages/agent-core/env.json` (highest priority)
2. `.env.local` in project root
3. `.env` in project root (fallback)

## Benefits of env.json

- **Type Safety**: Zod schema validation catches errors early
- **Centralized**: All configuration in one place
- **Flexible**: Easy to add new configuration options
- **Portable**: JSON format is easy to manage and version (when not sensitive)
- **Model Configuration**: Can specify which Claude model to use

## Configuration Schema

```typescript
{
  anthropicApiKey: string       // Required: Your Anthropic API key
  directories: {
    bio: string                 // Default: "bio"
    jobs: string                // Default: "jobs"
    output: string              // Default: "output"
    public: string              // Default: "public"
  }
  model: string                 // Default: "claude-sonnet-4-20250514"
}
```

## Troubleshooting

### "Configuration not found" Error

Make sure either:
- `packages/agent-core/env.json` exists with valid format, OR
- `.env.local` exists with `ANTHROPIC_API_KEY`

### "env.json validation failed" Error

Check that your `env.json` follows the correct schema. Compare with `env.json.example`.

### Still Using .env.local

That's perfectly fine! The system maintains backwards compatibility.

## Security Note

**IMPORTANT**: `env.json` is gitignored by default. Never commit this file to version control as it contains sensitive API keys.

## Questions?

See the main README.md or CLAUDE.md for full documentation.
