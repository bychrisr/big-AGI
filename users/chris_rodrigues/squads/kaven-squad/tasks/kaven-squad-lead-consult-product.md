---
task: consultProduct()
responsavel: "@kaven-squad-lead"
responsavel_type: agent
atomic_layer: task
Entrada:
  - question: string # A product question or decision to consult on
  - minds: list # Product minds to consult (default: all 3)
  - mode: string # "single" | "duo" | "roundtable" (default: "roundtable")
  - context: string # Optional: current feature/story context
  - framework: string # Optional: debate framework (default: "steel_man")
  - scope: string # Optional: "discovery" | "story" | "strategy" | "validation"
Saida:
  - product_recommendation: string # Consolidated recommendation
  - mind_perspectives: list # Individual perspectives from each mind
  - action_items: list # Concrete implementation steps for Steave
  - dissenting_views: list # Any disagreements noted
Checklist:
  - "[ ] Identify the product question clearly"
  - "[ ] Select appropriate scope (discovery/story/strategy/validation)"
  - "[ ] Load relevant product mind system prompts"
  - "[ ] Present current feature/story context to minds"
  - "[ ] Capture each mind's perspective individually"
  - "[ ] Synthesize recommendations into actionable steps"
  - "[ ] Note any dissenting views or trade-offs"
  - "[ ] Return to Steave persona with clear next steps"
---

# consultProduct()

Consult the MMOS Product Council — 3 product minds from the mmos-squad — for expert product decisions. This is a **cross-squad consultation**: Steave (kaven-squad-lead) channels product expertise from Marty Cagan, Jeff Patton, and Cagan-Patton before making discovery, story mapping, and product strategy decisions.

## Usage

```
@kaven-squad-lead *consult-product "Should we prioritize usage analytics or billing automation in the next sprint?"
@kaven-squad-lead *consult-product --minds marty_cagan,cagan_patton --scope discovery "What discovery activities validate multi-tenant theming demand?"
@kaven-squad-lead *consult-product --mode duo --minds jeff_patton,cagan_patton --scope story "How should we structure the user journey for tenant onboarding?"
@kaven-squad-lead *consult-product --mode single --minds marty_cagan --scope validation "What evidence would validate the marketplace hypothesis?"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | yes | The product question or decision to consult on |
| `minds` | list | no | Which minds to consult. Default: all 3 product minds |
| `mode` | string | no | `single` (1 mind), `duo` (2 minds discuss), `roundtable` (3 minds debate). Default: `roundtable` |
| `context` | string | no | Current feature/story/sprint context for product decision |
| `framework` | string | no | Debate framework for duo/roundtable: `steel_man` (default), `socratic`, `hegelian` |
| `scope` | string | no | Product domain: `discovery`, `story`, `strategy`, `validation` (auto-selects minds if not specified) |

## Available Product Minds

| Mind | Domain | Best For |
|------|--------|----------|
| **marty_cagan** | Discovery, Product-Market Fit | Discovery activities, evidence-based decisions, product risk assessment, continuous discovery |
| **jeff_patton** | Story Mapping, User Journeys | Story mapping workshops, user journey design, outcome thinking, release planning |
| **cagan_patton** | Hybrid Product Strategist | Discovery + story mapping integration, product strategy, holistic product thinking |

## Mind System Prompt Locations

```
squads/mmos-squad/minds/marty_cagan/system_prompts/system-prompt-discovery-coach.md
squads/mmos-squad/minds/jeff_patton/system_prompts/system-prompt-generalista-v1.0.md
squads/mmos-squad/minds/cagan_patton/system_prompts/system-prompt-product-strategist.md
```

## Scope Selection Map

Use `--scope` to auto-select the most relevant minds for specific product domains:

| Scope | Primary Minds | Optional Minds | Use Case |
|-------|---------------|----------------|----------|
| **discovery** | marty_cagan, cagan_patton | jeff_patton | Discovery activities, validation experiments, risk assessment |
| **story** | jeff_patton, cagan_patton | marty_cagan | Story mapping, user journey design, release planning |
| **strategy** | marty_cagan, jeff_patton, cagan_patton | — | Product roadmap, vision alignment, strategic decisions |
| **validation** | cagan_patton, marty_cagan | jeff_patton | Hypothesis validation, evidence review, outcome measurement |

> **Note**: If `--scope` is specified, minds are auto-selected unless explicitly overridden via `--minds`.

## Output Format

> **Nota**: Use o template correspondente ao modo de consulta. Inclua APENAS as seções dos minds efetivamente consultados.

### Template — Single Mode

```markdown
## Product Council Consultation

**Question**: {question}
**Mode**: single | **Mind**: {mind_name}
**Scope**: {scope} *(if specified)*

---

### {Mind Name} ({Domain})
{Perspective using mind's specific frameworks}

---

### Recommendation

**Recommended approach:**
{Direct recommendation from the single mind's perspective}

### Action Items for Steave
- [ ] {step 1}
- [ ] {step 2}

### Consultation Log
| Field | Value |
|-------|-------|
| Timestamp | {ISO timestamp} |
| Mode | single |
| Scope | {scope or "general"} |
| Minds | {mind_name} |
| Question | {question} |
| Key Recommendation | {1-line summary} |
```

### Template — Duo Mode

```markdown
## Product Council Consultation

**Question**: {question}
**Mode**: duo | **Framework**: {framework}
**Scope**: {scope} *(if specified)*
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

### Action Items for Steave
- [ ] {step 1}
- [ ] {step 2}

### Consultation Log
| Field | Value |
|-------|-------|
| Timestamp | {ISO timestamp} |
| Mode | duo |
| Framework | {framework} |
| Scope | {scope or "general"} |
| Minds | {mind_A}, {mind_B} |
| Question | {question} |
| Key Recommendation | {1-line summary} |
| Trade-offs Accepted | {trade-off notes} |
```

### Template — Roundtable Mode

```markdown
## Product Council Consultation

**Question**: {question}
**Mode**: roundtable | **Framework**: {framework}
**Scope**: {scope} *(if specified)*
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

### Action Items for Steave
- [ ] {step 1}
- [ ] {step 2}
- [ ] {step 3}

### Consultation Log
| Field | Value |
|-------|-------|
| Timestamp | {ISO timestamp} |
| Mode | roundtable |
| Framework | {framework} |
| Scope | {scope or "general"} |
| Minds | {mind_list} |
| Question | {question} |
| Key Recommendation | {1-line summary} |
| Trade-offs Accepted | {trade-off notes} |
```

## Implementation Steps

### Step 1: Parse the Consultation Request

Extract the question, mode, minds list, scope, and optional context from the command invocation. If `--scope` is specified, auto-select minds based on the Scope Selection Map unless explicitly overridden. Default to all 3 minds in roundtable mode with steel_man framework if not specified.

### Step 2: Load Product Mind System Prompts

Read the system prompt files for each requested mind from `squads/mmos-squad/minds/{mind_name}/system_prompts/`. These contain the complete cognitive architecture, frameworks, communication style, and domain expertise for each mind.

**Token budget consideration**: Each mind's system prompt is ~10,000-30,000 tokens. Loading all 3 costs ~45,000-60,000 tokens. For quick consultations, prefer `single` or `duo` mode. Use `--scope` to auto-filter minds to the most relevant subset.

### Step 3: Establish Consultation Context

Present the product question along with any relevant context:
- Current feature or story being discussed
- Sprint goals and prioritization constraints
- Kaven framework capabilities and limits
- Business constraints (launch timeline, pricing tier, target customer)
- The specific product decision that needs to be made

### Step 4: Channel Each Mind's Perspective

For each product mind, temporarily adopt their cognitive framework and generate a response:

**Marty Cagan**: Apply Continuous Discovery principles. Ask "What evidence validates this?" Assess product risk (value, usability, feasibility, viability). Consider discovery activities to reduce risk. Focus on empowered teams, outcomes over outputs.

**Jeff Patton**: Apply Story Mapping thinking. Consider user journeys end-to-end. Break down by activities, tasks, and stories. Focus on outcome vs output. Think in release slices ("walking skeleton" → incremental value). Ask "What's the smallest useful release?"

**Cagan-Patton**: Integrate discovery + story mapping. Apply dual lens: "What evidence supports this user journey?" Combine continuous discovery with story-driven planning. Balance strategic vision with tactical execution. Synthesize Cagan's risk assessment with Patton's outcome thinking.

### Step 5: Execute Consultation by Mode

**Single mode**: Load one mind, present the question, capture their perspective using their specific frameworks and vocabulary.

**Duo mode**: Load two minds. Have them discuss the question for 3 exchanges:
1. Mind A presents their perspective
2. Mind B responds, building on or challenging Mind A
3. Mind A synthesizes, acknowledging Mind B's points

**Roundtable mode**: Load 3 minds. Structured debate:
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
4. Translate into concrete implementation steps for Steave

### Step 8: Generate Action Items

Convert the product recommendation into actionable squad leadership tasks that Steave can execute:
- Sprint planning adjustments
- Discovery activities to schedule
- Story mapping workshops to facilitate
- Evidence collection priorities
- Stakeholder alignment actions
- Backlog refinement focus areas

### Step 9: Return to Steave Context

After the consultation, explicitly return to Steave's squad leader persona. The product council output becomes input for Steave's sprint planning and prioritization decisions. Steave should acknowledge the council's recommendation and proceed with the chosen approach.

### Step 10: Log the Consultation

Inclua a seção **Consultation Log** no final do output (conforme template do modo utilizado). A tabela padronizada deve conter:

| Campo | Descrição |
|-------|-----------|
| Timestamp | Data/hora ISO da consulta |
| Mode | single, duo, ou roundtable |
| Framework | steel_man, socratic, ou hegelian (duo/roundtable only) |
| Scope | discovery, story, strategy, validation, ou "general" |
| Minds | Lista dos minds consultados |
| Question | A pergunta original |
| Key Recommendation | Resumo de 1 linha da recomendação principal |
| Trade-offs Accepted | Notas sobre trade-offs aceitos (se houver) |

> Esta seção é **obrigatória** para rastreabilidade cross-squad.

## When to Use This Command

| Scenario | Recommended Mode | Minds | Scope |
|----------|-----------------|-------|-------|
| Discovery question | duo | marty_cagan + cagan_patton | discovery |
| Story mapping workshop | single | jeff_patton | story |
| Product strategy decision | roundtable | all 3 | strategy |
| Validation approach | duo | cagan_patton + marty_cagan | validation |
| Sprint prioritization | duo | cagan_patton + jeff_patton | strategy |
| User journey design | single | jeff_patton | story |
| Risk assessment | single | marty_cagan | discovery |
| Release planning | duo | jeff_patton + cagan_patton | story |
| Outcome definition | duo | jeff_patton + marty_cagan | strategy |
| Evidence review | duo | marty_cagan + cagan_patton | validation |

## Cross-Squad Protocol

This task implements the **Product Council consultation** pattern in the AIOS ecosystem. Key principles:

1. **Read-only access**: kaven-squad reads mmos-squad mind data but never modifies it
2. **Persona channeling, not full activation**: Steave channels product mind perspectives but does not fully switch persona. The squad-lead context is maintained throughout.
3. **Budget-aware**: Mind system prompts are loaded on-demand and only for the duration of the consultation
4. **Traceable**: Consultations are documented in the output format for audit trail
5. **Composable**: This pattern can be reused for other cross-squad consultations (e.g., kaven-architect consulting strategy minds)
6. **Scope-aware**: Auto-select minds based on product domain to optimize token budget and relevance
