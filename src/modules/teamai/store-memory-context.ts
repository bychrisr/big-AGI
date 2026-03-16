/**
 * In-memory cache for MMOS mind system messages with memory layer injected.
 *
 * Enables Story 4.3 "inject memory at AIX level": memories are fetched before
 * each LLM call, not once at mind-selection time. Uses a 2-minute TTL and
 * folder-aware cache invalidation.
 *
 * Flow:
 *   1. Mind selected (PersonaSelector) → warmMindCache() pre-fetches base + memory
 *   2. User sends message (_handleExecute) → ensureFreshMindSystemMessage() checks TTL
 *      - Cache fresh: returns combined immediately (no API call)
 *      - Cache stale: fetches memory block, returns combined (base prompt reused)
 *   3. SystemPurposes[mindId].systemMessage updated → inlineUpdatePurposeInHistory picks it up
 */

import { SystemPurposes } from '../../data';

import { buildMemoryContextBlock, fetchMindSystemPrompt } from './store-minds';


/** 2-minute TTL for the memory context cache. */
const CACHE_TTL_MS = 2 * 60 * 1000;

type MemoryMode = 'general' | 'production' | 'trail' | 'consultation';

interface CacheEntry {
  /** Raw system prompt without the memory block. */
  basePrompt: string;
  /** The injected memory/context block (empty string if no memories). */
  memoryBlock: string;
  /** basePrompt + memoryBlock — what gets set as SystemPurposes[mindId].systemMessage. */
  combined: string;
  /** Active folder title when this entry was built. */
  folderTitle: string | undefined;
  /** Interaction mode when this entry was built. */
  mode: MemoryMode;
  /** Unix timestamp of last fetch, for TTL check. */
  fetchedAt: number;
}

// Module-level cache (keyed by `${mindId}:${mode}`). Not persisted — intentionally resets on page reload
// so the first message after reload always gets fresh memories.
const _cache = new Map<string, CacheEntry>();


function _cacheKey(mindId: string, mode: MemoryMode): string {
  return `${mindId}:${mode}`;
}


function _isFresh(entry: CacheEntry, folderTitle: string | undefined, mode: MemoryMode): boolean {
  return (Date.now() - entry.fetchedAt) < CACHE_TTL_MS
    && entry.folderTitle === folderTitle
    && entry.mode === mode;
}


/**
 * Returns a fresh combined system prompt (base + memory block) for the given mind.
 *
 * - Cache fresh (< 2 min, same folder, same mode): returns immediately, no API calls.
 * - Cache stale: fetches memory block (reuses cached base prompt if available),
 *   updates cache, returns combined.
 *
 * Called in _handleExecute.ts before each AIX request for MMOS minds.
 */
export async function ensureFreshMindSystemMessage(
  mindId: string,
  folderTitle: string | undefined,
  mode: MemoryMode = 'general',
): Promise<string | null> {
  const key = _cacheKey(mindId, mode);
  const cached = _cache.get(key);

  if (cached && _isFresh(cached, folderTitle, mode)) {
    return cached.combined;
  }

  // Fetch base prompt (only if not cached) and memory block in parallel
  const [basePrompt, memoryBlock] = await Promise.all([
    cached?.basePrompt ? Promise.resolve(cached.basePrompt) : fetchMindSystemPrompt(mindId),
    buildMemoryContextBlock(folderTitle, mode),
  ]);

  if (!basePrompt) return null;

  const combined = basePrompt + memoryBlock;
  _cache.set(key, { basePrompt, memoryBlock, combined, folderTitle, mode, fetchedAt: Date.now() });
  return combined;
}


/**
 * Pre-warms the cache with an already-fetched basePrompt + fresh memory block.
 * Also updates SystemPurposes[mindId].systemMessage for immediate effect.
 *
 * Called from PersonaSelector when a mind is selected, so the first message
 * after selection uses fresh memory without any extra latency.
 */
export async function warmMindCache(
  mindId: string,
  basePrompt: string,
  folderTitle: string | undefined,
  mode: MemoryMode = 'general',
): Promise<void> {
  const memoryBlock = await buildMemoryContextBlock(folderTitle, mode);
  const combined = basePrompt + memoryBlock;
  const key = _cacheKey(mindId, mode);

  _cache.set(key, { basePrompt, memoryBlock, combined, folderTitle, mode, fetchedAt: Date.now() });

  // Update SystemPurposes so inlineUpdatePurposeInHistory uses the fresh combined prompt
  if (SystemPurposes[mindId]) {
    SystemPurposes[mindId]!.systemMessage = combined;
  }
}


/**
 * Clears the cache entry for a specific mind + mode combination.
 * Pass mode='*' to clear all modes for that mind.
 */
export function invalidateMindCache(mindId: string, mode?: MemoryMode | '*'): void {
  if (!mode || mode === '*') {
    // Clear all cache entries for this mind across all modes
    for (const key of _cache.keys()) {
      if (key.startsWith(`${mindId}:`)) _cache.delete(key);
    }
  } else {
    _cache.delete(_cacheKey(mindId, mode));
  }
}
