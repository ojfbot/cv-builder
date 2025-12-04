# Troubleshooting Guide - V2 (LangGraph)

This guide covers common issues, errors, and pitfalls when working with the V2 LangGraph-powered CV Builder system.

## Table of Contents

1. [Common Pitfalls](#common-pitfalls)
2. [Database Issues](#database-issues)
3. [API and Server Issues](#api-and-server-issues)
4. [Browser Integration Issues](#browser-integration-issues)
5. [Performance Issues](#performance-issues)
6. [Development Environment](#development-environment)

---

## Common Pitfalls

### 1. Using SQLite in Production

**Problem**: Application fails with `SQLITE_BUSY` errors when deployed with multiple server instances.

**Why it happens**:
- SQLite uses file-level locking
- Only ONE process can write at a time
- Multiple server instances (horizontal scaling) cause lock contention

**Solution**:
```bash
# Migrate to PostgreSQL before production deployment
# See docs/technical/DATABASE_STRATEGY.md

# Update env.json
{
  "databaseType": "postgresql",
  "databaseUrl": "postgresql://user:pass@host:5432/dbname"
}
```

**Prevention**:
- Use SQLite only for local development
- Always use PostgreSQL for staging and production
- Set up CI/CD to verify `databaseType` in production config

### 2. Missing V2 API Initialization

**Problem**: V2 endpoints return 404 or are not available.

**Why it happens**:
- `ENABLE_V2_API` environment variable not set
- GraphManager failed to initialize
- Database connection failed

**Solution**:
```bash
# 1. Enable V2 API
export ENABLE_V2_API=true

# 2. Check server logs for initialization errors
npm run dev:api

# Look for:
# "GraphManager (v2) initialized successfully" ✅
# or
# "Failed to initialize GraphManager" ❌

# 3. Verify database setup
npm run init-db  # For SQLite
# or ensure PostgreSQL tables exist
```

**Prevention**:
- Add health check endpoint: `GET /api/v2/health`
- Monitor GraphManager initialization in logs
- Set `ENABLE_V2_API=true` in environment configs

### 3. Anthropic API Key Not Found

**Problem**: Server starts but V2 chat fails with "API key not found" error.

**Why it happens**:
- `env.json` not created or missing API key
- Wrong path to env.json (looking in wrong package)
- Environment variable not set

**Solution**:
```bash
# 1. Create env.json from example
cp packages/agent-graph/env.json.example packages/agent-graph/env.json

# 2. Add your API key
{
  "anthropicApiKey": "sk-ant-api03-...",
  "databaseType": "sqlite"
}

# 3. Restart server
npm run dev:api
```

**Prevention**:
- Check for env.json existence in startup script
- Add clear error message if API key is missing
- Document env.json location in README

### 4. Thread Not Found Errors

**Problem**: Chat requests fail with "Thread not found" or "Thread state not found".

**Why it happens**:
- Frontend is using old/invalid thread ID
- Thread was deleted
- Database was reset without clearing frontend state

**Solution**:
```typescript
// In browser app, always create thread before chatting
const thread = await apiClient.createThread({ userId: 'user123' });

// Store thread ID
localStorage.setItem('currentThreadId', thread.id);

// Use thread ID for all chat requests
await apiClient.chat({
  threadId: thread.id,
  message: 'Hello'
});
```

**Prevention**:
- Validate thread exists before chat requests
- Handle 404 errors gracefully (create new thread)
- Clear localStorage when database is reset

### 5. Rate Limit Exceeded

**Problem**: Requests fail with "Rate limit exceeded" message.

**Why it happens**:
- Too many requests from single IP
- V2 chat has strict limits (30 requests / 15 minutes)
- Development mode not enabled

**Solution**:
```bash
# For development, set NODE_ENV to use permissive limits
export NODE_ENV=development
npm run dev:api

# Check rate limit headers in response
# Retry-After: <seconds>
# X-RateLimit-Limit: 30
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: <timestamp>
```

**Prevention**:
- Implement exponential backoff in client
- Show user-friendly rate limit message in UI
- Cache responses where appropriate
- Use development mode during testing

### 6. Memory Usage Growing

**Problem**: Server memory usage increases over time and never decreases.

**Why it happens**:
- MemoryVectorStore holds all embeddings in memory
- Checkpoints accumulate without cleanup
- No retention policy implemented

**Solution**:
```sql
-- Add cleanup job for old checkpoints (run daily)
DELETE FROM checkpoints
WHERE created_at < NOW() - INTERVAL '30 days';

-- Monitor memory usage
# Check Node.js heap
node --expose-gc --max-old-space-size=4096 dist/server.js
```

**Prevention**:
- Implement checkpoint retention policy
- Use persistent vector storage (sqlite-vec, pgvector)
- Monitor memory metrics
- Set up automated cleanup jobs

---

## Database Issues

### PostgreSQL Connection Refused

**Problem**: `Error: connect ECONNREFUSED` when trying to connect to PostgreSQL.

**Diagnosis**:
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection string
echo $DATABASE_URL
# Should be: postgresql://user:password@host:5432/dbname

# Test connection
psql postgresql://user:password@host:5432/dbname
```

**Solutions**:
1. **PostgreSQL not running**:
   ```bash
   # macOS
   brew services start postgresql@14

   # Linux
   sudo systemctl start postgresql
   ```

2. **Wrong host/port**:
   ```bash
   # Update DATABASE_URL
   export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
   ```

3. **Firewall blocking**:
   ```bash
   # Allow PostgreSQL port
   sudo ufw allow 5432/tcp
   ```

### Missing Tables

**Problem**: `relation "checkpoints" does not exist` or `relation "threads" does not exist`.

**Solution**:
```sql
-- Run schema creation SQL (PostgreSQL)
-- See docs/technical/DATABASE_STRATEGY.md for complete schema

CREATE TABLE IF NOT EXISTS checkpoints (
  thread_id TEXT NOT NULL,
  thread_ts TEXT NOT NULL,
  parent_ts TEXT,
  checkpoint JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, thread_ts)
);

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
```

For SQLite:
```bash
# Run init-db utility
npm run init-db
```

### Database Size Growing Rapidly

**Problem**: Database file (SQLite) or PostgreSQL database growing by GB/day.

**Diagnosis**:
```sql
-- Check checkpoint count
SELECT COUNT(*) FROM checkpoints;

-- Check size per thread
SELECT thread_id, COUNT(*) as checkpoint_count
FROM checkpoints
GROUP BY thread_id
ORDER BY checkpoint_count DESC
LIMIT 10;

-- Check total size (PostgreSQL)
SELECT pg_size_pretty(pg_total_relation_size('checkpoints'));
```

**Solutions**:
1. **Implement retention policy** (see Common Pitfalls #6)
2. **Reduce checkpoint frequency** (if creating too many)
3. **Optimize state size** (remove unnecessary data from state)

---

## API and Server Issues

### V2 Chat Stream Not Working

**Problem**: Streaming chat endpoint doesn't send events or connection closes immediately.

**Diagnosis**:
```bash
# Test streaming endpoint with curl
curl -N -X POST http://localhost:3001/api/v2/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"threadId":"thread-123","message":"Hello"}'

# Should see:
# event: connected
# data: {"status":"connected"}
#
# event: state
# data: {...}
```

**Common Causes**:
1. **Missing thread**: Create thread first
2. **Proxy buffering**: Nginx/reverse proxy buffering SSE
3. **CORS issue**: Browser blocking SSE from different origin

**Solutions**:
```nginx
# Nginx - disable buffering for SSE
location /api/v2/chat/stream {
  proxy_pass http://localhost:3001;
  proxy_buffering off;
  proxy_cache off;
  proxy_set_header Connection '';
  proxy_http_version 1.1;
  chunked_transfer_encoding off;
}
```

### GraphManager Not Initialized

**Problem**: Error: `GraphManager not initialized. Call initialize() first.`

**Why it happens**:
- Initialization failed silently
- `ENABLE_V2_API` not set
- Database connection failed during init

**Solution**:
```bash
# Check server startup logs
npm run dev:api 2>&1 | grep -i "graphmanager\|v2\|langgraph"

# Should see:
# "Initializing GraphManager (v2 - LangGraph)..."
# "GraphManager (v2) initialized successfully"

# If initialization fails, check:
# 1. Anthropic API key exists
# 2. Database is accessible
# 3. env.json is valid JSON
```

---

## Browser Integration Issues

### V2 Toggle Not Appearing

**Problem**: V2 feature toggle doesn't show up in browser app.

**Diagnosis**:
```javascript
// Open browser console
localStorage.getItem('v2Enabled')  // Should be 'true' or 'false'

// Check Redux state
store.getState().v2
// Should show: { enabled: true/false, apiAvailable: true/false }
```

**Solutions**:
1. **Clear localStorage**: May have stale data
   ```javascript
   localStorage.clear()
   location.reload()
   ```

2. **Check API availability**:
   ```bash
   curl http://localhost:3001/api/v2/stats
   # Should return thread statistics
   ```

3. **Verify component is rendered**:
   - Check Dashboard.tsx includes `<V2Toggle />`
   - Check for React errors in console

### Thread Sidebar Not Showing Threads

**Problem**: Thread sidebar shows empty or loading state even though threads exist.

**Diagnosis**:
```javascript
// Browser console
store.getState().threads
// Check: threads.items, threads.loading, threads.error

// Manual API test
fetch('http://localhost:3001/api/v2/threads/user/user123')
  .then(r => r.json())
  .then(console.log)
```

**Solutions**:
1. **Dispatch fetchThreads**:
   ```typescript
   useEffect(() => {
     if (v2Enabled && userId) {
       dispatch(fetchThreads({ userId }));
     }
   }, [v2Enabled, userId, dispatch]);
   ```

2. **Check user ID**: May be undefined or wrong value

3. **Check CORS**: Browser may be blocking request

---

## Performance Issues

### Slow Chat Responses

**Problem**: V2 chat takes > 30 seconds to respond.

**Possible Causes**:

1. **Cold start**: First request after idle
   - **Solution**: Implement keepalive/warmup requests

2. **Large state**: State has grown too large
   - **Diagnosis**: Check state size in database
   ```sql
   SELECT thread_id,
          LENGTH(checkpoint::text) as size_bytes,
          LENGTH(checkpoint::text)/1024 as size_kb
   FROM checkpoints
   ORDER BY size_bytes DESC
   LIMIT 10;
   ```
   - **Solution**: Prune old messages, limit state size

3. **Slow LLM calls**: Anthropic API is slow
   - **Solution**: Use streaming, show progress indicators

4. **Database queries**: Slow checkpoint retrieval
   - **Solution**: Add indexes, use connection pooling

### High Memory Usage

**Problem**: Server using > 2GB RAM.

**Diagnosis**:
```bash
# Check Node.js heap
node --expose-gc server.js &
ps aux | grep node  # Check RSS

# Enable memory profiling
node --inspect server.js
# Connect Chrome DevTools -> Memory tab
```

**Solutions**:
1. **Vector store**: Using MemoryVectorStore
   - See Common Pitfalls #6

2. **Large checkpoints**: Accumulating state
   - Implement retention policy

3. **Memory leaks**: Event listeners, timers
   - Use Node.js profiler to identify leaks

---

## Development Environment

### TypeScript Errors After Git Pull

**Problem**: TypeScript errors after pulling latest changes.

**Solutions**:
```bash
# 1. Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# 2. Clean TypeScript cache
rm -rf packages/*/dist
npm run build

# 3. Restart TypeScript server
# In VS Code: Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

### Cannot Import from @cv-builder/agent-graph

**Problem**: `Module not found: Can't resolve '@cv-builder/agent-graph'`

**Solutions**:
```bash
# 1. Build agent-graph package
npm run build --workspace=@cv-builder/agent-graph

# 2. Check package.json references
# In dependent package, should have:
{
  "dependencies": {
    "@cv-builder/agent-graph": "*"
  }
}

# 3. Use npm workspaces
npm install  # From repo root
```

### Hot Reload Not Working

**Problem**: Changes to code don't trigger reload.

**Solutions**:
```bash
# 1. Check nodemon/ts-node-dev is running
ps aux | grep nodemon

# 2. Restart dev server
npm run dev:api

# 3. Check file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Getting More Help

If you're still stuck after trying these solutions:

1. **Check Logs**: Look for detailed error messages in console
2. **Enable Debug Logging**: Set `LOG_LEVEL=debug` in environment
3. **Check GitHub Issues**: Search existing issues
4. **Create Issue**: Provide:
   - Environment (OS, Node version, package versions)
   - Complete error message
   - Steps to reproduce
   - Relevant logs

## Related Documentation

- [Database Strategy](./DATABASE_STRATEGY.md) - Production database guidance
- [Phase 1 Implementation Guide](./06-phase-1-implementation-guide.md) - Setup instructions
- [Architecture V2](../ARCHITECTURE_V2.md) - System architecture
- [Migration Guide](./MIGRATION_GUIDE.md) - V1 to V2 migration
