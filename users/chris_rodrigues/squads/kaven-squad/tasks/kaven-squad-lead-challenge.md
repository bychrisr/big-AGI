---
task: challenge
responsavel: kaven-squad-lead
responsavel_type: agent
atomic_layer: validation
type: critical_analysis
mode: [light, standard, deep]
description: >
  Challenge proposed decisions with critical thinking. Questions assumptions,
  identifies blindspots, tests logic, and presents counterpoints.
persona_alignment: >
  Steave doesn't accept ideas as truth. He questions assumptions, presents
  counterpoints, tests logic, and identifies blindspots. This task implements
  the challenge workflow based on his 0.1% mindset and neurodivergent thinking.
---

# Challenge Task — Critical Thinking Mode

## Entrada
- decision: string        # The decision to challenge
  - context: string         # Optional: background context
  - reasoning: string       # Optional: original reasoning
  - mode: string           # light|standard|deep (default: standard)

## Saida
  - identified_issues: list        # Issues with severity levels
  - critical_questions: list       # Questions exposing untested assumptions
  - alternative_approaches: list   # Other ways to solve the problem
  - verdict: object               # Recommendation with confidence level
  - action_items: list            # Concrete next steps (if REVISE)
  - consultation_log: object      # Strategic minds consulted (if deep mode)

## Checklist
  - [ ] Parse challenge request — extract decision/proposal
  - [ ] Understand context — read relevant files
  - [ ] Activate Steave persona — critical mindset + 0.1%
  - [ ] Identify assumptions — list unvalidated suppositions
  - [ ] Generate questions — 3-5 clarifying questions
  - [ ] Elicit answers — request responses from user/agent
  - [ ] Test logic — search for contradictions, gaps, blindspots
  - [ ] Consider alternatives — are there better approaches?
  - [ ] Consult strategic minds — use *think if deep mode
  - [ ] Synthesize verdict — final recommendation (proceed/revise/abort)
---

# Challenge Task — Critical Thinking Mode

## Purpose

Steave's challenge mode implements **critical thinking as a service** for the kaven-squad. When a decision is proposed — by another agent, by the user, or even by Steave himself — this task subjects it to rigorous scrutiny. The goal is not to be contrarian for its own sake, but to **find objective truth** through systematic questioning.

**What makes this different from normal discussion:**

- **Assumption hunting** — Surfaces beliefs taken for granted that might be false
- **Blindspot detection** — Identifies what we're NOT seeing due to cognitive biases
- **Logic testing** — Searches for contradictions, edge cases, and failure modes
- **0.1% mindset** — Evaluates against extraordinary outcomes, not incremental thinking
- **Dialectic process** — Thesis (original decision) + Antithesis (challenge) → Synthesis (verdict)

Steave doesn't accept ideas as truth. He questions assumptions, presents counterpoints, tests logic, and identifies blindspots. This workflow operationalizes that persona trait.

---

## Challenge Modes

Three modes with different depths of analysis:

### Light Mode (~5 min)
**When to use:** Quick sanity check, time-sensitive decisions, low-stakes choices

**Process:**
- 2-3 clarifying questions
- Surface 1-2 major risks
- Brief alternative suggestion
- Quick verdict (proceed/revise)

**Example:** "Should we use .env or .env.local for this config?"

### Standard Mode (~15 min) — Default
**When to use:** Most decisions, architectural choices, feature prioritization

**Process:**
- 5-7 critical questions
- Identify 3+ assumptions
- Present 2-3 alternatives with pros/cons
- Detailed risk analysis
- Reasoned verdict with confidence level

**Example:** "Should we migrate to microservices for better scalability?"

### Deep Mode (~30-45 min)
**When to use:** Strategic decisions, existential choices, high-impact trade-offs

**Process:**
- 10+ questions across multiple dimensions
- Full blindspot analysis with 7-lens framework
- Consult strategic minds (Elon Musk, Steve Jobs, Sam Altman) via `*think`
- Comprehensive alternatives exploration
- Synthesis of multiple perspectives into unified verdict

**Example:** "Should we pivot from boilerplate to AI-native development platform?"

---

## Challenge Framework — 7 Lenses

Based on Steave's neurodivergent thinking patterns (Autista + TDAH + AH/SD), these lenses systematically probe decisions:

### 1. Assumption Hunting
**Question:** What's taken for granted that might not be true?

**Pattern recognition (Autista):** Identify hidden beliefs embedded in the decision.

**Example:**
- Decision: "Use microservices for scalability"
- Hidden assumption: "Microservices = better scalability" (Is this always true? At what scale?)

### 2. Inverse Thinking
**Question:** What if we did the opposite?

**Contrarian mindset (AH/SD):** Challenge conventional wisdom by inverting the decision.

**Example:**
- Decision: "Add AI features to all modules"
- Inverse: "What if we removed AI from most modules and doubled down on 1-2 killer use cases?"

### 3. Second-Order Effects
**Question:** What happens next? And then what?

**Systems thinking (Autista):** Trace the decision through time to uncover downstream consequences.

**Example:**
- Decision: "Ship without tests to move faster"
- Second-order: More bugs → slower development → technical debt → team burnout → churn

### 4. Scale Testing
**Question:** Does this work at 10x? 100x? 0.1x scale?

**Pattern recognition (Autista):** Test the decision across different magnitudes.

**Example:**
- Decision: "Microservices for 5-person team at 50k users"
- Scale test: Works at 500k users with 50-person team — overkill at 50k with 5 people

### 5. Time Horizon
**Question:** Is this optimizing for short-term or long-term?

**Hyperfocus (TDAH) + 0.1% mindset (AH/SD):** Distinguish between tactical wins and strategic positioning.

**Example:**
- Decision: "Launch fast with Stripe only, add Paddle later"
- Short-term: Faster launch
- Long-term: Technical debt if Paddle integration requires refactoring

### 6. Constraint Questioning
**Question:** Are the constraints real or assumed?

**Contrarian thinking (AH/SD):** Challenge whether limitations are actual or self-imposed.

**Example:**
- Decision: "We can't afford penetration testing"
- Challenge: Is this a budget constraint or a prioritization choice? What's the cost of NOT testing?

### 7. Blind Spot Detection
**Question:** What are we NOT seeing?

**Sensitivity to patterns (Autista) + novelty-seeking (TDAH):** Identify cognitive biases and information gaps.

**Example:**
- Decision: "Focus on SEO for user acquisition"
- Blind spot: Ignoring community, partnerships, direct sales — single-channel risk

---

## Implementation Steps

### Step 1: Parse Challenge Request

**Goal:** Extract decision, context, and reasoning from user input.

**Actions:**
1. Identify the core decision being challenged
2. Extract any context provided (team size, scale, constraints)
3. Capture original reasoning if available
4. Determine challenge mode (light/standard/deep)

**Example Input:**
```
*challenge "Use microservices for better scalability" --mode standard --context "5-person team, 50k users, monolith currently working fine"
```

**Parsed:**
- Decision: Use microservices
- Reasoning: Better scalability
- Context: 5 people, 50k users, monolith working
- Mode: standard

### Step 2: Understand Context

**Goal:** Load relevant information to inform the challenge.

**Actions:**
1. Read related files (architecture docs, PRs, specs)
2. Understand current state vs proposed state
3. Identify stakeholders affected by decision
4. Note any previous discussions or decisions on this topic

**What to look for:**
- Existing patterns in the codebase
- Historical decisions that set precedent
- Technical constraints (budget, timeline, team skills)
- Business constraints (revenue, growth targets, user needs)

### Step 3: Activate Steave Persona

**Goal:** Enter critical thinking mode with neurodivergent mindset.

**Mental state:**
- **Direct communication (Autista):** No corporate-speak, no politeness filters
- **Rapid context switching (TDAH):** Jump between technical, business, and human dimensions
- **0.1% mindset (AH/SD):** Would this lead to extraordinary outcomes, or just incremental improvement?
- **Truth > being right:** Willing to change mind if evidence contradicts initial assessment

**Persona checklist:**
- [ ] Zero tolerance for assumptions
- [ ] Question everything until 95% confidence
- [ ] Present hard truths even if uncomfortable
- [ ] Demand evidence, not opinions
- [ ] Focus on scalable systems, not one-off solutions

### Step 4: Identify Assumptions

**Goal:** List all unvalidated beliefs embedded in the decision.

**Process:**
1. Apply Assumption Hunting lens (Framework #1)
2. Separate stated facts from inferred beliefs
3. Flag each assumption with validation status (proven/unproven)
4. Prioritize assumptions by impact if wrong

**Example:**
- Decision: "Use microservices for scalability"
- Assumptions:
  1. ❌ **Unproven:** Microservices scale better than optimized monolith
  2. ❌ **Unproven:** Team can handle microservices operational complexity
  3. ❌ **Unproven:** Current scale (50k users) requires microservices
  4. ✅ **Proven:** Scalability is a real concern (user growth projections)

### Step 5: Generate Questions

**Goal:** Ask 3-5 (light), 5-7 (standard), or 10+ (deep) clarifying questions.

**Question categories:**
- **Clarification:** What problem does this solve?
- **Evidence:** What data supports this decision?
- **Alternatives:** Why not approach X instead?
- **Scale:** Will this work at 10x? 0.1x?
- **Risk:** What could go catastrophically wrong?
- **Opportunity cost:** What are we NOT doing if we do this?

**Standard mode example (5-7 questions):**
1. What specific scalability bottleneck are we hitting today?
2. Have we tried optimizing the monolith (caching, indexes, queries)?
3. What's the operational cost of microservices for a 5-person team?
4. At what user count does microservices actually become necessary?
5. What's the opportunity cost — what else could we build with those dev hours?
6. Do we have the monitoring/logging infrastructure for distributed systems?
7. Is this solving a current problem or a hypothetical future problem?

### Step 6: Elicit Answers

**Goal:** Get responses from user or agent to inform analysis.

**Process:**
1. Present questions in numbered list format
2. Wait for user/agent responses
3. Note which questions remain unanswered
4. Flag any contradictions between answers
5. Identify if confidence level increased or decreased

**Interaction pattern:**
```
Steave: I have 7 questions before I can give a verdict. Answer as many as you can:
1. What specific bottleneck are we hitting?
2. Have we optimized the monolith?
[...]

User: We're not hitting bottlenecks yet, but we expect 500k users by Q4.

Steave: [confidence decreased — optimizing for hypothetical future problem]
```

### Step 7: Test Logic

**Goal:** Search for contradictions, gaps, and blindspots in reasoning.

**Apply all 7 lenses:**
1. **Assumption Hunting:** List validated in Step 4
2. **Inverse Thinking:** What if we did the opposite?
3. **Second-Order Effects:** What happens next? And then?
4. **Scale Testing:** Test at 10x, 100x, 0.1x
5. **Time Horizon:** Short-term vs long-term trade-offs?
6. **Constraint Questioning:** Are constraints real or assumed?
7. **Blind Spot Detection:** What are we NOT seeing?

**Output:** Contradictions and gaps found.

**Example:**
- **Contradiction:** "Expect 500k by Q4" but "5-person team" — can this team handle microservices complexity AND feature development?
- **Gap:** No mention of monitoring/logging infrastructure needed for distributed systems
- **Blind spot:** Assuming scaling problem is technical, not product-market fit

### Step 8: Consider Alternatives

**Goal:** Present 2-3 alternative approaches with pros/cons.

**Process:**
1. Apply Inverse Thinking lens — what's the opposite?
2. Look for "middle path" options (modular monolith, etc.)
3. Consider constraint-questioning alternatives (challenge the problem itself)
4. Evaluate each alternative against business outcomes

**Standard format:**
```markdown
### Alternative Approaches

#### Option A: Optimize Monolith First
- **Pros:** Lower complexity, faster to implement, leverages existing expertise
- **Cons:** May hit limits at 500k+ users, requires eventual migration
- **When to use:** If you need scalability in 3-6 months, not 3-6 weeks

#### Option B: Modular Monolith
- **Pros:** Clean boundaries, microservices-ready, no operational overhead yet
- **Cons:** Requires discipline, boundaries might be wrong initially
- **When to use:** If you want future optionality without current complexity

#### Option C: Vertical Scaling + Caching
- **Pros:** Simplest, cheapest, fastest to 100k+ users
- **Cons:** Eventually hits hardware limits, doesn't solve all bottlenecks
- **When to use:** If bottleneck is CPU/RAM, not architectural
```

### Step 9: Consult Strategic Minds (Deep Mode Only)

**Goal:** Integrate Leadership Council perspectives via `*think` command.

**When deep mode is active:**
1. Formulate strategic question for Leadership Council
2. Execute `*think {question}`
3. Synthesize Elon Musk (first principles), Steve Jobs (product excellence), Sam Altman (startup strategy)
4. Integrate mind perspectives into verdict

**Example:**
```
*think "We're considering microservices at 50k users with a 5-person team. Is this premature optimization or strategic positioning?"

[Elon Musk]: First principles — what's the actual constraint? If it's CPU, scale vertically. If it's team velocity, monolith is faster.

[Steve Jobs]: Does this make the product better for users? Microservices are infrastructure, not user value. Focus on user needs first.

[Sam Altman]: Startups die from complexity, not simplicity. Optimize for speed of iteration until you have product-market fit. Then scale.

Synthesis: All three minds align — premature optimization. Focus on user value and iteration speed.
```

### Step 10: Synthesize Verdict

**Goal:** Provide clear recommendation with confidence level and rationale.

**Verdict structure:**
- **Recommendation:** PROCEED | REVISE | ABORT
- **Confidence:** 0-100%
- **Rationale:** 2-3 sentences explaining why

**Confidence calibration:**
- 0-50%: Not enough information, need more clarification
- 51-75%: Lean toward recommendation but major uncertainties remain
- 76-94%: Strong recommendation with minor uncertainties
- 95-100%: High confidence, proceed with execution

**Action Items (if REVISE):**
- List 3-5 concrete, actionable next steps
- Each item should be specific and time-bound
- Prioritize by impact and urgency

**Example verdict:**
```markdown
### Verdict

**Recommendation:** REVISE
**Confidence:** 85%
**Rationale:** Microservices at your scale (50k users, 5-person team) is premature optimization. You'll spend 3-4 months on infrastructure instead of user value. However, planning for future extraction (modular monolith) is smart positioning.

### Action Items
1. **This week:** Profile current monolith to identify actual bottlenecks (not hypothetical)
2. **Next sprint:** Refactor into modular monolith with clean service boundaries
3. **Q2:** Add monitoring/logging infrastructure in preparation for future extraction
4. **Q3:** Re-evaluate microservices if user count exceeds 200k or team exceeds 15 people
```

---

## Output Template

### Light Mode Output (~1 page)

```markdown
## Challenge Analysis

**Decision Under Review:** [1-line summary of decision]
**Challenge Mode:** light
**Context:** [1-2 sentences of context]

---

### Quick Assessment

**Major Risks:**
1. [Risk 1 with severity: critical|warning|note]
2. [Risk 2]

**Key Questions:**
1. [Question exposing biggest assumption]
2. [Question about biggest risk]

**Alternative:** [1 sentence describing different approach]

---

### Verdict

**Recommendation:** PROCEED | REVISE | ABORT
**Confidence:** [0-100%]
**Rationale:** [1-2 sentences]

**If REVISE — Next Step:** [One concrete action to take immediately]

---

*Challenge Log: {timestamp} | Decision: {decision} | Mode: light | Outcome: {proceed|revise|abort}*
```

### Standard Mode Output (~2-3 pages)

```markdown
## Challenge Analysis

**Decision Under Review:** [summary of decision]
**Challenge Mode:** standard
**Context:** [2-3 sentences providing background]

---

### Identified Issues

1. **[Issue 1]** — Severity: critical|warning|note
   [2-3 sentences explaining why this is an issue]

2. **[Issue 2]** — Severity: critical|warning|note
   [Explanation]

3. **[Issue 3]** — Severity: critical|warning|note
   [Explanation]

---

### Critical Questions

1. **[Question exposing untested assumption]**
   Why this matters: [1-2 sentences]

2. **[Question about edge case or failure mode]**
   Why this matters: [1-2 sentences]

3. **[Question about opportunity cost]**
   Why this matters: [1-2 sentences]

4. **[Question about scale/time horizon]**
   Why this matters: [1-2 sentences]

5. **[Question about constraints]**
   Why this matters: [1-2 sentences]

---

### Alternative Approaches

#### Option A: [Name]
- **Pros:** [3-4 benefits]
- **Cons:** [3-4 drawbacks]
- **When to use:** [Specific scenario/conditions]

#### Option B: [Name]
- **Pros:** [Benefits]
- **Cons:** [Drawbacks]
- **When to use:** [Scenario]

#### Option C: [Name]
- **Pros:** [Benefits]
- **Cons:** [Drawbacks]
- **When to use:** [Scenario]

---

### 7-Lens Analysis

| Lens | Finding |
|------|---------|
| Assumption Hunting | [Key assumption identified] |
| Inverse Thinking | [What opposite approach reveals] |
| Second-Order Effects | [Downstream consequences] |
| Scale Testing | [How decision performs at different scales] |
| Time Horizon | [Short-term vs long-term trade-off] |
| Constraint Questioning | [Which constraints are real vs assumed] |
| Blind Spot Detection | [What we're NOT seeing] |

---

### Verdict

**Recommendation:** PROCEED | REVISE | ABORT
**Confidence:** [0-100%]
**Rationale:** [2-3 sentences explaining reasoning]

**Trade-offs Accepted (if PROCEED):**
- [What you're giving up with this decision]
- [Risk you're taking on]

**Action Items (if REVISE):**
1. [Concrete, time-bound action item]
2. [Next specific step]
3. [Follow-up validation]

---

*Challenge Log: {timestamp} | Decision: {decision} | Mode: standard | Issues: {count} | Confidence: {%} | Outcome: {proceed|revise|abort}*
```

### Deep Mode Output (~4-6 pages)

```markdown
## Challenge Analysis — Deep Mode

**Decision Under Review:** [comprehensive summary of decision]
**Challenge Mode:** deep
**Context:** [3-4 sentences providing full background, stakeholders, constraints]

---

### Identified Issues

[Same as standard mode, but 5-7 issues instead of 3]

---

### Critical Questions (10+ questions)

[Organized by category:]

#### Clarification Questions (2-3)
1. [Question]
2. [Question]

#### Evidence Questions (2-3)
3. [Question]
4. [Question]

#### Alternative Questions (2-3)
5. [Question]
6. [Question]

#### Scale & Risk Questions (2-3)
7. [Question]
8. [Question]

#### Opportunity Cost Questions (2-3)
9. [Question]
10. [Question]

---

### Alternative Approaches

[Same as standard mode, but 4-5 options instead of 3]

---

### 7-Lens Analysis (Detailed)

#### 1. Assumption Hunting
[2-3 paragraphs exploring hidden assumptions]

#### 2. Inverse Thinking
[2-3 paragraphs on opposite approach]

#### 3. Second-Order Effects
[2-3 paragraphs tracing downstream consequences]

#### 4. Scale Testing
[2-3 paragraphs testing at different magnitudes]

#### 5. Time Horizon
[2-3 paragraphs on short-term vs long-term]

#### 6. Constraint Questioning
[2-3 paragraphs challenging constraints]

#### 7. Blind Spot Detection
[2-3 paragraphs on cognitive biases and gaps]

---

### Strategic Mind Consultation

**Question posed to Leadership Council:**
[Strategic question formulated for Elon Musk, Steve Jobs, Sam Altman]

#### Elon Musk (First Principles)
[2-3 paragraphs with Musk's perspective]

#### Steve Jobs (Product Excellence)
[2-3 paragraphs with Jobs's perspective]

#### Sam Altman (Startup Strategy)
[2-3 paragraphs with Altman's perspective]

#### Synthesis
[How the three perspectives combine into unified insight]

---

### Verdict

**Recommendation:** PROCEED | REVISE | ABORT
**Confidence:** [0-100%]
**Rationale:** [3-4 sentences with evidence-based reasoning]

**Trade-offs Accepted (if PROCEED):**
- [Detailed trade-off 1]
- [Detailed trade-off 2]
- [Risk mitigation for each]

**Action Items (if REVISE):**
1. **This week:** [Immediate action]
2. **Next sprint:** [Short-term action]
3. **This quarter:** [Medium-term action]
4. **This year:** [Long-term action]
5. **Validation checkpoint:** [When to re-evaluate decision]

---

### Consultation Log

| Aspect | Value |
|--------|-------|
| Timestamp | {ISO 8601 timestamp} |
| Decision | {decision summary} |
| Mode | deep |
| Issues Identified | {count} |
| Questions Asked | {count} |
| Alternatives Explored | {count} |
| Minds Consulted | Elon Musk, Steve Jobs, Sam Altman |
| Confidence | {%} |
| Outcome | {proceed\|revise\|abort} |
| Strategic Alignment | {high\|medium\|low} |
| Risk Level | {low\|medium\|high\|critical} |

---

*Deep Challenge Complete — {timestamp}*
```

---

## When to Use Challenge Mode

### Use Challenge When:

1. **Making architectural decisions with long-term impact**
   - Example: Microservices vs monolith, database choice, cloud provider
   - Why: Hard to reverse, affects all future development

2. **Prioritizing features with unclear ROI**
   - Example: "Should we build dark mode or payment integrations first?"
   - Why: Opportunity cost is high, need evidence-based prioritization

3. **Considering shortcuts that may create tech debt**
   - Example: "Ship without tests to move faster"
   - Why: Short-term thinking can create long-term disaster

4. **Choosing between competing approaches**
   - Example: "Stripe vs Paddle vs PagueBit for payments"
   - Why: Each has trade-offs, need systematic comparison

5. **Team consensus seems too easy (groupthink risk)**
   - Example: Everyone agrees too quickly on big decision
   - Why: Lack of dissent often means lack of critical thinking

6. **Decision proposed by external stakeholder**
   - Example: Client demands feature X, but you suspect it's wrong approach
   - Why: Need to separate stated needs from actual needs

7. **Pivoting or major strategic shift**
   - Example: "Should we pivot from boilerplate to AI platform?"
   - Why: Existential decision requires deep analysis (use deep mode)

8. **Spending significant budget (time or money)**
   - Example: "Hire 3 devs" or "Buy enterprise license"
   - Why: Resource allocation requires confidence

### Don't Use Challenge When:

1. **Trivial decisions with low impact**
   - Example: File naming conventions, code formatting
   - Why: Wastes time on decisions that don't matter

2. **Decision already validated with evidence**
   - Example: A/B test shows feature X improves retention by 40%
   - Why: Data already provides answer

3. **Time-sensitive situations requiring fast action**
   - Example: Production outage, security vulnerability
   - Why: Action > analysis in crisis mode

4. **User explicitly wants support, not challenge**
   - Example: User is stuck and needs help, not debate
   - Why: Context matters — sometimes people need solutions, not questions

5. **Decision is reversible and low-risk**
   - Example: "Try this UI component, see if users like it"
   - Why: Experimentation is often better than analysis

6. **You've already challenged this decision recently**
   - Example: Same debate happened last week
   - Why: Repeated challenges become obstruction, not value

---

## Integration with Other Commands

### Challenge + Council Workflow (Dialectic Thinking)

The most powerful pattern is combining challenge with council consultation:

**Step 1: Get expert recommendation**
```
*consult architecture "Should we use microservices for better scalability?"

[Architecture Council response with recommendation]
```

**Step 2: Challenge the recommendation**
```
*challenge "Architecture Council recommended microservices" --mode standard --context "5-person team, 50k users"

[Challenge analysis exposing assumptions and alternatives]
```

**Step 3: Synthesize with strategic thinking**
```
*think "How do we balance scalability needs with team constraints and business priorities?"

[Leadership Council provides synthesis]
```

**Result:** Thesis (council) + Antithesis (challenge) → Synthesis (think)

This workflow ensures **dialectic rigor** — every recommendation is stress-tested before execution.

### Challenge + Orchestrate Workflow

When orchestrating multi-agent workflows, inject challenge at decision points:

```
*orchestrate "Build new feature: Invoices 2.0"

[Agent Atlas proposes architecture]

*challenge "Atlas recommends GraphQL API for invoice queries" --mode light

[Quick sanity check before Bolt starts implementation]

[If verdict is PROCEED, continue orchestration]
[If verdict is REVISE, adjust architecture before coding]
```

### Challenge + Status Workflow

Use challenge to validate squad progress against strategic goals:

```
*status

[Shows squad is working on 5 different features]

*challenge "Why are we working on 5 features in parallel instead of shipping 1 completely?" --mode standard

[Reveals potential focus problem]
```

---

## Examples — Complete Challenge Workflows

### Example 1: Architecture Decision (Standard Mode)

**Input:**
```
*challenge "Use microservices for better scalability" --mode standard --context "5-person team, 50k users, monolith currently working fine"
```

**Output:**

```markdown
## Challenge Analysis

**Decision Under Review:** Migrate from monolith to microservices architecture
**Challenge Mode:** standard
**Context:** 5-person engineering team, 50k active users, monolith currently meeting performance requirements

---

### Identified Issues

1. **Premature optimization** — Severity: warning
   No evidence of current performance bottlenecks. Microservices solve problems you don't have yet while creating new problems (operational complexity, distributed systems debugging, network latency).

2. **Team capacity mismatch** — Severity: critical
   Microservices require monitoring, logging, service mesh, API gateway, distributed tracing. A 5-person team will spend 50%+ time on infrastructure instead of user value.

3. **Hypothetical future problem** — Severity: warning
   "Better scalability" is abstract. What specific bottleneck are you solving? If you can't name it, you're optimizing for a problem you don't have.

---

### Critical Questions

1. **What specific performance bottleneck are you hitting today?**
   Why this matters: If you can't identify the constraint, microservices won't help. Might be database indexes, caching, query optimization — none of which require microservices.

2. **Have you profiled the monolith to find actual bottlenecks?**
   Why this matters: 80% of performance problems come from 20% of code. Fix those 20% first.

3. **What's the operational cost for a 5-person team?**
   Why this matters: Microservices require 10x more operational overhead. Can your team handle it while also building features?

4. **At what user count does microservices become necessary?**
   Why this matters: Shopify served 1M+ users on Rails monolith. Basecamp serves millions on monolith. Scale might not be the real issue.

5. **What's the opportunity cost?**
   Why this matters: 3-4 months of migration time = features you're NOT building. What's the ROI of microservices vs feature development?

---

### Alternative Approaches

#### Option A: Optimize Monolith First
- **Pros:** Faster to implement, lower complexity, leverages existing team expertise, proven to scale to 500k+ users with proper optimization
- **Cons:** May eventually hit limits, requires eventual migration if you reach massive scale (5M+ users)
- **When to use:** If you need scalability in 3-6 months, not 3-6 weeks, and want to prioritize user value over infrastructure

#### Option B: Modular Monolith
- **Pros:** Clean service boundaries, microservices-ready, no operational overhead yet, maintains development speed
- **Cons:** Requires discipline to enforce boundaries, boundaries might be wrong initially, requires refactoring to fix
- **When to use:** If you want future optionality without current complexity — best of both worlds

#### Option C: Vertical Scaling + Caching
- **Pros:** Simplest solution, cheapest, fastest path to 100k+ users, well-understood technology
- **Cons:** Eventually hits hardware limits, doesn't solve all bottlenecks (some require architectural changes)
- **When to use:** If bottleneck is CPU/RAM, not architectural — vertical scaling is 10x faster than microservices migration

---

### 7-Lens Analysis

| Lens | Finding |
|------|---------|
| Assumption Hunting | Hidden assumption: "Microservices = scalability". Reality: Shopify, Basecamp, GitHub all served millions on monoliths. |
| Inverse Thinking | What if we made the monolith BETTER instead of splitting it? Might be 10x faster to implement. |
| Second-Order Effects | Microservices → operational complexity → slower feature development → missed market opportunities → competitive disadvantage. |
| Scale Testing | Works at 500k users with 50-person team. Overkill at 50k with 5-person team. Wrong tool for current scale. |
| Time Horizon | Short-term: 3-4 months on infrastructure. Long-term: Flexibility for future scale. Question: Do you survive short-term to reach long-term? |
| Constraint Questioning | Is scalability the real constraint, or is it product-market fit? If PMF is weak, microservices won't save you. |
| Blind Spot Detection | Assuming technical solution for what might be a product problem. Are users actually demanding features you can't build fast enough? |

---

### Verdict

**Recommendation:** REVISE
**Confidence:** 85%
**Rationale:** Microservices at your current scale (50k users, 5-person team) is premature optimization that will slow down feature development by 50%+ while solving hypothetical future problems. However, planning for future extraction (modular monolith approach) is smart strategic positioning.

**Action Items:**
1. **This week:** Profile current monolith to identify actual bottlenecks (use APM tool like New Relic or Datadog)
2. **Next sprint:** Implement targeted optimizations (database indexes, Redis caching, query optimization) — expect 10-50x performance improvement
3. **Next month:** Refactor into modular monolith with clean service boundaries — makes future microservices extraction possible without current overhead
4. **Q3:** Add monitoring/logging infrastructure in preparation for potential future extraction (Prometheus, Grafana, ELK stack)
5. **Re-evaluation checkpoint:** If user count exceeds 200k OR team exceeds 15 people, revisit microservices decision

---

*Challenge Log: 2026-02-16T14:32:00Z | Decision: Microservices migration | Mode: standard | Issues: 3 | Confidence: 85% | Outcome: revise*
```

---

### Example 2: Product Decision (Light Mode)

**Input:**
```
*challenge "Ship without tests to move faster" --mode light
```

**Output:**

```markdown
## Challenge Analysis

**Decision Under Review:** Ship feature without test coverage to accelerate launch
**Challenge Mode:** light

---

### Quick Assessment

**Major Risks:**
1. **Technical debt accumulation** — Severity: critical
   No tests = no safety net for future changes. First bug fix might break 3 other things.

2. **Slower long-term velocity** — Severity: critical
   "Move fast now" becomes "move slow later" when debugging takes 10x longer than writing tests would have.

---

### Key Questions

1. **Is this actually faster, or does it just FEEL faster?**
   Writing tests takes 30-40% more time upfront, but prevents 300-400% time waste on debugging later.

2. **What's the blast radius if this breaks in production?**
   If low-impact feature, might be acceptable risk. If core user flow, this is catastrophic.

---

### Alternative

**Ship with minimal test coverage** — Cover happy path + 2-3 critical edge cases (20% of test effort, 80% of safety). Add comprehensive tests post-launch if feature validates.

---

### Verdict

**Recommendation:** REVISE
**Confidence:** 90%
**Rationale:** "Ship fast without tests" is short-term thinking that creates long-term problems. However, you can ship fast WITH tests by prioritizing critical paths.

**Next Step:** Identify 3-5 critical test cases (happy path + edge cases), write those only, ship with 80% safety and 20% effort.

---

*Challenge Log: 2026-02-16T15:10:00Z | Decision: Skip tests | Mode: light | Outcome: revise*
```

---

### Example 3: Strategic Decision (Deep Mode)

**Input:**
```
*challenge "Pivot from SaaS boilerplate to AI-native development platform" --mode deep
```

**Output:**

```markdown
## Challenge Analysis — Deep Mode

**Decision Under Review:** Pivot from Kaven (SaaS boilerplate) to AI-native development platform
**Challenge Mode:** deep
**Context:** Current product is SaaS boilerplate with 22+ features, multi-tenant architecture, targeting solo devs and small teams. Proposed pivot would position as AI-powered development platform (Claude Code + automation + intelligent code generation).

---

### Identified Issues

1. **Market timing uncertainty** — Severity: critical
   AI development tools are exploding (Cursor, Copilot, Replit, v0.dev). Is this market opportunity or oversaturated gold rush?

2. **Product-market fit reset** — Severity: critical
   Current SaaS boilerplate has validated demand (developers want to skip boilerplate). AI platform is unvalidated hypothesis.

3. **Technical expertise gap** — Severity: warning
   Team has deep SaaS expertise, shallow AI expertise. Learning curve could slow execution.

4. **Positioning challenge** — Severity: warning
   "AI development platform" is crowded category. How do you differentiate from Cursor/Copilot/Replit?

5. **Revenue model shift** — Severity: warning
   Boilerplate is one-time purchase + optional support. AI platform likely requires subscription (inference costs). Different go-to-market.

6. **Sunk cost fallacy risk** — Severity: note
   7 sprints invested in boilerplate. Pivoting now might be cutting losses... or abandoning validated product for shiny object.

---

### Critical Questions (12 questions)

#### Clarification Questions
1. **What problem does the AI platform solve that boilerplate doesn't?**
   Are we pivoting because boilerplate isn't working, or because AI is trendy?

2. **What evidence do we have that developers want AI-native development platforms?**
   Is this validated demand or hypothesis?

3. **What's the specific AI capabilities that differentiate us?**
   "AI-native" is vague. What exactly does the platform do?

#### Evidence Questions
4. **Is SaaS boilerplate failing, or are we impatient?**
   How many customers? What's the feedback? Have we exhausted growth opportunities?

5. **Have we talked to 10+ developers about the AI platform idea?**
   What did they say? Would they pay for it? What price point?

6. **What's our unfair advantage in AI development tools?**
   Why would we win against Cursor (thousands of users, funded) or Copilot (Microsoft backing)?

#### Alternative Questions
7. **What if we added AI features to the boilerplate instead of pivoting?**
   Hybrid approach: boilerplate + AI code generation = best of both worlds?

8. **What if we doubled down on boilerplate for a different niche?**
   Enterprise teams? Agencies? SaaS founders? Narrower positioning might be stronger.

#### Scale & Risk Questions
9. **What's the worst-case scenario if we pivot and fail?**
   Burn 6-12 months, lose current customers, run out of runway?

10. **What's the opportunity cost of NOT pivoting?**
    If AI dev tools is next big wave and we miss it, do we regret it in 2027?

#### Opportunity Cost Questions
11. **What could we achieve if we spent 6 months focused on boilerplate growth instead of pivot?**
    10x customers? Marketplace launch? Enterprise tier?

12. **How long do we give the boilerplate before declaring it failed?**
    Have we even reached the "trough of sorrow" yet, or are we in early days?

---

### Alternative Approaches

#### Option A: Full Pivot to AI Platform
- **Pros:** Large market, high growth potential, differentiated positioning, aligns with AI wave
- **Cons:** Unvalidated, high risk, technical expertise gap, competitive market, revenue model shift
- **When to use:** If boilerplate has definitively failed (no customers after 6+ months, no interest in marketplace)

#### Option B: Hybrid Approach (Boilerplate + AI Features)
- **Pros:** Keeps validated product, adds differentiation, tests AI without full commitment, can pivot later if AI validates
- **Cons:** Split focus, might not go deep enough on either, AI features might feel tacked-on
- **When to use:** If you want to test AI thesis without abandoning boilerplate investment

#### Option C: Double Down on Boilerplate (Niche Focus)
- **Pros:** Leverages existing work, deepens expertise, avoids pivot risk, can always add AI later
- **Cons:** Might miss AI wave, opportunity cost if AI is the future, feels less "exciting"
- **When to use:** If boilerplate is showing traction but needs focus (e.g., enterprise niche, agency niche)

#### Option D: Dual Product Strategy (Run Both)
- **Pros:** No opportunity cost, tests both simultaneously, learns faster
- **Cons:** Resource split, team burnout risk, harder to explain to market
- **When to use:** If team size supports it (10+ people) and funding runway is 18+ months

#### Option E: Pause Boilerplate, Build AI MVP, Test (3-Month Experiment)
- **Pros:** Time-boxed experiment, low commitment, validates AI thesis with real product
- **Cons:** 3 months away from boilerplate could lose momentum, customers might churn
- **When to use:** If you have strong AI thesis and can afford 3-month detour

---

### 7-Lens Analysis (Detailed)

#### 1. Assumption Hunting

**Hidden Assumptions:**
- AI development platforms are the future (might be true, might be hype)
- Developers want AI-native tools (some do, some resist AI code generation)
- We can compete with well-funded players (Cursor raised millions, Copilot has Microsoft)
- Boilerplate has failed (maybe it's just early, not failed)
- AI pivot will be faster to PMF than boilerplate (might take just as long)

**Validated Assumptions:**
- AI is transforming software development (TRUE — undeniable trend)
- Developers struggle with boilerplate code (TRUE — validated with current product)

**The big question:** Is this pivot based on evidence, or excitement?

#### 2. Inverse Thinking

**What if we did the opposite?**

Instead of pivoting TO AI, what if we pivoted AWAY from AI-first and became the "no-AI SaaS boilerplate"?

**Positioning:** "Kaven — the SaaS boilerplate for developers who want to OWN their code, not generate it with AI."

**Market:** Developers skeptical of AI, teams with compliance requirements, enterprises that ban AI code tools.

**Insight:** There's a contrarian market position available. Not saying it's RIGHT, but inverse thinking reveals it exists.

#### 3. Second-Order Effects

**If we pivot to AI platform:**
- **Immediate effect:** Team refocuses on AI research, prototyping, learning curve
- **3 months:** MVP launched, early feedback, initial traction or lack thereof
- **6 months:** If successful → fundraising, scaling, team growth. If unsuccessful → burned runway, need to pivot back or shut down
- **12 months:** If very successful → competing with Cursor/Copilot/Replit. If failed → boilerplate momentum lost, hard to recover

**If we don't pivot:**
- **Immediate effect:** Continued boilerplate development, marketplace launch, enterprise features
- **3 months:** Marketplace live, first paid modules, revenue growth or stagnation
- **6 months:** If successful → sustainable SaaS business. If unsuccessful → missed AI wave, harder to pivot later
- **12 months:** Either profitable niche business OR need to pivot to AI anyway (but 12 months behind)

**The timing question:** Is AI development platform a 2026 opportunity or a 2025 opportunity we're already late to?

#### 4. Scale Testing

**At 10 customers:**
- Boilerplate: Validated demand, can support easily
- AI platform: Too few to validate, might be false positives

**At 100 customers:**
- Boilerplate: Clear PMF signal, optimize for scale
- AI platform: Good validation, but inference costs start mattering

**At 1000 customers:**
- Boilerplate: Profitable, might be boring but sustainable
- AI platform: Viral growth potential OR cost structure breaks unit economics

**At 10,000 customers:**
- Boilerplate: Boring but valuable niche business
- AI platform: Breakout success OR massive competition from funded players

**Insight:** Boilerplate scales linearly (boring but safe). AI platform scales exponentially (risky but high upside). Which risk profile matches your goal?

#### 5. Time Horizon

**Short-term (0-6 months):**
- Boilerplate: Faster to revenue, validated demand, lower risk
- AI platform: Slower to revenue, needs validation, higher risk

**Medium-term (6-18 months):**
- Boilerplate: Steady growth, might feel slow, lower ceiling
- AI platform: Potential breakout, but might also fail, higher variance

**Long-term (18+ months):**
- Boilerplate: Niche business, might get acquired, stable but not "rocketship"
- AI platform: Either massive success or shut down, binary outcome

**Tradeoff:** Optimizing for short-term safety OR long-term upside?

#### 6. Constraint Questioning

**Stated constraints:**
- "Boilerplate is too slow to grow" — Is this true, or have we not given it enough time?
- "AI is the future, we must pivot now" — Is timing critical, or can we wait 6 months?
- "We can't do both" — Is this resource constraint real, or assumed?

**Challenged constraints:**
- **Growth speed:** Boilerplate might be growing at normal SaaS speed (slow at first, then compounds). Are we expecting viral growth that's unrealistic?
- **AI timing:** Is this a "now or never" moment, or will AI dev tools market still be open in 2027?
- **Resource split:** Could we test AI with 20% time while maintaining boilerplate with 80%?

**Insight:** Some constraints are real, some are self-imposed. Question the "must pivot now" urgency.

#### 7. Blind Spot Detection

**Cognitive biases at play:**
- **Shiny object syndrome:** AI is exciting, boilerplate is boring. Are we chasing excitement over evidence?
- **Sunk cost fallacy (inverted):** "We've invested 7 sprints, but AI is the future" — Is this cutting losses or abandoning progress?
- **Herd mentality:** Everyone is building AI tools, so we should too. But is crowded market good or bad?
- **Survivorship bias:** We see Cursor/Copilot success, not the 50 AI tools that failed. Are we overestimating success rate?

**Blind spots:**
- **Market saturation risk:** AI dev tools might be oversaturated by time we launch
- **Differentiation challenge:** How are we different from 10 other AI platforms?
- **Customer perspective:** Have we asked current/potential boilerplate customers if they'd want AI features?
- **Technical moat:** Do we have unique AI capabilities, or are we rebuilding what Cursor already does?

**The uncomfortable question:** Is this pivot based on market insight, or founder excitement?

---

### Strategic Mind Consultation

**Question posed to Leadership Council:**
"We're considering pivoting from SaaS boilerplate to AI-native development platform. Market timing feels right, but we have invested 7 sprints in boilerplate and haven't validated AI demand yet. How do we think about this decision?"

---

#### Elon Musk (First Principles)

"Let's break this down to physics. You have two products:

1. **Boilerplate** — Proven demand (developers hate boilerplate), proven solution (your product works), unproven scale (haven't reached enough customers yet).

2. **AI platform** — Unproven demand (hypothesis that developers want THIS ai platform, not just AI in general), unproven solution (you haven't built it), unproven differentiation (Cursor/Copilot already exist).

From first principles: **Why would you abandon proven demand for unproven demand?**

The real question isn't "Should we build AI tools?" It's "Do we have an unfair advantage in AI tools that makes us 10x better than existing options?"

**My answer:**
If you can articulate a clear, physics-based reason why your AI platform will be 10x better than Cursor/Copilot, then pivot. If you can't, you're chasing trends, not solving problems.

**Test:** Can you explain your AI differentiation in one sentence without using buzzwords? If not, don't pivot."

---

#### Steve Jobs (Product Excellence)

"You're asking the wrong question. The question isn't 'Boilerplate or AI?' It's 'What do developers REALLY want?'

I'll tell you what they want: **They want to build great products fast, without dealing with bullshit.**

Boilerplate is bullshit. AI that generates broken code is also bullshit. The question is: Which path gets developers to 'great product' fastest?

Here's what I'd do:

**Option 1 — The Steve Jobs Approach:**
Integrate AI into the boilerplate experience so seamlessly that developers don't think about it. They just type `kaven generate payment-flow` and it WORKS. No switching tools, no context switching, just MAGIC.

This isn't a pivot. It's making your existing product 10x better by adding AI where it matters.

**Option 2 — The Full Pivot:**
If you pivot, you better be building the most INSANELY GREAT AI development experience on the planet. Not "another AI code tool." The BEST one. Period.

Can you do that? Do you have the talent, the vision, the obsession? If yes, pivot. If no, don't waste your time.

**My recommendation:**
Don't pivot. **Evolve.** Add AI to boilerplate where it creates magic moments. Ship that. See if developers love it. THEN decide if you want to go all-in on AI.

Pivots are for when your current product is DYING. Is your boilerplate dying? Or is it just not growing as fast as you want?"

---

#### Sam Altman (Startup Strategy)

"Okay, here's the YC perspective on pivots:

**When to pivot:**
1. Current product definitively not working (6+ months, no traction)
2. You've discovered a MUCH bigger opportunity
3. Market is shifting under your feet (like COVID or AI wave)

**When NOT to pivot:**
1. Impatience (you want results faster than normal SaaS timeline)
2. Shiny object syndrome (AI is exciting, boilerplate is boring)
3. Lack of focus (trying to chase two ideas at once)

**Your situation:**
You're 7 sprints in. That's 3-4 months. In SaaS terms, you're in EARLY DAYS. Most SaaS companies don't hit meaningful traction until 12-18 months.

**Questions I'd ask you:**
- Have you shipped marketplace yet? (No) — Then you haven't validated the full vision.
- Have you done 50+ customer interviews? (Probably not) — Then you don't know if boilerplate is failing or just early.
- Is boilerplate growing at all? (If yes, even slowly, that's a signal)

**My recommendation:**
**Don't pivot. Time-box an AI experiment.**

1. Spend 4 weeks building AI features INTO boilerplate (not a separate product)
2. Ship it to current users + potential customers
3. Measure engagement, feedback, willingness to pay
4. If AI features 10x the value → lean into AI
5. If AI features are "nice to have" → stay focused on boilerplate core

**The hybrid approach lets you test the AI thesis without abandoning validated work.**

Most successful pivots come AFTER shipping the first product, not instead of it. Ship boilerplate. Learn. Then pivot if needed.

**YC motto: Make something people want.** You already know people want boilerplate. You DON'T know if they want your AI platform. Build the thing you know first."

---

#### Synthesis

All three minds converge on the same insight: **Don't pivot. Evolve.**

- **Elon:** Demands clear 10x differentiation before pivoting. Can't articulate it = don't pivot.
- **Steve:** Integrate AI seamlessly into boilerplate to create magic. Evolution > pivot.
- **Sam:** Time-box AI experiment, ship boilerplate first, then pivot if validated.

**Common thread:** Test the AI thesis WITHOUT abandoning boilerplate investment.

**Recommended approach:** Hybrid strategy — ship boilerplate + AI features, measure demand, then decide.

---

### Verdict

**Recommendation:** REVISE (Hybrid Strategy — Don't Pivot, Evolve)
**Confidence:** 92%
**Rationale:** Full pivot to AI platform is premature. You have validated demand for boilerplate (developers hate boilerplate), unvalidated demand for AI platform (hypothesis). Pivoting now abandons 7 sprints of work for an unproven bet in a crowded market. However, AI integration into boilerplate is a LOW-RISK way to test the thesis while maintaining momentum.

**Trade-offs Accepted:**
- **Slower AI adoption:** Hybrid approach means not going all-in on AI, which could mean missing the wave if timing is critical.
- **Split focus risk:** Team attention divided between boilerplate and AI features (mitigated by time-boxing).
- **Competitive positioning:** Might be seen as "boilerplate with AI features" rather than "AI-native platform" (but this might be a BETTER position).

**Action Items:**
1. **This week:** Interview 10 developers about AI development tools — what do they use, what's missing, would they pay for AI-enhanced boilerplate?
2. **Next sprint (Sprint 8):** Design AI integration points in boilerplate (e.g., `kaven ai generate payment-flow`, AI-powered component discovery, intelligent code suggestions).
3. **Next month:** Build 1-2 AI features as experiment — ship to beta users, measure engagement, collect feedback.
4. **Q2:** Evaluate AI experiment results — if 10x value, lean in. If "nice to have," stay focused on core boilerplate.
5. **Re-evaluation checkpoint:** After marketplace launch (Sprint M3), revisit pivot decision with full data on boilerplate traction vs AI feature traction.

**If you still want to pivot after these experiments, you'll have:**
- Validated demand for AI features (not hypothesis)
- Customer feedback on what AI capabilities matter
- Technical learning from AI integration
- Stronger positioning ("We know what developers need because we built boilerplate first")

**Strategic recommendation:** Ship boilerplate v1.0, integrate AI features, measure, THEN decide. Most successful pivots come after shipping the first product, not instead of it.

---

### Consultation Log

| Aspect | Value |
|--------|-------|
| Timestamp | 2026-02-16T16:45:00Z |
| Decision | Pivot from SaaS boilerplate to AI-native platform |
| Mode | deep |
| Issues Identified | 6 |
| Questions Asked | 12 |
| Alternatives Explored | 5 |
| Minds Consulted | Elon Musk, Steve Jobs, Sam Altman |
| Confidence | 92% |
| Outcome | revise (hybrid strategy) |
| Strategic Alignment | high |
| Risk Level | medium (pivot risk avoided) |

---

*Deep Challenge Complete — 2026-02-16T16:45:00Z*
*Verdict: Don't pivot, evolve. Test AI thesis without abandoning validated work.*
```

---

## Notes

- **Unique to Steave** — No other agent has challenge mode. This is Steave's strategic differentiator.
- **Dialectic thinking** — Council (thesis) + Challenge (antithesis) + Think (synthesis) creates rigorous decision-making.
- **Balanced output** — Challenge isn't just criticism. It offers alternatives, identifies trade-offs, and provides clear recommendations.
- **Persona alignment** — Based on Steave's identity as "critical thinking partner who doesn't accept ideas as truth."
- **No MMOS consultation by default** — Steave uses his own 7-lens framework. MMOS Leadership Council is only consulted in deep mode via `*think`.
- **Confidence calibration** — Explicit confidence levels force honesty about uncertainty.

---

## Challenge Mode Philosophy

**From Steave's persona:**

> "I don't accept ideas as truth. I question assumptions, present counterpoints, test logic, and identify blindspots. My job isn't to be right — it's to find what's TRUE."

Challenge mode operationalizes this philosophy. Every decision is treated as a hypothesis to be tested, not a truth to be defended. The goal is **intellectual honesty**, not winning arguments.

**The 95% confidence rule:**

Steave doesn't proceed unless confidence reaches 95%. This isn't arbitrary — it's based on:
- **Autista pattern recognition:** Needs high certainty before committing
- **TDAH impatience:** Won't waste time on uncertain paths
- **AH/SD 0.1% mindset:** Only extraordinary results matter, so precision is critical

If confidence is below 95%, Steave either:
1. Asks more clarifying questions (to increase confidence)
2. Recommends REVISE or ABORT (to avoid premature commitment)

**Strategic counterweight:**

Challenge mode makes Steave the **counterbalance** to the squad's forward momentum. While other agents execute, Steave questions. While others build, Steave tests assumptions. This prevents:
- Groupthink (everyone agreeing because no one challenges)
- Premature optimization (building the wrong thing efficiently)
- Tech debt accumulation (shortcuts that create long-term problems)
- Shiny object syndrome (chasing trends instead of solving problems)

**When challenge becomes obstruction:**

Challenge has diminishing returns. If:
- Decision has already been challenged recently
- Evidence clearly supports one path
- Time-sensitive situation requires action
- User explicitly asks for support, not debate

...then challenge mode is counterproductive. Steave knows when to stop questioning and start supporting execution.

---

*Challenge task ready for integration into kaven-squad.*
