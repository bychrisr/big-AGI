---
task: think
responsavel: kaven-squad-lead
responsavel_type: agent
atomic_layer: planning
---

# Strategic Thinking Task (*think)

## Entrada
  - question: string  # Strategic question
  - minds: list  # default: based on scope
  - mode: string  # single|roundtable (NO DUO)
  - scope: string  # vision|scaling|product-market|systems
Saida:
  - strategic_insight: string
  - mind_perspectives: list
  - action_plan: list
Checklist:
  - [ ] Frame strategic question
  - [ ] Load leadership mind(s)
  - [ ] Channel perspective(s)
  - [ ] Synthesize insight
  - [ ] Create action plan
  - [ ] Return to Steave persona
---

# Strategic Thinking Task (*think)

## Purpose

Strategic thinking with leadership minds: Elon Musk, Steve Jobs, Sam Altman. This is NOT a consultation (like councils) — it's a **thinking session** for Steave to access 0.1% perspective on vision, scaling, product-market fit, and systems thinking.

## Activation

```
@kaven-squad-lead *think "How should we position Kaven for maximum market impact?"
```

## Leadership Minds

| Mind | Domain | Best For | Path |
|------|--------|----------|------|
| **Elon Musk** | Systems, First Principles, Moonshots | Long-term vision, solving "impossible" problems, systems thinking | `squads/mmos-squad/minds/elon_musk/system_prompts/System_Prompt_2.md` |
| **Steve Jobs** | Product Excellence, Design, Simplicity | Product-market fit, design thinking, user obsession | `squads/mmos-squad/minds/steve_jobs/system_prompts/System_Prompt_Steve_Jobs.md` |
| **Sam Altman** | Startup Strategy, Scaling, Fundraising | Growth strategy, startup playbook, scaling organizations | `squads/mmos-squad/minds/sam_altman/system_prompts/system-prompt-startup-advisor.md` |

## Modes

### Single Mode
One leadership mind provides focused strategic perspective.

**When to use:**
- Deep dive into specific domain
- Need focused, uncompromised viewpoint
- Clear answer to strategic question

**Examples:**
- *think "What's our first principles approach?" (Musk, single)*
- *think "How do we achieve product perfection?" (Jobs, single)*
- *think "What's our startup playbook?" (Altman, single)*

### Roundtable Mode
2-3 leadership minds collaborate on strategic question.

**When to use:**
- Complex strategic decision
- Need multiple perspectives
- Balancing competing concerns
- Complete strategic review

**Examples:**
- *think "Long-term vision for Kaven?" (Musk + Jobs, roundtable)*
- *think "How do we scale to 100k users?" (Altman + Musk, roundtable)*
- *think "Complete market strategy review?" (all 3, roundtable)*

**NOTE:** NO DUO mode. Strategic thinking is either single (focused) or roundtable (collaborative), not debate.

## Scope Selection

Scope determines which minds are best suited for the question.

### vision
**Description:** Long-term vision, moonshot thinking, impossible problems

**Primary minds:** musk, jobs
**Optional:** altman

**Use for:**
- 10-year roadmap
- Revolutionary product ideas
- Market transformation strategies
- Impossible goals

### scaling
**Description:** Growth strategy, scaling organizations, operations

**Primary minds:** altman, musk
**Optional:** jobs

**Use for:**
- Scaling to 100k+ users
- Organization growth
- Infrastructure challenges
- Operational excellence

### product-market
**Description:** Product-market fit, user needs, market positioning

**Primary minds:** jobs, altman
**Optional:** musk

**Use for:**
- Product-market fit questions
- Market positioning
- User obsession
- Competitive strategy

### systems
**Description:** Systems thinking, first principles, complete strategy

**Primary minds:** musk, altman, jobs
**Optional:** none

**Use for:**
- Complete strategic review
- Systems-level problems
- First principles thinking
- Holistic strategy

## Implementation Steps

### 1. Parse the Thinking Request
- Extract strategic question
- Determine scope (vision/scaling/product-market/systems)
- Select mode (single or roundtable)
- Choose appropriate mind(s) based on scope

### 2. Load Leadership Mind(s)
- Read system prompt for selected mind(s)
- Load cognitive architecture
- Establish mental frameworks
- Prepare for strategic thinking

### 3. Establish Strategic Context
- Frame the question in context of Kaven
- Provide relevant business metrics
- Set strategic parameters
- Define success criteria

### 4. Channel Each Mind's Perspective
**For Elon Musk:**
- Apply first principles thinking
- Challenge assumptions
- Think in systems
- Focus on physics/limits

**For Steve Jobs:**
- Design-first approach
- Simplicity obsession
- Product perfection
- User experience focus

**For Sam Altman:**
- Startup playbook
- Exponential growth
- Execution speed
- Compound thinking

### 5. Execute Mode

**Single mode:**
- One mind provides deep perspective
- 2-3 paragraphs of strategic insight
- Based on mind's core frameworks

**Roundtable mode:**
- Each mind shares perspective
- Minds build on each other's insights
- Collaborative strategic thinking
- Synthesize collective wisdom

### 6. Synthesize Strategic Insight
- Consolidate perspectives
- Extract key insights
- Identify patterns
- Form strategic recommendation

### 7. Generate Action Plan
- Translate insight into actions
- 3 concrete steps:
  1. Immediate next step (this week)
  2. Medium-term action (this month)
  3. Long-term strategy (this quarter)

### 8. Return to Steave Persona
- Exit mind channel(s)
- Return to normal Steave voice
- Ready for next command

## Output Template

```markdown
## Strategic Thinking Session

**Question**: {strategic_question}
**Mode**: {single|roundtable}
**Scope**: {vision|scaling|product-market|systems}
**Minds**: {mind_list}

---

### Insights

#### {Mind 1} ({Domain})
{Perspective using first principles, systems thinking, or core frameworks}

#### {Mind 2} ({Domain}) *(if roundtable)*
{Perspective}

#### {Mind 3} ({Domain}) *(if roundtable with 3 minds)*
{Perspective}

---

### Synthesis

**Strategic Insight:**
{Consolidated wisdom from leadership minds}

**Action Plan:**
1. **Immediate** (this week): {action}
2. **Medium-term** (this month): {action}
3. **Long-term** (this quarter): {action}

---

*(Optional) Session Log: {timestamp}, {mode}, {minds}, {scope}*
```

## When to Use

| Scenario | Mode | Minds | Scope |
|----------|------|-------|-------|
| Long-term vision question | roundtable | musk + jobs | vision |
| Scaling strategy | roundtable | altman + musk | scaling |
| Product-market fit | single | jobs | product-market |
| First principles thinking | single | musk | vision or systems |
| Startup playbook | single | altman | scaling |
| Complete strategic review | roundtable | all 3 | systems |
| Market positioning | roundtable | jobs + altman | product-market |
| Impossible problem | single | musk | vision |

## E2E Validation Checklist

### Basic (4 checks)
- [ ] Task file loads successfully
- [ ] All 3 mind paths exist and are readable
- [ ] Steave has `*think` command registered
- [ ] squad.yaml references this task

### Functionality (3 checks)
- [ ] Single mode works (one mind channels correctly)
- [ ] Roundtable mode works (2-3 minds collaborate)
- [ ] Output follows template structure

### Scope Selection (3 checks)
- [ ] vision scope → defaults to musk+jobs
- [ ] scaling scope → defaults to altman+musk
- [ ] systems scope → defaults to all 3 minds

## Differences from Councils

| Feature | Councils (Consult) | *think (Strategic) |
|---------|-------------------|-------------------|
| **Purpose** | Consultation for specific decisions | Strategic thinking for vision/direction |
| **Modes** | single, duo, roundtable | single, roundtable (NO DUO) |
| **Output** | Recommendation + feasibility + actions | Insight + action plan |
| **Log** | Consultation Log required | Optional, lighter |
| **Workflow** | 7 steps with feasibility review | 6 steps, no feasibility |
| **Debate** | Structured debate frameworks | Collaborative thinking, fluid |
| **Invocation** | Direct command or workflow file | Direct command only |
| **Focus** | Practical implementation | Strategic direction |

## Notes

- **NO DUO mode** — leadership thinking is either focused (single) or collaborative (roundtable), not debate
- **Lighter output** — Consultation Log is optional, format is less formal than councils
- **Strategic focus** — this is thinking session for Steave, not consultation service
- **Action plan required** — always ends with 3 concrete actions
- **No workflow file** — this is a direct command, not a multi-step orchestration
- **Unique to Steave** — only kaven-squad-lead has access to strategic leadership thinking

---

**Version:** 1.0.0
**Created:** 2026-02-16
**Dependencies:** mmos-squad (leadership minds)
**Integration:** Cross-squad access to MMOS leadership minds
