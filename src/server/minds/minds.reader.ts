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
  systemPromptPath?: string;
  status?: string;
  category?: string;
}


// Converte slug (ex: "alex_hormozi") em nome legível ("Alex Hormozi")
function slugToName(slug: string): string {
  return slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}


// Extrai um campo de YAML usando regex — robusto para múltiplos schemas sem parser completo
function extractYamlField(content: string, ...keys: string[]): string | null {
  for (const key of keys) {
    // Tenta match em qualquer nível de indentação: "  key: value" ou "key: value"
    const match = content.match(new RegExp(`(?:^|\\n)\\s*${key}:\\s*["']?([^"'\\n#]+?)["']?\\s*(?:\\n|$)`));
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return null;
}


// Escolhe o melhor arquivo de system prompt disponível no diretório
// Ordem de preferência: main.md > COGNITIVE_OS.md > arquivos com "final" > qualquer .md
function findBestSystemPrompt(promptsDir: string): string | null {
  if (!fs.existsSync(promptsDir)) return null;

  const files = fs.readdirSync(promptsDir).filter(f => f.endsWith('.md'));
  if (files.length === 0) return null;

  const priority = [
    (f: string) => f === 'main.md',
    (f: string) => f.toLowerCase() === 'cognitive_os.md',
    (f: string) => f.toLowerCase().includes('final'),
    (f: string) => f.toLowerCase().includes('system_prompt') || f.toLowerCase().includes('system-prompt'),
    () => true, // qualquer .md como fallback
  ];

  for (const check of priority) {
    const found = files.find(check);
    if (found) return path.join(promptsDir, found);
  }
  return null;
}


function readMindFromDir(mindDir: string, source: 'shared' | 'custom'): MindMetadata | null {
  const slug = path.basename(mindDir);
  const metadataPath = path.join(mindDir, 'metadata.yaml');

  // Campos derivados do metadata.yaml (quando disponível) ou do nome do diretório
  let id = slug;
  let name = slugToName(slug);
  let specialty = '';

  if (fs.existsSync(metadataPath)) {
    try {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      // Suporta múltiplos schemas: flat (mind_id), nested (mind.slug), nested (mind.name)
      id = extractYamlField(content, 'mind_id', 'slug') ?? slug;
      name = extractYamlField(content, 'name') ?? slugToName(slug);
      specialty = extractYamlField(content, 'role', 'domain', 'primary_use_case') ?? '';
    } catch (err) {
      console.warn(`[minds.reader] Erro ao ler metadata.yaml em ${mindDir}:`, err);
    }
  }

  // Encontra o melhor system prompt disponível
  const promptsDir = path.join(mindDir, 'system_prompts');
  const systemPromptPath = findBestSystemPrompt(promptsDir);
  let systemPromptPreview: string | undefined;

  if (systemPromptPath) {
    try {
      const promptContent = fs.readFileSync(systemPromptPath, 'utf-8');
      systemPromptPreview = promptContent.slice(0, 200).replace(/\n/g, ' ').trim();
    } catch {
      // preview opcional — não falha
    }
  }

  // Skip minds sem nenhum system prompt (não estão prontos para uso)
  if (!systemPromptPath) {
    console.warn(`[minds.reader] Nenhum system prompt encontrado em ${mindDir} — ignorando`);
    return null;
  }

  return {
    id,
    name,
    specialty: specialty || slugToName(slug),
    tags: [],
    tokenBudget: 15000,
    source,
    systemPromptPreview,
    systemPromptPath,
    status: 'active',
  };
}


function readMindsFromDir(baseDir: string, source: 'shared' | 'custom', squad?: string): MindMetadata[] {
  if (!fs.existsSync(baseDir)) return [];

  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const minds: MindMetadata[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const mindDir = path.join(baseDir, entry.name);
    const mind = readMindFromDir(mindDir, source);
    if (mind) {
      if (squad) mind.category = squad;
      minds.push(mind);
    }
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

  const squadsDir = path.join(teamaiRepoPath, 'squads-base');
  const minds: MindMetadata[] = [];

  if (fs.existsSync(squadsDir)) {
    const entries = fs.readdirSync(squadsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const squadName = entry.name;
      const squadMindsDir = path.join(squadsDir, squadName, 'minds');
      const squadMinds = readMindsFromDir(squadMindsDir, 'shared', squadName);
      minds.push(...squadMinds);
    }
  }

  setCached(cacheKey, minds);
  return minds;
}


export function readUserMinds(teamaiRepoPath: string, userId: string): MindMetadata[] {
  const cacheKey = `user:${teamaiRepoPath}:${userId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const minds: MindMetadata[] = [];

  // Minds avulsos do usuário (users/{userId}/minds/)
  const userMindsDir = path.join(teamaiRepoPath, 'users', userId, 'minds');
  minds.push(...readMindsFromDir(userMindsDir, 'custom'));

  // Agentes de squads do usuário (users/{userId}/squads/*/agents/*.md)
  const userSquadsDir = path.join(teamaiRepoPath, 'users', userId, 'squads');
  minds.push(...readUserSquadAgents(userSquadsDir));

  setCached(cacheKey, minds);
  return minds;
}


/**
 * Lê agentes de squads do usuário como minds customizados.
 * Cada arquivo agents/*.md vira um MindMetadata usando o próprio .md como system prompt.
 */
function readUserSquadAgents(squadsDir: string): MindMetadata[] {
  if (!fs.existsSync(squadsDir)) return [];

  const minds: MindMetadata[] = [];
  const squadEntries = fs.readdirSync(squadsDir, { withFileTypes: true });

  for (const squadEntry of squadEntries) {
    if (!squadEntry.isDirectory()) continue;
    const squadName = squadEntry.name;
    const agentsDir = path.join(squadsDir, squadName, 'agents');
    if (!fs.existsSync(agentsDir)) continue;

    const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    for (const agentFile of agentFiles) {
      const agentPath = path.join(agentsDir, agentFile);
      const mind = readSquadAgentFromFile(agentPath, squadName);
      if (mind) minds.push(mind);
    }
  }

  return minds;
}


/**
 * Converte um arquivo de agente AIOS (.md com bloco YAML) em MindMetadata.
 * O arquivo completo é usado como system prompt — é o formato esperado pelo AIOS.
 */
function readSquadAgentFromFile(agentPath: string, squadName: string): MindMetadata | null {
  const slug = path.basename(agentPath, '.md');

  let content: string;
  try {
    content = fs.readFileSync(agentPath, 'utf-8');
  } catch {
    console.warn(`[minds.reader] Falha ao ler agente: ${agentPath}`);
    return null;
  }

  // Extrai name do campo "name:" dentro do bloco YAML do agente
  const nameMatch = content.match(/^agent:\s*\n(?:.*\n)*?(?:\s+name:\s+(.+))/m);
  const name = nameMatch?.[1]?.trim() ?? slugToName(slug);

  // Extrai title/specialty
  const titleMatch = content.match(/^\s+title:\s+(.+)/m);
  const specialty = titleMatch?.[1]?.trim() ?? '';

  // Preview das primeiras 200 chars (sem o cabeçalho ACTIVATION-NOTICE)
  const systemPromptPreview = content.slice(0, 200).replace(/\n/g, ' ').trim();

  return {
    id: slug,
    name,
    specialty: specialty || slugToName(slug),
    tags: ['squad', squadName],
    tokenBudget: 15000,
    source: 'custom',
    systemPromptPreview,
    systemPromptPath: agentPath,  // o .md inteiro é o system prompt
    status: 'active',
    category: squadName,
  };
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


// SimplePersona é o formato do big-AGI store de personas
export interface MindAsSimplePersona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  creationDate: string;
  pictureUrl?: string;
  inputText: string;
  source: 'mmos-sync';
}


/**
 * Converte MindMetadata para formato SimplePersona do big-AGI.
 * Lê o system prompt completo do arquivo em disco.
 * Retorna null se system prompt não puder ser lido.
 */
export function mindToSimplePersona(mind: MindMetadata): MindAsSimplePersona | null {
  if (!mind.systemPromptPath) return null;

  let systemPrompt: string;
  try {
    systemPrompt = fs.readFileSync(mind.systemPromptPath, 'utf-8').trim();
  } catch {
    console.warn(`[minds.reader] Falha ao ler system prompt: ${mind.systemPromptPath}`);
    return null;
  }

  // Verificar se existe imagem no diretório do mind
  const mindDir = path.dirname(path.dirname(mind.systemPromptPath));
  const pictureUrl = findMindPicture(mindDir);

  return {
    id: `mmos-${mind.id}`,
    name: mind.name,
    description: mind.specialty,
    systemPrompt,
    creationDate: new Date().toISOString(),
    pictureUrl: pictureUrl ?? undefined,
    inputText: `MMOS Mind: ${mind.name} — ${mind.specialty}`,
    source: 'mmos-sync',
  };
}


/** Procura por imagem de avatar no diretório do mind. */
function findMindPicture(mindDir: string): string | null {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
  const imageNames = ['avatar', 'picture', 'profile', 'icon'];

  try {
    if (!fs.existsSync(mindDir)) return null;
    const files = fs.readdirSync(mindDir);
    for (const name of imageNames) {
      for (const ext of imageExtensions) {
        if (files.includes(`${name}${ext}`)) {
          return `/api/minds/avatar/${path.basename(mindDir)}/${name}${ext}`;
        }
      }
    }
  } catch {
    // optional — não falha
  }
  return null;
}
