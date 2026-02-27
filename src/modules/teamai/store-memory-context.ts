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

interface CacheEntry {
  /** Raw system prompt without the memory block. */
  basePrompt: string;
  /** The injected memory/context block (empty string if no memories). */
  memoryBlock: string;
  /** basePrompt + memoryBlock — what gets set as SystemPurposes[mindId].systemMessage. */
  combined: string;
  /** Active folder title when this entry was built. */
  folderTitle: string | undefined;
  /** Unix timestamp of last fetch, for TTL check. */
  fetchedAt: number;
}

// Module-level cache (keyed by mindId). Not persisted — intentionally resets on page reload
// so the first message after reload always gets fresh memories.
const _cache = new Map<string, CacheEntry>();


function _isFresh(entry: CacheEntry, folderTitle: string | undefined): boolean {
  return (Date.now() - entry.fetchedAt) < CACHE_TTL_MS && entry.folderTitle === folderTitle;
}


/**
 * Returns a fresh combined system prompt (base + memory block) for the given mind.
 *
 * - Cache fresh (< 2 min, same folder): returns immediately, no API calls.
 * - Cache stale: fetches memory block (reuses cached base prompt if available),
 *   updates cache, returns combined.
 *
 * Called in _handleExecute.ts before each AIX request for MMOS minds.
 */
export async function ensureFreshMindSystemMessage(
  mindId: string,
  folderTitle: string | undefined,
): Promise<string | null> {
  const cached = _cache.get(mindId);

  if (cached && _isFresh(cached, folderTitle)) {
    return cached.combined;
  }

  // Fetch base prompt (only if not cached) and memory block in parallel
  const [basePrompt, memoryBlock] = await Promise.all([
    cached?.basePrompt ? Promise.resolve(cached.basePrompt) : fetchMindSystemPrompt(mindId),
    buildMemoryContextBlock(folderTitle),
  ]);

  if (!basePrompt) return null;

  const combined = basePrompt + memoryBlock;
  _cache.set(mindId, { basePrompt, memoryBlock, combined, folderTitle, fetchedAt: Date.now() });
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
): Promise<void> {
  const memoryBlock = await buildMemoryContextBlock(folderTitle);
  const combined = basePrompt + memoryBlock;

  _cache.set(mindId, { basePrompt, memoryBlock, combined, folderTitle, fetchedAt: Date.now() });

  // Update SystemPurposes so inlineUpdatePurposeInHistory uses the fresh combined prompt
  if (SystemPurposes[mindId]) {
    SystemPurposes[mindId]!.systemMessage = combined;
  }
}


/** Clears the cache entry for a specific mind (e.g., after explicit memory save). */
export function invalidateMindCache(mindId: string): void {
  _cache.delete(mindId);
}
