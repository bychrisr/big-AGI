/**
 * TS port of squads-base/mmos-squad/utils/claude_md_parser.py
 * Extracts architectural decisions, technologies, and patterns
 * from a CLAUDE.md file content using regex + keyword matching.
 */

export interface ClaudeMdPatterns {
  decisions: string[];
  technologies: string[];
  patterns: string[];
}

const DECISION_KEYWORDS = /\b(chose|choose|decided|decision|selected|use|using|prefer|adopted|escolhido|escolha|decisão|decidiu|utiliza|utilizar|prefere|adotado)\b/i;

const TECH_PATTERN = /\b(React|Next\.?js|Vue|Angular|Svelte|TypeScript|JavaScript|Python|Go|Rust|PostgreSQL|MySQL|SQLite|MongoDB|Redis|Supabase|Firebase|Docker|Kubernetes|AWS|GCP|Azure|Vercel|Railway|tRPC|GraphQL|REST|gRPC|Zustand|Redux|MobX|Jotai|Tailwind|MUI|Joy|Chakra|shadcn|Prisma|Drizzle|SQLAlchemy|Vitest|Jest|Pytest|Playwright|ESLint|Prettier|Ruff|oxlint)\b/gi;

const PATTERN_KEYWORDS = /\b(pattern|convention|standard|style|rule|approach|architecture|padrão|convenção|regra|abordagem|arquitetura|estrutura)\b/i;

const PATTERN_SECTION_KEYWORDS = [
  'pattern', 'standard', 'convention', 'padrão', 'arquitetura',
];

const MAX_DECISIONS = 20;
const MAX_TECHNOLOGIES = 30;
const MAX_PATTERNS = 20;
const MIN_LINE_LENGTH = 20;
const MAX_ITEM_LENGTH = 200;

function cleanMarkdown(line: string): string {
  return line.replace(/[`*_[\]]/g, '').slice(0, MAX_ITEM_LENGTH);
}


export function extractPatterns(
  claudeMdContent: string,
): ClaudeMdPatterns {
  const lines = claudeMdContent.split('\n');

  const decisions: string[] = [];
  const technologies = new Set<string>();
  const patterns: string[] = [];

  let currentSection = '';

  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) continue;

    if (stripped.startsWith('#')) {
      currentSection = stripped.replace(/^#+\s*/, '').toLowerCase();
      continue;
    }

    // Extract technologies from any line
    const techMatches = stripped.match(TECH_PATTERN);
    if (techMatches) {
      for (const t of techMatches)
        technologies.add(t.toLowerCase());
    }

    if (stripped.length <= MIN_LINE_LENGTH) continue;

    // Detect decisions
    if (DECISION_KEYWORDS.test(stripped)) {
      const clean = cleanMarkdown(stripped);
      if (!decisions.includes(clean) && decisions.length < MAX_DECISIONS)
        decisions.push(clean);
    }

    // Detect patterns
    const isPatternSection = PATTERN_SECTION_KEYWORDS.some(
      (kw) => currentSection.includes(kw),
    );
    if (isPatternSection || PATTERN_KEYWORDS.test(stripped)) {
      const clean = cleanMarkdown(stripped);
      if (!patterns.includes(clean) && patterns.length < MAX_PATTERNS)
        patterns.push(clean);
    }
  }

  return {
    decisions,
    technologies: [...technologies].slice(0, MAX_TECHNOLOGIES),
    patterns,
  };
}
