# Epic 6 — Contexto Multi-Projeto

> **Status:** Draft | **Fase:** 5 | **Sprint:** TBD | **Prioridade:** P1 — Enhancement
> **Depende de:** Epics 1-5 completos (repo, debate engine, multi-usuario, aprendizado continuo, clone)

## Epic Goal

Agents que sabem de todos os projetos do usuario, detectam padroes cross-project via similaridade semantica, e consultores disruptivos adicionais integrados via APEX scoring — expandindo o MMOS com perspectivas de indie/solo/leverage.

## Epic Description

**Contexto:**
- Cada usuario tem multiplos projetos (Kaven, Seja Eleito, etc.)
- Agents hoje operam isolados no escopo do projeto ativo
- Padroes e decisoes de um projeto podem ser relevantes para outro
- O MMOS tem 27 minds mas faltam perspectivas indie/solo/leverage

**O que sera implementado:**
1. CrossProjectContextProvider — detecta similaridade semantica entre problema atual e decisoes de outros projetos
2. Indexacao de CLAUDE.md de cada projeto no Supabase como base para similarity
3. Notificacoes cross-project integradas no fluxo de conversa do Steave
4. APEX scoring e adicao de 3 novos consultores disruptivos ao MMOS

**Fluxo cross-project:**
```
Chris -> Agent: "Aquilo que fizemos no Seja Eleito pode ajudar aqui no Kaven?"
Agent -> Chris: "Percebi que voce resolveu algo parecido no Seja Eleito. Quer reaproveitar?"
```

**Criterios de sucesso:**
- CrossProjectContextProvider detecta padroes com confidence > 0.7
- Notificacoes nao spammam (mesmo insight nao notifica 2x)
- 3 consultores disruptivos adicionados com system prompts e KBs completas
- APEX scoring documentado e aplicado aos 5 candidatos

## Stories

### Story 6.1 — Implementar CrossProjectContextProvider

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[similarity_accuracy_test, threshold_validation, spam_prevention_test]`

Como sistema teamAI,
quero que um provider detecte similaridade semantica entre o problema atual e decisoes de outros projetos do usuario,
para que insights cross-project sejam surfados automaticamente quando relevantes.

**Acceptance Criteria:**
1. `CrossProjectContextProvider.find_relevant_past_decision()` implementada conforme spec da arquitetura (secao 8).
2. Semantic similarity usando embeddings ou keyword matching com score normalizado 0-1.
3. Threshold configuravel (default: 0.7) — abaixo disso, nenhuma notificacao.
4. Execucao silenciosa sem bloquear a sessao do usuario.
5. `format_insight()` retorna mensagem formatada: "Detectei algo parecido em {projeto}: {decisao}. Quer considerar isso aqui?"
6. Notificacao apenas quando confidence > threshold.
7. Historico de notificacoes evita spam — mesmo insight nao notifica 2x na mesma sessao.

---

### Story 6.2 — Indexar CLAUDE.md de cada projeto no Supabase

**Executor:** `@data-engineer` | **Quality Gate:** `@dev`
**Quality Gate Tools:** `[schema_validation, sync_correctness, similarity_index_test]`

Como sistema teamAI,
quero que cada projeto tenha seu CLAUDE.md indexado no Supabase com patterns extraidos,
para que o CrossProjectContextProvider tenha uma base de dados para calcular similaridade.

**Acceptance Criteria:**
1. Tabela `user_projects` atualizada com campos `claude_md` (text) e `patterns` (jsonb).
2. Sync automatico quando CLAUDE.md e salvo/atualizado no projeto.
3. Patterns extraidos do CLAUDE.md: decisoes arquiteturais, padroes de codigo, tecnologias usadas.
4. Indice de busca por similarity criado (full-text search ou embedding index).
5. API endpoint `/api/projects` lista projetos do usuario com patterns.

---

### Story 6.3 — Integrar notificacoes cross-project no Steave

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[integration_test, ux_flow_validation, logging_verification]`

Como usuario do teamAI,
quero que o Steave (kaven-squad-lead) me notifique inline quando detectar um padrao cross-project relevante,
para que eu possa reaproveitar decisoes de outros projetos sem ter que lembrar manualmente.

**Acceptance Criteria:**
1. Steave chama `CrossProjectContextProvider` em cada novo problema recebido.
2. Notificacao inline na conversa (nao popup ou modal separado).
3. Tom natural e contextual: "Lembro que no Seja Eleito voce resolveu algo parecido..."
4. Opcoes apresentadas: "Sim, conte mais" ou "Nao, foca no {projeto_atual}".
5. Se "Sim": traz contexto relevante do outro projeto com decisao e resultado.
6. Logging de todas as notificacoes para analise de qualidade e refinamento do threshold.

---

### Story 6.4 — APEX scoring e adicao de 3 consultores disruptivos

**Executor:** `@analyst` | **Quality Gate:** `@pm`
**Quality Gate Tools:** `[scoring_framework_review, mind_quality_check, registry_validation]`

Como sistema teamAI,
quero avaliar 5 candidatos a consultores disruptivos via APEX scoring e adicionar os top 3 ao MMOS,
para que o sistema tenha perspectivas de wealth/leverage, indie SaaS, e criacao de conteudo solo.

**Acceptance Criteria:**
1. Framework APEX scoring documentado: **A**mplitude (largura de aplicacao), **P**rofundidade (expertise tecnica), e**X**clusividade (perspectiva unica), **P**raticidade (acionabilidade dos conselhos).
2. Scoring dos 5 candidatos: Naval Ravikant, Sahil Lavingia, Simon Sinek, Justin Welsh, Dickie Bush.
3. Top 3 selecionados com minimo 1 do perfil indie/solo.
4. Mind criado para cada selecionado: `system_prompt.md` + `kb/` com chunks relevantes.
5. Minds integrados no `registry.yaml` e listados no mmos-squad.
6. `metadata.yaml` de cada mind com: id, name, speciality, token_budget, tags.

---

## Compatibility Requirements

- [ ] CrossProjectContextProvider funciona com a tabela `user_projects` existente no Supabase (secao 5 da arquitetura)
- [ ] Notificacoes cross-project respeitam RLS — usuario so ve insights dos seus proprios projetos
- [ ] Novos minds seguem mesmo formato que os 27 existentes (metadata.yaml, system_prompt.md, kb/)
- [ ] `/api/projects` segue mesmo padrao de auth que `/api/memory` e `/api/minds`

## Risk Mitigation

- **Risco:** Similarity scoring com muitos false positives irritam o usuario
- **Mitigacao:** Threshold conservador (0.7), historico de notificacoes evita spam, logging para refinar
- **Risco:** CLAUDE.md de projetos contem informacao sensivel indexada no Supabase
- **Mitigacao:** RLS garante isolamento por usuario; campos `patterns` extraem apenas metadados, nao codigo
- **Risco:** Novos minds com KB insuficiente geram respostas rasas
- **Mitigacao:** Quality gate do @pm valida profundidade do KB antes de integrar ao registry

## Definition of Done

- [ ] Stories 6.1-6.4 completas com ACs met
- [ ] CrossProjectContextProvider detecta padroes com confidence > 0.7 em teste real
- [ ] Notificacoes cross-project funcionam end-to-end no Steave
- [ ] 3 novos consultores disruptivos com system prompts e KBs completas
- [ ] APEX scoring documentado e aplicado
- [ ] Nenhum false positive em teste com projetos distintos (Kaven vs Psicologia)
- [ ] Epic 7+ pode construir sobre esta fundacao cross-project
