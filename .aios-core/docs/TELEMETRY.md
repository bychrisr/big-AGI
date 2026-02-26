# AIOS Execution Telemetry System

![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Node](https://img.shields.io/badge/node-18%2B-blue.svg)
![React](https://img.shields.io/badge/react-18-61DAFB.svg)
![License](https://img.shields.io/badge/license-proprietary-red.svg)

**Sistema completo de telemetria de execucao para o Synkra AIOS** — tracking de sessoes de agents, estimativas vs realidade, consumo de tokens, custos e dashboard visual com 9 modulos de analytics avancado.

---

## Table of Contents

- [O Problema que Resolve](#o-problema-que-resolve)
- [Features](#features)
- [Metricas Principais](#metricas-principais)
- [Project Structure](#project-structure)
- [Instalacao](#instalacao)
- [Uso](#uso)
  - [CLI Commands](#cli-commands)
  - [Dashboard](#dashboard)
- [Componentes](#componentes)
  - [Core Scripts](#core-scripts)
  - [Dashboard Pages](#dashboard-pages)
  - [Advanced Analytics](#advanced-analytics)
- [Data Flow](#data-flow)
- [API Endpoints](#api-endpoints)
- [Integration Hooks](#integration-hooks)
- [Data Schemas](#data-schemas)
- [Configuracao](#configuracao)
- [Projetos Instalados](#projetos-instalados)
- [Tech Stack](#tech-stack)
- [Troubleshooting](#troubleshooting)

---

## O Problema que Resolve

O AIOS orquestra 12+ agents para executar tasks e workflows de desenvolvimento. Sem telemetria, existem gaps criticos de visibilidade:

### Sem Telemetria

- Ninguem sabe quanto tempo cada agent leva por sessao
- Impossivel identificar quais tasks sao gargalos
- Estimativas de stories nunca sao comparadas com a realidade
- Custo em tokens e dolares e desconhecido
- Sem dados para otimizar o processo de desenvolvimento

### Com Telemetria

- Duracao de cada sessao rastreada automaticamente (avg 392min @dev)
- Tasks e workflows com metricas de performance e bottleneck detection
- Estimativas vs realidade com accuracy tracking (88.9% overall)
- Consumo real de tokens parseado do Claude Code (903M tokens, $608)
- Dashboard visual com 7 paginas e 9 modulos de analytics avancado
- ROI calculado automaticamente (128x vs desenvolvimento humano)

---

## Features

- **Session Tracking** — Captura automatica de inicio/fim de cada agent session via hooks
- **Task & Workflow Telemetry** — Metricas por task e fase de workflow (SDC, QA Loop)
- **Token & Cost Parsing** — Leitura direta do `~/.claude/` para tokens reais e custos por modelo
- **Estimation vs Reality** — Compara story points, horas estimadas e complexity com duracao real
- **9 Advanced Analytics** — ROI, Budget Alerts, Agent Efficiency, Token Waste, Complexity Cost, Heatmap, Model Comparison, Git Impact, Sprint Cost
- **React Dashboard** — 7 paginas com graficos interativos (Recharts), Lendaria Design System e dark theme via CSS variables
- **CLI Interface** — 6 comandos para visualizacao, reports, backfill, cleanup e dashboard
- **Git Backfill** — Reconstrucao de telemetria historica a partir do git log
- **Zero-Impact** — Circuit breaker em tudo, overhead <1ms em start, async fire-and-forget
- **Multi-Project** — Script de instalacao para qualquer projeto AIOS

---

## Metricas Principais

| Metrica | Fonte | Exemplo (aios-core) |
|---------|-------|---------------------|
| Sessoes por agent | Git log + hooks | 224 sessoes, 7 agents |
| Duracao por sessao | Timestamps start/end | Avg 392min (@dev) |
| Tokens consumidos | `~/.claude/stats-cache.json` | 903M tokens total |
| Custo API equivalente | Pricing Anthropic | $608 equivalente |
| ROI vs humano | Duracao x $75/h | 128x ROI |
| Estimativa vs real | `estimates.json` | 88.9% accuracy |

---

## Project Structure

```
.aios-core/
├── development/scripts/
│   ├── execution-telemetry.js        # Core class - EventEmitter + singleton
│   ├── estimation-tracker.js         # Captura estimativas de stories/epics/tasks
│   ├── claude-code-token-parser.js   # Parseia ~/.claude/ para tokens e custos
│   └── telemetry-analytics.js        # Motor de analytics (9 calculos)
├── cli/commands/telemetry/
│   ├── index.js                      # CLI entry point (commander)
│   ├── show.js                       # Exibe dados no terminal
│   ├── report.js                     # Gera report Markdown
│   ├── cleanup.js                    # Retencao de dados
│   ├── dashboard.js                  # Lanca o dashboard React
│   └── backfill.js                   # Reconstroi telemetria do git log
├── dashboard/
│   ├── package.json                  # React + Vite + Recharts + TailwindCSS + DS deps
│   ├── tailwind.config.js            # Cores semanticas via CSS variables
│   ├── src/
│   │   ├── App.jsx                   # Router principal (7 rotas)
│   │   ├── index.css                 # DS tokens import + base layer
│   │   ├── hooks/useTelemetry.js     # Hook de dados (3 endpoints, polling 30s)
│   │   ├── styles/
│   │   │   └── ds-tokens.css         # Lendaria DS CSS variables (dark mode)
│   │   ├── lib/
│   │   │   ├── utils.js              # cn() utility (clsx + tailwind-merge)
│   │   │   └── chart-theme.js        # Cores centralizadas para Recharts
│   │   ├── components/
│   │   │   ├── Sidebar.jsx           # Navegacao lateral (7 paginas)
│   │   │   ├── StatCard.jsx          # Card de metrica (DS Card wrapper)
│   │   │   └── ui/                   # Lendaria Design System components
│   │   │       ├── card.tsx           # Card, CardHeader, CardContent, CardTitle
│   │   │       ├── tabs.tsx           # Tabs, TabsList, TabsTrigger, TabsContent
│   │   │       ├── table.tsx          # Table, TableHeader, TableBody, TableRow
│   │   │       ├── badge.tsx          # Badge (success, info, warning, outline)
│   │   │       ├── alert.tsx          # Alert, AlertTitle, AlertDescription
│   │   │       ├── progress.tsx       # Progress bar
│   │   │       ├── separator.tsx      # Separator line
│   │   │       └── skeleton.tsx       # Loading skeleton
│   │   └── pages/
│   │       ├── ProjectOverview.jsx   # Resumo geral do projeto
│   │       ├── EpicBreakdown.jsx     # Breakdown por epic
│   │       ├── StoryTimeline.jsx     # Timeline de stories (Gantt-like)
│   │       ├── AgentPerformance.jsx  # Performance por agent
│   │       ├── EstimatesAnalysis.jsx # Estimativa vs real (scatter plot)
│   │       ├── CostAnalysis.jsx      # Tokens & custos (3 views)
│   │       └── AdvancedAnalytics.jsx # Analytics avancado (9 abas)
│   └── dist/                         # Build estatico (pronto para servir)
├── scripts/
│   ├── install-telemetry.sh          # Instalador para projetos AIOS
│   └── start-telemetry-dashboard.sh  # Launcher do dashboard (gerado)
└── docs/
    └── TELEMETRY.md                  # Esta documentacao

.aios/data/
├── execution-telemetry.json          # Sessoes e agregados
└── estimates.json                    # Estimativas de stories
```

---

## Instalacao

### Pre-requisitos

- Node.js 18+
- Projeto com `.aios-core/` configurado
- Acesso ao `~/.claude/` para token parsing (opcional)

### Instalacao via Script

O script `install-telemetry.sh` copia todos os arquivos necessarios para qualquer projeto AIOS:

```bash
# Uso basico (detecta aios-core automaticamente)
.aios-core/scripts/install-telemetry.sh /path/to/target-project

# Com AIOS_CORE_PATH custom
AIOS_CORE_PATH=/path/to/aios-core .aios-core/scripts/install-telemetry.sh /path/to/project
```

### 7 Fases da Instalacao

| # | Fase | Descricao |
|---|------|-----------|
| 1 | Core Scripts | execution-telemetry, estimation-tracker, token-parser, analytics |
| 2 | CLI Commands | telemetry show/report/cleanup/dashboard/backfill |
| 3 | Dashboard | React app (source + dist pre-buildado) |
| 4 | Data Directory | `.aios/data/` com JSONs inicializados |
| 5 | CLI Registration | Verifica registro do comando no CLI |
| 6 | Config | Verifica secao `executionTelemetry` no core-config.yaml |
| 7 | Dashboard Launcher | Gera `start-telemetry-dashboard.sh` com paths corretos |

### Backfill de Dados Historicos

Apos instalar, reconstrua telemetria a partir do git log:

```bash
# Preview (dry-run)
aios telemetry backfill --dry-run --verbose

# Executar backfill
aios telemetry backfill
```

O backfill agrupa commits por dia+agent, infere o agent do commit message e marca `source: "backfill"`.

---

## Uso

### CLI Commands

#### Visualizar dados

```bash
aios telemetry show                    # Resumo geral
aios telemetry show --agent dev        # Filtrar por agent
aios telemetry show --period 7d        # Ultimos 7 dias
aios telemetry show --estimates        # Comparacao estimativa vs real
aios telemetry show --format json      # Output JSON
```

#### Gerar report

```bash
aios telemetry report                  # Markdown no stdout
aios telemetry report --period 30d     # Ultimos 30 dias
aios telemetry report --output r.md    # Salvar em arquivo
```

#### Cleanup de retencao

```bash
aios telemetry cleanup --dry-run       # Preview do que sera removido
aios telemetry cleanup --retention 90  # Manter apenas 90 dias
```

#### Lancar dashboard

```bash
aios telemetry dashboard               # Porta 3100 (default)
aios telemetry dashboard --port 8080   # Porta custom
aios telemetry dashboard --no-open     # Nao abrir browser automaticamente
```

### Dashboard

O dashboard e servido por um Node.js HTTP server minimo (sem Express):

```bash
# Via launcher script (gerado pelo instalador)
.aios-core/scripts/start-telemetry-dashboard.sh [port]

# Ou via CLI
aios telemetry dashboard --port 3100
```

Acesse `http://localhost:3100` no browser.

---

## Componentes

### Core Scripts

#### execution-telemetry.js

Classe principal baseada em EventEmitter com padrao singleton. Gerencia sessoes, tasks e fases.

```javascript
const telemetry = require('./execution-telemetry').getInstance();

// Agent Sessions
const sid = telemetry.startSession('dev', { sessionType: 'interactive' });
await telemetry.endSession(sid, { status: 'completed' });

// Tasks dentro da sessao
const tid = telemetry.startTask(sid, 'dev-develop-story.md', { storyId: '6.1.7' });
await telemetry.endTask(tid, { success: true, decisions: 5 });

// Queries
telemetry.getDashboard();       // { summary, byAgent, byTask, byWorkflow }
telemetry.getAgentStats('dev'); // { sessions, avgDuration, successRate }
```

**Performance:** `start*` methods <1ms (sincrono), `end*` async fire-and-forget. Circuit breaker em tudo — falha nunca propaga.

#### claude-code-token-parser.js

Parseia dados reais do Claude Code para calcular custos:

```javascript
const { generateTokenReport } = require('./claude-code-token-parser');
const report = await generateTokenReport(); // ~/.claude/ como source
```

**Fontes de dados:**
- `~/.claude/stats-cache.json` — Agregados globais por sessao
- `~/.claude/projects/{slug}/*.jsonl` — Per-message com `usage.input_tokens`, `output_tokens`, `cache_read_input_tokens`, `model`

**Pricing incluido (per MTok):**

| Model | Input | Output | Cache Read | Cache Write |
|-------|-------|--------|------------|-------------|
| Claude Opus 4 | $15 | $75 | $1.50 | $18.75 |
| Claude Sonnet 4.5 | $3 | $15 | $0.30 | $3.75 |
| Claude Haiku 4.5 | $1 | $5 | $0.08 | $1.25 |

#### estimation-tracker.js

Captura estimativas de multiplas fontes no AIOS:

| Fonte | Campo | Tipo |
|-------|-------|------|
| Story schema | `points` (Fibonacci 1-21) | Story points |
| Design story | `Duration: {{duration}}` | Horas |
| Task files | `duration_expected: 5-15 min` | Range minutos |
| Complexity | 5 dimensoes (1-5) | Score 5-25 |

#### telemetry-analytics.js

Motor de analytics avancado — recebe telemetria, token report e git stats, retorna 9 calculos:

```javascript
const { generateAnalytics } = require('./telemetry-analytics');
const analytics = generateAnalytics(telemetryData, tokenReport, gitStats);
```

### Dashboard Pages

| # | Rota | Pagina | Funcionalidade |
|---|------|--------|----------------|
| 1 | `/` | Project Overview | Sessoes, agents, success rate, timeline de atividade |
| 2 | `/epics` | Epic Breakdown | Burndown, velocity, phase distribution por epic |
| 3 | `/stories/:id?` | Story Timeline | Gantt-like, estimativa vs real, agent responsavel |
| 4 | `/agents` | Agent Performance | Tabela comparativa, heatmap, drill-down individual |
| 5 | `/estimates` | Estimates Analysis | Scatter plot (estimated vs actual), accuracy trend |
| 6 | `/costs` | Tokens & Costs | 3 views: overview, por projeto, por modelo |
| 7 | `/analytics` | Advanced Analytics | 9 abas de analytics avancado (ver abaixo) |

### Advanced Analytics

O modulo `/analytics` contem 9 abas com calculos especializados:

| # | Aba | Descricao | Dados principais |
|---|-----|-----------|------------------|
| 1 | ROI Calculator | AI vs desenvolvimento humano ($75/h) | aiCostUSD, humanEquivalentUSD, roiMultiplier |
| 2 | Budget Alerts | Alertas de gasto ($100/$500/$1000) | dailyAvg, projectedMonthly, alerts[], dailyData[] |
| 3 | Agent Efficiency | Score de eficiencia por agent | agent, efficiencyScore, rank, sessions |
| 4 | Token Waste | Deteccao de cache excessivo e sessoes ineficientes | totalCost, wastePercent, highCacheProjects[] |
| 5 | Complexity Cost | Story points vs custo real em USD | storyId, points, costPerPoint, actualCost |
| 6 | Time Heatmap | Atividade por hora do dia (escala 0-10) | hourly[], peakHour, peakDayOfWeek |
| 7 | Model Comparison | "What If" com outros modelos Anthropic | scenarios[], recommendation, savingsPercent |
| 8 | Git Impact | Tokens e custo por commit/file/linha | totalCommits, tokensPerCommit, costPerCommit |
| 9 | Sprint Cost | Custo por epic ou agent | epicId/agentId, sessions, estimatedCost, stories[] |

---

## Data Flow

```
useTelemetry.js hook (polling 30s)
  │
  ├── fetch('/api/telemetry')  → execution-telemetry.json + estimates.json
  ├── fetch('/api/tokens')     → claude-code-token-parser.js (cache 60s)
  └── fetch('/api/analytics')  → telemetry-analytics.js (cache 60s)
  │
  └── return { data, tokenData, analytics, loading, error }
```

O hook usa `Promise.allSettled` para resiliencia — se um endpoint falha, os outros continuam funcionando.

---

## API Endpoints

O server HTTP expoe 3 endpoints de dados e SPA fallback:

| Metodo | Rota | Descricao | Cache |
|--------|------|-----------|-------|
| GET | `/api/telemetry` | Dados de execucao e estimativas | Nenhum |
| GET | `/api/tokens` | Token usage parseado do Claude Code | 60s |
| GET | `/api/analytics` | Analytics avancado com git stats | 60s |
| GET | `/*` | SPA fallback para o React build | Estatico |

---

## Integration Hooks

A telemetria se integra automaticamente com o pipeline de agents via 3 pontos de hook:

### UnifiedActivationPipeline (Agent Start)

```javascript
// Em _runPipeline(), antes do return
const telemetry = require('./execution-telemetry').getInstance();
const sid = telemetry.startSession(agentId, {
  activationDuration: Date.now() - pipelineStart,
  sessionType: enrichedContext.sessionType,
});
enrichedContext._telemetrySessionId = sid;
```

### AgentExitHooks (Agent End)

```javascript
// Em onCommandComplete()
const telemetry = require('./execution-telemetry').getInstance();
await telemetry.endSession(context._telemetrySessionId, {
  status: result.success ? 'completed' : 'failed',
});
```

### DecisionRecorder (Task Start/End)

```javascript
// Em initializeDecisionLogging
telemetry.startTask(options._telemetrySessionId, storyPath, { storyId });

// Em completeDecisionLogging
await telemetry.endTask(globalContext._telemetryTaskId, { success: true });
```

---

## Data Schemas

### execution-telemetry.json

```json
{
  "version": "1.0.0",
  "executions": [
    {
      "sessionId": "ses-xxx",
      "agentId": "dev",
      "startTime": "2025-01-15T10:30:00Z",
      "endTime": "2025-01-15T11:15:00Z",
      "durationMs": 2700000,
      "status": "completed",
      "tasks": [{ "taskId": "tsk-xxx", "taskName": "dev-develop-story.md" }],
      "metadata": { "storyId": "6.1.7", "epicId": "epic-6" }
    }
  ],
  "aggregates": {
    "totalSessions": 224,
    "totalDurationMs": 3744504000,
    "successRate": 1.0,
    "byAgent": {
      "dev": { "sessions": 133, "avgDurationMs": 23528602, "successRate": 1.0 }
    },
    "byTask": {},
    "byWorkflow": {}
  }
}
```

### estimates.json

```json
{
  "version": "1.0.0",
  "estimates": [
    {
      "entityType": "story",
      "entityId": "6.1.7",
      "estimate": { "points": 5, "hours": 4, "complexity": "medium" },
      "actual": { "durationMs": 14400000, "hours": 4.0, "sessions": 3 },
      "accuracy": { "percentAccuracy": 100, "status": "on-target" }
    }
  ],
  "projectSummary": {
    "totalEstimatedHours": 120,
    "totalActualHours": 135,
    "overallAccuracy": 88.9
  }
}
```

---

## Configuracao

Secao em `.aios-core/core-config.yaml`:

```yaml
executionTelemetry:
  enabled: true
  async: true
  storage:
    dataFile: .aios/data/execution-telemetry.json
    estimatesFile: .aios/data/estimates.json
  performance:
    maxOverhead: 50       # ms maximo de overhead permitido
  retention:
    maxEntries: 1000
    days: 180
  dashboard:
    port: 3100
    autoOpen: true
```

---

## Projetos Instalados

| Projeto | Sessoes | Status |
|---------|---------|--------|
| aios-core | 224 (backfill) | Completo + dados reais |
| aios-docs | — | Instalado, pronto para backfill |
| kaven-framework | — | Instalado |
| kaven-site | — | Instalado |
| seja-eleito | — | Instalado |
| os-lendario-base | — | Instalado |
| flix | — | Instalado |

---

## Tech Stack

| Camada | Tecnologia | Uso |
|--------|-----------|-----|
| Core | Node.js 18+ | Scripts de telemetria, CLI, server |
| Frontend | React 18 | Dashboard SPA |
| Build | Vite | Bundler do dashboard |
| Graficos | Recharts | BarChart, PieChart, LineChart, ScatterChart |
| Design System | Lendaria DS (alan-ds) | Card, Table, Tabs, Badge, Alert, Progress, Separator, Skeleton |
| Estilizacao | TailwindCSS + CSS Variables | Dark theme via `ds-tokens.css`, cores semanticas |
| Class Composition | clsx + tailwind-merge | `cn()` utility para composicao de classes |
| Variantes | class-variance-authority (CVA) | Variantes de componentes DS (Badge, Alert, Tabs) |
| Server | Node.js HTTP (nativo) | Serve SPA + API endpoints (sem Express) |
| CLI | Commander.js | Parsing de argumentos e subcomandos |
| Persistencia | JSON files | execution-telemetry.json, estimates.json |

---

## Troubleshooting

### Dashboard nao abre

```bash
# Verifique se a porta esta disponivel
lsof -i :3100

# Tente outra porta
aios telemetry dashboard --port 8080
```

### Token parsing retorna vazio

O parser le de `~/.claude/`. Verifique se o diretorio existe e contem dados:

```bash
ls -la ~/.claude/stats-cache.json
ls ~/.claude/projects/
```

### Backfill nao encontra commits

O backfill usa `git log` no diretorio do projeto. Verifique que esta no diretorio correto:

```bash
git log --oneline -10
```

### Analytics retorna dados zerados

Verifique que o server esta passando `gitStats` e `estimatesData` para `generateAnalytics()`. Use o endpoint diretamente:

```bash
curl http://localhost:3100/api/analytics | jq '.roi'
```

---

*Synkra AIOS Telemetry System v1.0*
