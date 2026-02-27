-- Migration: 20260226_001_debate_sessions
-- Tabela para persistir sessões de debate do teamAI

CREATE TABLE IF NOT EXISTS debate_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL UNIQUE,
    topic TEXT NOT NULL,
    minds TEXT[] NOT NULL DEFAULT '{}',
    turns JSONB NOT NULL DEFAULT '[]'::jsonb,
    token_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_debate_sessions_user_id ON debate_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_debate_sessions_created_at ON debate_sessions(created_at DESC);

-- RLS
ALTER TABLE debate_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_sessions_select"
    ON debate_sessions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "users_own_sessions_insert"
    ON debate_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_own_sessions_update"
    ON debate_sessions FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "users_own_sessions_delete"
    ON debate_sessions FOR DELETE
    USING (user_id = auth.uid());

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_debate_sessions_updated_at
    BEFORE UPDATE ON debate_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
