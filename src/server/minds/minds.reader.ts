import * as fs from 'node:fs';
import * as path from 'node:path';


// Cache em memória com TTL de 5 minutos
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<MindMetadata[]>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos


export interface MindMetadata {
  id: string;
  name: string;
  specialty: string;
  tags: string[];
  tokenBudget: number;
  source: 'shared' | 'custom';
  systemPromptPreview?: string;
  status?: string;
  category?: string;
}


function parseMetadataYaml(content: string): Record<string, unknown> {
  // Parser YAML simples para campos básicos (sem dependência extra)
  // Formato esperado: "key: value" ou "key:\n  - item"
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  let currentKey: string | null = null;
  let inArray = false;
  const currentArray: string[] = [];

  for (const line of lines) {
    if (line.startsWith('#') || line.trim() === '') continue;

    const arrayMatch = line.match(/^  - (.+)$/);
    if (arrayMatch && currentKey && inArray) {
      currentArray.push(arrayMatch[1].trim());
      continue;
    }

    if (currentKey && inArray && currentArray.length > 0) {
      result[currentKey] = [...currentArray];
      currentArray.length = 0;
      inArray = false;
      currentKey = null;
    }

    const keyValueMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;
      if (value.trim() === '') {
        currentKey = key;
        inArray = true;
        currentArray.length = 0;
      } else {
        const cleaned = value.trim().replace(/^["']|["']$/g, '');
        result[key] = cleaned;
      }
    }
  }

  if (currentKey && inArray && currentArray.length > 0) {
    result[currentKey] = [...currentArray];
  }

  return result;
}


function readMindFromDir(mindDir: string, source: 'shared' | 'custom'): MindMetadata | null {
  const metadataPath = path.join(mindDir, 'metadata.yaml');

  if (!fs.existsSync(metadataPath)) {
    console.warn(`[minds.reader] metadata.yaml ausente: ${metadataPath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(metadataPath, 'utf-8');
    const data = parseMetadataYaml(content);

    if (!data['id'] || !data['name'] || !data['specialty']) {
      console.warn(`[minds.reader] metadata.yaml inválido em ${mindDir}: campos obrigatórios ausentes`);
      return null;
    }

    // Ler preview do system prompt (primeiros 200 chars)
    const systemPromptPath = path.join(mindDir, 'system_prompts', 'main.md');
    let systemPromptPreview: string | undefined;
    if (fs.existsSync(systemPromptPath)) {
      const promptContent = fs.readFileSync(systemPromptPath, 'utf-8');
      systemPromptPreview = promptContent.slice(0, 200).replace(/\n/g, ' ').trim();
    }

    return {
      id: String(data['id']),
      name: String(data['name']),
      specialty: String(data['specialty']),
      tags: Array.isArray(data['tags']) ? (data['tags'] as string[]) : [],
      tokenBudget: Number(data['token_budget']) || 15000,
      source,
      systemPromptPreview,
      status: data['status'] ? String(data['status']) : 'active',
      category: data['category'] ? String(data['category']) : undefined,
    };
  } catch (err) {
    console.warn(`[minds.reader] Erro ao ler ${metadataPath}:`, err);
    return null;
  }
}


function readMindsFromDir(baseDir: string, source: 'shared' | 'custom'): MindMetadata[] {
  if (!fs.existsSync(baseDir)) return [];

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const minds: MindMetadata[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const mindDir = path.join(baseDir, entry.name);
    const mind = readMindFromDir(mindDir, source);
    if (mind) minds.push(mind);
  }

  return minds;
}


function getCached(key: string): MindMetadata[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}


function setCached(key: string, data: MindMetadata[]): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}


export function readSharedMinds(teamaiRepoPath: string): MindMetadata[] {
  const cacheKey = `shared:${teamaiRepoPath}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const sharedMindsDir = path.join(teamaiRepoPath, 'squads-base', 'mmos-squad', 'minds');
  const minds = readMindsFromDir(sharedMindsDir, 'shared');
  setCached(cacheKey, minds);
  return minds;
}


export function readUserMinds(teamaiRepoPath: string, userId: string): MindMetadata[] {
  const cacheKey = `user:${teamaiRepoPath}:${userId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const userMindsDir = path.join(teamaiRepoPath, 'users', userId, 'minds');
  const minds = readMindsFromDir(userMindsDir, 'custom');
  setCached(cacheKey, minds);
  return minds;
}


export function mergeMinds(shared: MindMetadata[], custom: MindMetadata[]): MindMetadata[] {
  const merged = new Map<string, MindMetadata>();

  // Shared primeiro (base)
  for (const mind of shared) {
    merged.set(mind.id, mind);
  }

  // Custom sobrescreve shared se mesmo id
  for (const mind of custom) {
    merged.set(mind.id, mind);
  }

  return Array.from(merged.values());
}
