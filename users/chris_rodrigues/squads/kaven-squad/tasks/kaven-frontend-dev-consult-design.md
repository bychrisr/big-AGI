---
task: consultDesign()
responsavel: "@kaven-frontend-dev"
responsavel_type: agent
atomic_layer: task
Entrada:
  - question: string # A design question or decision to consult on
  - minds: list # Design minds to consult (default: all 4)
  - mode: string # "single" | "duo" | "roundtable" (default: "roundtable")
  - context: string # Optional: current component/page context
  - framework: string # Optional: debate framework (default: "steel_man")
Saida:
  - design_recommendation: string # Consolidated recommendation
  - mind_perspectives: list # Individual perspectives from each mind
  - action_items: list # Concrete implementation steps for Pixel
  - dissenting_views: list # Any disagreements noted
Checklist:
  - [ ] Identify the design question clearly
  - [ ] Load relevant design mind system prompts
  - [ ] Present current code/component context to minds
  - [ ] Capture each mind's perspective individually
  - [ ] Synthesize recommendations into actionable steps
  - [ ] Note any dissenting views or trade-offs
  - [ ] Return to Pixel persona with clear next steps
---

# consultDesign()

Consult the MMOS Design Council — 4 design minds from the mmos-squad — for expert design decisions. This is a **cross-squad consultation**: Pixel (kaven-frontend-dev) channels design expertise from Brad Frost, Don Norman, Julie Zhuo, and Michael Bierut before making UI/UX decisions.

## Usage

```
@kaven-frontend-dev *consult-design "Should we use a sidebar or top-nav layout for the Tenant App dashboard?"
@kaven-frontend-dev *consult-design --minds brad_frost,don_norman "How should we structure the component hierarchy for the billing page?"
@kaven-frontend-dev *consult-design --mode duo --minds brad_frost,don_norman "Atomic design tokens vs CSS variables for theming?"
@kaven-frontend-dev *consult-design --mode single --minds michael_bierut "What brand identity system works for white-label SaaS?"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | yes | The design question or decision to consult on |
| `minds` | list | no | Which minds to consult. Default: all 4 design minds |
| `mode` | string | no | `single` (1 mind), `duo` (2 minds discuss), `roundtable` (3-4 minds debate). Default: `roundtable` |
| `context` | string | no | Current component/page code or screenshot for context |
| `framework` | string | no | Debate framework for duo/roundtable: `steel_man` (default), `socratic`, `hegelian` |

## Available Design Minds

| Mind | Domain | Best For |
|------|--------|----------|
| **brad_frost** | Design Systems, Atomic Design | Component architecture, design tokens, scalability, @kaven/ui structure |
| **don_norman** | UX, Cognitive Psychology | Usability evaluation, affordances, mental models, accessibility |
| **julie_zhuo** | Product Design Leadership | Design process, team dynamics, design principles, prioritization |
| **michael_bierut** | Brand & Visual Identity | Brand narrative, typography, visual systems, white-label theming |

## Mind System Prompt Locations

```
squads/mmos-squad/minds/brad_frost/system_prompts/system-prompt-design-systems-v2.0.md
squads/mmos-squad/minds/don_norman/system_prompts/system-prompt-ux-expert-v1.0.md
squads/mmos-squad/minds/julie_zhuo/system_prompts/system-prompt-design-leader-v1.0.md
squads/mmos-squad/minds/michael_bierut/system_prompts/system-prompt-brand-strategist-v1.0.md
```

## Output Format

> **Nota**: Use o template correspondente ao modo de consulta. Inclua APENAS as seções dos minds efetivamente consultados.

### Template — Single Mode

```markdown
## Design Council Consultation

**Question**: {question}
**Mode**: single | **Mind**: {mind_name}

---

### {Mind Name} ({Domain})
{Perspective using mind's specific frameworks}

---

### Recommendation

**Recommended approach:**
{Direct recommendation from the single mind's perspective}

### Action Items for Pixel
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
## Design Council Consultation

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

### Action Items for Pixel
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
## Design Council Consultation

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

#### {Mind 4} ({Domain}) *(if applicable)*
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

### Action Items for Pixel
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

Extract the question, mode, minds list, and optional context from the command invocation. Default to all 4 minds in roundtable mode with steel_man framework if not specified.

### Step 2: Load Design Mind System Prompts

Read the system prompt files for each requested mind from `squads/mmos-squad/minds/{mind_name}/system_prompts/`. These contain the complete cognitive architecture, frameworks, communication style, and domain expertise for each mind.

**Token budget consideration**: Each mind's system prompt is ~3,000-8,000 tokens. Loading all 4 costs ~15,000-25,000 tokens. For quick consultations, prefer `single` or `duo` mode.

### Step 3: Establish Consultation Context

Present the design question along with any relevant context:
- Current component code or page layout being discussed
- The Kaven design system constraints (@kaven/ui, glassmorphism, TailwindCSS 4)
- Technical constraints (Server Components, multi-tenant theming, responsive requirements)
- The specific decision that needs to be made

### Step 4: Channel Each Mind's Perspective

For each design mind, temporarily adopt their cognitive framework and generate a response:

**Brad Frost**: Apply Atomic Design thinking. Consider component hierarchy, naming conventions, scale testing ("How does this work with 1 tenant? 10? 1000?"), design system governance implications.

**Don Norman**: Apply the Seven Fundamental Principles. Evaluate affordances and signifiers. Check for Gulf of Execution / Gulf of Evaluation. Assess the three emotional levels (visceral, behavioral, reflective).

**Julie Zhuo**: Apply Purpose-People-Process. Run the Controversial Principles Test on design decisions. Consider team scaling implications. Focus on "why does this feature exist?"

**Michael Bierut**: Apply Design as Storytelling. Consider brand identity consistency across tenants. Evaluate typography choices. Think in systems, not individual marks. Consider the Empty Vessel principle for white-label scenarios.

### Step 5: Execute Consultation by Mode

**Single mode**: Load one mind, present the question, capture their perspective using their specific frameworks and vocabulary.

**Duo mode**: Load two minds. Have them discuss the question for 3 exchanges:
1. Mind A presents their perspective
2. Mind B responds, building on or challenging Mind A
3. Mind A synthesizes, acknowledging Mind B's points

**Roundtable mode**: Load 3-4 minds. Structured debate:
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
1. Identify consensus points (where 3+ minds agree)
2. Note dissenting views with reasoning (not dismissing minority positions)
3. Formulate a consolidated recommendation that respects the strongest arguments
4. Translate into concrete implementation steps for Pixel

### Step 8: Generate Action Items

Convert the design recommendation into actionable development tasks that Pixel can execute:
- Component structure changes
- Design token updates
- Accessibility improvements
- Brand consistency checks
- Code patterns to follow

### Step 9: Return to Pixel Context

After the consultation, explicitly return to Pixel's frontend developer persona. The design council output becomes input for Pixel's implementation decisions. Pixel should acknowledge the council's recommendation and proceed with the chosen approach.

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
| Component architecture decision | duo | brad_frost + don_norman |
| New page layout design | roundtable | all 4 |
| Design system token naming | single | brad_frost |
| UX flow evaluation | single | don_norman |
| Brand/theming decision | duo | michael_bierut + brad_frost |
| Design principles definition | duo | julie_zhuo + don_norman |
| Multi-tenant UI strategy | roundtable | all 4 |
| Accessibility audit | duo | don_norman + brad_frost |

## Cross-Squad Protocol

This task implements the first **cross-squad consultation** pattern in the AIOS ecosystem. Key principles:

1. **Read-only access**: kaven-squad reads mmos-squad mind data but never modifies it
2. **Persona channeling, not full activation**: Pixel channels design mind perspectives but does not fully switch persona. The frontend-dev context is maintained throughout.
3. **Budget-aware**: Mind system prompts are loaded on-demand and only for the duration of the consultation
4. **Traceable**: Consultations are documented in the output format for audit trail
5. **Composable**: This pattern can be reused for other cross-squad consultations (e.g., kaven-architect consulting strategy minds)
