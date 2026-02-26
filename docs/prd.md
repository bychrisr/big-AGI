# teamAI — Product Requirements Document

> **Versão:** 1.0 | **Data:** 2026-02-26 | **Autor:** Morgan (PM Agent) | **Status:** Aprovado
> **Tipo:** Brownfield Enhancement — big-AGI fork + novo repo teamai
> **Fonte:** teamAI-Master-Architecture.md v3.0

---

## Índice

1. [Análise do Projeto Existente](#1-análise-do-projeto-existente)
2. [Visão e Objetivos](#2-visão-e-objetivos)
3. [Requisitos Funcionais](#3-requisitos-funcionais)
4. [Requisitos Não-Funcionais](#4-requisitos-não-funcionais)
5. [Restrições de Compatibilidade](#5-restrições-de-compatibilidade)
6. [Metas de Interface](#6-metas-de-interface)
7. [Restrições Técnicas](#7-restrições-técnicas)
8. [Estrutura de Epics](#8-estrutura-de-epics)
9. [Métricas de Sucesso](#9-métricas-de-sucesso)
10. [Change Log](#10-change-log)

---

## 1. Análise do Projeto Existente

### 1.1 Estado Atual

Este repositório é o **fork do big-AGI** (`bychrisr/big-agi`), atualmente na branch `migration`. O big-AGI é uma aplicação Next.js 15 com:

- Multi-model AI chat (Claude, Gemini, OpenAI)
- Sistema de Personas nativas
- Beam (scatter/gather para múltiplos modelos em paralelo)
- AIX — framework de streaming real-time
- Auth via HTTP Basic Auth (a substituir)
- API keys armazenadas em localStorage (a migrar)
- Self-host via Docker

### 1.2 Stack Atual

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15, React 18, Material-UI Joy |
| State | Zustand + IndexedDB |
| API | tRPC, Edge Runtime |
| AI | AIX streaming framework |
| Auth | HTTP Basic Auth (padrão big-AGI) |
| Storage | localStorage / IndexedDB |

### 1.3 Tipo de Enhancement

- [x] Nova funcionalidade significativa (sistema de minds, clone, memória)
- [x] Integração com novos sistemas (Supabase, Python debate_engine)
- [x] Substituição de Auth (HTTP Basic → Supabase Auth)
- [x] Criação de repo companion (`bychrisr/teamai`)

### 1.4 Impacto

**Impacto Major** — mudanças arquiteturais substanciais:
- Substituição do sistema de Auth
- Redirecionamento de API keys
- Customização profunda do Beam
- Novas rotas API integradas com Python e Supabase

---

## 2. Visão e Objetivos

### O que é o teamAI

**teamAI** é um sistema pessoal de inteligência cognitiva self-hostado. Combina:
- **27+ minds** — clones cognitivos de thought leaders (Hormozi, Musk, Graham, etc.)
- **Agents especializados** por projeto — squads com papéis definidos (architect, dev, qa, etc.)
- **Clone do usuário** — DNA Mental construído incrementalmente via exportações de LLMs + checkpoints
- **Aprendizado contínuo** — memória explícita + checkpoints silenciosos + extração de DNA

O MMOS (Mind Mapper OS) é o motor cognitivo. O teamAI é a camada que une tudo: UI, usuários, projetos, memória e frontend.

### Objetivos do Produto

| # | Objetivo | KPI |
|---|---------|-----|
| O1 | Debates entre minds sem estourar context window | Debate 5 minds < 60k tokens |
| O2 | Agents que aprendem e lembram entre sessões | Memória persistida e aplicada |
| O3 | Clone do usuário progressivamente fiel | Fidelidade 40% após onboarding |
| O4 | Isolamento completo entre usuários | Zero cross-contamination de dados |
| O5 | Self-host simples via Docker | Deploy em < 30 min |
| O6 | Cada usuário usa sua própria API key | Zero custo compartilhado de API |

### Background

Chris Rodrigues identificou que ferramentas de IA existentes não capturam identidade cognitiva nem permitem consultar múltiplos thought leaders em paralelo de forma estruturada. O teamAI resolve isso ao clonar cognitivamente thought leaders como personas consultáveis, permitir debates estruturados entre eles, e construir progressivamente um clone do próprio usuário.

---

## 3. Requisitos Funcionais

### FR — Sistema de Minds

- **FR1:** O sistema deve servir os 27+ minds do MMOS como personas no big-AGI, com system prompt e KB por mind.
- **FR2:** Cada consulta a um mind deve comprimir o KB para ≤ 8k tokens relevantes ao tópico (KB compression).
- **FR3:** O sistema deve suportar minds personalizados por usuário, além dos compartilhados do MMOS.
- **FR4:** A rota `/api/minds` deve retornar apenas os minds disponíveis para o usuário autenticado.

### FR — Debates (Beam)

- **FR5:** O Beam deve ser customizável para usar system prompt de minds em vez de apenas trocar o modelo LLM.
- **FR6:** O debate_engine Python deve orquestrar debates com session caching (system prompt carregado 1x por sessão).
- **FR7:** Debates com minds leves (< 20k tokens) devem suportar multi-persona call em chamada única.
- **FR8:** Sessões de debate devem ser persistidas no Supabase e reabríveis via `*resume [session_id]`.
- **FR9:** A rota `/api/debate` deve autenticar via Supabase JWT antes de chamar o debate_engine.

### FR — Autenticação e API Keys

- **FR10:** A autenticação deve usar Supabase Auth (substituindo HTTP Basic Auth do big-AGI).
- **FR11:** API keys dos usuários (Anthropic, Gemini) devem ser armazenadas encriptadas no Supabase, não em localStorage.
- **FR12:** Cada usuário configura suas próprias API keys — nenhuma key compartilhada de admin.
- **FR13:** A rota `/api/clone` deve servir o DNA Mental do usuário autenticado.

### FR — Memória e Aprendizado

- **FR14:** Agents devem suportar comando explícito de memória ("grava na memória que...").
- **FR15:** Checkpoints silenciosos devem rodar em background após cada sessão, identificando padrões com confidence > 0.65.
- **FR16:** Memórias devem ser injetadas no context dos agents nas sessões subsequentes.
- **FR17:** O sistema deve suportar extração de DNA Mental de exportações de ChatGPT e Gemini.
- **FR18:** A rota `/api/memory` deve ler e escrever memórias no Supabase com RLS.

### FR — Clone do Usuário

- **FR19:** O onboarding deve gerar clone inicial com fidelidade ~35% a partir de 5-8 perguntas.
- **FR20:** O clone deve evoluir progressivamente: 40% → 60% → 80% → 94% (meta DNA Mental).
- **FR21:** Milestones de fidelidade devem gerar notificações ao usuário.
- **FR22:** O clone deve ser versionado no Git (`users/*/clone/`) com espelho no Supabase.

### FR — Multi-Usuário

- **FR23:** Cada usuário deve ter isolamento completo de dados via RLS no Supabase.
- **FR24:** Tiers de usuário: admin (chris_rodrigues), user (guilger_oliveira), guest (futuro).
- **FR25:** Onboarding agent deve guiar novos usuários em < 10 minutos.
- **FR26:** Cada usuário tem seus próprios squads (symlink MMOS + squads próprios).

### FR — Contexto Multi-Projeto

- **FR27:** Agents devem ter acesso ao contexto de todos os projetos do usuário, operando no escopo do projeto ativo.
- **FR28:** CrossProjectContextProvider deve notificar o usuário quando detectar similarity > 0.7 com outro projeto.
- **FR29:** O `CLAUDE.md` de cada projeto deve ser indexado no Supabase como contexto do projeto.

---

## 4. Requisitos Não-Funcionais

- **NFR1:** Consulta a single mind: < 15k tokens (atual ~60k — redução de ~85% via KB compression).
- **NFR2:** Growth Council (5 minds): < 60k tokens (atual ~250k).
- **NFR3:** Debate Oxford (2 minds): < 80k tokens (atual ~150k).
- **NFR4:** Context window máximo Claude Sonnet: 200k — debates com 4+ minds DEVEM usar otimização.
- **NFR5:** Latência de resposta single mind: < 5s para primeira resposta (streaming).
- **NFR6:** Supabase RLS: zero dados cross-user em qualquer query.
- **NFR7:** API keys nunca em logs, client-side ou Git — exclusivamente Supabase encriptado.
- **NFR8:** Deploy Docker em servidor Linux com symlinks preservados nativamente.
- **NFR9:** Sistema operacional com usuário único e sem internet do servidor (air-gapped opcional).

---

## 5. Restrições de Compatibilidade

- **CR1:** Funcionalidades existentes do big-AGI (chat, personas, beam, settings) devem continuar funcionando durante e após a migração.
- **CR2:** A customização do Beam para minds não deve quebrar o uso padrão de Beam com múltiplos modelos.
- **CR3:** As rotas API existentes do big-AGI (`/api/chat`, `/api/llm/*`) não devem ser alteradas — apenas novas rotas adicionadas.
- **CR4:** O schema do IndexedDB existente deve ser preservado — dados de chat do usuário não podem ser perdidos.
- **CR5:** Symlinks do Git devem funcionar após `git clone` em ambiente Linux/Docker.

---

## 6. Metas de Interface

### 6.1 Mudanças no Frontend

| Componente | Tipo | Descrição |
|-----------|------|-----------|
| Settings → API Keys | Modificação | Redirecionar para Supabase (não localStorage) |
| Personas | Modificação | Sync automático com MMOS minds |
| Beam | Modificação | Botão "Start Debate" com seleção de minds |
| Sidebar | Adição | Painel de memória do usuário |
| Onboarding | Adição | Fluxo de 5-8 perguntas para novos usuários |
| Auth | Substituição | Supabase Auth substituindo HTTP Basic Auth |

### 6.2 Consistência Visual

- Seguir o design system existente do big-AGI (Material-UI Joy).
- Novas telas de onboarding e memória devem usar os mesmos componentes base.
- Painel de memória deve ser acessível via sidebar existente.

---

## 7. Restrições Técnicas

### Stack existente

```
Linguagens: TypeScript, JavaScript, Python (debate_engine)
Frameworks: Next.js 15, React 18, tRPC, Zustand
Database: Supabase (PostgreSQL com RLS)
Auth: Supabase Auth (JWT)
AI: Anthropic Claude, Google Gemini (via API keys do usuário)
Deploy: Docker self-host (Linux)
Storage: Supabase Storage (sources dos minds)
```

### Abordagem de integração

- **Database:** Supabase desde o início — sem SQLite transitório.
- **API:** Next.js Route Handlers para as novas rotas; Python via subprocess/container separado.
- **Frontend:** Customizações do big-AGI via hooks e componentes adicionais, sem fork drástico.
- **Testing:** `tsc --noEmit` + `npm run lint` antes de cada commit.

### Deploy e operações

- **Build:** Docker multi-stage com symlinks Git preservados.
- **Deploy:** Servidor Linux, Docker Compose, domínio próprio.
- **Monitoring:** Logs no Supabase + logs locais do container.
- **Config:** `.env` no servidor — nunca commitado.

### Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Debate estoura context window | 4 camadas de otimização de tokens obrigatórias |
| Symlinks quebram no Docker | Linux nativo — Docker é Linux, symlinks preservados |
| Migração de localStorage para Supabase | Manter localStorage como fallback durante transição |
| debate_engine Python + Next.js | Subprocess com timeout; container separado como alternativa |
| API key vazar | RLS + encriptação Supabase; nunca em logs |

---

## 8. Estrutura de Epics

### Decisão de estrutura

O projeto é dividido em **6 epics** correspondendo às fases do roadmap. Cada epic é independente mas sequencial — epic N pode iniciar assim que epic N-1 estiver estável.

| Epic | Nome | Fase | Prioridade |
|------|------|------|-----------|
| Epic 1 | Fundação do Repo teamai | Fase 0 | P0 — Blocker |
| Epic 2 | Debate Engine funcional | Fase 1 | P0 — Core |
| Epic 3 | Frontend teamAI | Fase 2 | P0 — Core |
| Epic 4 | Memória e Aprendizado | Fase 3 | P1 — Importante |
| Epic 5 | Multi-Usuário | Fase 4 | P1 — Importante |
| Epic 6 | Contexto Multi-Projeto | Fase 5 | P2 — Futuro próximo |

### Arquivos dos Epics (sharded)

- [Epic 1 — Fundação](prd/epic-1-fundacao.md)
- [Epic 2 — Debate Engine](prd/epic-2-debate-engine.md)
- [Epic 3 — Frontend teamAI](prd/epic-3-frontend.md)
- [Epic 4 — Memória e Aprendizado](prd/epic-4-memoria.md)
- [Epic 5 — Multi-Usuário](prd/epic-5-multi-usuario.md)
- [Epic 6 — Contexto Multi-Projeto](prd/epic-6-contexto-multi-projeto.md)

---

## 9. Métricas de Sucesso

| Métrica | Baseline | Target | Fase |
|---------|---------|--------|------|
| Tokens — single mind | ~60k | < 15k | Epic 2 |
| Tokens — 5 minds | ~250k | < 60k | Epic 2 |
| Fidelidade clone onboarding | 0% | 35-40% | Epic 4 |
| Fidelidade clone maturidade | — | > 60% | Epic 4+ |
| Tempo de onboarding | — | < 10 min | Epic 5 |
| Isolamento de dados | — | 100% RLS | Epic 5 |
| Deploy time | — | < 30 min | Epic 3 |

---

## 10. Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Criação | 2026-02-26 | 1.0 | PRD inicial baseado em teamAI-Master-Architecture.md v3.0 | Morgan (PM) |
