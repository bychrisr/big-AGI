# teamAI — UI/UX Specification (Focused)

> **Versão:** 1.0 | **Data:** 2026-02-26 | **Autor:** Uma (UX Design Expert)
> **Escopo:** Apenas telas/fluxos genuinamente novos — Login, Onboarding e Painel de Memória
> **Design System:** Material-UI Joy (existente no big-AGI — não criar novo)
> **Referência PRD:** docs/prd.md · Seção 6

---

## Princípios de UX para este Projeto

| Princípio | Aplicação no teamAI |
|-----------|-------------------|
| **Clareza antes de elegância** | Onboarding explica o "por quê" de cada pergunta |
| **Progressive disclosure** | Memória aparece só quando relevante, não intrude |
| **Familiar primeiro** | Todas as novas telas usam tokens do big-AGI existente |
| **Acessível por padrão** | WCAG AA em todas as telas novas |

---

## Personas

**Chris (Admin):** Desenvolvedor e power user. Conhece o sistema inteiro. Prefere direto ao ponto.

**Guilger (User):** Usuária do tier `user`. Primeiro contato com o sistema via onboarding. Não técnica — espera experiência guiada e clara.

---

## Fluxo 1 — Login / Autenticação

> **Story:** 3.1 | **Substitui:** HTTP Basic Auth pop-up do browser

### User Flow

```mermaid
flowchart TD
    A([Usuário acessa qualquer rota]) --> B{Sessão válida?}
    B -- Sim --> C[App normal]
    B -- Não --> D[/login]
    D --> E[Preenche email + senha]
    E --> F{Auth OK?}
    F -- Não --> G[Exibe erro inline]
    G --> E
    F -- Sim --> H{Primeiro login?}
    H -- Sim --> I[/onboarding]
    H -- Não --> C
    C --> J[Botão Sair no menu]
    J --> K[Logout + redirect /login]
```

### Tela: `/login`

**Layout:** Página centralizada, sem sidebar/header do big-AGI. Fundo neutro escuro (padrão dark mode do big-AGI).

```
┌──────────────────────────────────────┐
│                                      │
│           [Logo teamAI]              │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  Email                         │  │
│  │  [________________________]    │  │
│  │                                │  │
│  │  Senha                         │  │
│  │  [________________________]    │  │
│  │                                │  │
│  │  [        Entrar        ]      │  │
│  │                                │  │
│  │  ⚠ [mensagem de erro aqui]     │  │
│  └────────────────────────────────┘  │
│                                      │
│  v1.0 · self-hosted                  │
└──────────────────────────────────────┘
```

**Componentes (Material-UI Joy):**
- `Sheet` — card central, `variant="outlined"`, `borderRadius="lg"`
- `FormControl` + `FormLabel` + `Input` — campos de email e senha
- `Button` — `variant="solid"`, `color="primary"`, full width
- `Alert` — `color="danger"`, aparece apenas com erro, `role="alert"` para a11y

**Estados do botão "Entrar":**
- Default: habilitado com texto "Entrar"
- Loading: `loading={true}`, texto "Entrando..." (evita duplo clique)
- Erro: botão volta ao default, Alert aparece abaixo

**Mensagens de erro:**
| Situação | Mensagem |
|----------|----------|
| Credenciais inválidas | "Email ou senha incorretos." |
| Muitas tentativas | "Muitas tentativas. Aguarde 1 minuto." |
| Sem conexão | "Sem conexão com o servidor. Tente novamente." |

**Acessibilidade:**
- `<label>` explícito para cada campo (não placeholder como label)
- `aria-describedby` aponta para a mensagem de erro quando presente
- `aria-live="polite"` no Alert de erro
- Focus trap no card — não navegar para elementos fora da tela de login
- Contraste mínimo 4.5:1 (WCAG AA)

---

## Fluxo 2 — Onboarding

> **Story:** 5.2 | **Agent:** Alex | **Meta:** < 10 min, 7 perguntas conversacionais

### Quando dispara

Após primeiro login bem-sucedido, `onboarding_completed` não existe em `user_preferences`.
Redirect automático para `/onboarding`.

### User Flow

```mermaid
flowchart TD
    A([Primeiro login]) --> B[Boas-vindas — Alex se apresenta]
    B --> C[P1: Nome / como prefere ser chamado]
    C --> D[P2: Área de trabalho]
    D --> E[P3: 2-3 maiores interesses]
    E --> F[P4: Quem te inspira?]
    F --> G[P5: Perfil público?]
    G --> H{P6: Já usa IA?}
    H -- Sim --> I[Instrução de export ChatGPT/Gemini]
    I --> I2{Upload agora?}
    I2 -- Sim --> I3[Upload de arquivo .json]
    I2 -- Agora não --> J
    I3 --> J
    H -- Não --> J
    J[P7: Maior desafio agora] --> K[Configurar API Key Anthropic]
    K --> L{API key válida?}
    L -- Não --> M[Erro inline + link documentação]
    M --> K
    L -- Sim --> N[Tela de confirmação / resumo]
    N --> O([App principal])
```

### Layout geral do Onboarding

**Estrutura:** Tela cheia, sem sidebar. Área de chat centralizada (max-width: 640px). Header mínimo com logo e progresso.

```
┌──────────────────────────────────────────────┐
│  teamAI          [●●●○○○○]  Pergunta 3 de 7  │
├──────────────────────────────────────────────┤
│                                              │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ 🤖 Alex                              │   │
│  │ Que ótimo te conhecer! Em que área   │   │
│  │ você trabalha?                       │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ Você: Tecnologia, startups           │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────┐  [Enviar →]   │
│  │ Digite sua resposta...   │               │
└──────────────────────────────────────────────┘
```

**Componentes:**
- Header: `LinearProgress` do MUI Joy com valor 0-100 proporcional ao step
- Bolha do Alex: `Sheet variant="soft" color="neutral"`, ícone 🤖 ou avatar
- Bolha do usuário: `Sheet variant="soft" color="primary"`, alinhada à direita
- Input: `Textarea` ou `Input` conforme tipo da resposta
- Botão: `Button variant="solid"` — texto "Enviar →", shortcut `Enter`

### Telas especiais

#### Step 6 — Exportação de LLMs (se usuário usa IA)

```
┌─────────────────────────────────────────────┐
│ 🤖 Alex                                     │
│ Você pode exportar seu histórico e eu        │
│ construo um perfil muito mais completo.      │
│ É fácil:                                    │
│                                             │
│ ChatGPT: Settings → Data Controls → Export  │
│ Gemini:  myaccount.google.com → Dados       │
│                                             │
│ [📎 Fazer upload agora]  [Pular por agora]  │
└─────────────────────────────────────────────┘
```

- `Button variant="outlined"` para upload (não obrigatório)
- `Link` para "Pular por agora" — sempre disponível, sem culpa
- Drop zone para `.json` se clicar em upload

#### Step — API Key Anthropic

```
┌─────────────────────────────────────────────┐
│ 🤖 Alex                                     │
│ Para usar o teamAI, você precisa de uma      │
│ API key da Anthropic.                       │
│                                             │
│ → console.anthropic.com [↗]                 │
│                                             │
│ Cole sua key aqui:                          │
│ [sk-ant-________________________]  [✓]     │
│                                             │
│ 🔒 Criptografada e nunca compartilhada.     │
└─────────────────────────────────────────────┘
```

- Input `type="password"` com toggle show/hide
- Botão de validação (ícone check) — faz chamada de teste antes de salvar
- Texto de segurança: `Typography level="body-xs"` com ícone cadeado
- Estados: validando (spinner), válida (check verde), inválida (X vermelho + mensagem)

#### Tela de Confirmação (final)

```
┌─────────────────────────────────────────────┐
│ 🤖 Alex                                     │
│ Tudo pronto! Aqui está o que configurei:    │
│                                             │
│  ✓  Nome: Chris                             │
│  ✓  Área: Tecnologia                        │
│  ✓  Interesses: IA, produtos, sistemas      │
│  ✓  API key: configurada                    │
│  ✓  Perfil inicial criado (fidelidade: 35%) │
│                                             │
│ Vou melhorando conforme conversamos! 🚀     │
│                                             │
│ [  Começar a usar o teamAI →  ]            │
└─────────────────────────────────────────────┘
```

- Lista com `Chip color="success"` para cada item confirmado
- Fidelity badge: `Chip variant="outlined" color="neutral"` mostrando %
- CTA principal: `Button size="lg" variant="solid" color="primary"`

### Acessibilidade — Onboarding

- Cada pergunta do Alex tem `aria-live="polite"` para anunciar ao screen reader
- Input focado automaticamente ao aparecer nova pergunta
- Progress indicator tem `aria-label="Pergunta 3 de 7"`
- Nunca esconder o botão "Pular" atrás de condições — sempre acessível
- Tecla `Enter` envia resposta; `Shift+Enter` para nova linha em Textarea

---

## Fluxo 3 — Painel de Memória

> **Story:** 4.3 · Story indireta: 4.1 | **Rota API:** `/api/memory`

### O que é

Sidebar/painel lateral que mostra o que o sistema aprendeu sobre o usuário — memórias explícitas e checkpoints silenciosos. Usuário pode ver, entender e deletar memórias.

### Onde vive

Integrado ao sistema de painéis do Optima layout (big-AGI). Novo item no menu lateral: ícone 🧠 "Memórias".

### User Flow

```mermaid
flowchart TD
    A[Usuário clica em 🧠 Memórias] --> B[Painel abre na direita]
    B --> C[Lista de memórias carregada via GET /api/memory]
    C --> D{Tem memórias?}
    D -- Não --> E[Estado vazio — "Ainda sem memórias..."]
    D -- Sim --> F[Lista agrupada por tipo]
    F --> G[Usuário clica em memória]
    G --> H[Tooltip: quando foi salva, confidence, fonte]
    F --> I[Usuário clica no 🗑]
    I --> J[Confirmação inline]
    J -- Confirma --> K[DELETE /api/memory/:key]
    K --> L[Remove da lista com animação]
    J -- Cancela --> F
    F --> M[Usuário digita nova memória]
    M --> N[POST /api/memory]
    N --> O[Adiciona ao topo da lista]
```

### Layout do Painel

```
┌─────────────────────────────────┐
│ 🧠 Memórias          [×Fechar]  │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │ + Adicionar memória...  │   │
│  └─────────────────────────┘   │
│                                 │
│  EXPLÍCITAS  ────────────────  │
│  ┌──────────────────────────┐  │
│  │ 📌 output_format         │  │
│  │ "números primeiro, depois│  │
│  │  narrativa"              │  │
│  │ [confidence: ████░ 1.0] 🗑│  │
│  └──────────────────────────┘  │
│                                 │
│  OBSERVADAS  ────────────────  │
│  ┌──────────────────────────┐  │
│  │ 👁 recurring_interest    │  │
│  │ "automação de processos" │  │
│  │ [confidence: ███░░ 0.75] 🗑│  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ 👁 preferred_depth       │  │
│  │ "aprofunda muito temas   │  │
│  │  de sistemas"            │  │
│  │ [confidence: ██░░░ 0.6]  🗑│  │
│  └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

**Componentes:**
- Painel: `Drawer` do MUI Joy (ou Sheet lateral) — `anchor="right"`, `size="md"`
- Agrupamento: `Typography level="body-xs" textTransform="uppercase"` como separador
- Card de memória: `Card variant="soft"` com `key`, `value` e confidence bar
- Confidence bar: `LinearProgress` com `determinate value={confidence * 100}`
- Ícone de fonte: 📌 para `explicit`, 👁 para `checkpoint`/`pattern`
- Delete: `IconButton size="sm"` com ícone trash — inline, sem modal
- Confirmação: inline expand do card com texto "Remover esta memória?" + [Sim] [Não]

**Campo "Adicionar memória":**
- `Input placeholder="Adicionar memória..."` no topo
- Ao clicar/focar: expande para formulário com campo `key` e `value`
- Salva com `Enter` ou botão `+`

**Estado vazio:**
```
┌─────────────────────────────────┐
│                                 │
│    🧠                           │
│    Ainda sem memórias.          │
│                                 │
│    Diga ao agent para gravar    │
│    algo, ex: "Grava na memória  │
│    que prefiro respostas        │
│    curtas."                     │
│                                 │
└─────────────────────────────────┘
```

### Micro-interações

| Ação | Comportamento |
|------|--------------|
| Abrir painel | Slide-in da direita, `transition: 200ms ease` |
| Nova memória adicionada | Aparece no topo com fade-in verde |
| Memória deletada | Fade-out + collapse vertical, `150ms` |
| Hover no card | Background levemente mais claro |
| Hover no ícone 🗑 | Cor muda para vermelho (`color="danger"`) |

### Acessibilidade — Painel de Memória

- Painel tem `role="complementary"` e `aria-label="Painel de memórias do usuário"`
- Botão de fechar: `aria-label="Fechar painel de memórias"`
- Delete: `aria-label="Remover memória: {key}"` para cada botão
- Focus retorna ao botão que abriu o painel ao fechar
- Confidence bar: `aria-label="Confiança: 75%"` para screen readers

---

## Responsividade

| Breakpoint | Login | Onboarding | Painel de Memória |
|-----------|-------|-----------|-------------------|
| Mobile (< 600px) | Card full-width, padding reduzido | Full screen, sem sidebar | Drawer full-width |
| Tablet (600-1024px) | Card 480px centralizado | Max-width 580px | Drawer 360px |
| Desktop (> 1024px) | Card 480px centralizado | Max-width 640px | Drawer 380px |

---

## Tokens de Design (apenas novos)

Todos os componentes usam tokens existentes do big-AGI. Nenhum token novo necessário. Exceções:

```css
/* Apenas dois novos valores — não extrair para tokens, inline é suficiente */
--memory-confidence-low: var(--joy-palette-warning-500);   /* < 0.65 */
--memory-confidence-high: var(--joy-palette-success-500);  /* >= 0.65 */
```

---

## Checklist de Entrega (Design Handoff)

- [x] Fluxo de Auth documentado com todos os estados
- [x] Onboarding: 7 perguntas + 2 telas especiais mapeadas
- [x] Painel de Memória: estados, micro-interações, componentes
- [x] Responsividade definida para os 3 fluxos
- [x] Acessibilidade WCAG AA especificada em cada tela
- [x] Nenhum token novo necessário — reutiliza big-AGI
- [ ] Revisão com stakeholder (Chris)
- [ ] Implementação — Stories 3.1, 4.3, 5.2

---

*Spec focada — escopo intencional. Telas existentes do big-AGI não documentadas aqui.*
*Próxima revisão: após implementação das Stories 3.1 e 5.2.*
