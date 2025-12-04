# V2 (LangGraph) Quick Start Guide

## Quick Start - Enable V2 API

**Easiest method:**
```bash
npm run dev:v2
```

This starts both API server and browser app with V2 enabled.

## Alternative Methods

### Method 1: Separate Terminals

**Terminal 1:**
```bash
ENABLE_V2_API=true npm run dev:api
```

**Terminal 2:**
```bash
npm run dev
```

### Method 2: Export Environment Variable

```bash
export ENABLE_V2_API=true
npm run dev:all
```

## Verify It's Working

Server logs should show:
```
[GraphManager] Initialized successfully with LangGraph
V2 API (LangGraph): /api/v2/* ✅
```

Browser UI should show:
- ✅ "V2 API Available" in the toggle

## Test V2

1. Click "V2 (LangGraph) Mode" toggle in UI
2. Thread sidebar appears on right
3. Send a chat message
4. Thread persists across page refreshes

## Troubleshooting

**"V2 API is not available"**
→ Restart API with: `ENABLE_V2_API=true npm run dev:api`

**"Failed to initialize GraphManager"**
→ Check `packages/agent-core/env.json` has valid API key

For detailed help, see `docs/technical/TROUBLESHOOTING_V2.md`
