/**
 * One-time migration of API keys from Zustand/localStorage to Supabase.
 *
 * Runs on first login when SUPABASE_URL is configured.
 * Reads vendor keys from the LLM service store, upserts each to Supabase
 * via the encrypted apikeys tRPC router, then clears them from the store.
 *
 * Safe to run multiple times — guarded by 'api_keys_migrated' flag in localStorage.
 */
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { apiAsyncNode } from '~/common/util/trpc.client';
import { useModelsStore } from '~/common/stores/llms/store-llms';


const MIGRATION_FLAG = 'api_keys_migrated';

/** Map from Zustand setup field name → tRPC provider identifier. */
const PROVIDER_FIELD_MAP: Record<string, string> = {
  anthropicKey: 'anthropic',
  geminiKey: 'gemini',
  oaiKey: 'openai',           // openai + openrouter share oaiKey
  groqKey: 'groq',
  deepseekKey: 'deepseek',
  perplexityKey: 'perplexity',
  xaiKey: 'xai',
  mistralKey: 'mistral',
  moonshotKey: 'moonshot',
  togetherKey: 'togetherai',
  openPipeKey: 'openpipe',
  alibabaOaiKey: 'alibaba',
};


/**
 * Extracts all non-empty API keys from the LLM service store.
 * Returns a map of provider → key.
 */
function extractKeysFromStore(sources: ReturnType<typeof useModelsStore.getState>['sources']): Map<string, string> {
  const found = new Map<string, string>();
  for (const source of sources) {
    const setup = source.setup as Record<string, unknown> | undefined;
    if (!setup) continue;
    for (const [field, provider] of Object.entries(PROVIDER_FIELD_MAP)) {
      const value = setup[field];
      if (typeof value === 'string' && value.trim().length > 0 && !found.has(provider)) {
        found.set(provider, value.trim());
      }
    }
  }
  return found;
}


/**
 * Clears API keys from the Zustand store for all known providers.
 * Called after successful migration to Supabase.
 */
function clearKeysFromStore(): void {
  const { sources, updateServiceSettings } = useModelsStore.getState();
  for (const source of sources) {
    const setup = source.setup as Record<string, unknown> | undefined;
    if (!setup) continue;
    const patch: Record<string, string> = {};
    for (const field of Object.keys(PROVIDER_FIELD_MAP)) {
      if (typeof setup[field] === 'string' && setup[field]) {
        patch[field] = '';
      }
    }
    if (Object.keys(patch).length > 0) {
      updateServiceSettings(source.id, patch);
    }
  }
}


/**
 * Migrates API keys from localStorage/Zustand to Supabase (once per user).
 *
 * Call this hook inside a component rendered after the user is authenticated.
 * No-ops in dev mode (no SUPABASE_URL) and after migration is complete.
 */
export function useLlmApiKeyMigration(isAuthenticated: boolean): void {
  const SUPABASE_ENABLED = typeof process !== 'undefined'
    && Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL']);

  const sources = useModelsStore(useShallow(s => s.sources));

  React.useEffect(() => {
    if (!isAuthenticated || !SUPABASE_ENABLED) return;
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') return;

    const keys = extractKeysFromStore(sources);
    if (keys.size === 0) {
      localStorage.setItem(MIGRATION_FLAG, 'true');
      return;
    }

    void (async () => {
      let migrated = 0;
      for (const [provider, key] of keys) {
        try {
          await apiAsyncNode.apikeys.upsertKey.mutate({ provider, key });
          migrated++;
        } catch (err) {
          console.warn(`[migration] Failed to migrate key for ${provider}:`, err);
        }
      }

      if (migrated > 0) {
        clearKeysFromStore();
        console.info(`[migration] ${migrated} API key(s) migrated to Supabase`);
      }

      localStorage.setItem(MIGRATION_FLAG, 'true');
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, SUPABASE_ENABLED]);
}
