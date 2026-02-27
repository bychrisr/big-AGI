---
task: consultGrowth()
responsavel: "@kaven-squad-lead"
responsavel_type: agent
atomic_layer: task
Entrada:
  - question: string # A growth question or decision to consult on
  - minds: list # Growth minds to consult (default: all 4)
  - mode: string # "single" | "duo" | "roundtable" (default: "roundtable")
  - context: string # Optional: current feature/story context
  - framework: string # Optional: debate framework (default: "steel_man")
  - scope: string # Optional: "pricing" | "positioning" | "copy" | "gtm"
Saida:
  - growth_recommendation: string # Consolidated recommendation
  - mind_perspectives: list # Individual perspectives from each mind
  - action_items: list # Concrete implementation steps for Steave
  - dissenting_views: list # Any disagreements noted
Checklist:
  - "[ ] Identify the growth question clearly"
  - "[ ] Select appropriate scope (pricing/positioning/copy/gtm)"
  - "[ ] Load relevant growth mind system prompts"
  - "[ ] Present current feature/story context to minds"
  - "[ ] Capture each mind's perspective individually"
  - "[ ] Synthesize recommendations into actionable steps"
  - "[ ] Note any dissenting views or trade-offs"
  - "[ ] Return to Steave persona with clear next steps"
---

# consultGrowth()

Consult the MMOS Growth Council — 4 growth minds from the mmos-squad — for expert growth and marketing decisions. This is a **cross-squad consultation**: Steave (kaven-squad-lead) channels growth expertise from Seth Godin, Alex Hormozi, Eugene Schwartz, and Paul Graham before making pricing, positioning, copywriting, and go-to-market strategy decisions.

## Usage

```
@kaven-squad-lead *consult-growth "Should we price Kaven at $149 or $399 for the Starter tier?"
@kaven-squad-lead *consult-growth --minds seth_godin,alex_hormozi --scope positioning "How do we position Kaven against no-code tools?"
@kaven-squad-lead *consult-growth --mode duo --minds eugene_schwartz,seth_godin --scope copy "What's the hook for our landing page?"
@kaven-squad-lead *consult-growth --mode single --minds paul_graham --scope gtm "Should we focus on developers or indie hackers first?"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | yes | The growth question or decision to consult on |
| `minds` | list | no | Which minds to consult. Default: all 4 growth minds |
| `mode` | string | no | `single` (1 mind), `duo` (2 minds discuss), `roundtable` (3-4 minds debate). Default: `roundtable` |
| `context` | string | no | Current feature/story/sprint context for growth decision |
| `framework` | string | no | Debate framework for duo/roundtable: `steel_man` (default), `socratic`, `hegelian` |
| `scope` | string | no | Growth domain: `pricing`, `positioning`, `copy`, `gtm` (auto-selects minds if not specified) |

## Available Growth Minds

| Mind | Domain | Best For |
|------|--------|----------|
| **seth_godin** | Positioning, Smallest Viable Audience | Market positioning, differentiation strategy, "remarkable" messaging, purple cow thinking, permission marketing |
| **alex_hormozi** | Offers, Value Propositions | Pricing strategy, irresistible offers, value equation optimization, premium positioning, ROI frameworks |
| **eugene_schwartz** | Copywriting, Market Sophistication | Headlines, sales copy, awareness stages, market sophistication levels, desire channeling |
| **paul_graham** | Startup Strategy, First Principles | Go-to-market strategy, founder insights, product-market fit, startup wisdom, contrarian thinking |
| **leandro_aguiari** | Storytelling, Personal Branding (🆕) | Narrative positioning, brand differentiation, launch strategy, "impossible to ignore" messaging, emerging market expertise (Brazil), personal brand as business model |

## Mind System Prompt Locations

```
squads/mmos-squad/minds/seth_godin/system_prompts/SYSTEM_PROMPT_SETH_GODIN_POSICIONAMENTO.md
squads/mmos-squad/minds/alex_hormozi/system_prompts/COGNITIVE_OS.md
squads/mmos-squad/minds/eugene_schwartz/system_prompts/eugene-schwartz-v2.md
squads/mmos-squad/minds/paul_graham/system_prompts/paul_graham_ultimate_system_prompt.md
squads/mmos-squad/minds/leandro_aguiari/system_prompts/SYSTEM_PROMPT_LEANDRO_AGUIARI_V1_GENERALISTA.md
```

> **NEW (Feb 17, 2026)**: Leandro Aguiari added to Growth Council. Lightweight prompt (~4.2KB) — all 3 variants (Generalista, Positioning Specialist, Educator Specialist) available.

## CRITICAL WARNING: Alex Hormozi Token Budget

> **⚠️ IMPORTANT:** Alex Hormozi's `COGNITIVE_OS.md` is exceptionally large (~60,000 tokens — detailed CAC-H canvas, psycho-biography, anti-patterns, case library).
>
> **Recommendation:** Use `single` or `duo` mode when consulting Hormozi to avoid context overflow in Sonnet. If using `roundtable` with 4 minds including Hormozi, be aware of token limits.
>
> **Models without issues:** Opus, Haiku 4.5, or any high-context model can handle roundtable with Hormozi comfortably.

## Scope Selection Map

Use `--scope` to auto-select the most relevant minds for specific growth domains:

| Scope | Primary Minds | Optional Minds | Use Case |
|-------|---------------|----------------|----------|
| **pricing** | alex_hormozi, seth_godin | paul_graham, leandro_aguiari | Pricing strategy, tier structure, value equation optimization, premium vs discount positioning, narrative framing |
| **positioning** | seth_godin, leandro_aguiari | eugene_schwartz, alex_hormozi | Market positioning, differentiation, "remarkable" angle, narrative-driven positioning, "impossible to ignore" messaging, smallest viable audience definition |
| **copy** | eugene_schwartz, leandro_aguiari | alex_hormozi, seth_godin | Landing page headlines, sales copy, email sequences, value communication, storytelling narratives, brand messaging |
| **gtm** | seth_godin, leandro_aguiari, alex_hormozi | eugene_schwartz, paul_graham | Go-to-market strategy, channel selection, launch positioning, market entry, narrative strategy, emerging market expertise (Brazil) |

> **Note**: If `--scope` is specified, minds are auto-selected unless explicitly overridden via `--minds`.

## Output Format

> **Nota**: Use o template correspondente ao modo de consulta. Inclua APENAS as seções dos minds efetivamente consultados.

### Template — Single Mode

```markdown
## Growth Council Consultation

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
## Growth Council Consultation

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
## Growth Council Consultation

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

#### {Mind 4} ({Domain}) *(if 4 minds)*
{Perspective using this mind's specific frameworks}

---

### Cross-Pollination Round
- **{Mind 1}** responds to **{Mind 2}**: {response}
- **{Mind 2}** responds to **{Mind 3}**: {response}
- **{Mind 3}** responds to **{Mind 4}**: {response}
- **{Mind 4}** responds to **{Mind 1}**: {response}

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

Extract the question, mode, minds list, scope, and optional context from the command invocation. If `--scope` is specified, auto-select minds based on the Scope Selection Map unless explicitly overridden. Default to all 4 minds in roundtable mode with steel_man framework if not specified.

### Step 2: Load Growth Mind System Prompts

Read the system prompt files for each requested mind from `squads/mmos-squad/minds/{mind_name}/system_prompts/`. These contain the complete cognitive architecture, frameworks, communication style, and domain expertise for each mind.

**Token budget consideration**: Mind system prompts range from 10,000-60,000 tokens (Alex Hormozi's COGNITIVE_OS.md is ~60K). Loading all 4 costs ~90,000-120,000 tokens. For quick consultations, prefer `single` or `duo` mode. Use `--scope` to auto-filter minds to the most relevant subset.

### Step 3: Establish Consultation Context

Present the growth question along with any relevant context:
- Current feature or story being discussed
- Pricing strategy and tier structure
- Target customer profile (solo devs, small teams, agencies)
- Competitive landscape
- Launch timeline and business constraints
- The specific growth decision that needs to be made

### Step 4: Channel Each Mind's Perspective

For each growth mind, temporarily adopt their cognitive framework and generate a response:

**Seth Godin**: Apply Purple Cow thinking. Ask "Is this remarkable?" Consider Smallest Viable Audience — who specifically? Permission Marketing principles. "People like us do things like this" identity framework. Focus on positioning, differentiation, and being worth talking about. Always prefer niche dominance over mass appeal.

**Alex Hormozi**: Apply Value Equation (Dream Outcome / (Time Delay × Effort & Sacrifice)) × Perceived Likelihood. Assess pricing through Grand Slam Offer lens. Maximize value/price discrepancy. Focus on premium positioning, ROI clarity, and irresistible offer structure. Use "starving crowd" analysis. Validate through unit economics and LTV/CAC.

**Eugene Schwartz**: Apply Five Stages of Awareness (unaware → problem-aware → solution-aware → product-aware → most-aware). Assess Market Sophistication Level (1-5). Focus on headline/hook power. Channel existing desire, don't create it. Assembly method: research 80%, write 20%. Intensity dimensions to amplify value perception.

**Paul Graham**: Apply first-principles thinking. Consider "What would someone building this in 2026 do differently?" Focus on founder-market fit and product-market fit. Startup wisdom: do things that don't scale, make something people want, talk to users. Contrarian insights about growth. Historical patterns predicting future surprises.

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
1. Identify consensus points (where 2+ minds agree)
2. Note dissenting views with reasoning (not dismissing minority positions)
3. Formulate a consolidated recommendation that respects the strongest arguments
4. Translate into concrete implementation steps for Steave

### Step 8: Generate Action Items

Convert the growth recommendation into actionable squad leadership tasks that Steave can execute:
- Pricing adjustments or tier restructuring
- Positioning refinements for marketing materials
- Copywriting priorities for landing page, emails, docs
- Go-to-market channel selection and launch strategy
- Competitive differentiation focus areas
- Target customer profile refinements

### Step 9: Return to Steave Context

After the consultation, explicitly return to Steave's squad leader persona. The growth council output becomes input for Steave's strategic planning and prioritization decisions. Steave should acknowledge the council's recommendation and proceed with the chosen approach.

### Step 10: Log the Consultation

Inclua a seção **Consultation Log** no final do output (conforme template do modo utilizado). A tabela padronizada deve conter:

| Campo | Descrição |
|-------|-----------|
| Timestamp | Data/hora ISO da consulta |
| Mode | single, duo, ou roundtable |
| Framework | steel_man, socratic, ou hegelian (duo/roundtable only) |
| Scope | pricing, positioning, copy, gtm, ou "general" |
| Minds | Lista dos minds consultados |
| Question | A pergunta original |
| Key Recommendation | Resumo de 1 linha da recomendação principal |
| Trade-offs Accepted | Notas sobre trade-offs aceitos (se houver) |

> Esta seção é **obrigatória** para rastreabilidade cross-squad.

## When to Use This Command

| Scenario | Recommended Mode | Minds | Scope |
|----------|-----------------|-------|-------|
| Pricing decision | duo | alex_hormozi + seth_godin | pricing |
| Positioning statement | duo | seth_godin + eugene_schwartz | positioning |
| Landing page headline | single | eugene_schwartz | copy |
| Go-to-market strategy | roundtable | all 4 (or 3: godin, hormozi, schwartz) | gtm |
| Launch positioning | duo | seth_godin + alex_hormozi | positioning |
| Email copy | duo | eugene_schwartz + alex_hormozi | copy |
| Target customer definition | single | seth_godin | positioning |
| Offer structure | single | alex_hormozi | pricing |
| Startup strategy question | single | paul_graham | gtm |
| Competitive differentiation | duo | seth_godin + eugene_schwartz | positioning |

## Cross-Squad Protocol

This task implements the **Growth Council consultation** pattern in the AIOS ecosystem. Key principles:

1. **Read-only access**: kaven-squad reads mmos-squad mind data but never modifies it
2. **Persona channeling, not full activation**: Steave channels growth mind perspectives but does not fully switch persona. The squad-lead context is maintained throughout.
3. **Budget-aware**: Mind system prompts are loaded on-demand and only for the duration of the consultation. Be especially mindful of Alex Hormozi's large prompt (~60K tokens).
4. **Traceable**: Consultations are documented in the output format for audit trail
5. **Composable**: This pattern can be reused for other cross-squad consultations (e.g., kaven-architect consulting strategy minds)
6. **Scope-aware**: Auto-select minds based on growth domain to optimize token budget and relevance
