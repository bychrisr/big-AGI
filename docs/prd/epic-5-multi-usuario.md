# Epic 5 — Multi-Usuario (Fase 4)

> **Status:** Ready | **Fase:** 4 | **Sprint:** 8-10 | **Prioridade:** P0 — Core
> **Depende de:** Epic 1 (repo), Epic 2 (debate_engine + Supabase schema), Epic 3 (frontend + auth), Epic 4 (memoria + clone)

## Epic Goal

guilger_oliveira consegue usar o teamAI de forma completamente isolada de chris_rodrigues — RLS em todas as tabelas, onboarding agent funcional, clone bootstrap automatico, e acesso via dominio proprio.

## Epic Description

**Contexto:**
- Supabase Auth ja configurado (Epic 3) com JWT por usuario
- Tabelas de debate_sessions ja tem RLS basico (Epic 2)
- Clone de chris_rodrigues ja existe com fidelidade ~35%+ (Epic 4)
- Agora: estender isolamento para TODAS as tabelas, criar onboarding para novos usuarios, e configurar acesso externo

**Tiers de usuario:**

| Tier | Exemplo | Acesso |
|------|---------|--------|
| `admin` | chris_rodrigues | Tudo — criar squads, minds, ver todos os projetos |
| `user` | guilger_oliveira | Seus projetos + minds compartilhados do MMOS |
| `guest` | (futuro) | Somente leitura de minds publicos |

**Tabelas Supabase com RLS:**
- `user_memories` — memorias dos agents sobre o usuario
- `debate_sessions` — historico de debates (ja tem RLS basico do Epic 2)
- `user_clone` — DNA Mental do usuario
- `user_projects` — projetos e configs
- `user_api_keys` — API keys encriptadas
- `user_preferences` — preferencias e configuracoes

**Pipeline de onboarding (5-8 perguntas):**
1. Nome e como prefere ser chamado
2. Area de trabalho
3. 2-3 maiores interesses
4. Quem inspira (para sugerir minds)
5. Perfil publico (Instagram, YouTube, site)
6. Ja usa IA? (se sim: sugerir exportar historico)
7. Maior desafio atual

## Stories

### Story 5.1 — RLS em todas as tabelas Supabase

**Executor:** `@data-engineer` | **Quality Gate:** `@dev`
**Quality Gate Tools:** `[rls_validation, isolation_test, schema_compliance]`

Como sistema teamAI,
quero que Row Level Security esteja habilitado em todas as tabelas de usuario,
para que cada usuario acesse apenas seus proprios dados.

**Acceptance Criteria:**
1. RLS habilitado em: `user_memories`, `debate_sessions`, `user_clone`, `user_projects`, `user_api_keys`, `user_preferences`.
2. Policy "users see own data" usando `auth.uid()` em todas as tabelas.
3. Testes de isolamento: user A nao acessa dados de user B.
4. Service role bypass para operacoes admin.
5. Migrations SQL versionadas em `supabase/migrations/`.

---

### Story 5.2 — Criar onboarding agent

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[flow_validation, ux_review, data_persistence_test]`

Como novo usuario do teamAI,
quero ser guiado por um agent "Alex" que me conheca em 5-8 perguntas rapidas,
para que o sistema tenha contexto sobre mim desde o primeiro uso.

**Acceptance Criteria:**
1. Fluxo completo de onboarding implementado com agent "Alex".
2. Perguntas apresentadas uma a uma (conversacional, nao formulario).
3. Respostas salvas em `user_preferences` e `user_clone`.
4. Pergunta sobre exportacao de LLMs com instrucao de como exportar (ChatGPT, Gemini).
5. Pergunta sobre API key com link para Anthropic.
6. Ao final: confirmacao de tudo configurado com resumo ao usuario.
7. Onboarding completo em < 10 minutos.

---

### Story 5.3 — Clone bootstrap automatico pos-onboarding

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[clone_validation, fidelity_calculation, data_integrity_test]`

Como novo usuario do teamAI,
quero que apos o onboarding meu clone inicial seja gerado automaticamente,
para que o sistema ja me conheca minimamente desde o primeiro uso.

**Acceptance Criteria:**
1. Bootstrap roda automaticamente ao fim do onboarding.
2. Respostas das perguntas mapeadas para `user_clone` no Supabase + Git (`users/{username}/clone/`).
3. Fidelidade calculada (~35% baseline para onboarding sem export).
4. Notificacao ao usuario: "Criei um perfil inicial seu. Vou melhorando conforme conversamos."
5. Clone em `users/{username}/clone/` com versao inicial (`v0.1-bootstrap`).
6. Se usuario forneceu export de LLM: processar via DNA Mental extraction e aumentar fidelidade.

---

### Story 5.4 — Configurar dominio proprio e acesso externo

**Executor:** `@devops` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[ssl_validation, cors_test, external_access_test]`

Como usuario externo (guilger_oliveira),
quero acessar o teamAI via dominio proprio de qualquer dispositivo,
para que eu possa usar o sistema remotamente.

**Acceptance Criteria:**
1. Nginx ou Caddy configurado como reverse proxy.
2. HTTPS com Let's Encrypt (auto-renovacao).
3. Variaveis de ambiente do Supabase configuradas no servidor.
4. CORS configurado para dominio proprio.
5. Teste de acesso externo de dispositivo diferente validado.

---

### Story 5.5 — Teste completo com guilger_oliveira

**Executor:** `@qa` | **Quality Gate:** `@pm`
**Quality Gate Tools:** `[e2e_test, isolation_validation, ux_acceptance]`

Como PM do teamAI,
quero validar que guilger_oliveira tem uma experiencia completa e isolada,
para que o sistema multi-usuario esteja pronto para producao.

**Acceptance Criteria:**
1. guilger_oliveira faz onboarding completo via agent Alex.
2. guilger_oliveira ve apenas seus dados (nao dados de chris_rodrigues).
3. guilger_oliveira acessa minds compartilhados do MMOS.
4. guilger_oliveira tem seu `psicologia-squad` configurado.
5. guilger_oliveira NAO ve `kaven-squad` de chris_rodrigues.
6. API key de guilger_oliveira funciona independente.
7. Clone de guilger_oliveira criado sem contaminar clone de chris_rodrigues.

---

## Compatibility Requirements

- [ ] RLS policies compatíveis com service role do Supabase (admin bypass)
- [ ] Onboarding agent funciona com Supabase Auth existente (Epic 3)
- [ ] Clone bootstrap usa mesma estrutura de DNA Mental do Epic 4
- [ ] Reverse proxy nao interfere com WebSocket streaming do AIX
- [ ] Schema de debate_sessions mantido compativel com Epic 2

## Risk Mitigation

- **Risco:** RLS policies bloqueiam operacoes admin necessarias
- **Mitigacao:** Service role bypass documentado; testes com ambos os roles (user + service)
- **Risco:** Onboarding agent muito longo — usuario desiste
- **Mitigacao:** Meta < 10 minutos; perguntas opcionais apos as 5 primeiras
- **Risco:** Clone bootstrap contamina dados entre usuarios
- **Mitigacao:** Testes de isolamento obrigatorios antes de merge; user_id em todas as queries
- **Risco:** Dominio exposto sem seguranca adequada
- **Mitigacao:** HTTPS obrigatorio; rate limiting no reverse proxy; Supabase Auth em todas as rotas

## Definition of Done

- [ ] Stories 5.1-5.5 completas com todos os ACs atendidos
- [ ] guilger_oliveira fez onboarding e usa o sistema isoladamente
- [ ] Zero dados vazando entre usuarios (validado com testes de isolamento)
- [ ] Dominio proprio acessivel externamente com HTTPS
- [ ] Clone de guilger_oliveira criado sem contaminar clone de chris_rodrigues
- [ ] Documentacao de "como adicionar novo usuario" atualizada
