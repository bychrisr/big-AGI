# Epic 3 — Frontend teamAI (Fase 2)

> **Status:** Ready | **Fase:** 2 | **Sprint:** 3-4 | **Prioridade:** P0 — Core
> **Depende de:** Epic 1 (repo teamai estruturado), Epic 2 (debate engine funcional)

## Epic Goal

big-AGI fork rodando com Auth Supabase, API keys por usuario no Supabase (nao localStorage), minds do MMOS como personas, Beam configurado para debates entre minds, e deploy Docker funcional.

## Epic Description

**Contexto:**
- Fork do big-AGI (`bychrisr/big-agi`) em branch `migration` com Next.js 15, React 18, TypeScript, tRPC, Zustand
- Autenticacao atual: HTTP Basic Auth via `HTTP_BASIC_AUTH_USERNAME` / `HTTP_BASIC_AUTH_PASSWORD` em `src/server/env.server.ts`
- API keys: armazenadas em localStorage via Zustand persist middleware
- Personas: sistema simples em `src/apps/personas/` com `SimplePersona` (systemPrompt + metadata)
- Beam: sistema scatter/gather em `src/modules/beam/` que envia para multiplos LLMs em paralelo
- Deploy: Dockerfile multi-stage existente, docker-compose.yaml basico

**O que sera implementado:**
1. Substituir HTTP Basic Auth por Supabase Auth (JWT)
2. Redirecionar armazenamento de API keys de localStorage para Supabase encriptado
3. Rota `/api/minds` que lista minds disponiveis por usuario
4. Sync automatico de personas MMOS para big-AGI
5. Beam customizado para debates entre minds (nao modelos)
6. Deploy Docker self-host funcional com todas as variaveis

**Premissas:**
- Repo `bychrisr/teamai` ja existe com minds em `squads-base/mmos-squad/minds/`
- `debate_engine.py` funcional com Anthropic API (Epic 2)
- Supabase projeto criado com tabelas base (Epic 2: `debate_sessions`)

## Stories

### Story 3.1 — Configurar Supabase Auth no big-AGI fork

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[auth_flow_validation, middleware_coverage, session_persistence_test]`

Substituir HTTP Basic Auth por Supabase Auth. Login/logout funcional, sessao persistida, redirect para login se nao autenticado.

**Acceptance Criteria:**
1. Supabase Auth SDK (`@supabase/supabase-js`, `@supabase/ssr`) instalado
2. Middleware de autenticacao em todas as rotas protegidas (API + pages)
3. Login/logout funcional com email/password
4. Sessao persistida via cookie (nao localStorage)
5. Redirect para /login se nao autenticado

---

### Story 3.2 — Migrar API keys para Supabase

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[encryption_validation, migration_test, localStorage_audit]`

Redirecionar armazenamento de API keys de localStorage para Supabase encriptado. Settings UI mantida identica.

**Acceptance Criteria:**
1. Settings UI ainda funciona (UX identica ao usuario)
2. Keys salvas na tabela Supabase `user_api_keys` (user_id, provider, encrypted_key)
3. Keys nunca em localStorage apos migracao
4. Migracao automatica de keys existentes no localStorage para Supabase no primeiro login
5. Encriptacao verificada (keys nao legais em texto plano no Supabase)

---

### Story 3.3 — Criar rota /api/minds

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[api_contract_validation, auth_test, response_format_check]`

Rota que lista minds disponiveis para o usuario autenticado (MMOS compartilhados + personalizados).

**Acceptance Criteria:**
1. GET /api/minds retorna lista de minds com metadata (id, name, specialty, tags, token_budget)
2. Autenticacao Supabase JWT obrigatoria (401 se nao autenticado)
3. Retorna minds compartilhados (`squads-base/mmos-squad/minds/`) + personalizados do usuario (`users/{user}/minds/`)
4. Formato compativel com sistema de Personas do big-AGI (`SimplePersona` interface)

---

### Story 3.4 — Sync automatico de Personas MMOS para big-AGI

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[sync_correctness, persona_format_validation, startup_test]`

Personas do big-AGI sincronizadas automaticamente com minds do MMOS.

**Acceptance Criteria:**
1. Script de sync le `minds/*/metadata.yaml` do repo teamai
2. Gera personas no formato big-AGI (`SimplePersona`: id, name, systemPrompt)
3. Sync executado no build/startup
4. Personas mostram nome e specialty do mind

---

### Story 3.5 — Beam configurado para debates entre minds

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[beam_integration_test, system_prompt_injection, debate_flow_validation]`

Botao "Start Debate" que abre Beam com minds selecionados (nao modelos).

**Acceptance Criteria:**
1. UI mostra "Start Debate" com selecao de minds
2. Beam intercepta request e injeta system prompt do mind selecionado
3. Chamadas vao para `/api/debate` (nao diretamente para LLM provider)
4. Resultado mostrado no formato Beam existente (scatter/gather UI)

---

### Story 3.6 — Deploy Docker self-host

**Executor:** `@devops` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[docker_build_test, compose_validation, env_completeness, health_check]`

Docker Compose funcional com big-AGI fork + variaveis de ambiente.

**Acceptance Criteria:**
1. Dockerfile multi-stage atualizado para teamAI (base existente em `/Dockerfile`)
2. `docker-compose.yml` com servicos (big-agi, variaveis de ambiente Supabase)
3. `.env.example` documentado com todas as variaveis necessarias
4. Symlinks preservados no container (Linux nativo)
5. Dominio proprio configuravel via variavel de ambiente
6. Health check funcional (`/api/health` ou similar)

---

## Compatibility Requirements

- [ ] Supabase Auth substituiu HTTP Basic Auth completamente (sem dual auth)
- [ ] API keys migraram de localStorage para Supabase sem perda
- [ ] Personas MMOS sincronizam automaticamente no startup
- [ ] Beam funciona tanto no modo original (multi-model) quanto no modo debate (multi-mind)
- [ ] Docker build funciona com `docker compose up` sem configuracao manual

## Risk Mitigation

- **Risco:** Supabase Auth quebra fluxos existentes do big-AGI que dependem de HTTP Basic Auth
- **Mitigacao:** Mapear todos os usos de `HTTP_BASIC_AUTH_USERNAME`/`HTTP_BASIC_AUTH_PASSWORD` antes de remover; implementar auth como middleware que nao afeta logica de negocio

- **Risco:** Migracao de API keys perde keys dos usuarios
- **Mitigacao:** Migracao automatica no primeiro login com fallback para leitura de localStorage; log de migracao para auditoria

- **Risco:** Beam customizado quebra funcionalidade original
- **Mitigacao:** Modo debate como extensao do Beam, nao substituicao; manter scatter/gather original intacto

## Definition of Done

- [ ] Todas as 6 stories completas com ACs met
- [ ] Login Supabase funcional end-to-end
- [ ] API keys encriptadas no Supabase, zero keys em localStorage
- [ ] `/api/minds` retorna minds do MMOS com formato correto
- [ ] Personas sincronizadas no startup
- [ ] Debate via Beam funcional com 2+ minds
- [ ] `docker compose up` funciona com `.env.example` preenchido
- [ ] Epic 4 (memoria e aprendizado) pode iniciar a partir desta base
