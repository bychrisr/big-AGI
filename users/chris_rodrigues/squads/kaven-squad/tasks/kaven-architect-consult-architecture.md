---
task: consultArchitecture()
responsavel: "@kaven-architect"
responsavel_type: agent
atomic_layer: task
Entrada:
  - question: string # An architectural question or decision to consult on
  - minds: list # Architecture minds to consult (default: all 3)
  - mode: string # "single" | "duo" | "roundtable" (default: "roundtable")
  - context: string # Optional: current code/system context
  - framework: string # Optional: debate framework (default: "steel_man")
Saida:
  - architecture_recommendation: string # Consolidated recommendation
  - mind_perspectives: list # Individual perspectives from each mind
  - action_items: list # Concrete implementation steps for Atlas
  - dissenting_views: list # Any disagreements noted
Checklist:
  - [ ] Identify the architectural question clearly
  - [ ] Load relevant architecture mind system prompts
  - [ ] Present current system/code context to minds
  - [ ] Capture each mind's perspective individually
  - [ ] Synthesize recommendations into actionable steps
  - [ ] Note any dissenting views or trade-offs
  - [ ] Return to Atlas persona with clear next steps
---

# consultArchitecture()

Consult the MMOS Architecture Council — 3 technical minds from the mmos-squad — for expert architectural decisions. This is a **cross-squad consultation**: Atlas (kaven-architect) channels technical expertise from Mitchell Hashimoto, Kent Beck, and Guillermo Rauch before making system design decisions.

## Usage

```
@kaven-architect *consult-architecture "Should we use microservices or monolith for multi-tenant SaaS?"
@kaven-architect *consult-architecture --minds hashimoto,beck "How should we design the database schema for tenant isolation?"
@kaven-architect *consult-architecture --mode duo --minds beck,rauch "TDD strategy for Fastify API routes with Prisma?"
@kaven-architect *consult-architecture --mode single --minds rauch "What's the optimal Next.js App Router architecture for tenant apps?"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | yes | The architectural question or decision to consult on |
| `minds` | list | no | Which minds to consult. Default: all 3 architecture minds |
| `mode` | string | no | `single` (1 mind), `duo` (2 minds discuss), `roundtable` (all 3 minds debate). Default: `roundtable` |
| `context` | string | no | Current code/system architecture for context |
| `framework` | string | no | Debate framework for duo/roundtable: `steel_man` (default), `socratic`, `hegelian` |

## Available Architecture Minds

| Mind | Domain | Best For |
|------|--------|----------|
| **mitchell_hashimoto** | Infrastructure, Systems | Workflow-centric architecture, infrastructure decisions, scaling systems, deployment strategies |
| **kent_beck** | Testing, Evolutionary Design | TDD strategy, test architecture, evolutionary patterns, refactoring approaches |
| **guillermo_rauch** | DX, Modern Tooling | Developer experience, modern stack choices, performance optimization, deployment workflows |

## Mind System Prompt Locations

```
squads/mmos-squad/minds/mitchell_hashimoto/system_prompts/system-prompt-infrastructure-expert-v1.0.md
squads/mmos-squad/minds/kent_beck/system_prompts/system-prompt-dev-workflow-v1.0.md
squads/mmos-squad/minds/guillermo_rauch/system_prompts/system-prompt-dx-specialist-v1.0.md
```

## Scope Selection Map

Use this guide to select optimal minds for specific architectural domains:

```yaml
infrastructure:
  primary: [hashimoto, beck]
  optional: [rauch]
  description: Infrastructure design, deployment architecture, scaling strategies
  examples:
    - CI/CD pipeline design
    - Container orchestration strategy
    - Database scaling approach
    - Infrastructure as Code patterns

testing:
  primary: [beck, rauch]
  optional: [hashimoto]
  description: Test architecture, TDD strategy, test infrastructure
  examples:
    - Test suite organization
    - Integration testing strategy
    - E2E testing approach
    - Test coverage targets

dx:
  primary: [rauch, beck]
  optional: [hashimoto]
  description: Developer experience, tooling choices, workflow optimization
  examples:
    - Framework selection (Next.js vs Remix)
    - Build tool optimization
    - Development workflow design
    - Developer onboarding experience

system:
  primary: [hashimoto, beck, rauch]
  optional: []
  description: Complete system architecture review requiring all perspectives
  examples:
    - Monolith vs microservices decision
    - Multi-tenant architecture design
    - API design and patterns
    - System-wide refactoring strategy
```

## Output Format

> **Nota**: Use o template correspondente ao modo de consulta. Inclua APENAS as seções dos minds efetivamente consultados.

### Template — Single Mode

```markdown
## Architecture Council Consultation

**Question**: {question}
**Mode**: single | **Mind**: {mind_name}

---

### {Mind Name} ({Domain})
{Perspective using mind's specific frameworks}

---

### Recommendation

**Recommended approach:**
{Direct recommendation from the single mind's perspective}

### Action Items for Atlas
- [ ] {step 1}
- [ ] {step 2}

### Consultation Log
| Field | Value |
|-------|-------|
| Timestamp | {ISO timestamp} |
| Mode | single |
| Minds | {mind_name} |
| Question | {question} |
| Key Recommendation | {1-line summary} |
```

### Template — Duo Mode

```markdown
## Architecture Council Consultation

**Question**: {question}
**Mode**: duo | **Framework**: {framework}
**Minds consulted**: {mind_A}, {mind_B}

---

### Individual Perspectives

#### {Mind A} ({Domain A})
{Perspective using Mind A's frameworks}

#### {Mind B} ({Domain B})
{Perspective using Mind B's frameworks}

---

### Exchange (3 rounds)

**Round 1** — {Mind A} opens:
{Mind A's opening argument}

**Round 2** — {Mind B} responds:
{Mind B responds, building on or challenging Mind A}

**Round 3** — {Mind A} synthesizes:
{Mind A synthesizes, acknowledging Mind B's points}

---

### Synthesis & Recommendation

**Consensus points:**
- {point 1}

**Dissenting views:**
- {mind}: {disagreement and reasoning}

**Recommended approach:**
{Consolidated recommendation}

### Action Items for Atlas
- [ ] {step 1}
- [ ] {step 2}

### Consultation Log
| Field | Value |
|-------|-------|
| Timestamp | {ISO timestamp} |
| Mode | duo |
| Framework | {framework} |
| Minds | {mind_A}, {mind_B} |
| Question | {question} |
| Key Recommendation | {1-line summary} |
| Trade-offs Accepted | {trade-off notes} |
```

### Template — Roundtable Mode

```markdown
## Architecture Council Consultation

**Question**: {question}
**Mode**: roundtable | **Framework**: {framework}
**Minds consulted**: {mind_list}

---

### Individual Perspectives

#### {Mind 1} ({Domain})
{Perspective using this mind's specific frameworks}

#### {Mind 2} ({Domain})
{Perspective using this mind's specific frameworks}

#### {Mind 3} ({Domain})
{Perspective using this mind's specific frameworks}

---

### Cross-Pollination Round
- **{Mind 1}** responds to **{Mind 2}**: {response}
- **{Mind 2}** responds to **{Mind 3}**: {response}
- **{Mind 3}** responds to **{Mind 1}**: {response}

---

### Synthesis & Recommendation

**Consensus points:**
- {point 1}
- {point 2}

**Dissenting views:**
- {mind}: {disagreement and reasoning}

**Recommended approach:**
{Consolidated recommendation with concrete implementation steps}

### Action Items for Atlas
- [ ] {step 1}
- [ ] {step 2}
- [ ] {step 3}

### Consultation Log
| Field | Value |
|-------|-------|
| Timestamp | {ISO timestamp} |
| Mode | roundtable |
| Framework | {framework} |
| Minds | {mind_list} |
| Question | {question} |
| Key Recommendation | {1-line summary} |
| Trade-offs Accepted | {trade-off notes} |
```

## Implementation Steps

### Step 1: Parse the Consultation Request

Extract the question, mode, minds list, and optional context from the command invocation. Default to all 3 minds in roundtable mode with steel_man framework if not specified.

### Step 2: Load Architecture Mind System Prompts

Read the system prompt files for each requested mind from `squads/mmos-squad/minds/{mind_name}/system_prompts/`. These contain the complete cognitive architecture, frameworks, communication style, and domain expertise for each mind.

**Token budget consideration**: Each mind's system prompt is ~8,000-15,000 tokens. Loading all 3 costs ~25,000-40,000 tokens. For quick consultations, prefer `single` or `duo` mode.

### Step 3: Establish Consultation Context

Present the architectural question along with any relevant context:
- Current system architecture or code being discussed
- The Kaven technical constraints (Fastify, Next.js App Router, Prisma, PostgreSQL)
- Multi-tenant isolation requirements (tenantId in all queries, RLS middleware)
- Performance requirements (target req/s, latency, scalability)
- The specific decision that needs to be made

### Step 4: Channel Each Mind's Perspective

For each architecture mind, temporarily adopt their cognitive framework and generate a response:

**Mitchell Hashimoto**: Apply Infrastructure-as-Workflow thinking. Consider "workflow, not product" principle. Evaluate infrastructure decisions through the lens of developer workflows and operational simplicity. Focus on composability, automation, and infrastructure patterns that enable teams. Consider scaling implications (1 server → 100 servers → 1000 servers).

**Kent Beck**: Apply TDD and evolutionary design principles. Start with the simplest thing that could possibly work. Consider test architecture implications of design decisions. Focus on making change easy (vs making code "right" upfront). Apply the rhythm: Red → Green → Refactor. Evaluate designs through the lens of "can we test this easily?" and "can we evolve this incrementally?". Consider refactoring patterns and design patterns that emerge from testing.

**Guillermo Rauch**: Apply DX-first thinking. Evaluate choices through developer experience lens: Is it fast? Is it simple? Does it reduce cognitive load? Focus on modern tooling (Next.js, Turbopack, edge computing). Consider performance as a feature. Apply "the best API is no API" principle. Evaluate deployment workflows and iteration speed. Consider the full developer journey from local dev to production.

### Step 5: Execute Consultation by Mode

**Single mode**: Load one mind, present the question, capture their perspective using their specific frameworks and vocabulary.

**Duo mode**: Load two minds. Have them discuss the question for 3 exchanges:
1. Mind A presents their perspective
2. Mind B responds, building on or challenging Mind A
3. Mind A synthesizes, acknowledging Mind B's points

**Roundtable mode**: Load all 3 minds. Structured debate:
1. Each mind presents their initial perspective (1 paragraph each)
2. Cross-pollination round: each mind responds to the most interesting point from another mind
3. Synthesis: identify consensus, dissenting views, and recommended approach

### Step 6: Debate Framework Integration (duo/roundtable only)

> **IMPORTANTE**: O debate framework NÃO é aplicado como step separado após as perspectivas. Ele é **integrado durante** os Steps 4 e 5 — cada mind já aplica o framework ao formular sua perspectiva e interações.

O framework selecionado define **como** os minds interagem durante a consulta:

**steel_man** (default): Cada mind deve articular a MELHOR versão dos argumentos opostos antes de defender os seus. Aplicado durante Step 5 — nos rounds de exchange (duo) ou cross-pollination (roundtable), cada mind primeiro reconhece os pontos fortes do outro antes de apresentar sua posição.

**socratic**: Minds fazem perguntas sondantes uns aos outros, investigando premissas. Aplicado durante Step 5 — exchanges usam formato pergunta→resposta em vez de argumento→contra-argumento.

**hegelian**: Progressão Tese → Antítese → Síntese. Aplicado durante Step 5 — Round 1 = tese (Mind A), Round 2 = antítese (Mind B), Round 3 = síntese colaborativa.

**Quando este Step se aplica**: Serve como referência para os Steps 4/5. Não há ação separada — o framework já está integrado na execução do modo.

### Step 7: Synthesize Recommendations

After all perspectives are captured:
1. Identify consensus points (where 2+ minds agree)
2. Note dissenting views with reasoning (not dismissing minority positions)
3. Formulate a consolidated recommendation that respects the strongest arguments
4. Translate into concrete implementation steps for Atlas

### Step 8: Generate Action Items

Convert the architecture recommendation into actionable development tasks that Atlas can execute:
- System design changes
- Database schema modifications
- API endpoint patterns
- Infrastructure setup steps
- Testing strategy adjustments
- Code refactoring tasks

### Step 9: Return to Atlas Context

After the consultation, explicitly return to Atlas's architect persona. The architecture council output becomes input for Atlas's implementation decisions. Atlas should acknowledge the council's recommendation and proceed with the chosen approach.

### Step 10: Log the Consultation

Inclua a seção **Consultation Log** no final do output (conforme template do modo utilizado). A tabela padronizada deve conter:

| Campo | Descrição |
|-------|-----------|
| Timestamp | Data/hora ISO da consulta |
| Mode | single, duo, ou roundtable |
| Framework | steel_man, socratic, ou hegelian (duo/roundtable only) |
| Minds | Lista dos minds consultados |
| Question | A pergunta original |
| Key Recommendation | Resumo de 1 linha da recomendação principal |
| Trade-offs Accepted | Notas sobre trade-offs aceitos (se houver) |

> Esta seção é **obrigatória** para rastreabilidade cross-squad.

## When to Use This Command

| Scenario | Recommended Mode | Minds |
|----------|-----------------|-------|
| Infrastructure decision | duo | hashimoto + beck |
| Testing architecture | duo | beck + rauch |
| DX evaluation | single | rauch |
| Complete system review | roundtable | all 3 |
| Scaling strategy | duo | hashimoto + rauch |
| Refactoring approach | duo | beck + rauch |
| CI/CD pipeline design | duo | hashimoto + rauch |
| API design patterns | duo | beck + rauch |
| Database schema design | duo | hashimoto + beck |
| Framework selection | roundtable | all 3 |

## Cross-Squad Protocol

This task implements the second **cross-squad consultation** pattern in the AIOS ecosystem (after Design Council). Key principles:

1. **Read-only access**: kaven-squad reads mmos-squad mind data but never modifies it
2. **Persona channeling, not full activation**: Atlas channels architecture mind perspectives but does not fully switch persona. The architect context is maintained throughout.
3. **Budget-aware**: Mind system prompts are loaded on-demand and only for the duration of the consultation
4. **Traceable**: Consultations are documented in the output format for audit trail
5. **Composable**: This pattern can be reused for other cross-squad consultations (e.g., kaven-pm consulting product strategy minds)
