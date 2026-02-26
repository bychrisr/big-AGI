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
          modelArg,
          maxTokensArg,
          topic: body.topic,
          minds: body.minds,
          userMessage: body.user_message,
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
  modelArg: string;
  maxTokensArg: string;
  topic: string;
  minds: string[];
  userMessage: string;
}

function buildPythonScript(params: PythonScriptParams): string {
  const { enginePath, mindsPath, anthropicApiKey, modelArg, maxTokensArg, topic, minds, userMessage } =
    params;
  return `
import sys, json, os
sys.path.insert(0, '${enginePath}')
os.environ.setdefault('ANTHROPIC_API_KEY', '${anthropicApiKey}')

from debate_engine.engine import DebateEngine
from debate_engine.mind_loader import MindLoader

api_key = os.environ.get('ANTHROPIC_API_KEY', '')
if not api_key:
    print(json.dumps({'type': 'error', 'mind_slug': '', 'error': 'ANTHROPIC_API_KEY not configured'}))
    sys.exit(1)

engine = DebateEngine(api_key=api_key${modelArg})
loader = MindLoader('${mindsPath}')
topic = ${JSON.stringify(topic)}
user_message = ${JSON.stringify(userMessage)}

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
    except Exception as e:
        print(json.dumps({'type': 'error', 'mind_slug': mind_slug, 'error': str(e)}))

print(json.dumps({'type': 'done', 'mind_slug': ''}))
`;
}
