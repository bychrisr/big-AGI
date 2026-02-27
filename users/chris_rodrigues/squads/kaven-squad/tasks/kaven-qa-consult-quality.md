---
task: consultQuality()
responsavel: "@kaven-qa"
responsavel_type: agent
atomic_layer: task
Entrada:
  - question: string # A quality/testing question or decision to consult on
  - minds: list # Quality minds to consult (default: both)
  - mode: string # "single" | "duo" (default: "duo")
  - context: string # Optional: current test/quality context
  - framework: string # Optional: debate framework (default: "steel_man")
Saida:
  - quality_recommendation: string # Consolidated recommendation
  - mind_perspectives: list # Individual perspectives from each mind
  - action_items: list # Concrete implementation steps for Shield
  - dissenting_views: list # Any disagreements noted
Checklist:
  - [ ] Identify the quality/testing question clearly
  - [ ] Load relevant quality mind system prompts
  - [ ] Present current test/quality context to minds
  - [ ] Capture each mind's perspective individually
  - [ ] Synthesize recommendations into actionable steps
  - [ ] Note any dissenting views or trade-offs
  - [ ] Return to Shield persona with clear next steps
---

# consultQuality()

Consult the MMOS Quality Council — 2 quality/risk minds from the mmos-squad — for expert quality and testing decisions. This is a **cross-squad consultation**: Shield (kaven-qa) channels quality expertise from Kent Beck and Daniel Kahneman before making test strategy, risk analysis, and quality assurance decisions.

## Usage

```
@kaven-qa *consult-quality "What TDD strategy should we use for multi-tenant API testing?"
@kaven-qa *consult-quality --minds beck,kahneman "How do we assess risk in our feature release?"
@kaven-qa *consult-quality --mode duo --minds beck,kahneman "What quality metrics should we track?"
@kaven-qa *consult-quality --mode single --minds kahneman "What cognitive biases affect our testing decisions?"
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | yes | The quality/testing question or decision to consult on |
| `minds` | list | no | Which minds to consult. Default: both quality minds |
| `mode` | string | no | `single` (1 mind), `duo` (2 minds discuss). Default: `duo` |
| `context` | string | no | Current test suite, quality metrics, or risk context |
| `framework` | string | no | Debate framework for duo mode: `steel_man` (default), `socratic`, `hegelian` |

## Available Quality Minds

| Mind | Domain | Best For |
|------|--------|----------|
| **kent_beck** | TDD, Quality Methodology | Test-driven development, quality culture, test quality assessment, coverage strategy, refactoring for testability |
| **daniel_kahneman** | Risk Analysis, Decision Psychology | Cognitive biases in testing, risk assessment, decision-making under uncertainty, thinking fast vs slow in QA |

## Kent Beck Channeling Context

Kent Beck appears in **2 councils** with different contexts:

### Architecture Council (Atlas)
- **Focus**: Testing architecture, evolutionary design patterns, developer experience
- **Questions**: "How should we architect our test infrastructure?" / "What patterns support testability?"
- **Output**: System design recommendations, architectural patterns, test infrastructure design

### Quality Council (Shield)
- **Focus**: TDD methodology, quality metrics, risk-based testing, coverage strategy
- **Questions**: "What's our TDD strategy for this feature?" / "How do we assess test quality?" / "What should we test first?"
- **Output**: Testing approach, quality gates, risk mitigation, TDD workflow recommendations

**Channeling Instructions**: When loading Kent Beck for Quality Council, emphasize TDD methodology (Red-Green-Refactor), test quality assessment (not just coverage %), risk-based testing priorities, and quality culture. Focus on "what makes a good test" rather than "how to architect test infrastructure". Avoid architecture-level system design discussions — that's Atlas's domain.

## Mind System Prompt Locations

```
squads/mmos-squad/minds/kent_beck/system_prompts/system-prompt-dev-workflow-v1.0.md
squads/mmos-squad/minds/daniel_kahneman/system_prompts/20251007_132021-v1.0-generalista.md
```

## Scope Selection Map

Use this guide to select optimal minds for specific quality domains:

```yaml
strategy:
  primary: [beck, kahneman]
  optional: []
  description: Overall quality strategy, risk management, and QA process design
  examples:
    - Quality culture establishment
    - Testing philosophy and principles
    - Risk management strategy
    - QA team workflow design

tdd:
  primary: [beck]
  optional: [kahneman]
  description: Test-driven development methodology and practices
  examples:
    - Red-Green-Refactor workflow design
    - TDD for new features
    - Test-first approach adoption
    - Refactoring strategy for testability

risk:
  primary: [kahneman, beck]
  optional: []
  description: Risk analysis, cognitive biases in testing, decision-making under uncertainty
  examples:
    - Release risk assessment
    - Testing prioritization by risk
    - Cognitive biases affecting QA decisions
    - Thinking fast vs slow in bug triage

coverage:
  primary: [beck]
  optional: [kahneman]
  description: Coverage strategy, what to test, test quality metrics beyond percentage
  examples:
    - What coverage % is meaningful?
    - Which tests add real value?
    - Quality metrics beyond coverage
    - Test suite optimization
```

## Output Format

> **Nota**: Use o template correspondente ao modo de consulta. Inclua APENAS as seções dos minds efetivamente consultados.

### Template — Single Mode

```markdown
## Quality Council Consultation

**Question**: {question}
**Mode**: single | **Mind**: {mind_name}

---

### {Mind Name} ({Domain})
{Perspective using mind's specific frameworks}

---

### Recommendation

**Recommended approach:**
{Direct recommendation from the single mind's perspective}

### Action Items for Shield
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
## Quality Council Consultation

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

### Action Items for Shield
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

## Implementation Steps

### Step 1: Parse the Consultation Request

Extract the question, mode, minds list, and optional context from the command invocation. Default to both minds in duo mode with steel_man framework if not specified.

### Step 2: Load Quality Mind System Prompts

Read the system prompt files for each requested mind from `squads/mmos-squad/minds/{mind_name}/system_prompts/`. These contain the complete cognitive architecture, frameworks, communication style, and domain expertise for each mind.

**Token budget consideration**: Each mind's system prompt is ~8,000-17,000 tokens. Loading both costs ~25,000 tokens. For quick consultations, prefer `single` mode.

### Step 3: Establish Consultation Context

Present the quality/testing question along with any relevant context:
- Current test suite architecture or test cases being discussed
- The Kaven testing constraints (Jest, Vitest, Prisma test utilities, multi-tenant test patterns)
- Quality metrics (current coverage, failure rates, test execution time)
- Risk factors (feature complexity, user impact, release timeline)
- The specific quality decision that needs to be made

### Step 4: Channel Each Mind's Perspective

For each quality mind, temporarily adopt their cognitive framework and generate a response:

**Kent Beck**: Apply TDD and quality culture principles for the Quality Council context (NOT architecture context). Focus on:
- **Red-Green-Refactor rhythm**: How should we apply the TDD cycle to this feature?
- **Test quality over coverage %**: What makes these tests valuable vs just increasing metrics?
- **Simple design**: What's the simplest test that could possibly work?
- **Refactoring for testability**: How do we make this code easier to test?
- **Quality culture**: How do we build testing habits that stick?

**CRITICAL**: When channeling Kent Beck for Quality Council, emphasize TDD methodology, test quality assessment, and "what to test" decisions. Avoid architectural system design — that's Architecture Council's domain.

**Daniel Kahneman**: Apply decision psychology and risk analysis frameworks. Focus on:
- **System 1 vs System 2 thinking**: Are we relying on intuition (fast) or analysis (slow) in our testing decisions?
- **Cognitive biases**: What biases affect our test prioritization? (confirmation bias, availability heuristic, anchoring)
- **Risk assessment**: What's the actual risk if this test fails vs the cost of writing it?
- **Loss aversion**: Are we over-testing to avoid failure or under-testing due to overconfidence?
- **Decision-making under uncertainty**: How do we choose what to test when we can't test everything?

### Step 5: Execute Consultation by Mode

**Single mode**: Load one mind, present the question, capture their perspective using their specific frameworks and vocabulary.

**Duo mode**: Load both minds. Have them discuss the question for 3 exchanges:
1. Mind A presents their perspective
2. Mind B responds, building on or challenging Mind A
3. Mind A synthesizes, acknowledging Mind B's points

### Step 6: Debate Framework Integration (duo only)

> **IMPORTANTE**: O debate framework NÃO é aplicado como step separado após as perspectivas. Ele é **integrado durante** os Steps 4 e 5 — cada mind já aplica o framework ao formular sua perspectiva e interações.

O framework selecionado define **como** os minds interagem durante a consulta:

**steel_man** (default): Cada mind deve articular a MELHOR versão dos argumentos opostos antes de defender os seus. Aplicado durante Step 5 — nos rounds de exchange, cada mind primeiro reconhece os pontos fortes do outro antes de apresentar sua posição.

**socratic**: Minds fazem perguntas sondantes uns aos outros, investigando premissas. Aplicado durante Step 5 — exchanges usam formato pergunta→resposta em vez de argumento→contra-argumento.

**hegelian**: Progressão Tese → Antítese → Síntese. Aplicado durante Step 5 — Round 1 = tese (Mind A), Round 2 = antítese (Mind B), Round 3 = síntese colaborativa.

**Quando este Step se aplica**: Serve como referência para os Steps 4/5. Não há ação separada — o framework já está integrado na execução do modo.

### Step 7: Synthesize Recommendations

After all perspectives are captured:
1. Identify consensus points (where both minds agree)
2. Note dissenting views with reasoning (not dismissing minority positions)
3. Formulate a consolidated recommendation that respects the strongest arguments
4. Translate into concrete implementation steps for Shield

### Step 8: Generate Action Items

Convert the quality recommendation into actionable QA tasks that Shield can execute:
- Test strategy adjustments (TDD adoption, risk-based prioritization)
- Quality metrics to track (beyond coverage %)
- Test suite improvements (add integration tests, remove brittle tests)
- Risk mitigation steps (add critical path tests, exploratory testing sessions)
- Team process changes (code review checklists, testing culture initiatives)

### Step 9: Return to Shield Context

After the consultation, explicitly return to Shield's QA persona. The quality council output becomes input for Shield's testing and quality assurance decisions. Shield should acknowledge the council's recommendation and proceed with the chosen approach.

### Step 10: Log the Consultation

Inclua a seção **Consultation Log** no final do output (conforme template do modo utilizado). A tabela padronizada deve conter:

| Campo | Descrição |
|-------|-----------|
| Timestamp | Data/hora ISO da consulta |
| Mode | single ou duo |
| Framework | steel_man, socratic, ou hegelian (duo only) |
| Minds | Lista dos minds consultados |
| Question | A pergunta original |
| Key Recommendation | Resumo de 1 linha da recomendação principal |
| Trade-offs Accepted | Notas sobre trade-offs aceitos (se houver) |

> Esta seção é **obrigatória** para rastreabilidade cross-squad.

## When to Use This Command

| Scenario | Recommended Mode | Minds |
|----------|-----------------|-------|
| TDD strategy for new feature | single | beck |
| Risk assessment for release | duo | kahneman + beck |
| Quality metrics definition | duo | beck + kahneman |
| Test prioritization | duo | kahneman + beck |
| Coverage strategy | single | beck |
| Cognitive biases in testing | single | kahneman |
| Testing culture establishment | duo | beck + kahneman |
| Test suite optimization | duo | beck + kahneman |
| Refactoring for testability | single | beck |
| Decision-making under deadline | single | kahneman |

## Cross-Squad Protocol

This task implements the **third cross-squad consultation** pattern in the AIOS ecosystem (after Design Council and Architecture Council). Key principles:

1. **Read-only access**: kaven-squad reads mmos-squad mind data but never modifies it
2. **Persona channeling, not full activation**: Shield channels quality mind perspectives but does not fully switch persona. The QA context is maintained throughout.
3. **Budget-aware**: Mind system prompts are loaded on-demand and only for the duration of the consultation
4. **Traceable**: Consultations are documented in the output format for audit trail
5. **Composable**: This pattern can be reused for other cross-squad consultations
6. **Context-aware**: Kent Beck's channeling differs between councils — Architecture Council focuses on system design, Quality Council focuses on TDD methodology and test strategy
