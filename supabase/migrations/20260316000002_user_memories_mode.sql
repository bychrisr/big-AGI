-- Migration: user_memories — add mode column
-- Allows memories to be scoped to a specific interaction mode

ALTER TABLE user_memories
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'general'
    CHECK (mode IN ('general', 'production', 'trail', 'consultation'));

-- Index for efficient filtering by user + mode
CREATE INDEX IF NOT EXISTS idx_user_memories_user_mode
  ON user_memories(user_id, mode);
