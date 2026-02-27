import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { agiUuid } from '~/common/util/idUtils';
import { useShallow } from 'zustand/react/shallow';


// constraint the max number of saved prompts, to stay below localStorage quota
const MAX_SAVED_PROMPTS = 100;


/**
 * Very simple personas store for the "Persona Creator" - note that we shall
 * switch to a more complex personas store in the future, as for now we mainly
 * save system prompts so that we don't lose what was created.
 */
export interface SimplePersona {
  id: string;
  name?: string;
  description?: string; // Short description / specialty (used by synced personas)
  systemPrompt: string; // The system prompt is very important and required
  creationDate: string; // ISO string format
  pictureUrl?: string; // Optional picture URL
  // source material
  inputProvenance?: SimplePersonaProvenance;
  inputText: string;
  // llm used
  llmLabel?: string;
  // sync source — 'mmos-sync' for personas imported from MMOS squad
  source?: 'mmos-sync' | 'user';
}

export type SimplePersonaProvenance = {
  type: 'youtube';
  url: string;
  title?: string;
  thumbnailUrl?: string;
} | {
  type: 'text';
};


interface AppPersonasStore {

  // state
  simplePersonas: SimplePersona[];

  // actions
  prependSimplePersona: (systemPrompt: string, inputText: string, inputProvenance?: SimplePersonaProvenance, llmLabel?: string) => void;
  importSyncedPersonas: (personas: Array<Pick<SimplePersona, 'id' | 'name' | 'description' | 'systemPrompt' | 'inputText'>>) => void;
  deleteSimplePersona: (id: string) => void;
  deleteSimplePersonas: (ids: Set<string>) => void;

}

/**
 * DO NOT USE outside of this application - this is a very simple store for Personas so that
 * they're not immediately lost.
 */
const useAppPersonasStore = create<AppPersonasStore>()(persist(
  (_set, _get) => ({

    simplePersonas: [],

    prependSimplePersona: (systemPrompt: string, inputText: string, inputProvenance?: SimplePersonaProvenance, llmLabel?: string) =>
      _set(state => {
        const newPersona: SimplePersona = {
          id: agiUuid('persona-simple'),
          systemPrompt,
          creationDate: new Date().toISOString(),
          inputProvenance,
          // to save bytes, do not save input text when from YouTube
          inputText: inputProvenance?.type === 'youtube' ? '' : inputText,
          llmLabel,
        };
        return {
          simplePersonas: [
            newPersona,
            ...state.simplePersonas.slice(0, MAX_SAVED_PROMPTS - 1),
          ],
        };
      }),

    importSyncedPersonas: (incoming) =>
      _set(state => {
        const incomingIds = new Set(incoming.map(p => p.id));
        // Keep manually created personas; replace existing synced ones
        const kept = state.simplePersonas.filter(p => p.source !== 'mmos-sync' || !incomingIds.has(p.id));
        const synced: SimplePersona[] = incoming.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          systemPrompt: p.systemPrompt,
          creationDate: new Date().toISOString(),
          inputText: p.inputText,
          source: 'mmos-sync' as const,
        }));
        const merged = [...synced, ...kept];
        return { simplePersonas: merged.slice(0, MAX_SAVED_PROMPTS) };
      }),

    deleteSimplePersona: (simplePersonaId: string) =>
      _set(state => ({
        simplePersonas: state.simplePersonas.filter(persona => persona.id !== simplePersonaId),
      })),

    deleteSimplePersonas: (simplePersonaIds: Set<string>) =>
      _set(state => ({
        simplePersonas: state.simplePersonas.filter(persona => !simplePersonaIds.has(persona.id)),
      })),

  }),
  {
    name: 'app-app-personas',
    version: 1,
  },
));

export function useSimplePersonas() {
  const simplePersonas = useAppPersonasStore(useShallow(state => state.simplePersonas));
  return { simplePersonas };
}

export function useSimplePersona(simplePersonaId: string) {
  const simplePersona = useAppPersonasStore(useShallow(state => {
    return state.simplePersonas.find(persona => persona.id === simplePersonaId) ?? null;
  }));
  return { simplePersona };
}

export function prependSimplePersona(systemPrompt: string, inputText: string, inputProvenance?: SimplePersonaProvenance, llmLabel?: string) {
  useAppPersonasStore.getState().prependSimplePersona(systemPrompt, inputText, inputProvenance, llmLabel);
}

export function importSyncedPersonas(personas: Array<Pick<SimplePersona, 'id' | 'name' | 'description' | 'systemPrompt' | 'inputText'>>) {
  useAppPersonasStore.getState().importSyncedPersonas(personas);
}

export function deleteSimplePersona(simplePersonaId: string) {
  useAppPersonasStore.getState().deleteSimplePersona(simplePersonaId);
}

export function deleteSimplePersonas(simplePersonaIds: Set<string>) {
  useAppPersonasStore.getState().deleteSimplePersonas(simplePersonaIds);
}