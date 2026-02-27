import * as fs from 'node:fs';
import * as path from 'node:path';

// Shape matches SimplePersona from src/apps/personas/store-app-personas.ts
// Required: id, systemPrompt, creationDate, inputText
// Optional: name, pictureUrl, inputProvenance, llmLabel
// Extended: source (for identifying synced personas)
export interface SyncedPersona {
  id: string;
  name: string;
  systemPrompt: string;
  creationDate: string;
  inputText: string;
  source: 'mmos-sync';
}

interface MindConfig {
  name?: string;
  id?: string;
}

// Converts slug (e.g. "alex_hormozi") to display name ("Alex Hormozi")
function slugToName(slug: string): string {
  return slug.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Selects the best system prompt file in a directory.
// Priority: main.md > COGNITIVE_OS.md > files with "final" > files with "system_prompt" > any .md
function findBestSystemPrompt(promptsDir: string): string | null {
  if (!fs.existsSync(promptsDir)) return null;
  const files = fs.readdirSync(promptsDir).filter((f) => f.endsWith('.md'));
  if (files.length === 0) return null;

  const priority: Array<(f: string) => boolean> = [
    (f) => f === 'main.md',
    (f) => f.toLowerCase() === 'cognitive_os.md',
    (f) => f.toLowerCase().includes('final'),
    (f) => f.toLowerCase().includes('system_prompt') || f.toLowerCase().includes('system-prompt'),
    () => true,
  ];

  for (const check of priority) {
    const found = files.find(check);
    if (found) return path.join(promptsDir, found);
  }
  return null;
}

function readMindConfig(mindDir: string): MindConfig | null {
  const configPath = path.join(mindDir, 'docs', 'config.json');
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as MindConfig;
  } catch {
    return null;
  }
}

function syncMindToPersona(mindDir: string): SyncedPersona | null {
  const slug = path.basename(mindDir);

  const promptPath = findBestSystemPrompt(path.join(mindDir, 'system_prompts'));
  if (!promptPath) {
    console.warn('[personas-sync] No system prompt found in', mindDir, '— skipping');
    return null;
  }

  let systemPrompt: string;
  try {
    systemPrompt = fs.readFileSync(promptPath, 'utf-8');
  } catch (err) {
    console.warn('[personas-sync] Failed to read system prompt at', promptPath, err);
    return null;
  }

  const config = readMindConfig(mindDir);
  const name = config?.name ?? slugToName(slug);

  return {
    id: `mmos-${slug}`,
    name,
    systemPrompt,
    creationDate: new Date().toISOString(),
    inputText: name,
    source: 'mmos-sync',
  };
}

/**
 * Reads all minds from the MMOS squad directory and converts them to SyncedPersona objects.
 *
 * @param teamaiRepoPath - Absolute path to the teamAI repository root.
 * @returns Array of SyncedPersona, one per mind with a valid system prompt.
 */
export function syncMindsToPersonas(teamaiRepoPath: string): SyncedPersona[] {
  const mindsDir = path.join(teamaiRepoPath, 'squads-base', 'mmos-squad', 'minds');

  if (!fs.existsSync(mindsDir)) {
    console.warn('[personas-sync] minds dir not found:', mindsDir);
    return [];
  }

  const entries = fs.readdirSync(mindsDir, { withFileTypes: true });
  const personas: SyncedPersona[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const mindDir = path.join(mindsDir, entry.name);
    try {
      const persona = syncMindToPersona(mindDir);
      if (persona) personas.push(persona);
    } catch (err) {
      console.warn('[personas-sync] Error processing mind', entry.name, err);
    }
  }

  return personas;
}
