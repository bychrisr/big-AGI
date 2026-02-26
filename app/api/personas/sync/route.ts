import { NextResponse } from 'next/server';
import { syncMindsToPersonas } from '~/modules/personas-sync/sync-minds-to-personas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const teamaiRepoPath = process.env['TEAMAI_REPO_PATH'] ?? process.cwd();

  try {
    const personas = syncMindsToPersonas(teamaiRepoPath);
    return NextResponse.json({ personas, count: personas.length });
  } catch (err) {
    console.error('[GET /api/personas/sync] Error:', err);
    return NextResponse.json({ error: 'Failed to sync personas' }, { status: 500 });
  }
}
