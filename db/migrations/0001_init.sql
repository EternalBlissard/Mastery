-- Mastery Phase 1: full normalized schema + pgvector HNSW indexes (idempotent).
-- Source: Mastery_Blueprint.md §D

CREATE EXTENSION IF NOT EXISTS vector;

-- Identity
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goals / tracks
CREATE TABLE IF NOT EXISTS certifications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  code                 TEXT NOT NULL UNIQUE,
  provider             TEXT,
  blueprint_source_url TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS objectives (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id UUID NOT NULL REFERENCES certifications (id) ON DELETE CASCADE,
  parent_id        UUID REFERENCES objectives (id) ON DELETE SET NULL,
  code             TEXT,
  title            TEXT NOT NULL,
  description      TEXT,
  weight_pct       REAL,
  sequence         INTEGER,
  embedding        vector(512),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  certification_id UUID REFERENCES certifications (id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  mode             TEXT NOT NULL CHECK (mode IN ('cert', 'own', 'combined')),
  target_date      DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents & chunks (own-materials)
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  goal_id     UUID NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  s3_key      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  page_count  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  page_number      INTEGER,
  section_heading  TEXT,
  content          TEXT NOT NULL,
  token_count      INTEGER,
  embedding        vector(512),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated items (questions)
CREATE TABLE IF NOT EXISTS items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id          UUID NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
  objective_id     UUID REFERENCES objectives (id) ON DELETE SET NULL,
  source_chunk_id  UUID REFERENCES chunks (id) ON DELETE SET NULL,
  type             TEXT NOT NULL CHECK (type IN ('mcq', 'free')),
  stem             TEXT NOT NULL,
  answer_key       TEXT NOT NULL,
  explanation      TEXT,
  distractors      JSONB,
  source_page      INTEGER,
  groundedness     BOOLEAN,
  difficulty_seed  REAL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scheduling state (FSRS, per user per item)
CREATE TABLE IF NOT EXISTS review_state (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  item_id     UUID NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  stability   DOUBLE PRECISION,
  difficulty  DOUBLE PRECISION,
  due         TIMESTAMPTZ,
  state       SMALLINT,
  reps        INTEGER NOT NULL DEFAULT 0,
  lapses      INTEGER NOT NULL DEFAULT 0,
  last_review TIMESTAMPTZ,
  UNIQUE (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS review_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES items (id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL,
  response_ms   INTEGER,
  state         SMALLINT,
  stability     DOUBLE PRECISION,
  difficulty    DOUBLE PRECISION,
  elapsed_days  INTEGER,
  reviewed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mastery (BKT, per user per objective)
CREATE TABLE IF NOT EXISTS mastery (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  objective_id  UUID NOT NULL REFERENCES objectives (id) ON DELETE CASCADE,
  p_known       DOUBLE PRECISION NOT NULL DEFAULT 0.3,
  attempts      INTEGER NOT NULL DEFAULT 0,
  correct       INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, objective_id)
);

-- Background jobs
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'queued',
  step          TEXT,
  progress_pct  INTEGER NOT NULL DEFAULT 0,
  error         TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW indexes for cosine nearest-neighbour search (Titan V2 @ 512 dims)
CREATE INDEX IF NOT EXISTS idx_objectives_embedding_hnsw
  ON objectives USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
  ON chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
