-- Mastery Phase 4: FSRS scheduling — due-queue + review history indexes (idempotent).
-- Each statement is standalone for Aurora Data API (one statement per call).

CREATE INDEX IF NOT EXISTS idx_review_state_user_due ON review_state (user_id, due);

CREATE INDEX IF NOT EXISTS idx_review_log_user_item ON review_log (user_id, item_id);
