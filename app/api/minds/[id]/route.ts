import * as fs from 'node:fs';
import * as path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '~/common/supabase/server';
import { mergeMinds, readSharedMinds, readUserMinds, type MindMetadata } from '~/server/minds/minds.reader';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_ENABLED = Boolean(process.env['NEXT_PUBLIC_SUPABASE_URL']);


/** Resolves teamAI username. Dev mode uses TEAMAI_DEV_USERNAME, prod queries user_preferences. */
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


interface MindDetailResponse {
  mind: MindMetadata;
  systemPromptContent?: string;
}

interface ErrorResponse {
  error: string;
  message: string;
}


export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<MindDetailResponse | ErrorResponse>> {
  let userId: string | null = null;

  if (SUPABASE_ENABLED) {
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
    const username = await resolveUsername(userId);
    const userMinds = username ? readUserMinds(teamaiRepoPath, username) : [];
    const allMinds = mergeMinds(sharedMinds, userMinds);

    const mind = allMinds.find(m => m.id === mindId);
    if (!mind) {
      return NextResponse.json(
        { error: 'Not Found', message: `Mind "${mindId}" not found` },
        { status: 404 },
      );
    }

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
