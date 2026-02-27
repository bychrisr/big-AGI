-- Migration: 20260226_003_user_memories
-- Memórias persistentes do usuário (explícitas e implícitas)

CREATE TABLE IF NOT EXISTS user_memories (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    confidence FLOAT NOT NULL DEFAULT 0.7 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    source TEXT NOT NULL DEFAULT 'explicit' CHECK (source IN ('explicit', 'checkpoint', 'pattern')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_applied TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, key)
);

-- Índice para ranking por confidence
CREATE INDEX IF NOT EXISTS idx_user_memories_user_confidence
    ON user_memories(user_id, confidence DESC);

-- RLS
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_memories_select"
    ON user_memories FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "users_own_memories_insert"
    ON user_memories FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_own_memories_update"
    ON user_memories FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "users_own_memories_delete"
    ON user_memories FOR DELETE
    USING (user_id = auth.uid());
