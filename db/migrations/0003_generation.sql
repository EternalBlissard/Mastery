-- Mastery Phase 3: grounded MCQ generation — content_hash dedupe + generation_jobs (idempotent).
-- Each statement is standalone for Aurora Data API (one statement per call).

ALTER TABLE items ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_items_goal_hash ON items (goal_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_items_goal ON items (goal_id);

CREATE INDEX IF NOT EXISTS idx_items_objective ON items (objective_id);

CREATE TABLE IF NOT EXISTS generation_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id       UUID,
  objective_id  UUID,
  status        TEXT NOT NULL DEFAULT 'queued',
  step          TEXT,
  requested     INTEGER,
  generated     INTEGER NOT NULL DEFAULT 0,
  error         TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
