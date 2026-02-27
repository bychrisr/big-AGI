-- Migration: 20260226_005_user_preferences
-- Preferências e configurações do usuário

CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    username TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    api_keys_migrated BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_model TEXT DEFAULT 'claude-sonnet-4-20250514',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_preferences_username ON user_preferences(username)
    WHERE username IS NOT NULL;

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_preferences_select"
    ON user_preferences FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "users_own_preferences_insert"
    ON user_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_own_preferences_update"
    ON user_preferences FOR UPDATE
    USING (user_id = auth.uid());

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
