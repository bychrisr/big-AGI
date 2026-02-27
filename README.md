# teamAI — Core Repository

> Sistema pessoal de inteligência cognitiva self-hostado.

Este é o repositório **core** do teamAI — squads, minds, users e debate engine.
O frontend (big-AGI fork) está em `bychrisr/big-agi`.

## O que é o teamAI

teamAI combina:
- **27+ minds** — clones cognitivos de thought leaders (Hormozi, Musk, Graham...)
- **Squads especializados** — agents por projeto (architect, dev, qa, devops...)
- **Clone do usuário** — DNA Mental construído incrementalmente
- **Aprendizado contínuo** — memória explícita + checkpoints silenciosos

## Estrutura

```
squads-base/
└── mmos-squad/          ← Hub cognitivo compartilhado (27+ minds)
    ├── minds/           ← Clones cognitivos
    ├── agents/          ← Agentes especializados
    └── workflows/       ← Workflows de debate e análise

users/
├── chris_rodrigues/
│   ├── squads/
│   │   ├── mmos-squad   → symlink → squads-base/mmos-squad
│   │   └── kaven-squad  ← Squad próprio (projeto Kaven)
│   ├── minds/           ← Minds personalizadas
│   └── clone/           ← DNA Mental (versionado)
└── guilger_oliveira/
    ├── squads/
    │   ├── mmos-squad   → symlink → squads-base/mmos-squad
    │   └── psicologia-squad
    └── clone/
```

## O que vai onde

| Asset | Git | Supabase |
|-------|-----|----------|
| System prompts dos minds | ✓ | — |
| KB chunks dos minds | ✓ | — |
| Agents e workflows | ✓ | — |
| Clone do usuário (DNA) | ✓ | espelho |
| Memórias dos agents | ✗ | ✓ |
| Sessões de debate | ✗ | ✓ |
| API keys dos usuários | ✗ nunca | ✓ encriptadas |

## Adicionar novo usuário

```bash
# 1. Criar estrutura
mkdir -p users/novo_usuario/squads users/novo_usuario/minds users/novo_usuario/clone

# 2. Criar symlink para mmos-squad
cd users/novo_usuario/squads
ln -s ../../../squads-base/mmos-squad ./mmos-squad

# 3. Commitar
git add users/novo_usuario/
git commit -m "feat: add novo_usuario to teamai"

# 4. Adicionar ao registry.yaml
# → squads-base/registry.yaml
```

## Deploy

Frontend: `bychrisr/big-agi` (Docker self-host)
Banco de dados: Supabase (PostgreSQL + Auth + Storage + RLS)

## Documentação

Arquitetura completa: `bychrisr/big-agi` → `teamAI-Master-Architecture.md`
