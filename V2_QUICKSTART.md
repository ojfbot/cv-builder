# V2 (LangGraph) Quick Start Guide

## ⚠️ Important: SQLite Concurrency Limitations

**V2 uses SQLite for state persistence**, which has known concurrency limitations:

### Development
- ✅ **Fine for single-user testing and development**
- ⚠️ May see occasional `SQLITE_BUSY` errors under concurrent requests
- Implemented with write-ahead logging (WAL) mode for better concurrency

### Production
- ❌ **NOT recommended for multi-user production deployments**
- SQLite has write contention issues with concurrent users
- **Solution**: Migrate to PostgreSQL for production use

### Migration Path
When you're ready for production:
1. Switch from `SQLiteCheckpointer` to `PostgresCheckpointer`
2. Update database connection in `packages/agent-graph/src/utils/config.ts`
3. Run migrations (see `docs/ARCHITECTURE_V2.md` for details)

See [Database Migration Guide](#database-migration-production) below for details.

---

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

**"SQLITE_BUSY" errors during concurrent requests**
→ This is a known SQLite limitation. Options:
- Reduce concurrent requests in development
- Migrate to PostgreSQL for production (see below)

For detailed help, see `docs/technical/TROUBLESHOOTING_V2.md`

---

## Database Migration (Production)

### When to Migrate

Migrate from SQLite to PostgreSQL when:
- Deploying to production with multiple concurrent users
- Experiencing frequent `SQLITE_BUSY` errors
- Need better reliability and performance at scale

### PostgreSQL Setup

1. **Install PostgreSQL**
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql

   # Or use cloud provider (AWS RDS, Supabase, etc.)
   ```

2. **Create Database**
   ```bash
   createdb cv_builder_v2
   ```

3. **Install PostgreSQL Checkpointer**
   ```bash
   cd packages/agent-graph
   npm install @langchain/langgraph-checkpoint-postgres
   ```

4. **Update Configuration**

   Edit `packages/agent-graph/src/utils/config.ts`:
   ```typescript
   // Replace:
   import { SQLiteCheckpointer } from '../state/sqlite-checkpointer';

   // With:
   import { PostgresCheckpointer } from '@langchain/langgraph-checkpoint-postgres';

   // Update checkpointer initialization:
   const checkpointer = new PostgresCheckpointer({
     connectionString: process.env.DATABASE_URL
   });
   ```

5. **Set Environment Variable**
   ```bash
   export DATABASE_URL="postgresql://user:pass@localhost:5432/cv_builder_v2"
   ```

6. **Restart Application**
   ```bash
   ENABLE_V2_API=true npm run dev:all
   ```

### Migration Notes

- **No data migration needed** - checkpoints are ephemeral development artifacts
- **Threads must be recreated** - users will start fresh conversations
- **Performance improvement** - PostgreSQL handles concurrent writes much better
- **Backup recommended** - Always backup before production deployment

### Cloud PostgreSQL Options

- **AWS RDS** - Fully managed, auto-scaling
- **Supabase** - PostgreSQL with built-in auth and APIs
- **Heroku Postgres** - Easy deployment integration
- **DigitalOcean Managed Database** - Simple and affordable

For more details, see `docs/ARCHITECTURE_V2.md` section on "State Persistence"

---

## RAG Vector Store (Production)

### Current Implementation (Development Only)

V2 currently uses **MemoryVectorStore** for RAG (Retrieval-Augmented Generation):
- ⚠️ **In-memory only** - data lost on restart
- ⚠️ **Not persisted** - no durability
- ⚠️ **Memory growth** - can grow unbounded
- ✅ **Good for development** - fast and simple

### Production Vector Store Options

When deploying to production, migrate to a persistent vector store:

#### Option 1: SQLite-Vec (Recommended for Small/Medium Scale)
**Best for**: Single-server deployments, moderate data volumes

```bash
npm install @langchain/community
```

```typescript
import { SQLiteVectorStore } from '@langchain/community/vectorstores/sqlite';

const vectorStore = await SQLiteVectorStore.fromExistingIndex(
  embeddings,
  { database: 'vectorstore.db' }
);
```

**Pros**:
- ✅ No additional infrastructure
- ✅ Simple setup
- ✅ Works with existing SQLite database

**Cons**:
- ❌ Same concurrency limitations as checkpointing
- ❌ Not suitable for high-traffic production

#### Option 2: pgvector (PostgreSQL)
**Best for**: Production deployments with PostgreSQL

```bash
npm install @langchain/community
# Enable pgvector extension in PostgreSQL
```

```typescript
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';

const vectorStore = await PGVectorStore.initialize(
  embeddings,
  {
    postgresConnectionOptions: {
      connectionString: process.env.DATABASE_URL
    }
  }
);
```

**Pros**:
- ✅ Production-grade performance
- ✅ Handles concurrent queries well
- ✅ Integrates with existing PostgreSQL database

**Cons**:
- ❌ Requires PostgreSQL with pgvector extension
- ❌ More complex setup

#### Option 3: Pinecone (Cloud Vector Database)
**Best for**: Large-scale production, serverless deployments

```bash
npm install @langchain/pinecone @pinecone-database/pinecone
```

```typescript
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const index = pinecone.Index(process.env.PINECONE_INDEX);

const vectorStore = await PineconeStore.fromExistingIndex(
  embeddings,
  { pineconeIndex: index }
);
```

**Pros**:
- ✅ Fully managed, auto-scaling
- ✅ Excellent performance at scale
- ✅ No infrastructure management

**Cons**:
- ❌ Additional cost
- ❌ External dependency

#### Option 4: Chroma
**Best for**: Development and small production deployments

```bash
npm install @langchain/community chromadb
```

```typescript
import { ChromaClient } from 'chromadb';
import { Chroma } from '@langchain/community/vectorstores/chroma';

const client = new ChromaClient({
  path: process.env.CHROMA_URL || 'http://localhost:8000'
});

const vectorStore = await Chroma.fromExistingCollection(
  embeddings,
  { collectionName: 'cv-builder', url: client.path }
);
```

**Pros**:
- ✅ Open source
- ✅ Docker support
- ✅ Good for medium scale

**Cons**:
- ❌ Requires separate service
- ❌ Less mature than pgvector

### Migration Steps

1. **Choose vector store** based on scale requirements
2. **Install dependencies** (see examples above)
3. **Update RAG configuration** in `packages/agent-graph/src/rag/vector-store.ts`
4. **Initialize/seed vector store** with initial data
5. **Test thoroughly** before production deployment

### Performance Considerations

| Vector Store | Query Latency | Concurrent Users | Cost |
|-------------|---------------|------------------|------|
| MemoryVectorStore | <1ms | 1 | Free |
| SQLite-Vec | 5-10ms | 10-20 | Free |
| pgvector | 10-20ms | 100+ | DB hosting |
| Pinecone | 20-50ms | 10,000+ | ~$70/mo+ |
| Chroma | 10-30ms | 50-100 | Free (self-host) |

### Current RAG Data

The V2 system includes placeholder data for:
- Resume templates and best practices
- Interview preparation guides
- Learning resources and courses
- Skills gap analysis frameworks

**Production deployment**: Replace placeholder data with your actual knowledge base.

For implementation details, see `packages/agent-graph/src/rag/` directory.
