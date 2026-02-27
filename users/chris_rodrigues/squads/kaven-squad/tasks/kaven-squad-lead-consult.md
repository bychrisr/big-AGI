---
task: consult()
responsavel: "@kaven-squad-lead"
responsavel_type: agent
atomic_layer: task
Entrada:
  - council: string # Council to consult: design|architecture|product|growth|quality
  - question: string # The question or decision to consult on
  - minds: list # Optional: specific minds to consult
  - mode: string # Optional: "single" | "duo" | "roundtable" (default: depends on council)
  - context: string # Optional: current context for the decision
  - framework: string # Optional: debate framework (default: "steel_man")
Saida:
  - council_output: string # Output from the selected council
  - delegation_log: string # Tracking of which council was invoked
  - recommendation: string # Consolidated recommendation
  - action_items: list # Concrete implementation steps
Checklist:
  - "[ ] Parse council name from input"
  - "[ ] Validate council exists in routing map"
  - "[ ] Extract question and optional parameters"
  - "[ ] Delegate to specific council task"
  - "[ ] Return council output to user"
  - "[ ] Log delegation for telemetry"
---

# consult()

**Generic router to any council** — Steave's meta-command that provides a unified entry point for all cross-squad consultations. Instead of remembering which command to use for each council, users can use `*consult {council} {question}` to route to any of the 5 councils.

## Purpose

This is a **strategic orchestration tool** that makes Steave the central hub for all domain expertise. Users don't need to know:
- Which agent owns which council
- What the specific command syntax is for each council
- Which minds are available in each council

The generic router handles all routing logic internally and delegates to the appropriate specialist.

## Usage

```
@kaven-squad-lead *consult design "Should we use a sidebar or top-nav layout for the dashboard?"
@kaven-squad-lead *consult architecture "How should we structure our test infrastructure?"
@kaven-squad-lead *consult product "Should we build feature X or Y first?"
@kaven-squad-lead *consult growth "How do we position Kaven against competitors?"
@kaven-squad-lead *consult quality "What's the minimum coverage for this module?"
```

**With options**:
```
@kaven-squad-lead *consult design "Navigation layout?" --mode duo --minds brad_frost,don_norman
@kaven-squad-lead *consult architecture "Test infra?" --framework socratic
@kaven-squad-lead *consult product "Feature priority?" --minds marty_cagan --mode single
@kaven-squad-lead *consult growth "Pricing strategy?" --mode roundtable --framework steel_man
@kaven-squad-lead *consult quality "TDD approach?" --minds kent_beck --mode single
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `council` | string | yes | Which council to consult: `design`, `architecture`, `product`, `growth`, or `quality` |
| `question` | string | yes | The question or decision to consult on |
| `minds` | list | no | Specific minds to consult (default: all minds in council) |
| `mode` | string | no | `single` (1 mind), `duo` (2 minds), `roundtable` (3+ minds). Default depends on council |
| `context` | string | no | Current context for the decision (code, feature, story) |
| `framework` | string | no | Debate framework: `steel_man` (default), `socratic`, `hegelian` |

## Supported Councils

| Council | Owner Agent | Command | Minds | Best For |
|---------|-------------|---------|-------|----------|
| **design** | Pixel (kaven-frontend-dev) | `*consult-design` | Brad Frost, Don Norman, Julie Zhuo, Michael Bierut | UX/UI decisions, component design, design systems, visual identity |
| **architecture** | Atlas (kaven-architect) | `*consult-architecture` | Mitchell Hashimoto, Kent Beck, Guillermo Rauch | Infrastructure, testing architecture, DX, system design |
| **product** | Steave (kaven-squad-lead) | `*consult-product` | Marty Cagan, Jeff Patton, Cagan-Patton | Discovery, story mapping, product strategy, feature validation |
| **growth** | Steave (kaven-squad-lead) | `*consult-growth` | Seth Godin, Alex Hormozi, Eugene Schwartz, Paul Graham | Positioning, pricing, copywriting, GTM strategy, growth hacking |
| **quality** | Shield (kaven-qa) | `*consult-quality` | Kent Beck, Daniel Kahneman | Testing strategy, TDD, risk analysis, coverage decisions |

## Council Routing Map

```yaml
councils:
  design:
    owner: kaven-frontend-dev
    task: kaven-frontend-dev-consult-design.md
    command: "*consult-design"
    minds: 4
    default_mode: roundtable
    description: "UX/UI decisions, component design, design systems"

  architecture:
    owner: kaven-architect
    task: kaven-architect-consult-architecture.md
    command: "*consult-architecture"
    minds: 3
    default_mode: roundtable
    description: "Infrastructure, testing architecture, DX, system design"

  product:
    owner: kaven-squad-lead
    task: kaven-squad-lead-consult-product.md
    command: "*consult-product"
    minds: 3
    default_mode: roundtable
    description: "Discovery, story mapping, product strategy, validation"

  growth:
    owner: kaven-squad-lead
    task: kaven-squad-lead-consult-growth.md
    command: "*consult-growth"
    minds: 4
    default_mode: roundtable
    description: "Positioning, pricing, copywriting, GTM strategy"

  quality:
    owner: kaven-qa
    task: kaven-qa-consult-quality.md
    command: "*consult-quality"
    minds: 2
    default_mode: duo
    description: "Testing strategy, TDD, risk analysis, coverage"
```

## Implementation Steps

### Step 1: Parse Command Input

Extract the council name and question from the command invocation. Handle both positional and flag-based syntax:

**Positional syntax**:
```
*consult architecture "How should we structure our test infrastructure?"
→ council="architecture", question="How should we structure our test infrastructure?"
```

**Flag syntax**:
```
*consult --council architecture --question "Test infrastructure?" --mode duo
→ council="architecture", question="Test infrastructure?", mode="duo"
```

**Optional parameters**:
- `--minds {mind1},{mind2}` → minds list
- `--mode {single|duo|roundtable}` → consultation mode
- `--framework {steel_man|socratic|hegelian}` → debate framework
- `--context "..."` → additional context

### Step 2: Validate Council Name

Check if the council name exists in the routing map. Valid councils:
- `design`
- `architecture`
- `product`
- `growth`
- `quality`

**Invalid council error**:
```
Unknown council 'marketing'. Available councils:
- design (UX/UI decisions, component design)
- architecture (Infrastructure, testing, DX)
- product (Discovery, story mapping, strategy)
- growth (Positioning, pricing, GTM)
- quality (Testing strategy, TDD, coverage)

Usage: *consult {council} {question} [options]
```

**Empty question error**:
```
Question cannot be empty. Usage: *consult {council} {question}

Example: *consult design "Should we use sidebar or topnav?"
```

### Step 3: Determine Target Agent and Task

Use the routing map to identify:
1. **Owner agent** — which agent to delegate to
2. **Task file** — which task to invoke
3. **Command** — what command to use

```javascript
const routing = councils[councilName];
const targetAgent = routing.owner;        // e.g., "kaven-architect"
const taskFile = routing.task;             // e.g., "kaven-architect-consult-architecture.md"
const command = routing.command;           // e.g., "*consult-architecture"
```

### Step 4: Prepare Delegation Parameters

Forward all optional parameters to the target council:
- `minds` → pass through if specified, otherwise use council's default
- `mode` → pass through if specified, otherwise use council's default
- `framework` → pass through if specified, otherwise use `steel_man`
- `context` → pass through if specified

**Parameter forwarding**:
```
Input:  *consult design "Layout?" --mode duo --minds brad_frost,don_norman
Delegate to: @kaven-frontend-dev *consult-design "Layout?" --mode duo --minds brad_frost,don_norman
```

### Step 5: Delegate to Specific Council

**For cross-agent councils** (design, architecture, quality):
```
Invoke: @{owner} {command} "{question}" {options}

Example:
  *consult architecture "Test infra?" --mode duo
  → @kaven-architect *consult-architecture "Test infra?" --mode duo
```

**For self-invoked councils** (product, growth):
```
Direct invoke: {command} "{question}" {options}

Example:
  *consult product "Feature X or Y?" --minds cagan
  → *consult-product "Feature X or Y?" --minds cagan
```

The target council task will execute its full consultation workflow (load minds, debate, synthesize, return output).

### Step 6: Return Output and Log Delegation

**Output format**:
```markdown
## Council Consultation via Generic Router

**Council**: {council}
**Owner**: {agent} (@{agent_id})
**Question**: {question}
**Delegated at**: {ISO timestamp}

---

{council_output}

---

### Delegation Log

| Field | Value |
|-------|-------|
| Timestamp | {ISO timestamp} |
| Council | {council} |
| Owner | {agent} |
| Command | {command} |
| Question | {question} |
| Options | {options_summary} |
| Status | completed |
```

**Telemetry event** (optional, if telemetry enabled):
```javascript
{
  event: "council_consultation_routed",
  council: councilName,
  owner: targetAgent,
  mode: mode || routing.default_mode,
  timestamp: new Date().toISOString()
}
```

## Usage Examples

### Design Council

**Question**: "Should we use a sidebar or top-nav layout for the Tenant App dashboard?"

**Command**:
```
@kaven-squad-lead *consult design "Should we use a sidebar or top-nav layout?"
```

**What happens**:
1. Router validates "design" council exists
2. Identifies owner: Pixel (kaven-frontend-dev)
3. Delegates to: `@kaven-frontend-dev *consult-design "Should we use a sidebar or top-nav layout?"`
4. Pixel loads 4 design minds (Frost, Norman, Zhuo, Bierut) in roundtable mode
5. Returns design recommendation with action items
6. Router logs delegation

### Architecture Council

**Question**: "How should we structure our test infrastructure for the marketplace?"

**Command**:
```
@kaven-squad-lead *consult architecture "Test infrastructure for marketplace?" --mode duo --minds mitchell_hashimoto,kent_beck
```

**What happens**:
1. Router validates "architecture" council exists
2. Identifies owner: Atlas (kaven-architect)
3. Delegates to: `@kaven-architect *consult-architecture "Test infrastructure for marketplace?" --mode duo --minds mitchell_hashimoto,kent_beck`
4. Atlas loads 2 architecture minds in duo mode
5. Returns architecture decision with implementation steps
6. Router logs delegation

### Product Council

**Question**: "Should we build self-service onboarding or marketplace first?"

**Command**:
```
@kaven-squad-lead *consult product "Self-service onboarding or marketplace first?"
```

**What happens**:
1. Router validates "product" council exists
2. Identifies owner: Steave (kaven-squad-lead) — **self-invocation**
3. Steave directly invokes: `*consult-product "Self-service onboarding or marketplace first?"`
4. Loads 3 product minds (Cagan, Patton, Cagan-Patton) in roundtable mode
5. Returns product recommendation with prioritization
6. Router logs delegation

### Growth Council

**Question**: "What's the best positioning for Kaven against competitors?"

**Command**:
```
@kaven-squad-lead *consult growth "Positioning vs competitors?" --framework steel_man
```

**What happens**:
1. Router validates "growth" council exists
2. Identifies owner: Steave (kaven-squad-lead) — **self-invocation**
3. Steave directly invokes: `*consult-growth "Positioning vs competitors?" --framework steel_man`
4. Loads 4 growth minds (Godin, Hormozi, Schwartz, Graham) in roundtable mode
5. Returns growth strategy with messaging
6. Router logs delegation

### Quality Council

**Question**: "What's the minimum test coverage for the licensing module?"

**Command**:
```
@kaven-squad-lead *consult quality "Min coverage for licensing module?" --mode single --minds kent_beck
```

**What happens**:
1. Router validates "quality" council exists
2. Identifies owner: Shield (kaven-qa)
3. Delegates to: `@kaven-qa *consult-quality "Min coverage for licensing module?" --mode single --minds kent_beck`
4. Shield loads Kent Beck in single mode
5. Returns quality recommendation with coverage targets
6. Router logs delegation

## Error Handling

| Error | Response |
|-------|----------|
| **Council not found** | `Unknown council '{name}'. Available councils: design, architecture, product, growth, quality` |
| **Empty question** | `Question cannot be empty. Usage: *consult {council} {question}` |
| **Invalid mode** | `Invalid mode '{mode}'. Valid modes: single, duo, roundtable` |
| **Invalid framework** | `Invalid framework '{framework}'. Valid frameworks: steel_man, socratic, hegelian` |
| **Invalid minds** | `Invalid mind '{mind}' for {council} council. See *help for valid minds.` |
| **Target agent unavailable** | `Council owner ({agent}) is unavailable. Try calling the specific command directly: {command}` |

## When to Use Generic Router vs Specific Command

| Scenario | Use | Why |
|----------|-----|-----|
| Don't know which council to use | `*consult` | Router guides to right council |
| Exploring available councils | `*consult` | User-friendly entry point |
| Quick ad-hoc consultation | `*consult` | Less mental overhead |
| Frequent user of a specific council | Specific command | More direct, saves delegation overhead |
| Scripting/automation | Specific command | Predictable behavior |
| Building workflows | Specific command | Explicit dependencies |

**Rule of thumb**: Use `*consult` for **discovery and exploration**, use specific commands (`*consult-design`, `*consult-architecture`, etc.) for **repeated and scripted** operations.

## Cross-Squad Protocol

This task implements the **meta-router pattern** for cross-squad consultations. Key principles:

1. **Centralized entry point**: All council consultations can be initiated through Steave
2. **Transparent delegation**: Users see which agent/council was invoked
3. **Parameter forwarding**: All options pass through unchanged to target council
4. **Self-invocation awareness**: Product/Growth councils don't create redundant delegation layers
5. **Traceable**: All delegations are logged in the output
6. **Composable**: Other agents can reference this pattern for their own meta-commands

## Benefits

**For users**:
- Single command to remember (`*consult`)
- Don't need to know squad internal structure
- Consistent syntax across all councils
- Helpful error messages guide to correct usage

**For squad**:
- Steave becomes central orchestrator
- Clear separation of concerns (each agent owns their council)
- Easy to add new councils (just update routing map)
- Delegation is explicit and trackable

**For cross-squad integration**:
- Establishes pattern for other squads to adopt
- Makes Kaven Squad knowledge accessible via unified API
- Enables future automation (e.g., AI chooses council based on question)

## Future Enhancements

### Auto-Routing (AI-Powered)

Instead of requiring explicit council name, analyze the question to auto-route:

```
*consult "How should we design the navigation?"
→ Auto-detects: design-related question → routes to Design Council
```

### Multi-Council Consultations

Support consulting multiple councils on the same question:

```
*consult design,architecture "How to structure the component library?"
→ Consults both Design and Architecture councils, synthesizes responses
```

### Consultation History

Track consultation history for pattern analysis:

```
*consult-history
→ Shows last 10 consultations with outcomes and action item completion status
```

### Recommendation Engine

Based on consultation history, suggest which council to use:

```
User: "How should we handle caching?"
Steave: "Based on past consultations, this is likely an architecture question. Should I route to Architecture Council? (yes/no)"
```
