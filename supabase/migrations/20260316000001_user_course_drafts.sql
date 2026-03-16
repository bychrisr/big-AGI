-- Migration: user_course_drafts
-- Course Creator — stores drafts in all pipeline stages

CREATE TABLE IF NOT EXISTS user_course_drafts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  mode        TEXT        NOT NULL DEFAULT 'greenfield'
                          CHECK (mode IN ('greenfield', 'brownfield')),
  status      TEXT        NOT NULL DEFAULT 'planning'
                          CHECK (status IN (
                            'planning',
                            'brief',
                            'research',
                            'curriculum',
                            'script_design',
                            'generation',
                            'validation',
                            'published'
                          )),
  brief_data        JSONB NOT NULL DEFAULT '{}',
  curriculum_data   JSONB NOT NULL DEFAULT '{}',
  script_data       JSONB NOT NULL DEFAULT '{}',
  validation_data   JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

-- RLS
ALTER TABLE user_course_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own course drafts"
  ON user_course_drafts
  FOR ALL
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_course_draft_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_course_drafts_updated_at
  BEFORE UPDATE ON user_course_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_course_draft_updated_at();
