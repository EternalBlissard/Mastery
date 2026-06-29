# Mastery database (Phase 1)

Aurora PostgreSQL + pgvector foundation: schema migration, connection module, and vector health checks.

## Prerequisites

- PostgreSQL with the [pgvector](https://github.com/pgvector/pgvector) extension (Aurora 15+ or local Postgres + pgvector).
- Copy `.env.example` → `.env` and set values for your environment.

## Run migrations

Applies every `db/migrations/*.sql` file in lexical order (idempotent — safe to re-run):

```bash
npm run migrate
```

## Data API + vector health check

Runs a Data API `select 1`, then verifies pgvector can parse `vector(512)` values and use cosine distance (`<=>`):

```bash
npm run db:health
```

The Next.js route `app/api/health/db/route.ts` performs the same Data API checks over HTTP.

## Connection model

All app and migration database access goes through the Aurora/RDS Data API over HTTPS + SigV4. There is no direct PostgreSQL socket path, no `pg` pool, and no IAM DB auth token plumbing.

Required environment:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `RDS_RESOURCE_ARN`
- `RDS_SECRET_ARN`
- `RDS_DATABASE`

See `db/data-api.ts` for the shared Data API executor used by app routes.

## HNSW indexes

Both `objectives.embedding` and `chunks.embedding` are `vector(512)` with HNSW indexes for cosine similarity:

```sql
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

- **Operator:** `<=>` (cosine distance) with `vector_cosine_ops`.
- **`m = 16`:** graph degree — balances recall vs index size for ~512-dim Titan embeddings.
- **`ef_construction = 64`:** build-time search width — good default for moderate corpus sizes.

## pgvector 0.8.0 — iterative scan / overfiltering

pgvector 0.8.0 adds **iterative index scans** for HNSW and IVFFlat. Without them, queries that combine vector search with restrictive `WHERE` filters can **overfilter** — the index returns too few candidates and misses true nearest neighbours.

When you add filtered RAG queries in later phases, enable iterative scan and tune `hnsw.ef_search` / `hnsw.iterative_scan` session settings so the index keeps probing until enough rows pass your filters. See the [pgvector 0.8.0 release notes](https://github.com/pgvector/pgvector/releases/tag/v0.8.0).

## Schema

Single migration: `db/migrations/0001_init.sql` — 11 tables (`users`, `certifications`, `objectives`, `goals`, `documents`, `chunks`, `items`, `review_state`, `review_log`, `mastery`, `ingestion_jobs`).
