-- Migration: 20260226_002_user_api_keys
-- Armazenamento seguro de API keys por usuário

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, provider)
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);

-- RLS
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_api_keys_select"
    ON user_api_keys FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "users_own_api_keys_insert"
    ON user_api_keys FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_own_api_keys_update"
    ON user_api_keys FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "users_own_api_keys_delete"
    ON user_api_keys FOR DELETE
    USING (user_id = auth.uid());

CREATE TRIGGER trigger_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
