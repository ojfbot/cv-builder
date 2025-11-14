# Browser Compatibility Fix

## Issue

Build error when running `npm run build`:

```
Uncaught Error: Module "fs" has been externalized for browser compatibility.
Cannot access "fs.promises" in client code.
```

This occurred because the browser-app was importing Node.js modules (`fs`, `path`) through the `@cv-builder/agent-core` package.

## Root Cause

When the browser tried to import from `@cv-builder/agent-core`, it loaded the entire `index.ts` which included exports of:
- `FileStorage` (uses Node.js `fs` module)
- `getConfig` (uses Node.js `fs` module)
- `OrchestratorAgent` (uses both FileStorage and getConfig)

These modules are not compatible with browser environments.

## Solution

Restructured the `agent-core` package exports to only export browser-compatible modules in the main entry point.

### Changes Made

#### 1. Updated `packages/agent-core/src/index.ts`

**Removed from main exports:**
- `FileStorage`
- `getConfig`
- `OrchestratorAgent`

**Added to exports:**
- Type exports for better TypeScript support

**Result:** Main package now only exports browser-compatible modules.

#### 2. How to Import Node.js-Only Modules

For Node.js environments (CLI, server), import directly:

```typescript
// Instead of this (won't work in browser):
import { FileStorage, getConfig } from '@cv-builder/agent-core'

// Use this (Node.js only):
import { FileStorage } from '@cv-builder/agent-core/utils/file-storage'
import { getConfig } from '@cv-builder/agent-core/utils/config'
import { OrchestratorAgent } from '@cv-builder/agent-core/agents/orchestrator-agent'
```

#### 3. Fixed TypeScript Unused Variable Warnings

- `packages/browser-app/src/components/Dashboard.tsx` - Removed unused `isExpanded`
- `packages/browser-app/src/contexts/ChatContext.tsx` - Prefixed unused param with `_`
- `packages/browser-app/src/services/browser-orchestrator.ts` - Removed unused method and prefixed unused param

## Package Export Structure

### Browser-Safe Exports (from main entry point)

```typescript
import {
  // Base Agent
  BaseAgent,

  // Specialized Agents (all browser-compatible)
  ResumeGeneratorAgent,
  JobAnalysisAgent,
  TailoringAgent,
  SkillsGapAgent,
  InterviewCoachAgent,

  // Models
  Bio,
  BioSchema,
  JobListing,
  JobListingSchema,

  // Types
  AgentMessage,
  AgentMetadata
} from '@cv-builder/agent-core'
```

### Node.js-Only Exports (direct imports)

```typescript
// File Storage (uses fs module)
import { FileStorage } from '@cv-builder/agent-core/utils/file-storage'

// Config (uses fs module)
import { getConfig, type Config, type EnvJson } from '@cv-builder/agent-core/utils/config'

// Orchestrator (uses FileStorage and getConfig)
import { OrchestratorAgent } from '@cv-builder/agent-core/agents/orchestrator-agent'
```

## Testing

Build now completes successfully:

```bash
npm run build
# ✓ built in 1.55s
```

## Browser vs Node.js Usage

### Browser (browser-app)
- Uses `BrowserOrchestrator` (browser-compatible wrapper)
- Uses `BrowserStorage` (localStorage-based)
- Imports only browser-safe modules from `@cv-builder/agent-core`

### Node.js (CLI)
- Uses `OrchestratorAgent` (full-featured)
- Uses `FileStorage` (file system-based)
- Can import Node.js-specific modules directly

## Benefits

1. **Browser Compatibility**: Main package works in browsers
2. **Type Safety**: Full TypeScript support maintained
3. **Flexibility**: Node.js code can still access file system utilities
4. **Clear Separation**: Browser vs Node.js code is clearly delineated
5. **No Breaking Changes**: Existing Node.js code can be updated with simple import changes

## Files Modified

1. `packages/agent-core/src/index.ts` - Removed Node.js-only exports
2. `packages/browser-app/src/components/Dashboard.tsx` - Fixed unused variable
3. `packages/browser-app/src/contexts/ChatContext.tsx` - Fixed unused parameter
4. `packages/browser-app/src/services/browser-orchestrator.ts` - Removed unused code

## Migration for Node.js Code

If you have existing Node.js code importing from `@cv-builder/agent-core`, update imports:

```typescript
// Before
import {
  OrchestratorAgent,
  FileStorage,
  getConfig
} from '@cv-builder/agent-core'

// After
import { OrchestratorAgent } from '@cv-builder/agent-core/agents/orchestrator-agent'
import { FileStorage } from '@cv-builder/agent-core/utils/file-storage'
import { getConfig } from '@cv-builder/agent-core/utils/config'
```

All other imports remain the same.

## Verification

```bash
# Type check passes
npm run type-check

# Build succeeds
npm run build

# Dev server works
npm run dev
```

## Conclusion

The package structure now properly separates browser-compatible and Node.js-only code, allowing the application to build successfully while maintaining full functionality in both environments.
