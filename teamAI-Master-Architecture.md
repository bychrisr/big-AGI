# teamAI — Master Architecture
> **Status:** Documento vivo | **Versão:** 3.0 | **Data:** Fevereiro 2026 | **Autor:** Chris Rodrigues
> **Scope:** Arquitetura completa — repo, frontend, squads, multi-usuário, aprendizado contínuo, token strategy, implementação

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Estrutura do Repositório](#2-estrutura-do-repositório)
3. [Frontend — big-AGI Fork](#3-frontend--big-agi-fork)
4. [Arquitetura de Squads — Hub-and-Spoke](#4-arquitetura-de-squads--hub-and-spoke)
5. [Sistema Multi-Usuário](#5-sistema-multi-usuário)
6. [Aprendizado Contínuo dos Agents](#6-aprendizado-contínuo-dos-agents)
7. [Clone do Usuário](#7-clone-do-usuário)
8. [Contexto Multi-Projeto](#8-contexto-multi-projeto)
9. [Estratégia de Tokens](#9-estratégia-de-tokens)
10. [Hierarquia de Agents — Tiers](#10-hierarquia-de-agents--tiers)
11. [Pipeline de Onboarding](#11-pipeline-de-onboarding)
12. [Backup e Resiliência](#12-backup-e-resiliência)
13. [Roadmap de Implementação](#13-roadmap-de-implementação)
14. [Decisões Fechadas](#14-decisões-fechadas)

---

## 1. Visão Geral

### O que é o teamAI

**teamAI** é um sistema pessoal de inteligência cognitiva que combina clonagem cognitiva de thought leaders, agents especializados por projeto e aprendizado contínuo sobre o usuário — tudo num único ambiente self-hostado.

Faz parte de um ecossistema maior. O MMOS (Mind Mapper OS) é o motor cognitivo dentro dele. O teamAI é a camada que une tudo: UI, usuários, projetos, memória e frontend.

### Princípios de Design

| Princípio | Descrição |
|-----------|-----------|
| **Hub-and-Spoke** | MMOS é o hub cognitivo fixo. Squads são spokes de projeto |
| **Token-first** | Toda decisão de arquitetura considera impacto em tokens |
| **User-sovereign** | Dados, clones e histórico pertencem ao usuário — nunca misturar |
| **Each user brings their key** | Cada usuário configura suas próprias API keys (Anthropic, Gemini) |
| **Aprendizado incremental** | Aprender em contexto, em tempo real — não em batch |
| **Docker-first** | Self-host com Docker; symlinks dentro do Git preservados no container |
| **Backup como cidadão de primeira classe** | Supabase + Git remote = nunca perder nada |

### Fluxo de alto nível

```
[Celular / PC do usuário]
        ↓
[big-AGI fork — Docker / domínio próprio]
        ↓
[Next.js API Routes — BFF]
├── /api/chat      → Anthropic/Gemini (API key do usuário)
├── /api/debate    → Python debate_engine (mmos-squad)
├── /api/minds     → Git repo (clones disponíveis)
└── /api/memory    → Supabase (memórias, sessões, clone)
        ↓
[Supabase]  ← memórias, sessões, projetos, clones
[Git repo]  ← minds, DNA Mental, agents, workflows
```

---

## 2. Estrutura do Repositório

### Estrutura de pastas (dentro do Git)

```
repo/ (bychrisr/teamai — privado)
│
├── squads-base/                          ← squads genéricos compartilhados
│   └── mmos-squad/                       ← hub cognitivo (MMOS genérico)
│       ├── minds/                        ← 27+ clones (só Chris cadastra)
│       │   ├── alan_nicolas/
│       │   ├── elon_musk/
│       │   ├── alex_hormozi/
│       │   └── ...
│       ├── agents/                       ← 10 agentes em .md
│       ├── adapters/
│       ├── config/
│       ├── scripts/
│       ├── workflows/
│       └── squad.yaml
│
└── users/
    ├── chris_rodrigues/
    │   ├── squads/
    │   │   ├── mmos-squad/               ← symlink → squads-base/mmos-squad/
    │   │   └── kaven-squad/              ← squad próprio do projeto Kaven
    │   ├── minds/                        ← minds personalizadas do Chris
    │   ├── clone/                        ← DNA Mental do Chris (versionado)
    │   ├── memories/                     ← NÃO no Git → Supabase
    │   └── projects/                     ← NÃO no Git → Supabase
    │
    └── guilger_oliveira/
        ├── squads/
        │   ├── mmos-squad/               ← symlink → squads-base/mmos-squad/
        │   └── psicologia-squad/         ← squad próprio
        ├── minds/                        ← minds personalizadas
        ├── clone/                        ← DNA Mental da Guilger (versionado)
        ├── memories/                     ← NÃO no Git → Supabase
        └── projects/                     ← NÃO no Git → Supabase
```

### O que vai onde

| Asset | Git | Supabase |
|-------|-----|----------|
| System prompts dos minds (27) | ✓ | — |
| KB chunks dos minds | ✓ | — |
| Agents (.md) e workflows | ✓ | — |
| Clone do usuário (DNA compilado) | ✓ | espelho |
| Minds personalizadas do usuário | ✓ | — |
| Sources originais (PDFs, transcrições) | ✗ pesado | Storage bucket |
| Memórias do agent sobre usuário | ✗ | ✓ |
| Histórico de sessões/debates | ✗ | ✓ |
| Projetos e configs de projeto | ✗ | ✓ |
| API keys dos usuários | ✗ nunca | ✓ encriptadas |

### Symlinks — dentro do Git (Docker-safe)

Symlinks ficam dentro do repo. Git preserva symlinks em Linux; Docker roda em Linux — funcionamento garantido sem nenhuma configuração extra.

```bash
# Criar symlink ao adicionar novo usuário
cd users/novo_usuario/squads/
ln -s ../../../squads-base/mmos-squad ./mmos-squad
git add mmos-squad
git commit -m "feat: add mmos-squad symlink for novo_usuario"
```

### .gitignore

```gitignore
# Dados de usuário (ficam no Supabase)
users/*/memories/
users/*/projects/

# Sources pesadas dos minds
squads-base/mmos-squad/minds/*/sources/

# Runtime
node_modules/
__pycache__/
*.pyc
.env
```

### Repositórios Git

| Repo | Visibilidade | Propósito |
|------|-------------|-----------|
| `bychrisr/teamai` | Privado | Repo principal — tudo acima |
| `bychrisr/big-agi` | Privado | Fork do frontend customizado |

---

## 3. Frontend — big-AGI Fork

### Por que big-AGI

| Feature | Relevância para o teamAI |
|---------|--------------------------|
| Personas nativas | Mapeiam diretamente para os minds do MMOS |
| Multi-model | Claude, Gemini, OpenAI via API key do usuário |
| Beam (arena de LLMs) | Debate entre minds em paralelo |
| Projetos/Folders | Contexto por projeto |
| Self-host com Docker | Controle total, sem lock-in |
| Licença MIT | Fork e customização livre |
| Next.js + TypeScript | Stack padrão, fácil de extender |

### Arquitetura Next.js do big-AGI

O big-AGI é **Next.js puro** — React no frontend, Edge Functions no backend. Não tem servidor separado. Tudo no mesmo app.

```
Usuário digita → React (client)
                    ↓
             /api/chat (Route Handler)
                    ↓
         Pega API key do usuário (Settings)
                    ↓
         Chama Anthropic/Gemini via HTTP
                    ↓
         Streaming de volta pro browser
```

### Novas rotas adicionadas no fork

```
/api/chat          ← já existe (LLM calls nativas)
/api/minds         ← NOVO: lista minds disponíveis por usuário
/api/debate        ← NOVO: orquestra debate_engine Python
/api/memory        ← NOVO: lê/escreve memórias no Supabase
/api/clone         ← NOVO: serve DNA Mental do usuário
```

Cada route.ts:
1. Autentica via Supabase Auth (JWT do usuário)
2. Pega API key do usuário do Supabase
3. Executa a lógica (subprocess Python, query Supabase, etc.)
4. Retorna streaming pro browser

### API keys — modelo por usuário

Cada usuário entra com suas próprias keys no Settings. O big-AGI já tem esse campo nativamente — o fork apenas redireciona o armazenamento para o Supabase (encriptado) ao invés de localStorage.

```yaml
chris_rodrigues:
  anthropic_key: "sk-ant-..." # encriptada no Supabase
  gemini_key: "AIza..."

guilger_oliveira:
  anthropic_key: "sk-ant-..." # key própria dela
```

### Beam como Arena de Debates

O Beam do big-AGI foi feito para múltiplos modelos respondendo em paralelo à mesma pergunta. No teamAI:

```
Beam padrão:    GPT-4 vs Claude vs Gemini (modelos diferentes)
teamAI Beam:    Hormozi vs Paul Graham vs Elon Musk (minds diferentes)
```

A customização: interceptar como o Beam monta os requests e injetar o system prompt do mind correspondente ao invés de trocar o modelo.

### Customizações do fork (lista completa)

1. **Personas → MMOS Minds:** sync automático com `minds/*/metadata.yaml`
2. **Projetos → teamAI Projects:** cada projeto carrega seu `CLAUDE.md` como contexto
3. **Campo "modelo/mind usado"** em cada mensagem (para histórico e clone)
4. **Painel de memória do usuário** — mostra o que o agent aprendeu sobre você
5. **Botão "Start Debate"** — abre Beam com minds selecionados
6. **Redirecionar API keys para Supabase** (ao invés de localStorage)
7. **Auth via Supabase** (ao invés de HTTP Basic Auth padrão do big-AGI)

---

## 4. Arquitetura de Squads — Hub-and-Spoke

### Modelo

```
                    ┌────────────────────────────┐
                    │         MMOS-SQUAD          │
                    │   cérebro cognitivo central │
                    │                             │
                    │  27+ minds (clones)         │
                    │  debate_engine.py           │
                    │  workflow_orchestrator.py   │
                    │  DNA Mental 8 Layers        │
                    └──────────────┬──────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
  ┌────────┴───────┐    ┌──────────┴────────┐    ┌─────────┴──────────┐
  │  kaven-squad   │    │  psicologia-squad │    │  [futuro squad]    │
  │  Steave + time │    │  guilger_oliveira │    │                    │
  │                │    │                   │    │                    │
  │  *consult MMOS │    │  *consult MMOS    │    │  *consult MMOS     │
  └────────────────┘    └───────────────────┘    └────────────────────┘
```

### Como o symlink resolve o acesso

```
users/chris_rodrigues/squads/mmos-squad/
    → symlink → squads-base/mmos-squad/

users/chris_rodrigues/squads/kaven-squad/
    → diretório real (squad próprio do Chris)
```

O resolver sabe que `users/*/squads/mmos-squad/minds/` aponta para `squads-base/mmos-squad/minds/` + `users/*/minds/` (personalizadas). Ambas são servidas juntas.

### registry.yaml

```yaml
# squads-base/registry.yaml
version: "3.0"

squads:
  mmos-squad:
    path: "squads-base/mmos-squad"
    role: brain
    provides: [minds, debate_engine, cognitive_analysis, greenfield_pipeline]
    minds_count: 27
    token_budget_worst_case: 60000   # hormozi

  kaven-squad:
    path: "users/chris_rodrigues/squads/kaven-squad"
    role: project
    owner: chris_rodrigues
    requires: [mmos-squad]

  psicologia-squad:
    path: "users/guilger_oliveira/squads/psicologia-squad"
    role: project
    owner: guilger_oliveira
    requires: [mmos-squad]

users:
  chris_rodrigues:
    tier: admin
    squads: [mmos-squad, kaven-squad]
    minds_custom: users/chris_rodrigues/minds/
    clone: users/chris_rodrigues/clone/

  guilger_oliveira:
    tier: user
    squads: [mmos-squad, psicologia-squad]
    minds_custom: users/guilger_oliveira/minds/
    clone: users/guilger_oliveira/clone/
```

---

## 5. Sistema Multi-Usuário

### Isolamento por usuário no Supabase

```sql
-- RLS: cada usuário vê apenas seus dados
CREATE POLICY "users see own data"
ON user_memories FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "users see own sessions"
ON debate_sessions FOR ALL
USING (user_id = auth.uid());
```

### Estrutura Supabase

```
supabase/
├── shared/
│   └── minds_metadata          ← 27 minds públicos (leitura para todos)
│
└── users/
    ├── user_memories           ← (user_id, key, value, confidence, source)
    ├── debate_sessions         ← (user_id, minds, topic, turns, tokens_used)
    ├── user_clone              ← (user_id, layer, content, fidelity, version)
    ├── user_projects           ← (user_id, project_name, claude_md, patterns)
    ├── user_api_keys           ← (user_id, provider, encrypted_key)
    └── user_preferences        ← (user_id, key, value)
```

### Tiers de usuário

| Tier | Exemplo | Acesso |
|------|---------|--------|
| `admin` | chris_rodrigues | Tudo — criar squads, minds, ver todos os projetos |
| `user` | guilger_oliveira | Seus projetos + minds compartilhados do MMOS |
| `guest` | (futuro) | Somente leitura de minds públicos |

---

## 6. Aprendizado Contínuo dos Agents

### Três mecanismos

#### 6.1 Memória Explícita

Usuário fala diretamente:

```
Chris: "Steave, grava na memória que eu sempre quero análise com número primeiro, depois narrativa."
Steave: "Gravado. Vou aplicar esse formato automaticamente daqui pra frente."
```

```python
class MemoryStore:
    def record_explicit(self, user_id: str, key: str, value: str, source: str = "explicit"):
        self.db.upsert("user_memories", {
            "user_id": user_id,
            "key": key,
            "value": value,
            "source": source,  # 'explicit' | 'checkpoint' | 'pattern'
            "confidence": 1.0 if source == "explicit" else 0.7,
            "created_at": now(),
            "last_applied": now()
        })
```

#### 6.2 Checkpoints Silenciosos

Agent observa padrões sem interromper o fluxo. Roda em background após cada sessão.

```python
class SilentCheckpoint:
    TRIGGERS = [
        "usuário corrigiu output do agent",
        "usuário pediu reformatação de resposta",
        "usuário expandiu um tema por >5 turnos",
        "usuário retomou tópico após >3 dias",
        "usuário escolheu opção B sempre que A e B apresentados",
    ]

    def analyze(self, session: Session) -> List[MemoryCandidate]:
        candidates = []
        if self._user_reformatted(session):
            candidates.append(MemoryCandidate(
                key="output_format",
                value=self._extract_preferred_format(session),
                confidence=0.75
            ))
        theme_freq = self._count_theme_occurrences(session)
        for theme, count in theme_freq.items():
            if count > 5:
                candidates.append(MemoryCandidate(
                    key=f"recurring_interest.{theme}",
                    value="alto interesse observado",
                    confidence=0.6
                ))
        return candidates

    def commit(self, candidates: List[MemoryCandidate]):
        for c in candidates:
            if c.confidence > 0.65:
                self.memory_store.record_explicit(
                    user_id=self.user_id,
                    key=c.key,
                    value=c.value,
                    source="checkpoint"
                )
```

#### 6.3 Extração de DNA Mental de LLMs Externas

Prompt cirúrgico que analisa exports do ChatGPT/Gemini/Claude para construir perfil cognitivo:

```markdown
# DNA Mental Extraction Prompt

Analise as conversas abaixo entre um usuário e uma IA.
Extraia padrões cognitivos e comportamentais do USUÁRIO (não da IA).

## O que extrair

Padrões de pensamento: como ele formula problemas, frameworks implícitos, reação a contradições.
Estilo de comunicação: tom predominante, comprimento, quando vai direto vs. contextualiza.
Padrões de interesse: temas recorrentes, o que aprofunda vs. descarta.
Padrões de decisão: velocidade, busca de validação vs. crítica, iteração.

## Output esperado (YAML)

dna_extraction:
  source: "ChatGPT export [data]"
  user: "chris_rodrigues"
  cognitive_patterns:
    problem_framing: "sistêmico — vê o sistema antes do componente"
    hypothesis_style: "propõe e pede para destruir"
    framework_preference: "first principles + alavancagem"
  communication:
    tone: "direto, denso, sem rodeios"
    question_style: "múltiplas questões em sequência"
  recurring_interests:
    - automação de processos
    - sistemas escaláveis
    - clonagem cognitiva
  decision_patterns:
    speed: "rápido quando sistema bem definido"
    validation_seeking: "prefere crítica a validação"

[CONVERSAS EXPORTADAS AQUI]
```

**Como usar:**
1. Exportar ChatGPT: Settings → Data Controls → Export
2. Exportar Gemini: myaccount.google.com → Data → Download
3. Rodar o prompt com as conversas como input
4. Output entra como source L2-L8 do clone do usuário

---

## 7. Clone do Usuário

### Bootstrap incremental — três fontes em paralelo

```
Fonte 1: Exportações de LLMs (ChatGPT ~2-3 anos, Gemini ~1 ano)
         → DNA Mental extraction
         → Contribui para: L1, L2, L3, L6

Fonte 2: Interações com minds do MMOS
         → Checkpoints silenciosos observam comportamento
         → Contribui para: L4, L5, L6, L7

Fonte 3: Onboarding estruturado (5-8 perguntas)
         → Valores, interesses, referências declarados
         → Contribui para: L1, L5, L8
```

### Fidelidade progressiva

```yaml
clone_chris_rodrigues:
  version: "0.1-bootstrap"
  fidelity: 35%
  milestones:
    - 40%: "Clone mínimo — pode auxiliar na geração de conteúdo simples"
    - 60%: "Clone funcional — voz reconhecível, padrões básicos capturados"
    - 80%: "Clone avançado — tomada de decisão alinhada"
    - 94%: "Clone de produção — meta DNA Mental atingida"
```

### Clone como infraestrutura multi-squad

```yaml
use_cases:
  - geração de conteúdo com voz autêntica do usuário
  - validação de decisões ("o Chris aprovaria isso?")
  - personalização de outputs ("como o Chris apresentaria isso?")
  - referência de estilo para qualquer squad do usuário
```

```python
def check_clone_milestone(user_id: str) -> Optional[CloneMilestone]:
    fidelity = calculate_fidelity(user_id)
    thresholds = {
        0.40: "Perfil inicial criado! Já posso gerar conteúdo na sua voz.",
        0.60: "Clone funcional — sua voz está ficando bem definida.",
        0.80: "Clone avançado — posso simular suas decisões com boa precisão.",
        0.94: "Clone de produção — meta atingida! 🎯"
    }
    for threshold, message in sorted(thresholds.items()):
        if fidelity >= threshold and not milestone_reached(user_id, threshold):
            return CloneMilestone(threshold=threshold, message=message)
    return None
```

---

## 8. Contexto Multi-Projeto

### O que é

Agents sabem de todos os projetos do usuário, mas operam no escopo do projeto ativo. Relação bidirecional:

- **Chris → Agent:** "Steave, aquilo que fizemos no Seja Eleito pode ajudar aqui no Kaven?"
- **Agent → Chris:** "Percebi que você resolveu um problema parecido no Seja Eleito. Quer reaproveitar?"

### Implementação

```python
class CrossProjectContextProvider:
    def find_relevant_past_decision(
        self,
        current_project: str,
        current_problem: str,
        user_id: str
    ) -> Optional[CrossProjectInsight]:
        """
        Roda silenciosamente. Só notifica se confidence > 0.7.
        """
        all_projects = self.load_user_projects(user_id)
        other_projects = [p for p in all_projects if p.id != current_project]

        for project in other_projects:
            similarity = self.semantic_similarity(
                current_problem,
                project.key_patterns + project.key_decisions
            )
            if similarity > 0.7:
                return CrossProjectInsight(
                    source_project=project.id,
                    relevant_decision=project.most_relevant_decision(current_problem),
                    confidence=similarity
                )
        return None

    def format_insight(self, insight: CrossProjectInsight) -> str:
        return (
            f"💡 Detectei algo parecido no projeto **{insight.source_project}**: "
            f"{insight.relevant_decision.summary}. "
            f"Quer considerar isso aqui?"
        )
```

---

## 9. Estratégia de Tokens

### O problema em números

| Operação | Meta | Atual (sem otimização) |
|----------|------|------------------------|
| Consulta single mind | < 15k tokens | ~60k |
| Growth Council (5 minds) | < 60k tokens | ~250k |
| Debate Oxford 2 minds | < 80k tokens | ~150k |

Context window Claude Sonnet: 200k. Sem otimização, 4 minds em debate = crash.

### Quatro camadas de otimização

#### Camada 1 — KB Compression (impacto imediato, ~85% redução)

```python
def extract_relevant_chunks(kb_path: str, topic: str, max_chunks: int = 10) -> str:
    topic_keywords = topic.lower().split()
    chunks = load_kb_chunks(kb_path)
    scored = [(sum(c.lower().count(kw) for kw in topic_keywords), c) for c in chunks]
    scored.sort(reverse=True)
    return "\n\n---\n\n".join(c for _, c in scored[:max_chunks])
# KB de 40k tokens → 5-8k tokens
```

#### Camada 2 — Session Caching

System prompt de cada mind carregado uma vez por sessão. Turnos seguintes enviam apenas o delta.

```python
class DebateSession:
    def get_prompt_for_turn(self, mind: str, message: str) -> str:
        if not self.initialized.get(mind):
            self.initialized[mind] = True
            return f"{self.load_system_prompt(mind)}\n\n{self.load_kb(mind, self.topic)}\n\n{message}"
        else:
            return f"[Turno anterior: {self.history[-1]}]\n\n{message}"
```

#### Camada 3 — Personas em Conversa Única

Para minds leves (< 20k tokens), uma única chamada com múltiplas personas. Não usar para Hormozi (60k).

```python
def multi_persona_call(minds: List[str], topic: str) -> str:
    combined_prompt = "\n\n".join([
        f"=== PERSONA: {mind.upper()} ===\n{load_compressed_prompt(mind)}"
        for mind in minds
    ])
    instruction = f"\nTópico: {topic}\nResponda como cada persona acima, claramente identificada."
    return call_claude(combined_prompt + instruction)
```

#### Camada 4 — Session Persistence (Supabase)

```python
class SessionStore:
    def save(self, session: DebateSession):
        self.db.insert("debate_sessions", {
            "id": session.session_id,
            "user_id": session.user_id,
            "minds": session.minds,
            "topic": session.topic,
            "turns": session.history,
            "tokens_used": session.token_counter,
        })

    def resume(self, session_id: str) -> DebateSession:
        """Comando: *resume [session_id]"""
        data = self.db.get("debate_sessions", session_id)
        return DebateSession.from_dict(data)
```

---

## 10. Hierarquia de Agents — Tiers

```
TIER 0 — SISTEMA
└── teamAI-Master               ← orquestrador global, acessa tudo

TIER 1 — HEADS DE SQUAD
├── Steave (kaven-squad-lead)
├── [futuro] seja-eleito-lead
└── [futuro] psicologia-lead (guilger)

TIER 2 — ESPECIALISTAS (ex: kaven-squad)
├── Atlas (architect)
├── Bolt (api-dev)
├── Pixel (frontend-dev)
├── Schema (db-engineer)
├── Shield (qa)
├── Deploy (devops)
└── Forge (module-creator)

TIER 3 — CONSULTORES COGNITIVOS (via MMOS)
├── Estratégicos: elon_musk, sam_altman, paul_graham
├── Produto: marty_cagan, jeff_patton
├── Growth: seth_godin, alex_hormozi, eugene_schwartz
└── Disruptivos: [APEX scoring pendente — ver candidatos abaixo]

TIER 4 — CLONES DE USUÁRIO
└── chris_rodrigues, guilger_oliveira, ...
```

### Consultores Disruptivos — candidatos para APEX scoring

| Candidato | Especialidade | Por que |
|-----------|---------------|---------|
| **Naval Ravikant** | Wealth + leverage filosófico | "Specific knowledge" — complementa PG mas mais agnóstico |
| **Sahil Lavingia** | Indie SaaS, Gumroad | Builder solo, bootstrapped — contraponto ao VC |
| **Simon Sinek** | Liderança inspiracional | Contraponto ao Hormozi — less metrics, more why |
| **Justin Welsh** | Criador de conteúdo solo | Sistemas de conteúdo — relevante para Seja Eleito |
| **Dickie Bush** | Escrita em público | Building in public como estratégia |

---

## 11. Pipeline de Onboarding

```
1. CADASTRO (2 min)
   └── Nome, email, senha → Supabase Auth

2. BOAS-VINDAS (agent de onboarding)
   └── "Olá! Sou o Alex, seu assistente de configuração.
        Vou te conhecer melhor em algumas perguntas rápidas."

3. OVERVIEW MÍNIMO (5-8 perguntas, 5 min)
   ├── Qual é o seu nome? Como prefere ser chamado?
   ├── Em que área você trabalha?
   ├── Quais são seus 2-3 maiores interesses?
   ├── Você acompanha alguém que te inspira muito?
   ├── Você tem perfil público? (Instagram, YouTube, site)
   ├── Você já usa alguma IA?
   │   └── Se sim: "Você pode exportar seu histórico e eu construo
   │                um perfil seu bem mais completo."
   └── Qual é seu maior desafio agora?

4. API KEY (obrigatório para usar)
   └── "Cole sua API key da Anthropic aqui. Ela fica criptografada
        e nunca sai do seu ambiente."

5. PRIMEIRO PROJETO (opcional, 3 min)
   └── Nome do projeto + objetivo → squad automático criado

6. CLONE INICIAL (background, automático)
   └── Respostas do overview → fidelidade ~35-40%
   └── Notificação: "Criei um perfil inicial seu. Vou melhorando
                     conforme conversamos."
```

---

## 12. Backup e Resiliência

### Stack de backup

```
Camada 1 — Código: Git (GitHub privado)
├── teamai → bychrisr/teamai
└── big-agi fork → bychrisr/big-agi

Camada 2 — Dados: Supabase
├── Sessões de debate
├── Memória de usuários
├── Clones (DNA Mental)
├── Histórico de interações
├── API keys (encriptadas)
└── Projetos e configs

Camada 3 — Sources (minds): Supabase Storage
└── squads-base/mmos-squad/minds/*/sources/ → bucket privado
```

### Cron de backup diário

```bash
#!/bin/bash
# backup-teamai.sh — cron diário

REPO_DIR="$HOME/projects/teamai"
cd "$REPO_DIR"

if ! git diff --quiet; then
    git add -A
    git commit -m "auto-backup: $(date '+%Y-%m-%d %H:%M')"
    git push origin main
    echo "✓ teamai backed up"
fi
```

```bash
# crontab
0 2 * * * /home/bychrisr/projects/teamai/scripts/backup-teamai.sh
```

### Prioridade de backup

| Asset | Onde | Backup |
|-------|------|--------|
| System prompts dos minds | Git minds/*/system_prompts/ | Git remoto |
| KB chunks dos minds | Git minds/*/kb/ | Git remoto |
| Clone do usuário | Git users/*/clone/ | Git + Supabase espelho |
| Sources originais | Supabase Storage | Supabase backup automático |
| Memória dos agents | Supabase | Supabase backup automático |
| Sessões de debate | Supabase | Supabase backup automático |

---

## 13. Roadmap de Implementação

### Fase 0 — Fundação (semana atual)

**Objetivo:** repo estruturado, symlinks, Git funcionando.

- [ ] Criar repo `bychrisr/teamai` com estrutura de pastas completa
- [ ] Mover `squads-base/mmos-squad/` com os 27 minds
- [ ] Criar `users/chris_rodrigues/` com symlink para mmos-squad
- [ ] Criar `users/guilger_oliveira/` com symlink para mmos-squad
- [ ] Criar `squads-base/registry.yaml` completo
- [ ] Criar `.gitignore` com exclusões corretas
- [ ] Validar que symlinks funcionam após `git clone`

### Fase 1 — Debate Engine funcional (semana 1-2)

**Objetivo:** debate com múltiplos minds sem estourar context window.

- [ ] Substituir Gemini por Anthropic API no `debate_engine.py`
- [ ] Implementar `extract_relevant_chunks()` (KB compression)
- [ ] Implementar `DebateSession` com session caching
- [ ] `session_store.py` com Supabase (já direto, sem SQLite)
- [ ] Testar Growth Council: meta < 60k tokens
- [ ] `/api/debate` route no big-AGI fork

### Fase 2 — Frontend funcional (semana 2-3)

**Objetivo:** big-AGI rodando com minds do MMOS e API keys por usuário.

- [ ] Fork `bychrisr/big-agi` e self-host com Docker
- [ ] Supabase Auth configurado no big-AGI
- [ ] API keys redirecionadas para Supabase (não localStorage)
- [ ] Sync de personas MMOS → big-AGI automatizado
- [ ] `/api/minds` route servindo clones disponíveis por usuário
- [ ] Beam configurado para debates entre minds

### Fase 3 — Memória e aprendizado (semana 3-4)

**Objetivo:** agents que aprendem e lembram.

- [ ] `memory_store.py` com comandos explícitos
- [ ] `silent_checkpoint.py` rodando em background
- [ ] Memória integrada no context dos agents
- [ ] Prompt de extração de DNA Mental de LLMs
- [ ] Bootstrap do clone `chris_rodrigues` com exports do ChatGPT/Gemini

### Fase 4 — Multi-usuário (semana 4-5)

**Objetivo:** guilger_oliveira consegue usar de forma isolada.

- [ ] RLS em todas as tabelas do Supabase
- [ ] Onboarding agent (5-8 perguntas) funcional
- [ ] Clone bootstrap automático pós-onboarding
- [ ] Teste completo com guilger_oliveira
- [ ] Domínio próprio configurado para acesso externo

### Fase 5 — Contexto multi-projeto (semana 6-8)

**Objetivo:** agents que lembram de outros projetos.

- [ ] `CrossProjectContextProvider` implementado
- [ ] `CLAUDE.md` de cada projeto indexado no Supabase
- [ ] Steave notificando sobre patterns cross-project
- [ ] Consultores disruptivos com APEX scoring (3 prioritários)

---

## 14. Decisões Fechadas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| **Nome do sistema** | teamAI | AIOS perde o brilho, faz parte de um sistema maior |
| **Claude Code no servidor** | Não — API direta | Claude Code é CLI local, não serve como HTTP server |
| **API keys** | Cada usuário coloca a própria | Sem key compartilhada do admin |
| **Symlinks dentro do Git** | Sim | Docker roda em Linux, preserva symlinks nativamente |
| **Frontend** | big-AGI fork | Beam para debates, personas nativas, MIT, Next.js |
| **Deploy** | Docker self-host | Symlinks safe, controle total, sem Vercel |
| **Banco** | Supabase desde o início | Evitar migração de SQLite — já tem Auth + RLS + Storage |
| **Repo único vs. múltiplos** | Repo único (`teamai`) | Simplifica symlinks, deploy e backup |

---

*Documento vivo — atualizado conforme implementação avança*
*Próxima revisão: após Fase 0 concluída*
