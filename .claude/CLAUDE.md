# Synkra AIOS Development Rules for Claude Code

You are working with Synkra AIOS, an AI-Orchestrated System for Full Stack Development.

<!-- AIOS-MANAGED-START: core-framework -->
## Core Framework Understanding

Synkra AIOS is a meta-framework that orchestrates AI agents to handle complex development workflows. Always recognize and work within this architecture.
<!-- AIOS-MANAGED-END: core-framework -->

<!-- AIOS-MANAGED-START: agent-system -->
## Agent System

### Agent Activation
- Agents are activated with @agent-name syntax: @dev, @qa, @architect, @pm, @po, @sm, @analyst
- The master agent is activated with @aios-master
- Agent commands use the * prefix: *help, *create-story, *task, *exit

### Agent Context
When an agent is active:
- Follow that agent's specific persona and expertise
- Use the agent's designated workflow patterns
- Maintain the agent's perspective throughout the interaction
<!-- AIOS-MANAGED-END: agent-system -->

## Development Methodology

### Story-Driven Development
1. **Work from stories** - All development starts with a story in `docs/stories/`
2. **Update progress** - Mark checkboxes as tasks complete: [ ] → [x]
3. **Track changes** - Maintain the File List section in the story
4. **Follow criteria** - Implement exactly what the acceptance criteria specify

### Code Standards
- Write clean, self-documenting code
- Follow existing patterns in the codebase
- Include comprehensive error handling
- Add unit tests for all new functionality
- Use TypeScript/JavaScript best practices

### Testing Requirements
- Run all tests before marking tasks complete
- Ensure linting passes: `npm run lint`
- Verify type checking: `npm run typecheck`
- Add tests for new features
- Test edge cases and error scenarios

<!-- AIOS-MANAGED-START: framework-structure -->
## AIOS Framework Structure

```
aios-core/
├── agents/         # Agent persona definitions (YAML/Markdown)
├── tasks/          # Executable task workflows
├── workflows/      # Multi-step workflow definitions
├── templates/      # Document and code templates
├── checklists/     # Validation and review checklists
└── rules/          # Framework rules and patterns

docs/
├── stories/        # Development stories (numbered)
├── prd/            # Product requirement documents
├── architecture/   # System architecture documentation
└── guides/         # User and developer guides
```
<!-- AIOS-MANAGED-END: framework-structure -->

## Workflow Execution

### Task Execution Pattern
1. Read the complete task/workflow definition
2. Understand all elicitation points
3. Execute steps sequentially
4. Handle errors gracefully
5. Provide clear feedback

### Interactive Workflows
- Workflows with `elicit: true` require user input
- Present options clearly
- Validate user responses
- Provide helpful defaults

## Best Practices

### When implementing features:
- Check existing patterns first
- Reuse components and utilities
- Follow naming conventions
- Keep functions focused and testable
- Document complex logic

### When working with agents:
- Respect agent boundaries
- Use appropriate agent for each task
- Follow agent communication patterns
- Maintain agent context

### When handling errors:
```javascript
try {
  // Operation
} catch (error) {
  console.error(`Error in ${operation}:`, error);
  // Provide helpful error message
  throw new Error(`Failed to ${operation}: ${error.message}`);
}
```

## Git & GitHub Integration

### Commit Conventions
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Reference story ID: `feat: implement IDE detection [Story 2.1]`
- Keep commits atomic and focused

### GitHub CLI Usage
- Ensure authenticated: `gh auth status`
- Use for PR creation: `gh pr create`
- Check org access: `gh api user/memberships`

<!-- AIOS-MANAGED-START: aios-patterns -->
## AIOS-Specific Patterns

### Working with Templates
```javascript
const template = await loadTemplate('template-name');
const rendered = await renderTemplate(template, context);
```

### Agent Command Handling
```javascript
if (command.startsWith('*')) {
  const agentCommand = command.substring(1);
  await executeAgentCommand(agentCommand, args);
}
```

### Story Updates
```javascript
// Update story progress
const story = await loadStory(storyId);
story.updateTask(taskId, { status: 'completed' });
await story.save();
```
<!-- AIOS-MANAGED-END: aios-patterns -->

## Environment Setup

### Required Tools
- Node.js 18+
- GitHub CLI
- Git
- Your preferred package manager (npm/yarn/pnpm)

### Configuration Files
- `.aios/config.yaml` - Framework configuration
- `.env` - Environment variables
- `aios.config.js` - Project-specific settings

<!-- AIOS-MANAGED-START: common-commands -->
## Common Commands

### AIOS Master Commands
- `*help` - Show available commands
- `*create-story` - Create new story
- `*task {name}` - Execute specific task
- `*workflow {name}` - Run workflow

### Development Commands
- `npm run dev` - Start development
- `npm test` - Run tests
- `npm run lint` - Check code style
- `npm run build` - Build project
<!-- AIOS-MANAGED-END: common-commands -->

## Debugging

### Enable Debug Mode
```bash
export AIOS_DEBUG=true
```

### View Agent Logs
```bash
tail -f .aios/logs/agent.log
```

### Trace Workflow Execution
```bash
npm run trace -- workflow-name
```

## Memória Persistente

**NUNCA crie arquivos de memória manualmente.** Use SEMPRE o plugin `claude-mem` para salvar e buscar memórias entre sessões.

| Ação | Ferramenta |
|------|-----------|
| Salvar memória | `mcp__plugin_claude-mem_mcp-search__save_memory` |
| Buscar memórias | `mcp__plugin_claude-mem_mcp-search__search` |
| Ver timeline | `mcp__plugin_claude-mem_mcp-search__timeline` |
| Buscar por ID | `mcp__plugin_claude-mem_mcp-search__get_observations` |

Isso vale para QUALQUER tentativa de criar `MEMORY.md`, `memory.md`, arquivos em `.claude/memory/`, ou qualquer outro mecanismo de memória manual.

## Claude Code Specific Configuration

### Performance Optimization
- Prefer batched tool calls when possible for better performance
- Use parallel execution for independent operations
- Cache frequently accessed data in memory during sessions

### Tool Usage Guidelines
- Always use the Grep tool for searching, never `grep` or `rg` in bash
- Use the Task tool for complex multi-step operations
- Batch file reads/writes when processing multiple files
- Prefer editing existing files over creating new ones

### Session Management
- Track story progress throughout the session
- Update checkboxes immediately after completing tasks
- Maintain context of the current story being worked on
- Save important state before long-running operations

### Error Recovery
- Always provide recovery suggestions for failures
- Include error context in messages to user
- Suggest rollback procedures when appropriate
- Document any manual fixes required

### Testing Strategy
- Run tests incrementally during development
- Always verify lint and typecheck before marking complete
- Test edge cases for each new feature
- Document test scenarios in story files

### Documentation
- Update relevant docs when changing functionality
- Include code examples in documentation
- Keep README synchronized with actual behavior
- Document breaking changes prominently

---

<!-- AIOS-MANAGED-START: teamai-context -->
## teamAI Project Context

Este repo é o **big-AGI fork** (`bychrisr/big-agi`) — frontend do sistema teamAI.
Branch ativa: `migration` (adaptação do big-agi para teamAI).

### O que é o teamAI
Sistema pessoal de inteligência cognitiva: 27+ minds (clones de thought leaders), agents por projeto, clone do usuário (DNA Mental) e aprendizado contínuo. Documento completo: `teamAI-Master-Architecture.md`.

### Dois Repos

| Repo | Propósito | Estado |
|------|-----------|--------|
| `bychrisr/big-agi` (este) | Frontend Next.js | Em desenvolvimento |
| `bychrisr/teamai` | Squads, minds, users, debate_engine Python | A criar (Fase 0) |

### Novas Rotas API (a implementar neste fork)

```
/api/minds    → lista minds disponíveis por usuário (do repo teamai)
/api/debate   → orquestra debate_engine Python
/api/memory   → lê/escreve Supabase user_memories
/api/clone    → serve DNA Mental do usuário
```

Cada route.ts: autentica via Supabase JWT → pega API key do usuário → executa lógica → streaming de volta.

### Customizações Pendentes

1. Auth: Supabase Auth (substituir HTTP Basic Auth do big-AGI)
2. API keys: localStorage → Supabase encriptado
3. Personas: sync automático com MMOS minds
4. Beam: debates entre minds (não entre modelos LLM)
5. Painel de memória do usuário

### Stack de Dados

- **Git (teamai repo):** system prompts, KB chunks, agents .md, clone do usuário
- **Supabase:** memórias, sessões de debate, API keys (encriptadas), projetos
- **RLS:** cada usuário vê apenas seus dados (`user_id = auth.uid()`)

### Fase Atual: Fase 0-2

Fase 0 → estrutura do repo teamai + symlinks
Fase 1 → debate_engine funcional (token optimization)
Fase 2 → este fork rodando com Auth Supabase + Beam/debates

### Decisões Fechadas

- Deploy: Docker self-host (symlinks Docker-safe)
- Banco: Supabase desde o início (sem SQLite → migração)
- API keys: cada usuário traz a própria (Anthropic/Gemini)
- Repo único `teamai` + fork separado `big-agi`
<!-- AIOS-MANAGED-END: teamai-context -->

*Synkra AIOS Claude Code Configuration v2.0*

<!-- AIOS-MANAGED-START: teamai-implementation-status -->
## teamAI Implementation Status

### Stories Completas (Ready for Review)
Epics 1-6 implementados. 36 minds no MMOS (symlink → /home/bychrisr/projects/personal/mmos-squad/minds/).
Branch ativa: `feat/debates-by-folder` | Deploy: Vercel (temporário, PRD diz Docker)

### Arquivos-chave implementados
- `src/modules/teamai/store-minds.ts` — Zustand store; `buildMemoryContextBlock` injeta user_memories + debate_sessions + CLAUDE.md do projeto
- `src/modules/teamai/store-memory-context.ts` — **[NOVO]** cache module-level (TTL 2min) para system prompts de minds MMOS; `ensureFreshMindSystemMessage` + `warmMindCache` + `invalidateMindCache`
- `src/modules/teamai/detectAndSaveMemory.ts` — detecta "grava na memória que..." no chat regular, salva via /api/memory e invalida cache do mind
- `src/modules/teamai/useProjectFolderSync.ts` — sync bidirecional Supabase→Zustand; remove pastas vazias sem backing
- `src/modules/teamai/MemoriesPanel.tsx` — painel no drawer mostrando user_memories com delete
- `src/modules/teamai/DebateSessionsSection.tsx` — sessões de debate por projeto no drawer
- `src/data.ts` — SystemPurposeId estendido para string; SystemPurposes = Record<string,SystemPurposeData>
- `app/api/minds/` — GET lista + GET :id (auth bypass em dev mode)
- `app/api/debate/route.ts` — streaming Python; salva sessão no Supabase; roda SilentCheckpoint pós-debate
- `app/api/memory/` — GET/POST/DELETE user_memories (SUPABASE_ENABLED bypass)
- `app/api/projects/` — GET/POST user_projects com claude_md (SUPABASE_ENABLED bypass)
- `app/api/debates/` — lista sessões por projeto
- `src/modules/aifn/autotitle/autoTitle.ts` — auto-title sempre funciona: fallback da 1ª mensagem + refino AI se fastUtil disponível
- `supabase/migrations/` — 7 migrations (debate_sessions, user_api_keys, user_memories, user_clone, user_preferences, user_projects)
- `squads-base/mmos-squad/debate_engine/` — Python debate engine + KB compression + session caching
- `squads-base/mmos-squad/scripts/` — memory_store, silent_checkpoint, cross_project_context

### Memory Layer (Story 4.3 — injeção no middleware AIX)
Arquitetura refatorada: memórias injetadas em `_handleExecute.ts` antes de CADA chamada AIX (não mais one-shot no PersonaSelector).

Fluxo correto:
1. Mind selecionado → `warmMindCache(mindId, basePrompt, folderTitle)` pré-aquece cache (base + memórias + debates)
2. Cada mensagem enviada → `_handleExecute` chama `ensureFreshMindSystemMessage(mindId, folderTitle)`
   - Cache fresh (<2min, mesma pasta): retorna combinado instantaneamente
   - Cache stale: re-busca memory block (mantém base prompt em cache)
3. `SystemPurposes[mindId].systemMessage = combinado` → `inlineUpdatePurposeInHistory` usa prompt fresco
4. "grava na memória que X" → `detectAndSaveMemory` salva + `invalidateMindCache` → próxima mensagem inclui memória nova
5. Page reload: cache limpo, primeira mensagem re-busca tudo automaticamente

### Dev Mode
- Middleware, /api/minds, /api/debate, /api/memory, /api/projects: bypass auth quando NEXT_PUBLIC_SUPABASE_URL não configurado
- TEAMAI_REPO_PATH=path/to/teamAI controla leitura de minds
- Dev server: npm run dev (porta 3001 em produção local — 3000 pode estar em uso por outro projeto)

### Pendências PRD
- Deploy Docker (PRD Sec 14: "sem Vercel") — Vercel é temporário
- API keys → Supabase (big-AGI ainda usa localStorage)
- Painel DNA Mental / clone do usuário
- Claude Code MCP integration (teamAI receber contexto do CLI)
<!-- AIOS-MANAGED-END: teamai-implementation-status -->
