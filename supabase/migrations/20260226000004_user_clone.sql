-- Migration: 20260226_004_user_clone
-- Clone cognitivo do usuário (DNA Mental)

CREATE TABLE IF NOT EXISTS user_clone (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    version TEXT NOT NULL DEFAULT '0.1-bootstrap',
    fidelity FLOAT NOT NULL DEFAULT 0.0 CHECK (fidelity >= 0.0 AND fidelity <= 1.0),
    layers JSONB NOT NULL DEFAULT '{}'::jsonb,
    milestone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_clone_user_id ON user_clone(user_id);

ALTER TABLE user_clone ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_clone_select"
    ON user_clone FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "users_own_clone_insert"
    ON user_clone FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_own_clone_update"
    ON user_clone FOR UPDATE
    USING (user_id = auth.uid());

CREATE TRIGGER trigger_user_clone_updated_at
    BEFORE UPDATE ON user_clone
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
