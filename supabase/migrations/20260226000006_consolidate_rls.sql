-- Migration: 20260226_006_consolidate_rls
-- Consolidação final de RLS e validação de isolamento

-- Garantir que service_role pode fazer operações admin (bypass RLS)
-- Este comportamento é default no Supabase — documentado aqui para clareza

-- Função helper para verificar isolamento (use em testes)
CREATE OR REPLACE FUNCTION check_rls_isolation(test_user_id UUID)
RETURNS TABLE(table_name TEXT, has_rls BOOLEAN, policy_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.tablename::TEXT,
        t.rowsecurity,
        COUNT(p.policyname)
    FROM pg_tables t
    LEFT JOIN pg_policies p ON p.tablename = t.tablename
    WHERE t.schemaname = 'public'
      AND t.tablename IN (
          'user_memories', 'debate_sessions', 'user_clone',
          'user_preferences', 'user_api_keys'
      )
    GROUP BY t.tablename, t.rowsecurity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
