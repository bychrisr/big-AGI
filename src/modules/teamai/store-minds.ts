/**
 * Client-side store for MMOS minds loaded from /api/minds.
 * Fetches once on first access and caches for the session.
 */
import { create } from 'zustand';

import { registerMindPersona } from '../../data';


export interface MindMetadata {
  id: string;
  name: string;
  specialty: string;
  tags: string[];
  tokenBudget: number;
  source: 'shared' | 'custom';
  systemPromptPreview?: string;
  systemPromptPath?: string;
  status?: string;
  category?: string;
}

interface MindsStore {
  minds: MindMetadata[];
  loading: boolean;
  error: string | null;
  loaded: boolean;

  fetchMinds: () => Promise<void>;
}


const MIND_SYMBOLS: Record<string, string> = {
  'naval_ravikant': '⚓',
  'justin_welsh': '✍️',
  'sahil_lavingia': '🚀',
  'alex_hormozi': '💪',
  'paul_graham': '🖥️',
  'seth_godin': '📢',
  'steve_jobs': '🍎',
  'sam_altman': '🤖',
};

function getMindSymbol(mindId: string, index: number): string {
  if (MIND_SYMBOLS[mindId]) return MIND_SYMBOLS[mindId];
  const emojis = ['🧠', '💡', '⚡', '🎯', '🔥', '🌟', '💎', '🚀', '✨', '🎭'];
  return emojis[index % emojis.length] ?? '🧠';
}


// Tracks which SystemPurposes IDs are dynamically registered minds (not built-in personas).
// Used by PersonaSelector to exclude minds from the built-in personas grid.
export const registeredMindIds = new Set<string>();


export const useMindsStore = create<MindsStore>()((set, get) => ({
  minds: [],
  loading: false,
  error: null,
  loaded: false,

  fetchMinds: async () => {
    if (get().loaded || get().loading) return;

    set({ loading: true, error: null });

    try {
      const response = await fetch('/api/minds');

      if (!response.ok) {
        set({ error: `Failed to load minds: ${response.status}`, loading: false });
        return;
      }

      const data = await response.json() as { minds: MindMetadata[] };
      const minds = data.minds ?? [];

      // Register each mind as a persona in SystemPurposes and track the IDs
      minds.forEach((mind, index) => {
        registeredMindIds.add(mind.id);
        registerMindPersona(mind.id, {
          title: mind.name,
          description: mind.specialty || 'MMOS Mind',
          systemMessage: mind.systemPromptPreview
            ? `${mind.systemPromptPreview}\n\nCurrent date: {{Today}}`
            : `You are ${mind.name}. ${mind.specialty}.\n\nCurrent date: {{Today}}`,
          symbol: getMindSymbol(mind.id, index),
        });
      });

      set({ minds, loaded: true, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message, loading: false });
    }
  },
}));


/** Hook to load and return the full system prompt for a specific mind. */
export async function fetchMindSystemPrompt(mindId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/minds/${encodeURIComponent(mindId)}`);
    if (!response.ok) return null;
    const data = await response.json() as { systemPromptContent?: string };
    return data.systemPromptContent ?? null;
  } catch {
    return null;
  }
}


/**
 * Fetches user memories + recent debate sessions and builds a context block
 * to be appended to any mind's system prompt.
 * This is the "Memory Layer" that Steave and all minds reference.
 */
export async function buildMemoryContextBlock(activeFolderTitle?: string): Promise<string> {
  const parts: string[] = [];

  // 1. User memories
  try {
    const memRes = await fetch('/api/memory');
    if (memRes.ok) {
      const memData = await memRes.json() as { memories?: Array<{ key: string; value: string; confidence: number }> };
      const memories = (memData.memories ?? []).filter(m => m.confidence >= 0.5);
      if (memories.length > 0) {
        parts.push('## Memórias do Usuário\n' + memories.map(m => `- **${m.key}**: ${m.value}`).join('\n'));
      }
    }
  } catch { /* silent */ }

  // 2. Project CLAUDE.md context
  if (activeFolderTitle) {
    try {
      const projRes = await fetch('/api/projects');
      if (projRes.ok) {
        const projData = await projRes.json() as {
          projects: Array<{ project_name: string; claude_md?: string | null }>
        };
        const project = projData.projects.find(
          p => p.project_name.toLowerCase() === activeFolderTitle.toLowerCase()
        );
        if (project?.claude_md) {
          // Truncate to avoid bloating the context (max 2000 chars)
          const md = project.claude_md.slice(0, 2000);
          parts.push(`## Contexto do Projeto — ${activeFolderTitle}\n\n${md}`);
        }
      }
    } catch { /* silent */ }
  }

  // 3. Recent debate sessions for active project
  if (activeFolderTitle) {
    try {
      const debateRes = await fetch(`/api/debates?project=${encodeURIComponent(activeFolderTitle.toLowerCase())}`);
      if (debateRes.ok) {
        const debateData = await debateRes.json() as {
          sessions?: Array<{ topic: string; created_at: string; minds: string[]; token_usage: { turns?: number } | null }>
        };
        const sessions = debateData.sessions ?? [];
        if (sessions.length > 0) {
          const sessionLines = sessions.slice(0, 5).map(s => {
            const date = new Date(s.created_at).toLocaleDateString('pt-BR');
            const turns = s.token_usage?.turns ?? 0;
            const minds = s.minds.slice(0, 3).map(m => m.split('_')[0]).join(', ');
            const topic = (s.topic.split(' — ')[0] ?? s.topic).slice(0, 60);
            return `- ${date} | "${topic}" | ${turns} turnos | ${minds}`;
          });
          parts.push(`## Debates Recentes — Projeto ${activeFolderTitle}\n` + sessionLines.join('\n'));
        }
      }
    } catch { /* silent */ }
  }

  if (parts.length === 0) return '';
  return '\n\n---\n## 🧬 Memory Layer Inicializada\n\n' + parts.join('\n\n') + '\n\n---';
}
