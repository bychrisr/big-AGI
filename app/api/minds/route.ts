import * as path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';

import { mergeMinds, readSharedMinds, readUserMinds, type MindMetadata } from '~/server/minds/minds.reader';


// Resolve o username do teamAI a partir do Supabase user_id
// Por enquanto usa mapeamento estático — Story 3.1 integrará JWT completo
function resolveUsername(userId: string): string | null {
  // TODO(Story 3.1): buscar do Supabase com JOIN users.profiles
  // Mapeamento temporário para desenvolvimento local
  const STATIC_MAP: Record<string, string> = {
    // Adicionar aqui durante desenvolvimento: 'supabase-uuid': 'username_no_repo'
  };
  return STATIC_MAP[userId] ?? null;
}


// Extrai user_id do Authorization header (Bearer token Supabase JWT)
// TODO(Story 3.1): usar createSupabaseServerClient() para validação completa
async function extractUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  // Decodifica JWT sem verificação (verificação completa virá na Story 3.1)
  // Em produção, Story 3.1 substituirá isso por validação real com Supabase
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as Record<string, unknown>;
    return typeof payload['sub'] === 'string' ? payload['sub'] : null;
  } catch {
    return null;
  }
}


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest): Promise<NextResponse<{ minds: MindMetadata[] } | { error: string; message: string }>> {
  // Autenticação: extrair user_id do JWT
  const userId = await extractUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Bearer token required' },
      { status: 401 },
    );
  }

  // Path base do repo teamAI (este próprio repo em desenvolvimento)
  const teamaiRepoPath = process.env['TEAMAI_REPO_PATH'] ?? process.cwd();

  try {
    // Ler minds compartilhados
    const sharedMinds = readSharedMinds(teamaiRepoPath);

    // Resolver username e ler minds personalizados
    const username = resolveUsername(userId);
    const userMinds = username ? readUserMinds(teamaiRepoPath, username) : [];

    // Combinar (custom sobrescreve shared)
    const minds = mergeMinds(sharedMinds, userMinds);

    return NextResponse.json({ minds }, { status: 200 });

  } catch (err) {
    console.error('[GET /api/minds] Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to read minds' },
      { status: 500 },
    );
  }
}
