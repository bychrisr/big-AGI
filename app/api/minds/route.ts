import * as path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '~/common/supabase/server';
import { mergeMinds, mindToSimplePersona, readSharedMinds, readUserMinds, type MindAsSimplePersona, type MindMetadata } from '~/server/minds/minds.reader';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


// Dev mode: skip auth when Supabase is not configured
const SUPABASE_ENABLED = Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL']);


/** Resolves teamAI username for the authenticated user.
 * In dev mode returns TEAMAI_DEV_USERNAME.
 * In prod mode queries user_preferences for the stored username. */
async function resolveUsername(userId: string): Promise<string | null> {
  if (!SUPABASE_ENABLED) {
    return process.env['TEAMAI_DEV_USERNAME'] ?? null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('user_preferences')
      .select('username')
      .eq('user_id', userId)
      .single();
    return data?.username ?? null;
  } catch {
    return null;
  }
}


type MindsResponse = { minds: MindMetadata[] } | { personas: MindAsSimplePersona[] } | { error: string; message: string };

export async function GET(request: NextRequest): Promise<NextResponse<MindsResponse>> {
  let userId: string | null = null;

  if (SUPABASE_ENABLED) {
    // Auth via cookie (set by middleware + OAuth callback)
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Login required' },
        { status: 401 },
      );
    }
    userId = user.id;
  } else {
    userId = 'dev-user';
  }

  // ?format=persona retorna no formato SimplePersona do big-AGI
  const format = request.nextUrl.searchParams.get('format');
  const returnAsPersona = format === 'persona';

  const teamaiRepoPath = process.env['TEAMAI_REPO_PATH'] ?? process.cwd();

  try {
    const sharedMinds = readSharedMinds(teamaiRepoPath);
    const username = await resolveUsername(userId);
    const userMinds = username ? readUserMinds(teamaiRepoPath, username) : [];
    const minds = mergeMinds(sharedMinds, userMinds);

    if (returnAsPersona) {
      const personas = minds
        .map(m => mindToSimplePersona(m))
        .filter((p): p is MindAsSimplePersona => p !== null);
      return NextResponse.json({ personas }, { status: 200 });
    }

    return NextResponse.json({ minds }, { status: 200 });

  } catch (err) {
    console.error('[GET /api/minds] Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to read minds' },
      { status: 500 },
    );
  }
}
