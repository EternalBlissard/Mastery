# Ingestion pipeline (Phase 2)

Phase 2 ingests PDF study documents: store the raw file in S3, queue a durable job in Aurora, process parse → chunk → embed asynchronously, and expose progress to the upload UI via polling.

All database access uses `executeDataStatement` from `db/data-api.ts` (Aurora Data API). There is no direct `pg` connection or `DATABASE_URL`.

## End-to-end flow

```mermaid
flowchart LR
  UI["Upload UI<br/>/upload"] -->|POST multipart| Upload["/api/upload"]
  Upload --> S3["S3<br/>putDocumentObject"]
  Upload --> Docs["documents row<br/>status=queued"]
  Upload --> Jobs["ingestion_jobs row<br/>status=queued"]
  Upload -->|returns jobId immediately| UI
  Upload -->|after() fire-and-forget| Process["/api/process"]
  Process -->|GET object| S3
  Process --> Parse["pdf-parse<br/>per-page text"]
  Parse --> Chunk["chunkDocument<br/>400–800 tok"]
  Chunk --> Embed["embedText<br/>Titan V2 @512"]
  Embed --> Chunks["chunks rows<br/>+ pgvector"]
  Process -->|UPDATE| Jobs
  Cron["Vercel Cron<br/>*/5 min"] -->|Bearer CRON_SECRET| CronRoute["/api/cron/process"]
  CronRoute -->|re-queue stuck| Jobs
  CronRoute -->|POST documentId| Process
  UI -->|GET every 2s| JobAPI["/api/jobs/[id]"]
  JobAPI --> Jobs
```

### Step-by-step

1. **Upload** (`POST /api/upload`) — Client sends `file`, `userId`, and `goalId`. The route hashes the PDF, uploads to S3 (`documents/{documentId}/{filename}`), inserts `documents` and `ingestion_jobs` rows (both `queued`), then schedules processing with Next.js `after()` and returns `{ documentId, jobId }` without waiting for parse or embed.
2. **Async worker** (`POST /api/process`) — Loads the queued job, fetches the PDF from S3, chunks text, embeds each chunk, and inserts into `chunks`. Updates `ingestion_jobs.status`, `step`, and `progress_pct` throughout.
3. **Cron safety net** (`GET /api/cron/process`, every 5 minutes) — Requires `Authorization: Bearer <CRON_SECRET>`. Selects jobs that are `queued` or `processing` with `updated_at` older than 5 minutes; resets stuck `processing` jobs to `queued`, then POSTs `/api/process` for each `documentId`.
4. **UI polling** (`GET /api/jobs/[id]`) — Upload page polls every 2 seconds for `{ status, step, progressPct }` until `done` or `error`.

## Long-running job pattern

Serverless uploads cannot block on PDF parsing and Bedrock embedding. Phase 2 uses a **DB-backed queue** with three triggers:

| Mechanism | Role |
|-----------|------|
| `ingestion_jobs` table | Durable queue and progress store (`status`, `step`, `progress_pct`, `error`) |
| Next.js `after()` | Immediate, non-blocking kickoff from `/api/upload` to `/api/process` |
| Vercel Cron (`*/5 * * * *`) | Retries `queued` jobs and recovers jobs stuck in `processing` |

**Idempotency:** Migration `0002_ingestion.sql` adds `chunk_index` and unique index `uq_chunks_doc_idx` on `(document_id, chunk_index)`. The worker inserts chunks with `ON CONFLICT (document_id, chunk_index) DO NOTHING`, so duplicate worker runs (e.g. cron + `after()` race, or retry after a partial embed) do not create duplicate chunks or fail the job.

Job lifecycle: `queued` → `processing` → `done` | `error`. Steps reported during processing include `fetching`, `chunking`, `embedding`, and `complete`.

## Embeddings: Amazon Titan Text Embeddings V2

`lib/bedrock.ts` exposes `embedText(text)`:

- Model ID from `BEDROCK_EMBEDDING_MODEL` (default in `.env.example`: `amazon.titan-embed-text-v2:0`)
- Invokes `bedrock-runtime.<AWS_REGION>.amazonaws.com` with SigV4 signing
- Request body: `{ inputText, dimensions: 512, normalize: true }`
- Throws if the response vector length is not **512** (matches `chunks.embedding` `vector(512)` from Phase 1)

Credentials: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (no hardcoded secrets).

## Chunking and citation metadata

`lib/chunk.ts` implements `chunkDocument(buffer)`:

| Parameter | Value |
|-----------|--------|
| Token estimate | Whitespace-split word count |
| Target size | ~600 tokens |
| Min / max per chunk | 400–800 tokens |
| Overlap | ~10% between consecutive chunks on the same page |

**PDF parsing:** `pdf-parse` with a custom per-page renderer preserves line breaks from vertical position changes so page text stays structured.

**Per-chunk metadata** (stored on each `chunks` row for future RAG citations):

- `page_number` — 1-based page from the PDF
- `section_heading` — Detected from lines that look like headings (numbered sections, ALL CAPS titles, short title-case lines without trailing period); carries forward across pages until a new heading is found
- `chunk_index` — Stable 0-based order within the document (used for idempotent upserts)
- `token_count` — Estimated token count for the chunk content

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/upload` | POST | S3 put + DB rows + async process trigger |
| `/api/process` | POST | Body: `{ documentId }` — worker |
| `/api/jobs/[id]` | GET | Job status for UI |
| `/api/cron/process` | GET | Cron recovery (guarded) |

## Environment variables

See `.env.example` for the full list. Phase 2 ingestion requires:

- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`
- `BEDROCK_EMBEDDING_MODEL`
- `CRON_SECRET` (Vercel Cron `Authorization` header)
- Aurora Data API vars from Phase 1 (`AURORA_RESOURCE_ARN`, `AURORA_SECRET_ARN`, `AURORA_DATABASE`)

## Database (migration 0002)

Additive, idempotent migration `db/migrations/0002_ingestion.sql`:

- `chunks.chunk_index` + unique `(document_id, chunk_index)`
- `idx_ingestion_jobs_status` on `ingestion_jobs(status)`
- `documents.content_sha256` for deduplication metadata

Do not edit `0001`; apply `0002` statements one at a time via the Data API.

## UI

`/upload` — Client component with drag-and-drop and file picker. Posts to `/api/upload`, then polls `/api/jobs/[id]` and shows a progress bar from `progressPct` and current `step`.
