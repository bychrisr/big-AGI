// Agent command definitions for teamAI council meetings via Beam debate

export interface CouncilConfig {
  name: string;
  icon: string;
  description: string;
  mindIds: string[];
}

export const COUNCILS: Record<string, CouncilConfig> = {
  growth: {
    name: 'Growth Council',
    icon: '📈',
    description: 'Estratégia de crescimento e marketing',
    mindIds: ['alex_hormozi', 'paul_graham', 'seth_godin', 'eugene_schwartz', 'leandro_aguiari'],
  },
  product: {
    name: 'Product Council',
    icon: '🎯',
    description: 'Product management e UX',
    mindIds: ['marty_cagan', 'jeff_patton', 'cagan_patton'],
  },
  leadership: {
    name: 'Leadership Council',
    icon: '🚀',
    description: 'Visão estratégica e liderança',
    mindIds: ['elon_musk', 'steve_jobs', 'sam_altman'],
  },
};

// Agent persona IDs that can trigger council meetings via *commands
const AGENT_PERSONA_IDS = new Set([
  'kaven-squad-lead',
  'kaven_squad_lead',
]);

export interface AgentCommand {
  council: string;
  topic: string;
}

/**
 * Parses agent commands from chat text.
 * Supported patterns:
 *   *consult-growth [topic]  → Growth Council (Hormozi, Graham, Godin, Schwartz)
 *   *consult-product [topic] → Product Council (Cagan, Patton)
 *   *think [topic]           → Leadership Council (Musk, Jobs, Altman)
 */
export function parseAgentCommand(text: string): AgentCommand | null {
  const trimmed = text.trim();

  const growthMatch = trimmed.match(/^\*consult-growth(?:\s+(.+))?$/i);
  if (growthMatch) {
    return { council: 'growth', topic: growthMatch[1]?.trim() ?? '' };
  }

  const productMatch = trimmed.match(/^\*consult-product(?:\s+(.+))?$/i);
  if (productMatch) {
    return { council: 'product', topic: productMatch[1]?.trim() ?? '' };
  }

  const thinkMatch = trimmed.match(/^\*think(?:\s+(.+))?$/i);
  if (thinkMatch) {
    return { council: 'leadership', topic: thinkMatch[1]?.trim() ?? '' };
  }

  return null;
}

/**
 * Returns true if the given persona ID is an agent that can trigger councils.
 */
export function isAgentPersona(systemPurposeId: string | null): boolean {
  if (!systemPurposeId) return false;
  return AGENT_PERSONA_IDS.has(systemPurposeId);
}
