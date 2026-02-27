# Epic 4 — Memoria e Aprendizado

> **Status:** Ready | **Fase:** 3 | **Sprint:** 6-8 | **Prioridade:** P0 — Core
> **Depende de:** Epic 2 (debate engine funcional), Epic 3 (frontend + Supabase Auth)

## Epic Goal

Agents que aprendem e lembram entre sessoes — memoria explicita via comando, checkpoints silenciosos automaticos, extracao de DNA Mental de exportacoes de LLMs externos, e bootstrap inicial do clone de chris_rodrigues.

## Epic Description

**Contexto:**
- O sistema precisa de tres mecanismos de aprendizado independentes que alimentam a mesma tabela `user_memories` no Supabase.
- Memorias sao injetadas no system prompt dos agents para personalizar respostas.
- O DNA Mental extraido de exports de ChatGPT/Gemini acelera o bootstrap do clone do usuario.

**Tres mecanismos de aprendizado:**

1. **Memoria Explicita:** Usuario fala "grava na memoria que..." e o agent salva com `confidence=1.0`. Implementado via `MemoryStore.record_explicit()`.

2. **Checkpoints Silenciosos:** Agent observa padroes no background apos cada sessao (correcoes, reformatacoes, temas recorrentes). Implementado via `SilentCheckpoint.analyze()`. Apenas candidates com `confidence > 0.65` sao commitados.

3. **Extracao de DNA Mental:** Prompt cirurgico analisa exports do ChatGPT/Gemini e gera YAML com padroes cognitivos, estilo de comunicacao, interesses recorrentes e padroes de decisao. Output alimenta as camadas L2-L8 do clone.

**Tabela Supabase `user_memories`:**
```sql
CREATE TABLE user_memories (
  user_id uuid REFERENCES auth.users(id),
  key text NOT NULL,
  value text NOT NULL,
  confidence float NOT NULL DEFAULT 1.0,
  source text NOT NULL CHECK (source IN ('explicit', 'checkpoint', 'pattern')),
  created_at timestamptz DEFAULT now(),
  last_applied timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

-- RLS: cada usuario ve apenas seus dados
CREATE POLICY "users see own memories"
ON user_memories FOR ALL
USING (user_id = auth.uid());
```

## Stories

### Story 4.1 — Implementar MemoryStore com comandos explicitos

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[supabase_schema_validation, upsert_correctness, command_detection_test]`

Como usuario do teamAI,
quero falar "grava na memoria que..." e o agent salvar essa informacao permanentemente,
para que minhas preferencias sejam lembradas em todas as sessoes futuras.

**Acceptance Criteria:**
1. `MemoryStore.record_explicit(user_id, key, value, source='explicit')` salva no Supabase `user_memories`.
2. `confidence=1.0` para `source='explicit'` (usuario declarou diretamente).
3. Comando detectado no chat: frases como "grava na memoria que...", "lembra que eu...", "anota que...".
4. Agent responde confirmando o que foi gravado (ex: "Gravado: preferencia_formato = numeros primeiro, depois narrativa").
5. Chave normalizada em `snake_case` (ex: "preferencia de formato" -> "preferencia_formato").
6. Upsert: se a chave ja existe para o usuario, atualiza o valor e `last_applied`.

---

### Story 4.2 — Implementar SilentCheckpoint

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[trigger_detection_test, confidence_scoring_validation, async_execution_test]`

Como sistema teamAI,
quero que agents observem padroes de comportamento do usuario em background,
para que preferencias implicitas sejam capturadas sem exigir comandos explicitos.

**Acceptance Criteria:**
1. Triggers implementados: usuario corrigiu output, pediu reformatacao, expandiu tema >5 turnos, retomou topico apos >3 dias.
2. `SilentCheckpoint.analyze(session)` retorna `List[MemoryCandidate]` com `key`, `value`, `confidence`.
3. Apenas candidates com `confidence > 0.65` sao commitados via `MemoryStore.record_explicit()` com `source='checkpoint'`.
4. Execucao assincrona — nao bloqueia a sessao do usuario.
5. Nao duplica memorias existentes — verifica se a chave ja existe antes de inserir.

---

### Story 4.3 — Integrar memoria no context dos agents

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[context_injection_test, token_budget_validation, relevance_ranking_test]`

Como usuario do teamAI,
quero que agents usem minhas memorias salvas para personalizar respostas,
para que cada sessao fique mais alinhada com minhas preferencias.

**Acceptance Criteria:**
1. No inicio de cada sessao, top-N memorias relevantes carregadas do Supabase.
2. Memorias injetadas no system prompt do agent/mind como bloco estruturado.
3. Memorias mais recentes e de alta confidence tem prioridade no ranking.
4. Maximo de 2k tokens para memorias injetadas (nao estourar context window).
5. Agent usa memorias nas respostas (ex: formata output conforme preferencia gravada).

---

### Story 4.4 — Criar prompt de extracao de DNA Mental

**Executor:** `@analyst` | **Quality Gate:** `@pm`
**Quality Gate Tools:** `[yaml_schema_validation, prompt_quality_review, extraction_coverage_test]`

Como usuario do teamAI,
quero poder importar meu historico de ChatGPT/Gemini e extrair padroes cognitivos automaticamente,
para que meu clone comece com um perfil rico baseado em interacoes reais.

**Acceptance Criteria:**
1. Prompt template em `squads-base/mmos-squad/tools/dna-extraction-prompt.md`.
2. Extrai: `cognitive_patterns`, `communication_style`, `recurring_interests`, `decision_patterns`.
3. Output e YAML valido conforme schema da arquitetura (secao 6.3 do Master Architecture).
4. Documentacao de como exportar de ChatGPT (Settings -> Data Controls -> Export) e Gemini (myaccount.google.com -> Data -> Download).

---

### Story 4.5 — Bootstrap clone chris_rodrigues

**Executor:** `@dev` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[yaml_schema_validation, fidelity_calculation_test, clone_integration_test]`

Como Chris (admin do teamAI),
quero gerar meu clone inicial combinando onboarding e DNA extraction,
para que o sistema tenha um perfil cognitivo funcional desde o primeiro dia.

**Acceptance Criteria:**
1. Script `scripts/bootstrap-clone.py` processa respostas de onboarding.
2. Script processa exports de LLMs via dna-extraction-prompt.
3. Gera `users/chris_rodrigues/clone/clone-v0.1.yaml` com fidelidade medida.
4. Milestone notifications implementadas (40%, 60%, 80%, 94%) conforme `check_clone_milestone()`.
5. Clone commitado no Git com tag de versao (`clone-chris-v0.1`).

---

## Compatibility Requirements

- [ ] `user_memories` usa mesmo schema RLS que `debate_sessions` (Epic 2) — pattern identico
- [ ] Memorias injetadas no context respeitam o token budget definido no Epic 2 (Camada 1 - KB Compression)
- [ ] `/api/memory` segue mesmo padrao de auth que `/api/debate` (Epic 2) e `/api/minds` (Epic 3)
- [ ] Clone YAML segue schema versionado compativel com o registry.yaml do Epic 1

## Risk Mitigation

- **Risco:** SilentCheckpoint gera memorias incorretas que poluem o context do agent
- **Mitigacao:** Threshold de confidence 0.65; usuario pode ver e deletar memorias; memorias de checkpoint decaem se nao aplicadas

- **Risco:** DNA extraction gera YAML invalido para exports malformados
- **Mitigacao:** Validacao de schema YAML apos extracao; fallback para campos parciais

- **Risco:** Injecao de memorias no system prompt estoura context window
- **Mitigacao:** Cap de 2k tokens; ranking por relevancia e confidence; truncamento gracioso

## Definition of Done

- [ ] Stories 4.1-4.5 completas com todos os ACs met
- [ ] Tabela `user_memories` criada com RLS no Supabase
- [ ] Memoria explicita funciona end-to-end (comando -> salva -> injeta na proxima sessao)
- [ ] SilentCheckpoint roda em background sem bloquear sessoes
- [ ] Clone chris_rodrigues v0.1 gerado com fidelidade >= 35%
- [ ] DNA extraction prompt testado com export real de ChatGPT
