-- Add project_name to debate_sessions for folder-based filtering
ALTER TABLE debate_sessions
  ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Index for fast filtering by project
CREATE INDEX IF NOT EXISTS idx_debate_sessions_project_name
  ON debate_sessions(user_id, project_name);
