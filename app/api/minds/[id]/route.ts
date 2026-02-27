import * as fs from 'node:fs';
import * as path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';

import { mergeMinds, readSharedMinds, readUserMinds, type MindMetadata } from '~/server/minds/minds.reader';


// Resolve o username do teamAI a partir do Supabase user_id
function resolveUsername(userId: string): string | null {
  // Dev mode: use TEAMAI_DEV_USERNAME environment variable
  if (!Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL'])) {
    return process.env['TEAMAI_DEV_USERNAME'] ?? null;
  }
  // TODO(Story 3.1): buscar do Supabase com JOIN users.profiles
  const STATIC_MAP: Record<string, string> = {};
  return STATIC_MAP[userId] ?? null;
}


// Extrai user_id do Authorization header (Bearer token Supabase JWT)
async function extractUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8'),
    ) as Record<string, unknown>;
    return typeof payload['sub'] === 'string' ? payload['sub'] : null;
  } catch {
    return null;
  }
}


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_ENABLED = Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL']);


interface MindDetailResponse {
  mind: MindMetadata;
  systemPromptContent?: string;
}

interface ErrorResponse {
  error: string;
  message: string;
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<MindDetailResponse | ErrorResponse>> {
  // Auth: skip in dev mode
  let userId: string | null = null;
  if (SUPABASE_ENABLED) {
    userId = await extractUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Bearer token required' },
        { status: 401 },
      );
    }
  } else {
    userId = 'dev-user';
  }

  const { id: mindId } = await params;
  if (!mindId) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Mind ID is required' },
      { status: 400 },
    );
  }

  const teamaiRepoPath = process.env['TEAMAI_REPO_PATH'] ?? process.cwd();

  try {
    const sharedMinds = readSharedMinds(teamaiRepoPath);
    const username = resolveUsername(userId);
    const userMinds = username ? readUserMinds(teamaiRepoPath, username) : [];
    const allMinds = mergeMinds(sharedMinds, userMinds);

    const mind = allMinds.find(m => m.id === mindId);
    if (!mind) {
      return NextResponse.json(
        { error: 'Not Found', message: `Mind "${mindId}" not found` },
        { status: 404 },
      );
    }

    // Read system prompt content if path is available
    let systemPromptContent: string | undefined;
    if (mind.systemPromptPath) {
      const resolvedPath = path.isAbsolute(mind.systemPromptPath)
        ? mind.systemPromptPath
        : path.join(teamaiRepoPath, mind.systemPromptPath);

      try {
        systemPromptContent = fs.readFileSync(resolvedPath, 'utf-8');
      } catch (err) {
        console.warn(`[GET /api/minds/${mindId}] Could not read system prompt:`, err);
      }
    }

    return NextResponse.json({ mind, systemPromptContent }, { status: 200 });

  } catch (err) {
    console.error(`[GET /api/minds/${mindId}] Error:`, err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to read mind details' },
      { status: 500 },
    );
  }
}
