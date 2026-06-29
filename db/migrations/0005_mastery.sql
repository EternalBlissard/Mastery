-- Mastery Phase 5: dashboard lookup indexes (idempotent).
-- Each statement is standalone for Aurora Data API (one statement per call).

CREATE INDEX IF NOT EXISTS idx_mastery_user ON mastery (user_id);

CREATE INDEX IF NOT EXISTS idx_items_goal_objective ON items (goal_id, objective_id);
