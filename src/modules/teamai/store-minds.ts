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

      // Register each mind as a persona in SystemPurposes
      minds.forEach((mind, index) => {
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
