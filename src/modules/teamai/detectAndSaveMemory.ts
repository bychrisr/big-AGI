'use client';

/**
 * Client-side memory command detection for MMOS minds.
 *
 * Mirrors the Python memory_command_detector.py patterns so that regular
 * chat (not debate mode) can also save explicit user memories when the
 * active persona is an MMOS mind.
 *
 * Usage: call detectAndSaveMemory(message, conversationId) before sending
 * any message when an MMOS mind is active.
 */

import { registeredMindIds } from './store-minds';


interface MemoryMatch {
  key: string;
  value: string;
}

// Mirrors squads-base/mmos-squad/scripts/memory_command_detector.py
const TRIGGER_PATTERNS: RegExp[] = [
  /gravar?\s+na\s+mem[oó]ria\s+que\s+(.+)/i,
  /lembrar?\s+que\s+eu\s+(.+)/i,
  /anotar?\s+que\s+(.+)/i,
  /memorizar?\s+que\s+(.+)/i,
  /salvar?\s+que\s+(.+)/i,
  /registrar?\s+que\s+(.+)/i,
  /guardar?\s+na\s+mem[oó]ria\s+(.+)/i,
];

function extractKeyValue(phrase: string): MemoryMatch {
  // "X é Y" or "X são Y"
  const isMatch = phrase.match(/^(.+?)\s+[eé]\s+(.+)$/i);
  if (isMatch && isMatch[1] && isMatch[2])
    return { key: isMatch[1].trim(), value: isMatch[2].trim() };

  // "X: Y" or "X = Y"
  const colonMatch = phrase.match(/^(.+?)\s*[:=]\s*(.+)$/);
  if (colonMatch && colonMatch[1] && colonMatch[2])
    return { key: colonMatch[1].trim(), value: colonMatch[2].trim() };

  // "prefiro X" / "gosto de X" / "uso X" / "trabalho com X"
  const prefMatch = phrase.match(/^(?:prefiro|gosto\s+de|uso|trabalho\s+com)\s+(.+)$/i);
  if (prefMatch && prefMatch[1])
    return { key: 'preferencia', value: prefMatch[1].trim() };

  return { key: 'memoria', value: phrase };
}

function detectMemoryCommand(message: string): MemoryMatch | null {
  for (const pattern of TRIGGER_PATTERNS) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const phrase = match[1].trim().replace(/\.$/, '');
      return extractKeyValue(phrase);
    }
  }
  return null;
}


/**
 * If the active persona is an MMOS mind and the message contains an explicit
 * memory command, saves it to /api/memory (fire-and-forget).
 *
 * Also refreshes the mind's system prompt with the new memory block after saving.
 */
export async function detectAndSaveMemory(
  message: string,
  activePersonaId: string | null,
): Promise<void> {
  if (!activePersonaId) return;
  if (!registeredMindIds.has(activePersonaId)) return;

  const match = detectMemoryCommand(message);
  if (!match) return;

  try {
    await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: match.key, value: match.value, source: 'explicit' }),
    });
  } catch {
    // Silent — never block the chat
  }
}
