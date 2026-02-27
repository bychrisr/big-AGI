# Epic 1 — Fundação do Repo teamai

> **Status:** Ready | **Fase:** 0 | **Sprint:** 1 | **Prioridade:** P0 — Blocker

## Epic Goal

Criar o repositório `bychrisr/teamai` com estrutura de pastas completa, symlinks Docker-safe, registry.yaml e .gitignore correto — a fundação que todos os outros epics dependem.

## Epic Description

**Contexto do sistema existente:**
- Repo atual (`bychrisr/big-agi`): frontend Next.js em branch `migration`
- Repo a criar (`bychrisr/teamai`): squads, minds, users, debate_engine

**O que será criado:**
- Estrutura completa de pastas do repo teamai
- `squads-base/mmos-squad/` com 27+ minds organizados
- `users/chris_rodrigues/` e `users/guilger_oliveira/` com symlinks
- `squads-base/registry.yaml` como fonte de verdade dos squads
- `.gitignore` que exclui memories/, projects/ e sources/ pesados

**Critérios de sucesso:**
- `git clone` + validação de symlinks funciona em Linux/Docker
- registry.yaml válido e completo
- Estrutura de pastas segue o spec da arquitetura

## Stories

### Story 1.1 — Criar estrutura de repositório teamai

**Executor:** `@devops` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[structure_validation, gitignore_review, symlink_test]`

Como desenvolvedor do teamAI,
quero criar o repositório `bychrisr/teamai` com a estrutura de pastas base,
para que todos os outros componentes tenham onde residir.

**Acceptance Criteria:**
1. Repo `bychrisr/teamai` criado como privado no GitHub.
2. Estrutura de pastas criada: `squads-base/mmos-squad/`, `users/`, `squads-base/registry.yaml`.
3. `.gitignore` configurado para excluir `users/*/memories/`, `users/*/projects/`, `squads-base/mmos-squad/minds/*/sources/`, `.env`.
4. README.md inicial criado com overview do sistema.
5. Primeiro commit com mensagem `chore: initial repo structure`.

---

### Story 1.2 — Organizar squads-base/mmos-squad com minds

**Executor:** `@devops` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[yaml_validation, directory_structure_check]`

Como sistema teamAI,
quero que os 27+ minds do MMOS estejam organizados em `squads-base/mmos-squad/minds/`,
para que possam ser acessados por qualquer usuário do sistema.

**Acceptance Criteria:**
1. Diretório `squads-base/mmos-squad/minds/` criado com subpasta por mind.
2. Cada mind tem: `metadata.yaml`, `system_prompt.md`, `kb/` (chunks).
3. `metadata.yaml` contém: `id`, `name`, `speciality`, `token_budget`, `tags`.
4. Os 27 minds listados na arquitetura estão presentes (estratégicos + produto + growth + disruptivos).
5. `squad.yaml` do mmos-squad define o squad com `provides: [minds, debate_engine, cognitive_analysis]`.
6. `squads-base/mmos-squad/agents/` tem os 10 agentes em `.md`.

---

### Story 1.3 — Criar estrutura de usuários com symlinks

**Executor:** `@devops` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[symlink_validation, git_symlink_test, clone_test]`

Como sistema teamAI,
quero que cada usuário tenha sua pasta em `users/` com symlink para mmos-squad,
para que o mmos-squad seja compartilhado sem duplicação.

**Acceptance Criteria:**
1. `users/chris_rodrigues/squads/mmos-squad` é symlink para `../../../squads-base/mmos-squad`.
2. `users/guilger_oliveira/squads/mmos-squad` é symlink para `../../../squads-base/mmos-squad`.
3. Symlinks commitados no Git (`git add mmos-squad` após `ln -s`).
4. `git clone` do repo e validação de symlinks funciona sem erros em Linux.
5. `users/chris_rodrigues/minds/` existe (vazio — para minds personalizados futuros).
6. `users/chris_rodrigues/clone/` existe com `README.md` explicando DNA Mental.
7. Mesma estrutura para `users/guilger_oliveira/`.

---

### Story 1.4 — Configurar registry.yaml e validação final

**Executor:** `@devops` | **Quality Gate:** `@architect`
**Quality Gate Tools:** `[yaml_validation, registry_completeness_check]`

Como sistema teamAI,
quero um `squads-base/registry.yaml` completo e validado,
para que o sistema saiba quais squads existem e quem tem acesso a quê.

**Acceptance Criteria:**
1. `squads-base/registry.yaml` criado com schema v3.0 conforme especificado na arquitetura.
2. Seção `squads` define: `mmos-squad` (role: brain), `kaven-squad` (role: project, owner: chris_rodrigues), `psicologia-squad` (role: project, owner: guilger_oliveira).
3. Seção `users` define: `chris_rodrigues` (tier: admin) e `guilger_oliveira` (tier: user).
4. YAML validado com `python -c "import yaml; yaml.safe_load(open('registry.yaml'))"`.
5. Script de validação `scripts/validate-structure.sh` criado e passa sem erros.
6. `docs/README.md` documenta como adicionar novo usuário ao sistema.

---

## Compatibility Requirements

- [ ] Symlinks funcionam após `git clone` em Linux/Docker
- [ ] `.gitignore` não exclui arquivos necessários (minds, agents, clone)
- [ ] registry.yaml é YAML válido

## Risk Mitigation

- **Risco principal:** Symlinks não funcionarem no ambiente de desenvolvimento do usuário (Windows/Mac)
- **Mitigação:** Documentar que desenvolvimento deve ser feito em Linux ou WSL2; Docker é Linux nativo
- **Rollback:** Substituir symlinks por cópias se necessário (não recomendado — duplicação)

## Definition of Done

- [ ] Todas as 4 stories completas com ACs met
- [ ] `git clone + validate-structure.sh` passa sem erros
- [ ] registry.yaml validado
- [ ] Documentação de "como adicionar usuário" disponível
- [ ] Epic 2 pode iniciar a partir desta fundação
