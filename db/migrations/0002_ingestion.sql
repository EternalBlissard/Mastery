-- Mastery Phase 2: ingestion pipeline additive columns + indexes (idempotent).
-- Each statement is standalone for Aurora Data API (one statement per call).

ALTER TABLE chunks ADD COLUMN IF NOT EXISTS chunk_index INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS uq_chunks_doc_idx ON chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_status ON ingestion_jobs (status);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_sha256 TEXT;
