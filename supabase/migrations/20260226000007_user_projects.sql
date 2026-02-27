-- user_projects: indexação de CLAUDE.md e padrões por projeto
CREATE TABLE IF NOT EXISTS user_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_name TEXT NOT NULL,
    claude_md TEXT,
    patterns JSONB DEFAULT '{}',
    claude_md_hash TEXT,  -- Para evitar reprocessamento desnecessário
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, project_name)
);

-- Full-text search index no CLAUDE.md
CREATE INDEX IF NOT EXISTS idx_user_projects_claude_md_fts
    ON user_projects USING GIN(to_tsvector('portuguese', COALESCE(claude_md, '')));

-- GIN index nos patterns para busca por chaves
CREATE INDEX IF NOT EXISTS idx_user_projects_patterns
    ON user_projects USING GIN(patterns);

-- Índice por user_id
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id
    ON user_projects(user_id);

-- RLS
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_projects_user_isolation"
    ON user_projects FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_projects_updated_at
    BEFORE UPDATE ON user_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função de busca por similaridade
CREATE OR REPLACE FUNCTION search_similar_patterns(query_text TEXT, uid UUID)
RETURNS TABLE(project_name TEXT, patterns JSONB, similarity REAL) AS $$
BEGIN
    RETURN QUERY
    SELECT
        up.project_name,
        up.patterns,
        ts_rank(to_tsvector('portuguese', COALESCE(up.claude_md, '')),
                plainto_tsquery('portuguese', query_text)) AS similarity
    FROM user_projects up
    WHERE up.user_id = uid
      AND to_tsvector('portuguese', COALESCE(up.claude_md, '')) @@ plainto_tsquery('portuguese', query_text)
    ORDER BY similarity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
