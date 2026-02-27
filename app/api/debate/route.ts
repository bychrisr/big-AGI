import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DebateRequest {
  topic: string;
  minds: string[];
  user_message: string;
  session_id?: string;
  project_name?: string;
  model?: string;
  max_tokens?: number;
}

interface DebateStreamChunk {
  type: 'text' | 'token_usage' | 'error' | 'done';
  mind_slug: string;
  content?: string;
  input_tokens?: number;
  output_tokens?: number;
  error?: string;
}

// Extrai user_id do JWT (stub — Story 3.1 já implementou full auth via middleware)
function extractUserId(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const [, payload] = auth.slice(7).split('.');
    if (!payload) return null;
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString(),
    ) as Record<string, unknown>;
    return typeof decoded['sub'] === 'string' ? decoded['sub'] : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  // Auth
  const userId = extractUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: 'Authorization header required', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }

  // Parse + validação do body
  let body: DebateRequest;
  try {
    body = (await request.json()) as DebateRequest;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  }

  if (!body.topic || !Array.isArray(body.minds) || body.minds.length === 0 || !body.user_message) {
    return NextResponse.json(
      { error: 'topic, minds[] and user_message are required', code: 'VALIDATION_ERROR' },
      { status: 400 },
    );
  }

  const teamaiRepoPath = process.env['TEAMAI_REPO_PATH'] ?? process.cwd();
  const enginePath = path.join(teamaiRepoPath, 'squads-base', 'mmos-squad');
  const mindsPath = path.join(teamaiRepoPath, 'squads-base', 'mmos-squad', 'minds');

  const anthropicApiKey = process.env['ANTHROPIC_API_KEY'] ?? '';
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '';
  const supabaseServiceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';
  const modelArg = body.model ? `, model='${body.model}'` : '';
  const maxTokensArg = body.max_tokens ? `max_tokens=${body.max_tokens},` : '';

  // Streaming response via subprocess Python
  const stream = new ReadableStream({
    start(controller) {
      const python = spawn('python3', [
        '-c',
        buildPythonScript({
          enginePath,
          mindsPath,
          anthropicApiKey,
          supabaseUrl,
          supabaseServiceRoleKey,
          userId,
          modelArg,
          maxTokensArg,
          topic: body.topic,
          minds: body.minds,
          userMessage: body.user_message,
          projectName: body.project_name ?? '',
        }),
      ]);

      const enc = new TextEncoder();

      python.stdout.on('data', (data: Buffer) => {
        controller.enqueue(enc.encode(data.toString()));
      });

      python.stderr.on('data', (data: Buffer) => {
        console.error('[api/debate] Python stderr:', data.toString());
      });

      python.on('close', (code) => {
        if (code !== 0) {
          const errChunk: DebateStreamChunk = {
            type: 'error',
            mind_slug: '',
            error: `Debate engine exited with code ${code}`,
          };
          controller.enqueue(enc.encode(JSON.stringify(errChunk) + '\n'));
        }
        controller.close();
      });

      python.on('error', (err) => {
        const errChunk: DebateStreamChunk = {
          type: 'error',
          mind_slug: '',
          error: `Failed to start debate engine: ${err.message}`,
        };
        controller.enqueue(enc.encode(JSON.stringify(errChunk) + '\n'));
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}

interface PythonScriptParams {
  enginePath: string;
  mindsPath: string;
  anthropicApiKey: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  userId: string;
  modelArg: string;
  maxTokensArg: string;
  topic: string;
  minds: string[];
  userMessage: string;
  projectName: string;
}

function buildPythonScript(params: PythonScriptParams): string {
  const {
    enginePath,
    mindsPath,
    anthropicApiKey,
    supabaseUrl,
    supabaseServiceRoleKey,
    userId,
    modelArg,
    maxTokensArg,
    topic,
    minds,
    userMessage,
    projectName,
  } = params;
  const scriptsPath = `${enginePath}/scripts`;
  const hasSupabase = supabaseUrl !== '' && supabaseServiceRoleKey !== '';
  return `
import sys, json, os, uuid
sys.path.insert(0, '${enginePath}')
sys.path.insert(0, '${scriptsPath}')
os.environ.setdefault('ANTHROPIC_API_KEY', '${anthropicApiKey}')
os.environ.setdefault('SUPABASE_URL', '${supabaseUrl}')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', '${supabaseServiceRoleKey}')

from debate_engine.engine import DebateEngine
from debate_engine.mind_loader import MindLoader
from memory_command_detector import detect_memory_command, format_confirmation

api_key = os.environ.get('ANTHROPIC_API_KEY', '')
if not api_key:
    print(json.dumps({'type': 'error', 'mind_slug': '', 'error': 'ANTHROPIC_API_KEY not configured'}))
    sys.exit(1)

user_message = ${JSON.stringify(userMessage)}
project_name = ${JSON.stringify(projectName)}

# Detectar comando de memoria antes de executar o debate
memory_cmd = detect_memory_command(user_message)
if memory_cmd.detected and memory_cmd.key and ${JSON.stringify(hasSupabase)}:
    try:
        from supabase import create_client
        from memory_store import MemoryStore
        sb = create_client('${supabaseUrl}', '${supabaseServiceRoleKey}')
        ms = MemoryStore(sb)
        ms.record_explicit('${userId}', memory_cmd.key, memory_cmd.value, source='explicit')
        confirmation = format_confirmation(memory_cmd.key, memory_cmd.value)
        print(json.dumps({'type': 'text', 'mind_slug': 'memory', 'content': confirmation}))
    except Exception as e:
        print(json.dumps({'type': 'error', 'mind_slug': 'memory', 'error': f'Erro ao gravar memoria: {e}'}))
    print(json.dumps({'type': 'done', 'mind_slug': ''}))
    sys.exit(0)

engine = DebateEngine(api_key=api_key${modelArg})
loader = MindLoader('${mindsPath}')
topic = ${JSON.stringify(topic)}

turns = []
total_input = 0
total_output = 0

for mind_slug in ${JSON.stringify(minds)}:
    if not loader.mind_exists(mind_slug):
        print(json.dumps({'type': 'error', 'mind_slug': mind_slug, 'error': f'Mind not found: {mind_slug}'}))
        continue
    try:
        system_prompt = loader.load_system_prompt(mind_slug)
        kb_context = loader.load_kb(mind_slug, topic=topic)
        result = engine.generate_response(
            mind_slug=mind_slug,
            system_prompt=system_prompt,
            kb_context=kb_context,
            user_message=user_message,
            ${maxTokensArg}
        )
        print(json.dumps({'type': 'text', 'mind_slug': mind_slug, 'content': result.content}))
        print(json.dumps({'type': 'token_usage', 'mind_slug': mind_slug, 'input_tokens': result.input_tokens, 'output_tokens': result.output_tokens}))
        turns.append({'mind_slug': mind_slug, 'content': result.content})
        total_input += result.input_tokens
        total_output += result.output_tokens
    except Exception as e:
        print(json.dumps({'type': 'error', 'mind_slug': mind_slug, 'error': str(e)}))

# Salvar sessão de debate no Supabase para memória futura
if turns and ${JSON.stringify(hasSupabase)}:
    try:
        from supabase import create_client
        sb = create_client('${supabaseUrl}', '${supabaseServiceRoleKey}')
        session_id = str(uuid.uuid4())
        sb.table('debate_sessions').insert({
            'session_id': session_id,
            'user_id': '${userId}',
            'topic': topic,
            'minds': ${JSON.stringify(minds)},
            'turns': turns,
            'token_usage': {
                'input': total_input,
                'output': total_output,
                'total': total_input + total_output,
                'turns': len(turns),
                'project': project_name,
            },
        }).execute()
    except Exception as e:
        # Silent — nao bloquear o streaming
        sys.stderr.write(f'[debate] Session save failed: {e}\\n')

# Silent checkpoint: detectar padroes implicitos de preferencia do usuario
if turns and ${JSON.stringify(hasSupabase)}:
    try:
        from supabase import create_client
        from memory_store import MemoryStore
        from silent_checkpoint import SilentCheckpoint, DebateSessionData
        sb_cp = create_client('${supabaseUrl}', '${supabaseServiceRoleKey}')
        ms = MemoryStore(sb_cp)
        checkpoint = SilentCheckpoint(ms)
        session_data = DebateSessionData(turns=turns, user_messages=[user_message], topic=topic, user_id='${userId}')
        candidates = checkpoint.analyze(session_data)
        checkpoint.commit('${userId}', candidates)
    except Exception as e:
        sys.stderr.write(f'[debate] Checkpoint failed: {e}\\n')

print(json.dumps({'type': 'done', 'mind_slug': ''}))
`;
}
