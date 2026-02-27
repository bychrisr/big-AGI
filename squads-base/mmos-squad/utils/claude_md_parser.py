"""
Parser de CLAUDE.md para extrair padrões arquiteturais, tecnologias e decisões.
"""
from __future__ import annotations

import re
from typing import TypedDict


class ClaudePatterns(TypedDict):
    decisions: list[str]
    technologies: list[str]
    patterns: list[str]


# Keywords que indicam uma decisão arquitetural
DECISION_KEYWORDS = re.compile(
    r'\b(chose|choose|decided|decision|selected|use|using|prefer|adopted|'
    r'escolhido|escolha|decisão|decidiu|utiliza|utilizar|prefere|adotado)\b',
    re.IGNORECASE,
)

# Tecnologias e frameworks comuns
TECH_PATTERNS = re.compile(
    r'\b(React|Next\.?js|Vue|Angular|Svelte|TypeScript|JavaScript|Python|Go|Rust|'
    r'PostgreSQL|MySQL|SQLite|MongoDB|Redis|Supabase|Firebase|'
    r'Docker|Kubernetes|AWS|GCP|Azure|Vercel|Railway|'
    r'tRPC|GraphQL|REST|gRPC|'
    r'Zustand|Redux|MobX|Jotai|'
    r'Tailwind|MUI|Joy|Chakra|shadcn|'
    r'Prisma|Drizzle|SQLAlchemy|'
    r'Vitest|Jest|Pytest|Playwright|'
    r'ESLint|Prettier|Ruff|oxlint)\b',
    re.IGNORECASE,
)

# Keywords de padrões de código
PATTERN_KEYWORDS = re.compile(
    r'\b(pattern|convention|standard|style|rule|approach|architecture|'
    r'padrão|convenção|regra|abordagem|arquitetura|estrutura)\b',
    re.IGNORECASE,
)


def extract_patterns(claude_md_content: str) -> ClaudePatterns:
    """
    Extrai decisões, tecnologias e padrões de um CLAUDE.md.

    Returns:
        Dict com decisions, technologies, patterns (cada item uma string)
    """
    lines = claude_md_content.splitlines()

    decisions: list[str] = []
    technologies: set[str] = set()
    patterns: list[str] = []

    current_section = ''

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Track section headers
        if stripped.startswith('#'):
            current_section = stripped.lstrip('#').strip().lower()
            continue

        # Extract technologies (from any line)
        found_techs = TECH_PATTERNS.findall(line)
        technologies.update(t.lower() for t in found_techs)

        # Detect decisions
        if DECISION_KEYWORDS.search(line) and len(stripped) > 20:
            # Clean up: remove markdown syntax, take first 200 chars
            clean = re.sub(r'[`*_\[\]]', '', stripped)[:200]
            if clean not in decisions:
                decisions.append(clean)

        # Detect patterns (from relevant sections or pattern keywords)
        is_pattern_section = any(
            kw in current_section
            for kw in ['pattern', 'standard', 'convention', 'padrão', 'arquitetura']
        )
        if (is_pattern_section or PATTERN_KEYWORDS.search(line)) and len(stripped) > 20:
            clean = re.sub(r'[`*_\[\]]', '', stripped)[:200]
            if clean not in patterns:
                patterns.append(clean)

    return {
        'decisions': decisions[:20],         # Max 20 decisões
        'technologies': list(technologies)[:30],  # Max 30 tecnologias
        'patterns': patterns[:20],           # Max 20 padrões
    }
