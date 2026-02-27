# Epic 2 — Debate Engine Funcional

> **Status:** Ready | **Fase:** 1 | **Sprint:** 2-3 | **Prioridade:** P0 — Core
> **Depende de:** Epic 1 (repo teamai estruturado)

## Epic Goal

Ter o `debate_engine.py` rodando com Anthropic API, KB compression funcional, session caching e integrado à rota `/api/debate` do big-AGI fork — tudo dentro dos budgets de token definidos.

## Epic Description

**Contexto:**
- debate_engine.py existe no mmos-squad mas usa Gemini — precisa migrar para Anthropic
- Context window Claude Sonnet: 200k — sem otimização, 4 minds = crash
- Meta: Growth Council (5 minds) < 60k tokens; Debate Oxford (2 minds) < 80k

**O que será implementado:**
1. Migrar debate_engine para Anthropic Claude API
2. KB compression (~85% redução de tokens)
3. Session caching (system prompt carregado 1x por sessão)
4. session_store.py com Supabase (sem SQLite)
5. Rota `/api/debate` no big-AGI fork
6. Validação de token budgets com testes reais

## Stories

### Story 2.1 — Migrar debate_engine para Anthropic API

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[api_contract_validation, error_handling_review, token_counting]`

Como sistema teamAI,
quero que o debate_engine use Anthropic Claude API em vez de Gemini,
para que debates usem o mesmo provider das consultas individuais.

**Acceptance Criteria:**
1. `debate_engine.py` usa `anthropic.Anthropic()` client em vez de Google Generative AI.
2. API key carregada de variável de ambiente `ANTHROPIC_API_KEY` (nunca hardcoded).
3. Modelo configurável via `DEBATE_MODEL` (default: `claude-sonnet-4-6`).
4. Streaming funciona corretamente para respostas longas.
5. Error handling cobre: API errors, rate limits, timeout, context overflow.
6. Testes: debate simples com 2 minds executa e retorna resposta válida.
7. Token count por turno é logado para monitoramento.

---

### Story 2.2 — Implementar KB compression

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[token_budget_validation, relevance_quality_test]`

Como sistema teamAI,
quero que o KB de cada mind seja comprimido para apenas os chunks relevantes ao tópico,
para que debates não excedam o budget de tokens.

**Acceptance Criteria:**
1. `extract_relevant_chunks(kb_path, topic, max_chunks=10)` implementada em `utils/kb_compression.py`.
2. Algoritmo: keyword scoring por tópico, ranked chunks, retorna top-N.
3. KB de 40k tokens → ≤ 8k tokens para tópico específico.
4. Token counter antes e depois de compression é logado.
5. Testes: KB do Hormozi (60k tokens) comprimido para < 8k para tópico "growth hacking".
6. Função aceita `min_chunks` e `max_chunks` como parâmetros opcionais.
7. Fallback: se tópico sem match, retorna primeiros N chunks (não falha).

---

### Story 2.3 — Implementar DebateSession com session caching

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[session_state_validation, token_delta_test, caching_correctness]`

Como sistema teamAI,
quero que o system prompt de cada mind seja carregado apenas uma vez por sessão,
para que turnos subsequentes enviem apenas o delta e economizem tokens.

**Acceptance Criteria:**
1. Classe `DebateSession` em `debate/session.py` com estado: `minds`, `topic`, `history`, `initialized`, `token_counter`.
2. `get_prompt_for_turn(mind, message)` retorna full prompt no primeiro turno, delta nos seguintes.
3. Session ID gerado como UUID no início da sessão.
4. `token_counter` acumula tokens por turno e por mind.
5. `multi_persona_call(minds, topic)` implementada para minds leves (< 20k tokens compilados).
6. Regra: Hormozi (60k) NUNCA usa multi_persona_call — sempre chamadas separadas.
7. Testes: 3 turnos com 2 minds, verificar que turno 2+ não inclui system prompt completo.

---

### Story 2.4 — Implementar session_store com Supabase

**Executor:** `@data-engineer` | **Quality Gate:** `@dev`
**Quality Gate Tools:** `[rls_validation, schema_compliance, encryption_check]`

Como sistema teamAI,
quero que sessões de debate sejam persistidas no Supabase com RLS,
para que possam ser retomadas e o histórico preservado.

**Acceptance Criteria:**
1. Tabela `debate_sessions` criada no Supabase: `(id uuid PK, user_id uuid FK, minds jsonb, topic text, turns jsonb, tokens_used int, created_at timestamptz, updated_at timestamptz)`.
2. RLS policy: `user_id = auth.uid()` para SELECT, INSERT, UPDATE.
3. `SessionStore.save(session)` insere/atualiza no Supabase.
4. `SessionStore.resume(session_id)` carrega sessão existente com verificação de ownership.
5. Sem SQLite em nenhum ponto — Supabase direto desde o início.
6. Índices: `debate_sessions(user_id)`, `debate_sessions(created_at)`.
7. Testes: save → resume → verificar dados idênticos; tentativa de acesso cross-user é rejeitada.

---

### Story 2.5 — Criar /api/debate route no big-AGI fork

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[auth_validation, streaming_test, subprocess_safety, api_contract]`

Como usuário do teamAI,
quero chamar o debate_engine via `/api/debate` de forma autenticada,
para que o frontend possa iniciar debates sem expor a lógica Python diretamente.

**Acceptance Criteria:**
1. Route Handler em `app/api/debate/route.ts` criada no big-AGI fork.
2. Autenticação: valida Supabase JWT antes de qualquer operação.
3. Request body: `{ minds: string[], topic: string, session_id?: string }`.
4. Pega API key do usuário do Supabase (não do request body).
5. Chama debate_engine Python via subprocess com timeout de 60s.
6. Response: streaming de volta para o browser (ReadableStream).
7. Error handling: 401 (não autenticado), 400 (minds inválidos), 500 (debate_engine falhou).
8. Integração verificada: debate com 2 minds via Postman/curl retorna streaming válido.

---

## Token Budget Validation

Antes de marcar epic como Done, executar validação de budgets:

| Operação | Meta | Medição |
|----------|------|---------|
| Single mind (Hormozi) | < 15k | `token_counter` em teste |
| Growth Council (5 minds leves) | < 60k | Debate completo com 3 turnos |
| Debate Oxford (Hormozi + Graham) | < 80k | Debate completo com 5 turnos |

## Compatibility Requirements

- [ ] debate_engine funciona como subprocess do Node.js sem conflitos de processo
- [ ] Supabase session_store usa mesmo schema que será usado pelo multi-usuário (Epic 5)
- [ ] /api/debate segue mesmo padrão de auth que /api/memory e /api/minds

## Risk Mitigation

- **Risco:** Python subprocess bloqueia Node.js event loop
- **Mitigação:** Subprocess assíncrono; timeout de 60s; container Python separado como alternativa

## Definition of Done

- [ ] Stories 2.1-2.5 completas
- [ ] Token budgets validados em teste real
- [ ] /api/debate funciona com streaming de ponta a ponta
- [ ] Sessões persistidas e retomáveis no Supabase
