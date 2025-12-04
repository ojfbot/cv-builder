# Production Database Strategy

## Overview

The CV Builder V2 system uses two database components:
1. **Checkpointer** - Stores conversation state snapshots for resumability and time-travel
2. **Thread Manager** - Manages conversation threads and metadata

Both components support **SQLite** (development/prototype) and **PostgreSQL** (production) backends.

## Current Implementation Status

### SQLite (Default - Development Only)

The current implementation uses SQLite by default for rapid prototyping:

**Checkpointer**: `packages/agent-graph/src/state/sqlite-checkpointer.ts`
**Thread Manager**: `packages/agent-graph/src/state/sqlite-thread-manager.ts`

#### Advantages
- Zero configuration - works out of the box
- File-based persistence (`./cv_builder.db`)
- Perfect for local development and testing
- No external dependencies

#### Limitations

**⚠️ SQLite is NOT suitable for production use due to:**

1. **Single-Process Limitation**
   - SQLite uses file-level locking
   - Only ONE process can write at a time
   - Concurrent writes from multiple API server instances will cause `SQLITE_BUSY` errors
   - Cannot scale horizontally with multiple servers

2. **Write Throughput**
   - WAL mode helps but still limited compared to PostgreSQL
   - High concurrent write loads will cause contention
   - Not suitable for > 10 concurrent users

3. **Backup Complexity**
   - File-based backups require coordination
   - No built-in replication
   - Point-in-time recovery requires external tools

4. **Hosting Constraints**
   - Many cloud platforms (Heroku, AWS Lambda, etc.) have ephemeral filesystems
   - Database file would be lost on container restart
   - Requires persistent volume mounts

## Production Recommendations

### When to Migrate to PostgreSQL

Migrate to PostgreSQL when you meet **any** of these criteria:

- [ ] Deploying to production with > 5 concurrent users
- [ ] Running multiple API server instances (horizontal scaling)
- [ ] Using cloud platforms with ephemeral storage
- [ ] Need automated backups and point-in-time recovery
- [ ] Require replication for high availability

### PostgreSQL Setup (Production)

#### 1. Database Provisioning

**Option A: Managed Service (Recommended)**
- **Supabase**: Free tier available, easy setup, includes pgvector
- **Railway**: Simple deployment, generous free tier
- **Render**: PostgreSQL included with web service
- **AWS RDS**: Enterprise-grade, more complex setup
- **Google Cloud SQL**: Similar to AWS RDS

**Option B: Self-Hosted**
- Requires: PostgreSQL 14+
- Manual backup/replication setup
- More operational overhead

#### 2. Schema Setup

Run these SQL commands to create the required tables:

```sql
-- Checkpoints table
CREATE TABLE IF NOT EXISTS checkpoints (
  thread_id TEXT NOT NULL,
  thread_ts TEXT NOT NULL,
  parent_ts TEXT,
  checkpoint JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (thread_id, thread_ts)
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id
  ON checkpoints(thread_id);

CREATE INDEX IF NOT EXISTS idx_checkpoints_created_at
  ON checkpoints(created_at);

-- Threads table
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_threads_user_id
  ON threads(user_id);

CREATE INDEX IF NOT EXISTS idx_threads_created_at
  ON threads(created_at DESC);
```

#### 3. Configuration

Update your `env.json`:

```json
{
  "anthropicApiKey": "sk-ant-...",
  "databaseType": "postgresql",
  "databaseUrl": "postgresql://user:password@host:5432/dbname"
}
```

**Environment Variables** (alternative):
```bash
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

#### 4. Migration from SQLite

If migrating from SQLite to PostgreSQL:

```bash
# 1. Backup SQLite database
cp cv_builder.db cv_builder.db.backup

# 2. Export data (if needed - checkpoints are ephemeral)
# Only export threads if you want to preserve conversation history

# 3. Update configuration to PostgreSQL
# 4. Run application - tables will be created automatically
# 5. Threads and checkpoints will start fresh (this is usually acceptable)
```

**Note**: Checkpoints are typically ephemeral. Most applications don't need to migrate checkpoint data, only thread metadata if you want to preserve conversation history.

## Storage Requirements

### Checkpoints

Each checkpoint stores the full conversation state:

- **Average size per checkpoint**: 5-50 KB (depends on message count, outputs)
- **Checkpoints per conversation**: ~10-50 (one per graph node execution)
- **Retention**: Typically 7-30 days

**Example calculation** (100 active users):
- 100 users × 5 conversations/user/week = 500 conversations/week
- 500 conversations × 30 checkpoints avg = 15,000 checkpoints/week
- 15,000 checkpoints × 20 KB avg = 300 MB/week
- **Monthly**: ~1.2 GB

**Recommended retention policy**:
```sql
-- Delete checkpoints older than 30 days
DELETE FROM checkpoints
WHERE created_at < NOW() - INTERVAL '30 days';
```

### Threads

Thread records are small (< 1 KB each) and should be retained long-term for user conversation history.

## Performance Considerations

### Indexing

The provided schema includes indexes on:
- `thread_id` (checkpoints) - Critical for retrieval performance
- `created_at` (checkpoints) - Important for cleanup queries
- `user_id` (threads) - Critical for user thread listing
- `created_at DESC` (threads) - Important for chronological sorting

### Connection Pooling

For production, configure connection pooling:

```typescript
// Example with pg-pool
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Monitoring

Monitor these metrics:
- Checkpoint table size (should stay bounded with retention policy)
- Query latency (checkpoints by thread_id should be < 50ms)
- Connection pool utilization
- Lock contention (should be minimal with proper indexing)

## Disaster Recovery

### Backup Strategy

**PostgreSQL Managed Services**: Usually include automated backups

**Self-Hosted**:
```bash
# Daily backups
pg_dump -h localhost -U user -d cv_builder > backup_$(date +%Y%m%d).sql

# Retention: Keep last 7 days + monthly snapshots
```

### Recovery Testing

Test recovery procedure quarterly:
1. Restore to test database
2. Verify thread count matches production
3. Test checkpoint retrieval
4. Verify application can connect and function

## Future Considerations

### Phase 4: RAG with Vector Storage

When implementing RAG (Retrieval-Augmented Generation), you'll need vector storage:

**Option 1: pgvector (recommended if already using PostgreSQL)**
```sql
CREATE EXTENSION vector;

CREATE TABLE embeddings (
  id SERIAL PRIMARY KEY,
  content TEXT,
  embedding vector(1536),
  metadata JSONB
);

CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);
```

**Option 2: Dedicated vector database**
- Pinecone, Weaviate, Qdrant (cloud)
- Chroma (local)

## Summary Table

| Aspect | SQLite (Dev) | PostgreSQL (Prod) |
|--------|--------------|-------------------|
| **Setup Complexity** | None | Moderate |
| **Concurrent Writes** | Single process | Unlimited |
| **Horizontal Scaling** | ❌ No | ✅ Yes |
| **Managed Hosting** | Limited | Many options |
| **Backup/Recovery** | Manual | Automated |
| **Max Concurrent Users** | ~10 | Thousands |
| **Production Ready** | ❌ No | ✅ Yes |
| **Cost** | Free | $0-25/month (managed) |

## Recommended Migration Timeline

1. **Prototype/MVP** (now): SQLite is fine
2. **Beta/Testing** (< 50 users): SQLite still acceptable
3. **Production Launch**: Migrate to PostgreSQL before public launch
4. **Scaling** (> 100 concurrent users): Ensure proper PostgreSQL configuration

## Getting Help

- **PostgreSQL Setup Issues**: See `docs/technical/06-phase-1-implementation-guide.md`
- **Connection Errors**: Check `docs/technical/06-phase-1-implementation-guide.md#troubleshooting`
- **Performance Tuning**: Consider connection pooling and query optimization
